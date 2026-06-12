import type { Snapshot } from "./types";

export const sampleSnapshot: Snapshot = {
  generatedAt: "2026-03-27 22:30:00",
  path: "/work/demo",
  repoName: "demo-repo",
  git: {
    inRepo: true,
    root: "/work/demo",
    branch: "feat/agent-readiness",
    defaultBranch: "main",
    upstream: "origin/feat/agent-readiness",
    ahead: 1,
    behind: 0,
    staged: 1,
    unstaged: 2,
    untracked: 0,
  },
  instructions: {
    "AGENTS.md": true,
    "README.md": true,
    "CONTRIBUTING.md": false,
    "docs/": true,
  },
  agentSurfaces: {
    "AGENTS.md": true,
    "CLAUDE.md": false,
    "GEMINI.md": false,
    "Copilot instructions": true,
    "Cursor rules": true,
    "Windsurf rules": false,
  },
  docsCount: 6,
  ecosystems: ["node", "make"],
  automationCommands: ["bun test", "bun run build", "make check"],
  ciPresent: true,
  testsPresent: true,
  testFileCount: 12,
  largeFileCount: 1,
  findings: {
    todo: 3,
    fixme: 1,
    hack: 0,
  },
  envFiles: [".env.example"],
  secretLikeFiles: [],
  toolchain: [
    { name: "bun", version: "1.1.x" },
    { name: "node", version: "v24.x" },
    { name: "git", version: "2.50.x" }
  ],
  readinessScore: 81,
  readinessLevel: "high",
  nextActions: [
    "Use the smallest verification command first: bun test.",
    "Review existing local changes before delegating another task.",
    "Split the oversized file to reduce context loss."
  ],
};
