import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { classifyToolUse, extractFilePath, detectGitAction } from "../hooks/post-tool-use.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");
const skillPath = path.join(pluginRoot, "skills", "brag-sheet", "SKILL.md");
const evalsPath = path.join(pluginRoot, "evals", "evals.json");

function parseFrontmatter(content) {
  const end = content.indexOf("\n---", 4);
  const fmBlock = content.slice(4, end);
  const lines = fmBlock.split("\n");
  const result = {};
  let currentKey = null;
  let currentVal = [];

  for (const line of lines) {
    const keyMatch = line.match(/^([a-z0-9_-]+):\s*(.*)$/i);
    if (keyMatch) {
      if (currentKey) {
        result[currentKey] = currentVal.join(" ").trim();
      }
      currentKey = keyMatch[1];
      const rest = keyMatch[2].replace(/^[>|][+-]?\s*/, "").trim();
      currentVal = rest ? [rest] : [];
    } else if (currentKey && /^\s+/.test(line)) {
      currentVal.push(line.trim());
    }
  }
  if (currentKey) {
    result[currentKey] = currentVal.join(" ").trim();
  }
  return result;
}

describe("Skill Frontmatter & Specification (kien-thai style)", () => {
  it("SKILL.md exists and starts with YAML frontmatter fence", () => {
    assert.ok(existsSync(skillPath), "SKILL.md must exist");
    const content = readFileSync(skillPath, "utf-8");
    assert.ok(content.startsWith("---\n"), "SKILL.md must open with --- frontmatter fence");
    assert.ok(content.indexOf("\n---", 4) !== -1, "SKILL.md must close frontmatter with --- fence");
  });

  it("parses valid frontmatter with name and description fields", () => {
    const content = readFileSync(skillPath, "utf-8");
    const fm = parseFrontmatter(content);

    assert.ok(fm.name, "frontmatter must contain name");
    assert.equal(fm.name, "brag-sheet");

    assert.ok(fm.description, "frontmatter must contain description");
    assert.ok(fm.description.length > 20, "description must be substantial");
    assert.ok(fm.description.length <= 1024, "description must not exceed 1024 characters (agentskills.io spec)");
  });

  it("adheres to Skill Discovery Optimization (SDO) guidelines", () => {
    const content = readFileSync(skillPath, "utf-8");
    const fm = parseFrontmatter(content);
    assert.match(fm.description, /^Use (this skill )?when\b/i, "description should focus on triggering conditions");
    assert.ok(!fm.description.includes("Enforces a 3-part"), "description must not summarize internal workflow");
  });

  it("contains essential trigger keywords in description", () => {
    const content = readFileSync(skillPath, "utf-8");
    const requiredKeywords = ["brag", "performance review", "weekly update", "impact"];
    for (const kw of requiredKeywords) {
      assert.ok(
        content.toLowerCase().includes(kw.toLowerCase()),
        `SKILL.md must include trigger keyword: ${kw}`
      );
    }
  });
});

describe("Eval Scenarios Dataset (evals.json)", () => {
  it("evals.json exists and adheres to benchmark schema", () => {
    assert.ok(existsSync(evalsPath), "evals.json must exist");
    const raw = readFileSync(evalsPath, "utf-8");
    const parsed = JSON.parse(raw);

    assert.equal(parsed.skill_name, "brag-sheet");
    assert.ok(Array.isArray(parsed.evals), "evals must be an array");
    assert.ok(parsed.evals.length >= 4, "must have at least 4 evaluation scenarios");

    const seenIds = new Set();
    for (const item of parsed.evals) {
      assert.ok(typeof item.id === "number", "eval id must be a number");
      assert.ok(!seenIds.has(item.id), `eval id ${item.id} must be unique`);
      seenIds.add(item.id);

      assert.ok(typeof item.name === "string" && item.name.length > 0, "eval name is required");
      assert.ok(typeof item.prompt === "string" && item.prompt.length > 0, "eval prompt is required");
      assert.ok(typeof item.mode === "string", "eval mode is required");
      assert.ok(item.expected_contract, "expected_contract is required");
    }
  });
});

describe("Impact Contract & Rule Consistency", () => {
  it("enforces the 3-part impact statement format in SKILL.md", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.ok(
      content.includes("Did [action] → [result/impact] → [evidence]") ||
      content.includes("action → result → evidence"),
      "SKILL.md must define the 3-part impact contract"
    );
  });

  it("defines Anti-Patterns and Evidence Ladder", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.ok(content.includes("Anti-Patterns"), "SKILL.md must include Anti-Patterns section");
    assert.ok(content.includes("Evidence Ladder"), "SKILL.md must include Evidence Ladder section");
    assert.ok(content.includes("(evidence needed)"), "SKILL.md must specify (evidence needed) fallback");
  });

  it("enforces no-emoji rule and clean plain-text formatting", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.match(content, /DO NOT.*use emojis/i, "SKILL.md must explicitly prohibit emojis");
    assert.ok(!content.includes("🚀"), "SKILL.md must not use rocket emoji");
    assert.ok(!content.includes("🏗️"), "SKILL.md must not use construction emoji");
  });

  it("integrates kien-thai skill for Thai language support", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.ok(content.includes("kien-thai"), "SKILL.md must reference kien-thai skill");
    assert.ok(content.includes("Topic-Comment"), "SKILL.md must mention Topic-Comment frame");
    assert.ok(content.includes("Professional / Tech Explainer"), "SKILL.md must specify Thai default register");
  });
});

describe("Superpowers Writing-Skills Standards Compliance", () => {
  it("contains standard Overview and When to Use sections", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.match(content, /^## Overview\b/m, "SKILL.md must contain ## Overview section");
    assert.match(content, /^## When to Use\b/m, "SKILL.md must contain ## When to Use section");
  });

  it("establishes the foundational spirit vs letter rule", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.ok(
      content.includes("Violating the letter of the rules is violating the spirit of the rules"),
      "SKILL.md must establish spirit vs letter rule"
    );
  });

  it("contains Rationalization Table and Red Flags section", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.match(content, /^## Rationalization Table\b/m, "SKILL.md must contain ## Rationalization Table");
    assert.match(content, /^## Red Flags\b/m, "SKILL.md must contain ## Red Flags section");
  });

  it("contains Common Mistakes section with fixes", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.match(content, /^## Common Mistakes\b/m, "SKILL.md must contain ## Common Mistakes");
  });

  it("contains a workflow decision flowchart", () => {
    const content = readFileSync(skillPath, "utf-8");
    assert.match(content, /```(?:mermaid|dot)/, "SKILL.md must include an inline decision flowchart");
  });
});


describe("Antigravity Lifecycle Hook Classification", () => {
  it("classifies write_to_file as filesCreated", () => {
    const result = classifyToolUse({
      toolName: "write_to_file",
      toolArgs: { TargetFile: "/path/to/feature.js" },
    });
    assert.deepEqual(result.filesCreated, ["/path/to/feature.js"]);
    assert.deepEqual(result.filesEdited, []);
  });

  it("classifies replace_file_content as filesEdited", () => {
    const result = classifyToolUse({
      toolName: "replace_file_content",
      toolArgs: { TargetFile: "/path/to/bugfix.js" },
    });
    assert.deepEqual(result.filesEdited, ["/path/to/bugfix.js"]);
    assert.deepEqual(result.filesCreated, []);
  });

  it("classifies run_command git commit and push", () => {
    const commitRes = classifyToolUse({
      toolName: "run_command",
      toolArgs: { CommandLine: "git commit -m 'feat: add evals'" },
    });
    assert.deepEqual(commitRes.significantActions, ["git commit"]);

    const pushRes = classifyToolUse({
      toolName: "run_command",
      toolArgs: { CommandLine: "git push origin main" },
    });
    assert.deepEqual(pushRes.significantActions, ["git push"]);
  });

  it("extractFilePath handles TargetFile, path, and file_path", () => {
    assert.equal(extractFilePath({ TargetFile: "a.js" }), "a.js");
    assert.equal(extractFilePath({ path: "b.js" }), "b.js");
    assert.equal(extractFilePath({ file_path: "c.js" }), "c.js");
    assert.equal(extractFilePath({}), null);
  });

  it("detectGitAction handles git commands with flags", () => {
    assert.equal(detectGitAction("git commit -m 'feat: add evals'"), "git commit");
    assert.equal(detectGitAction("git --no-pager commit -m 'test'"), "git commit");
    assert.equal(detectGitAction("git push origin main"), "git push");
    assert.equal(detectGitAction("git --force push"), "git push");
    assert.equal(detectGitAction("git status"), null);
  });

  it("executes hooks/post-tool-use.mjs via stdio as subprocess", async () => {
    const hookPath = path.join(pluginRoot, "hooks", "post-tool-use.mjs");
    const payload = JSON.stringify({
      toolCall: {
        name: "write_to_file",
        args: { TargetFile: "/tmp/test-output.txt" },
      },
    });

    const child = spawn(process.execPath, [hookPath], {
      stdio: ["pipe", "pipe", "inherit"],
    });

    let stdout = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stdin.write(payload);
    child.stdin.end();

    await new Promise((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Process exited with code ${code}`));
      });
    });

    const parsed = JSON.parse(stdout);
    assert.equal(parsed.continue, true);
    assert.deepEqual(parsed.classification?.filesCreated, ["/tmp/test-output.txt"]);
  });
});
