import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, "..");

describe("Antigravity Plugin Integration (agy)", () => {
  it("passes agy plugin validate with skills and hooks", async () => {
    const { stdout } = await execFileAsync("agy", ["plugin", "validate", "."], {
      cwd: pluginRoot,
    });
    assert.match(stdout, /skills\s+:\s+1 processed/);
    assert.match(stdout, /hooks\s+:\s+1 processed/);
  });

  it("installs and uninstalls cleanly via agy plugin install in isolated environment", async () => {
    const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "agy-test-home-"));
    const testEnv = { ...process.env, HOME: tmpHome };

    try {
      // 1. Install plugin into isolated home
      const installRes = await execFileAsync("agy", ["plugin", "install", pluginRoot], {
        cwd: pluginRoot,
        env: testEnv,
      });
      assert.match(installRes.stdout, /brag-sheet/);

      // 2. Verify presence in agy plugin list
      const listRes = await execFileAsync("agy", ["plugin", "list"], {
        cwd: pluginRoot,
        env: testEnv,
      });
      const parsed = JSON.parse(listRes.stdout);
      const bragSheetPlugin = parsed.imports?.find((p) => p.name === "brag-sheet");
      assert.ok(bragSheetPlugin, "brag-sheet must be listed in imports");
      assert.ok(bragSheetPlugin.components.includes("skills"), "must contain skills component");
      assert.ok(bragSheetPlugin.components.includes("hooks"), "must contain hooks component");

      // 3. Uninstall and cleanup
      const uninstallRes = await execFileAsync("agy", ["plugin", "uninstall", "brag-sheet"], {
        cwd: pluginRoot,
        env: testEnv,
      });
      assert.match(uninstallRes.stdout, /Uninstalled plugin "brag-sheet"/);

      const afterListRes = await execFileAsync("agy", ["plugin", "list"], {
        cwd: pluginRoot,
        env: testEnv,
      });
      if (afterListRes.stdout.includes("No imported plugins")) {
        assert.ok(true, "no plugins remaining");
      } else {
        const afterParsed = JSON.parse(afterListRes.stdout);
        const afterPlugin = afterParsed.imports?.find((p) => p.name === "brag-sheet");
        assert.equal(afterPlugin, undefined, "brag-sheet must be removed");
      }
    } finally {
      fs.rmSync(tmpHome, { recursive: true, force: true });
    }
  });
});
