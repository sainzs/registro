import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  LARGE_FILE_LINE_THRESHOLD,
  collectFindings,
  collectSnapshot,
  detectEcosystems,
  parsePorcelain,
  renderCompactReport,
  renderReport,
  renderTuiReport,
  type Snapshot,
} from "../src/lib.js";

function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = path.join(os.tmpdir(), `awr-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("parsePorcelain counts staged, unstaged, and untracked files", () => {
  const result = parsePorcelain([
    "M  tracked.ts",
    " M dirty.ts",
    "MM mixed.ts",
    "?? new.ts",
  ]);

  assert.deepEqual(result, { staged: 2, unstaged: 2, untracked: 1 });
});

test("detectEcosystems reads bun-compatible package scripts", () => {
  withTempDir((dir) => {
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ scripts: { test: "bun test", lint: "tsc --noEmit" } }, null, 2),
    );
    writeFileSync(path.join(dir, "bun.lock"), "");

    const result = detectEcosystems(dir);
    assert.equal(result.testsPresent, true);
    assert.equal(result.ciPresent, false);
    assert.ok(result.ecosystems.includes("node"));
    assert.ok(result.automationCommands.includes("bun test"));
    assert.ok(result.automationCommands.includes("bun run lint"));
  });
});

test("collectFindings detects env files, secret-like files, test files, and large files", () => {
  withTempDir((dir) => {
    mkdirSync(path.join(dir, "tests"), { recursive: true });
    writeFileSync(path.join(dir, ".env"), "API_KEY=secret\n");
    writeFileSync(path.join(dir, "prod.key"), "fake-key\n");
    writeFileSync(path.join(dir, "tests", "demo.test.ts"), "test('ok', () => {})\n");
    writeFileSync(
      path.join(dir, "huge.ts"),
      Array.from({ length: LARGE_FILE_LINE_THRESHOLD + 10 }, () => "console.log('x');").join("\n"),
    );

    const result = collectFindings(dir);
    assert.ok(result.envFiles.includes(".env"));
    assert.ok(result.secretLikeFiles.includes(".env"));
    assert.ok(result.secretLikeFiles.includes("prod.key"));
    assert.equal(result.testFileCount, 1);
    assert.equal(result.largeFileCount, 1);
  });
});

test("collectSnapshot builds a useful repo snapshot", () => {
  withTempDir((dir) => {
    mkdirSync(path.join(dir, ".cursor", "rules"), { recursive: true });
    mkdirSync(path.join(dir, "tests"), { recursive: true });
    writeFileSync(path.join(dir, "README.md"), "# Demo\n");
    writeFileSync(path.join(dir, "AGENTS.md"), "Be careful\n");
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }, null, 2));
    writeFileSync(path.join(dir, "notes.ts"), "// TODO: tighten this\n");
    writeFileSync(path.join(dir, "tests", "demo.test.ts"), "test('ok', () => {})\n");

    spawnSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: dir, stdio: "ignore" });
    spawnSync("git", ["config", "user.name", "Test User"], { cwd: dir, stdio: "ignore" });

    const snapshot = collectSnapshot(dir);
    assert.equal(snapshot.git.inRepo, true);
    assert.equal(snapshot.instructions["AGENTS.md"], true);
    assert.equal(snapshot.agentSurfaces["Cursor rules"], true);
    assert.ok(snapshot.ecosystems.includes("node"));
    assert.ok(snapshot.findings.todo >= 1);
    assert.equal(snapshot.testsPresent, true);
    assert.ok(snapshot.readinessScore >= 40);
  });
});

test("render functions include title, readiness, and commands", () => {
  const snapshot: Snapshot = {
    generatedAt: "2026-03-27 16:00:00",
    path: "/tmp/demo",
    repoName: "demo",
    git: {
      inRepo: true,
      root: "/tmp/demo",
      branch: "main",
      defaultBranch: "main",
      upstream: "-",
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
    },
    instructions: {
      "AGENTS.md": true,
      "README.md": true,
      "CONTRIBUTING.md": false,
      "docs/": false,
    },
    agentSurfaces: {
      "AGENTS.md": true,
      "CLAUDE.md": false,
      "GEMINI.md": false,
      "Copilot instructions": false,
      "Cursor rules": false,
      "Windsurf rules": false,
    },
    docsCount: 2,
    ecosystems: ["node"],
    automationCommands: ["bun test"],
    ciPresent: false,
    testsPresent: true,
    testFileCount: 4,
    largeFileCount: 0,
    findings: { todo: 0, fixme: 0, hack: 0 },
    envFiles: [],
    secretLikeFiles: [],
    toolchain: [{ name: "node", version: "v24.0.0" }],
    readinessScore: 78,
    readinessLevel: "high",
    nextActions: ["Use the smallest verification command first: bun test."],
  };

  const report = renderReport(snapshot, "plain");
  const compact = renderCompactReport(snapshot, "plain");
  const tui = renderTuiReport(snapshot, "plain");

  assert.match(report, /AGENTIC ENGINEERING REPORT/);
  assert.match(report, /HIGH \(78\/100\)/);
  assert.match(report, /bun test/);
  assert.match(compact, /readiness HIGH 78\/100/);
  assert.match(tui, /readiness HIGH/);
  assert.match(tui, /next 1/);
});
