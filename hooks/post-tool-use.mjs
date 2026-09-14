#!/usr/bin/env node

/**
 * @fileoverview Antigravity PostToolUse hook — classify tool calls for the brag sheet.
 *
 * Reads JSON hook payload from stdin, classifies tool calls (files created/edited,
 * git actions), persists receipts to a JSONL log, and outputs a clean JSON response to stdout.
 *
 * Designed to be 100% self-contained with zero runtime dependencies.
 *
 * @license MIT
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Tool classification sets
const FILE_CREATE_TOOLS = new Set(["write_to_file", "create", "create_file"]);
const FILE_EDIT_TOOLS = new Set(["replace_file_content", "edit", "edit_file", "str_replace_editor"]);
const SHELL_TOOLS = new Set(["run_command", "bash", "powershell"]);

export function extractFilePath(toolArgs) {
  return toolArgs?.TargetFile || toolArgs?.path || toolArgs?.file_path || null;
}

export function detectGitAction(command) {
  if (!command) return null;
  if (/\bgh\s+pr\s+create\b/i.test(command)) return "gh pr create";
  if (/\bgit\b(?:\s+(?:-[^\s]+|--[^\s]+|\S+=\S+))*\s+commit\b/i.test(command) ||
      /\bgit\b\s+(?:-C\s+\S+\s+)?commit\b/i.test(command)) return "git commit";
  if (/\bgit\b(?:\s+(?:-[^\s]+|--[^\s]+|\S+=\S+))*\s+push\b/i.test(command) ||
      /\bgit\b\s+(?:-C\s+\S+\s+)?push\b/i.test(command)) return "git push";
  return null;
}

export function classifyToolUse({ toolName, toolArgs }) {
  const filesCreated = [];
  const filesEdited = [];
  const significantActions = [];

  if (FILE_CREATE_TOOLS.has(toolName)) {
    const filePath = extractFilePath(toolArgs);
    if (filePath) filesCreated.push(filePath);
  } else if (FILE_EDIT_TOOLS.has(toolName)) {
    const filePath = extractFilePath(toolArgs);
    if (filePath) filesEdited.push(filePath);
  }

  if (SHELL_TOOLS.has(toolName)) {
    const command = toolArgs?.CommandLine || toolArgs?.command;
    const action = detectGitAction(command);
    if (action) significantActions.push(action);
  }

  return { filesCreated, filesEdited, significantActions };
}

export function recordActivity(classification, options = {}) {
  const logPath =
    options.logPath ||
    process.env.BRAG_SHEET_LOG_PATH ||
    path.join(os.homedir(), ".antigravity-brag-sheet-activity.jsonl");

  try {
    const record = {
      timestamp: new Date().toISOString(),
      ...classification,
    };
    fs.appendFileSync(logPath, JSON.stringify(record) + "\n", "utf8");
    return true;
  } catch {
    // Fault-tolerant: non-blocking on persistence failure
    return false;
  }
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  try {
    // Guard against interactive hang if run directly in a terminal
    if (process.stdin.isTTY) {
      process.stdout.write("{}\n");
      return;
    }

    const raw = await readStdin();
    if (!raw.trim()) {
      process.stdout.write("{}\n");
      return;
    }

    const payload = JSON.parse(raw);

    // Support Antigravity (toolCall: { name, args }), Agency, and camelCase
    const toolName = payload.toolCall?.name || payload.tool_name || payload.toolName || "";
    const toolArgs = payload.toolCall?.args || payload.tool_input || payload.toolArgs || {};

    const classification = classifyToolUse({ toolName, toolArgs });

    const hasActivity =
      classification.filesCreated.length > 0 ||
      classification.filesEdited.length > 0 ||
      classification.significantActions.length > 0;

    if (hasActivity) {
      recordActivity(classification);
    }

    const response = {
      continue: true,
      classification: hasActivity ? classification : undefined,
    };

    process.stdout.write(JSON.stringify(response) + "\n");
  } catch {
    // Fault-tolerant: never crash the agent loop on hook errors
    process.stdout.write("{}\n");
  }
}

// Only execute main when run directly as CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
