import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { GitStatus, Snapshot, ToolInfo } from "./snapshot.js";

export const VERSION = "0.4.0";
export const TITLE = "AGENTIC ENGINEERING REPORT";
export const LARGE_FILE_LINE_THRESHOLD = 800;

const EXCLUDED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".turbo",
  ".venv",
  "venv",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "target",
  "out",
  "__pycache__",
]);

const TEXT_FILE_EXTENSIONS = new Set([
  ".py",
  ".sh",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".toml",
  ".yaml",
  ".yml",
  ".md",
  ".txt",
  ".go",
  ".rs",
  ".rb",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".cc",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".php",
  ".html",
  ".css",
  ".scss",
  ".sql",
]);

const FINDING_PATTERNS = {
  todo: /\bTODO\b/g,
  fixme: /\bFIXME\b/g,
  hack: /\bHACK\b/g,
};

const SECRET_LIKE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.staging",
  ".npmrc",
  ".netrc",
  ".pypirc",
  "id_rsa",
  "id_dsa",
  "credentials",
]);

const SECRET_LIKE_SUFFIXES = new Set([".pem", ".key", ".p12", ".pfx", ".kdbx"]);
const ANSI_RESET = "\u001b[0m";

export type ThemeName = "auto" | "plain" | "random-access" | "amber" | "ocean" | "matrix";

export interface Theme {
  name: ThemeName | string;
  enabled: boolean;
  border?: string;
  title?: string;
  section?: string;
  accent?: string;
  good?: string;
  warn?: string;
  bad?: string;
  muted?: string;
  reset?: string;
}

export type { GitStatus, Snapshot, ToolInfo } from "./snapshot.js";

export interface CliOptions {
  path: string;
  json: boolean;
  compact: boolean;
  tui: boolean;
  theme: ThemeName;
}

const THEME_PRESETS: Record<string, Theme> = {
  "random-access": {
    name: "random-access",
    enabled: true,
    border: "\u001b[38;2;111;141;134m",
    title: "\u001b[1;38;2;0;255;178m",
    section: "\u001b[1;38;2;0;255;178m",
    accent: "\u001b[38;2;0;255;178m",
    good: "\u001b[38;2;74;222;128m",
    warn: "\u001b[38;2;162;229;184m",
    bad: "\u001b[38;2;38;201;148m",
    muted: "\u001b[38;2;111;141;134m",
    reset: ANSI_RESET,
  },
  amber: {
    name: "amber",
    enabled: true,
    border: "\u001b[38;5;179m",
    title: "\u001b[1;38;5;223m",
    section: "\u001b[1;38;5;215m",
    accent: "\u001b[38;5;222m",
    good: "\u001b[38;5;150m",
    warn: "\u001b[38;5;214m",
    bad: "\u001b[38;5;203m",
    muted: "\u001b[38;5;245m",
    reset: ANSI_RESET,
  },
  ocean: {
    name: "ocean",
    enabled: true,
    border: "\u001b[38;5;81m",
    title: "\u001b[1;38;5;123m",
    section: "\u001b[1;38;5;117m",
    accent: "\u001b[38;5;159m",
    good: "\u001b[38;5;120m",
    warn: "\u001b[38;5;221m",
    bad: "\u001b[38;5;203m",
    muted: "\u001b[38;5;250m",
    reset: ANSI_RESET,
  },
  matrix: {
    name: "matrix",
    enabled: true,
    border: "\u001b[38;5;34m",
    title: "\u001b[1;38;5;84m",
    section: "\u001b[1;38;5;46m",
    accent: "\u001b[38;5;119m",
    good: "\u001b[38;5;82m",
    warn: "\u001b[38;5;190m",
    bad: "\u001b[38;5;197m",
    muted: "\u001b[38;5;71m",
    reset: ANSI_RESET,
  },
};

function safeReadFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function runCommand(args: string[], cwd?: string): string | null {
  const result = spawnSync(args[0], args.slice(1), {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return output.length > 0 ? output : "";
}

export function commandExists(name: string): boolean {
  const pathEnv = process.env.PATH ?? "";
  const paths = pathEnv.split(path.delimiter).filter(Boolean);

  for (const dir of paths) {
    const candidate = path.join(dir, name);
    if (existsSync(candidate)) {
      return true;
    }
  }

  return false;
}

export function supportsColor(stream: NodeJS.WriteStream = process.stdout): boolean {
  if (process.env.NO_COLOR) {
    return false;
  }
  if ((process.env.TERM ?? "") === "dumb") {
    return false;
  }
  return Boolean(stream.isTTY);
}

export function resolveTheme(name: ThemeName = "auto", stream: NodeJS.WriteStream = process.stdout): Theme {
  if (name === "plain") {
    return { name: "plain", enabled: false };
  }

  if (name === "auto") {
    if (!supportsColor(stream)) {
      return { name: "plain", enabled: false };
    }
    const preferred = process.env.AWR_THEME ?? "random-access";
    return THEME_PRESETS[preferred] ?? THEME_PRESETS["random-access"];
  }

  return THEME_PRESETS[name] ?? THEME_PRESETS["random-access"];
}

function styleText(text: string, role: keyof Theme | "normal", theme: Theme): string {
  if (!theme.enabled || role === "normal") {
    return text;
  }

  const color = theme[role];
  if (!color) {
    return text;
  }

  return `${color}${text}${theme.reset ?? ANSI_RESET}`;
}

export function findRepoRoot(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  const result = runCommand(["git", "rev-parse", "--show-toplevel"], resolved);
  return result ? result : resolved;
}

export function detectRepoName(root: string): string {
  return path.basename(root) || root;
}

export function parsePorcelain(lines: string[]): { staged: number; unstaged: number; untracked: number } {
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;

  for (const line of lines) {
    if (!line) {
      continue;
    }
    if (line.startsWith("??")) {
      untracked += 1;
      continue;
    }
    if (line.length < 2) {
      continue;
    }
    if (line[0] !== " ") {
      staged += 1;
    }
    if (line[1] !== " ") {
      unstaged += 1;
    }
  }

  return { staged, unstaged, untracked };
}

export function collectGitStatus(targetPath: string): GitStatus {
  const resolved = path.resolve(targetPath);
  const inside = runCommand(["git", "rev-parse", "--is-inside-work-tree"], resolved) === "true";

  if (!inside) {
    return {
      inRepo: false,
      root: resolved,
      branch: "-",
      defaultBranch: "-",
      upstream: "-",
      ahead: 0,
      behind: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
    };
  }

  const root = runCommand(["git", "rev-parse", "--show-toplevel"], resolved) ?? resolved;
  const branch = runCommand(["git", "branch", "--show-current"], root) ?? "detached";

  let defaultBranch = "-";
  const remoteHead = runCommand(["git", "symbolic-ref", "refs/remotes/origin/HEAD"], root);
  if (remoteHead) {
    defaultBranch = remoteHead.split("/").at(-1) ?? "-";
  } else {
    for (const candidate of ["main", "master", "trunk"]) {
      const exists = runCommand(["git", "show-ref", "--verify", `refs/heads/${candidate}`], root);
      if (exists !== null) {
        defaultBranch = candidate;
        break;
      }
    }
  }

  const upstream = runCommand(["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], root) ?? "-";
  let ahead = 0;
  let behind = 0;

  if (upstream !== "-") {
    const counts = runCommand(["git", "rev-list", "--left-right", "--count", `HEAD...${upstream}`], root);
    if (counts) {
      const [aheadRaw, behindRaw] = counts.split(/\s+/);
      ahead = Number.parseInt(aheadRaw ?? "0", 10);
      behind = Number.parseInt(behindRaw ?? "0", 10);
    }
  }

  const porcelain = runCommand(["git", "status", "--porcelain"], root) ?? "";
  const parsed = parsePorcelain(porcelain.split(/\r?\n/));

  return {
    inRepo: true,
    root,
    branch,
    defaultBranch,
    upstream,
    ahead,
    behind,
    staged: parsed.staged,
    unstaged: parsed.unstaged,
    untracked: parsed.untracked,
  };
}

export function collectInstructions(root: string): { instructions: Record<string, boolean>; docsCount: number } {
  const instructions: Record<string, boolean> = {
    "AGENTS.md": existsSync(path.join(root, "AGENTS.md")),
    "README.md": existsSync(path.join(root, "README.md")) || existsSync(path.join(root, "README")),
    "CONTRIBUTING.md": existsSync(path.join(root, "CONTRIBUTING.md")),
    "docs/": existsSync(path.join(root, "docs")),
  };

  let docsCount = 0;
  for (const filePath of iterProjectFiles(root, 5000)) {
    if (filePath.toLowerCase().endsWith(".md")) {
      docsCount += 1;
    }
  }

  return { instructions, docsCount };
}

export function collectAgentSurfaces(root: string): Record<string, boolean> {
  return {
    "AGENTS.md": existsSync(path.join(root, "AGENTS.md")),
    "CLAUDE.md": existsSync(path.join(root, "CLAUDE.md")),
    "GEMINI.md": existsSync(path.join(root, "GEMINI.md")),
    "Copilot instructions": existsSync(path.join(root, ".github", "copilot-instructions.md")),
    "Cursor rules": existsSync(path.join(root, ".cursorrules")) || existsSync(path.join(root, ".cursor", "rules")),
    "Windsurf rules": existsSync(path.join(root, ".windsurfrules")),
  };
}

function readJsonFile(filePath: string): Record<string, unknown> {
  const content = safeReadFile(filePath);
  if (!content) {
    return {};
  }

  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function listMakeTargets(filePath: string): string[] {
  const content = safeReadFile(filePath);
  if (!content) {
    return [];
  }

  const targets: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith("#") || line.startsWith("\t") || !line.includes(":")) {
      continue;
    }
    const name = line.split(":", 1)[0]?.trim() ?? "";
    if (!name || /[ $(]/.test(name)) {
      continue;
    }
    targets.push(name);
  }
  return targets.slice(0, 10);
}

export function detectEcosystems(root: string): {
  ecosystems: string[];
  automationCommands: string[];
  ciPresent: boolean;
  testsPresent: boolean;
} {
  const ecosystems: string[] = [];
  const commands: string[] = [];

  const ciPresent =
    existsSync(path.join(root, ".github", "workflows")) ||
    existsSync(path.join(root, ".gitlab-ci.yml")) ||
    existsSync(path.join(root, "circle.yml"));

  let testsPresent = false;

  const packageJsonPath = path.join(root, "package.json");
  if (existsSync(packageJsonPath)) {
    ecosystems.push("node");
    const pkg = readJsonFile(packageJsonPath);
    const scripts = typeof pkg.scripts === "object" && pkg.scripts ? (pkg.scripts as Record<string, string>) : {};

    let runner = "npm";
    if (existsSync(path.join(root, "bun.lock")) || existsSync(path.join(root, "bun.lockb"))) {
      runner = "bun";
    } else if (existsSync(path.join(root, "pnpm-lock.yaml"))) {
      runner = "pnpm";
    } else if (existsSync(path.join(root, "yarn.lock"))) {
      runner = "yarn";
    }

    for (const scriptName of ["test", "lint", "build", "check", "typecheck"]) {
      if (!(scriptName in scripts)) {
        continue;
      }
      testsPresent = testsPresent || scriptName === "test";
      if (runner === "npm") {
        commands.push(scriptName === "test" ? "npm test" : `npm run ${scriptName}`);
      } else if (runner === "bun") {
        commands.push(scriptName === "test" ? "bun test" : `bun run ${scriptName}`);
      } else if (runner === "pnpm") {
        commands.push(scriptName === "test" ? "pnpm test" : `pnpm ${scriptName}`);
      } else {
        commands.push(`yarn ${scriptName}`);
      }
    }
  }

  if (existsSync(path.join(root, "pyproject.toml")) || existsSync(path.join(root, "requirements.txt"))) {
    ecosystems.push("python");
    if (existsSync(path.join(root, "tests")) || existsSync(path.join(root, "test"))) {
      testsPresent = true;
      commands.push(existsSync(path.join(root, "uv.lock")) ? "uv run pytest" : "pytest");
    }
  }

  if (existsSync(path.join(root, "Cargo.toml"))) {
    ecosystems.push("rust");
    testsPresent = true;
    commands.push("cargo test", "cargo fmt --check");
  }

  if (existsSync(path.join(root, "go.mod"))) {
    ecosystems.push("go");
    testsPresent = true;
    commands.push("go test ./...");
  }

  const makeTargets = listMakeTargets(path.join(root, "Makefile"));
  if (makeTargets.length > 0) {
    ecosystems.push("make");
    for (const target of ["test", "lint", "build", "check"]) {
      if (makeTargets.includes(target)) {
        testsPresent = testsPresent || target === "test";
        commands.push(`make ${target}`);
      }
    }
  }

  if (existsSync(path.join(root, "composer.json"))) {
    ecosystems.push("php");
  }
  if (existsSync(path.join(root, "Gemfile"))) {
    ecosystems.push("ruby");
  }
  if (existsSync(path.join(root, ".terraform")) || readdirSafe(root).some((name) => name.endsWith(".tf"))) {
    ecosystems.push("terraform");
  }

  return {
    ecosystems: unique(ecosystems),
    automationCommands: unique(commands).slice(0, 6),
    ciPresent,
    testsPresent,
  };
}

function readdirSafe(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function isProbablyTextFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  if (TEXT_FILE_EXTENSIONS.has(extension) || SECRET_LIKE_SUFFIXES.has(extension)) {
    return true;
  }
  if (base.startsWith(".env")) {
    return true;
  }
  return ["Dockerfile", "Makefile", "README", "LICENSE", ".npmrc", ".netrc", ".pypirc"].includes(base);
}

export function looksLikeTestFile(filePath: string): boolean {
  const parts = filePath.split(path.sep).map((part) => part.toLowerCase());
  const base = path.basename(filePath).toLowerCase();
  if (parts.some((part) => ["tests", "test", "__tests__", "spec"].includes(part))) {
    return true;
  }
  return (
    base.startsWith("test_") ||
    base.endsWith("_test.py") ||
    base.endsWith(".test.js") ||
    base.endsWith(".test.ts") ||
    base.endsWith(".spec.js") ||
    base.endsWith(".spec.ts")
  );
}

export function isSecretLikeFile(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  const extension = path.extname(filePath).toLowerCase();
  if (SECRET_LIKE_NAMES.has(base)) {
    return true;
  }
  if (base.startsWith(".env.") && !base.endsWith(".example") && !base.endsWith(".sample") && !base.endsWith(".template")) {
    return true;
  }
  return SECRET_LIKE_SUFFIXES.has(extension);
}

export function* iterProjectFiles(root: string, limit = 3000): Generator<string> {
  const stack = [root];
  let count = 0;

  while (stack.length > 0 && count < limit) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (count >= limit) {
        break;
      }

      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          stack.push(fullPath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.size > 1_000_000 || !isProbablyTextFile(fullPath)) {
        continue;
      }

      count += 1;
      yield fullPath;
    }
  }
}

export function collectFindings(root: string): {
  findings: Record<string, number>;
  envFiles: string[];
  secretLikeFiles: string[];
  largeFileCount: number;
  testFileCount: number;
} {
  const findings: Record<string, number> = { todo: 0, fixme: 0, hack: 0 };
  const envFiles: string[] = [];
  const secretLikeFiles: string[] = [];
  let largeFileCount = 0;
  let testFileCount = 0;

  for (const filePath of iterProjectFiles(root)) {
    const relative = path.relative(root, filePath).split(path.sep).join("/");
    const base = path.basename(filePath);

    if (base.startsWith(".env")) {
      envFiles.push(relative);
    }
    if (isSecretLikeFile(filePath)) {
      secretLikeFiles.push(relative);
    }
    if (looksLikeTestFile(filePath)) {
      testFileCount += 1;
    }

    const content = safeReadFile(filePath);
    if (!content) {
      continue;
    }

    if (content.length > 0 && content.split(/\r?\n/).length >= LARGE_FILE_LINE_THRESHOLD) {
      largeFileCount += 1;
    }

    findings.todo += [...content.matchAll(FINDING_PATTERNS.todo)].length;
    findings.fixme += [...content.matchAll(FINDING_PATTERNS.fixme)].length;
    findings.hack += [...content.matchAll(FINDING_PATTERNS.hack)].length;
  }

  return {
    findings,
    envFiles: envFiles.slice(0, 8),
    secretLikeFiles: unique(secretLikeFiles).slice(0, 8),
    largeFileCount,
    testFileCount,
  };
}

export function collectToolchain(): ToolInfo[] {
  const commands: Array<[string, string[]]> = [
    ["git", ["git", "--version"]],
    ["bun", ["bun", "--version"]],
    ["node", ["node", "--version"]],
    ["npm", ["npm", "--version"]],
    ["python3", ["python3", "--version"]],
    ["rg", ["rg", "--version"]],
    ["go", ["go", "version"]],
    ["rustc", ["rustc", "--version"]],
    ["cargo", ["cargo", "--version"]],
    ["uv", ["uv", "--version"]],
    ["pytest", ["pytest", "--version"]],
    ["ruff", ["ruff", "--version"]],
  ];

  const results: ToolInfo[] = [];
  for (const [name, cmd] of commands) {
    if (!commandExists(cmd[0])) {
      continue;
    }
    const output = runCommand(cmd);
    if (!output) {
      continue;
    }
    results.push({ name, version: output.split(/\r?\n/)[0] ?? output });
  }

  return results;
}

export function scoreReadiness(input: {
  instructions: Record<string, boolean>;
  agentSurfaces: Record<string, boolean>;
  docsCount: number;
  testsPresent: boolean;
  testFileCount: number;
  automationCommands: string[];
  ciPresent: boolean;
  git: GitStatus;
  secretLikeFiles: string[];
  largeFileCount: number;
}): { score: number; level: "low" | "medium" | "high" } {
  let score = 0;

  if (input.instructions["AGENTS.md"]) score += 20;
  if (input.instructions["README.md"]) score += 10;
  if (input.instructions["CONTRIBUTING.md"]) score += 5;
  if (input.docsCount >= 3) score += 5;

  const agentSurfaceCount = Object.values(input.agentSurfaces).filter(Boolean).length;
  if (agentSurfaceCount >= 1) score += 5;
  if (agentSurfaceCount >= 2) score += 5;

  if (input.testsPresent) score += 15;
  if (input.testFileCount >= 3) score += 5;
  if (input.automationCommands.length > 0) score += 10;
  if (input.ciPresent) score += 10;
  if (input.git.inRepo) {
    score += 5;
    if (input.git.staged + input.git.unstaged + input.git.untracked === 0) {
      score += 10;
    } else {
      score += 4;
    }
  }

  if (!input.testsPresent && !input.ciPresent) score -= 10;
  if (input.secretLikeFiles.length > 0) score -= Math.min(10, input.secretLikeFiles.length * 3);
  if (input.largeFileCount >= 10) score -= 10;
  else if (input.largeFileCount >= 3) score -= 5;

  score = Math.max(0, Math.min(100, score));
  const level = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  return { score, level };
}

export function buildNextActions(input: {
  instructions: Record<string, boolean>;
  agentSurfaces: Record<string, boolean>;
  testsPresent: boolean;
  automationCommands: string[];
  git: GitStatus;
  findings: Record<string, number>;
  ciPresent: boolean;
  secretLikeFiles: string[];
  largeFileCount: number;
}): string[] {
  const actions: string[] = [];
  const agentSurfaceCount = Object.values(input.agentSurfaces).filter(Boolean).length;

  if (!input.instructions["AGENTS.md"]) {
    actions.push("Add AGENTS.md with repo rules, verification expectations, and editing guardrails.");
  } else if (agentSurfaceCount > 1) {
    actions.push("Keep AGENTS.md and tool-specific instruction files aligned to avoid guidance drift.");
  }

  if (!input.testsPresent) {
    actions.push("Define a fast verification path so agents can run a targeted check before and after edits.");
  } else if (input.automationCommands.length > 0) {
    actions.push(`Use the smallest verification command first: ${input.automationCommands[0]}.`);
  }

  const totalChanges = input.git.staged + input.git.unstaged + input.git.untracked;
  if (totalChanges > 12) {
    actions.push("Trim or isolate unrelated worktree changes before delegating more agent tasks.");
  } else if (input.git.inRepo && totalChanges > 0) {
    actions.push("Review existing local changes so the next agent task starts from clear context.");
  }

  if (input.secretLikeFiles.length > 0) {
    actions.push("Review secret-like files before granting broad search or edit access to an agent.");
  }
  if (input.largeFileCount > 0) {
    actions.push("Break up or annotate oversized files; they increase context loss and make agent edits riskier.");
  }
  if ((input.findings.todo ?? 0) + (input.findings.fixme ?? 0) > 0) {
    actions.push("Inspect TODO/FIXME hotspots near the current task to avoid repeating known debt.");
  }
  if (!input.ciPresent) {
    actions.push("Add CI for at least one smoke test to keep autonomous edits honest.");
  }

  if (actions.length === 0) {
    actions.push("Worktree is clean and guidance is present; start with a narrow task and keep the diff focused.");
  }

  return actions.slice(0, 5);
}

export function collectSnapshot(targetPath = "."): Snapshot {
  const target = path.resolve(targetPath);
  const root = findRepoRoot(target);
  const git = collectGitStatus(target);
  const { instructions, docsCount } = collectInstructions(root);
  const agentSurfaces = collectAgentSurfaces(root);
  const { ecosystems, automationCommands, ciPresent, testsPresent } = detectEcosystems(root);
  const { findings, envFiles, secretLikeFiles, largeFileCount, testFileCount } = collectFindings(root);
  const toolchain = collectToolchain();
  const { score, level } = scoreReadiness({
    instructions,
    agentSurfaces,
    docsCount,
    testsPresent,
    testFileCount,
    automationCommands,
    ciPresent,
    git,
    secretLikeFiles,
    largeFileCount,
  });

  const nextActions = buildNextActions({
    instructions,
    agentSurfaces,
    testsPresent,
    automationCommands,
    git,
    findings,
    ciPresent,
    secretLikeFiles,
    largeFileCount,
  });

  return {
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
    path: target,
    repoName: detectRepoName(root),
    git,
    instructions,
    agentSurfaces,
    docsCount,
    ecosystems,
    automationCommands,
    ciPresent,
    testsPresent,
    testFileCount,
    largeFileCount,
    findings,
    envFiles,
    secretLikeFiles,
    toolchain,
    readinessScore: score,
    readinessLevel: level,
    nextActions,
  };
}

function formatBool(value: boolean): string {
  return value ? "yes" : "no";
}

function renderList(values: string[], fallback = "-"): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

function renderFlagSummary(flags: Record<string, boolean>): string {
  return Object.entries(flags)
    .map(([name, flag]) => `${name}=${formatBool(flag)}`)
    .join(", ");
}

function renderPresentFlags(flags: Record<string, boolean>): string {
  return renderList(
    Object.entries(flags)
      .filter(([, flag]) => flag)
      .map(([name]) => name),
  );
}

export function renderGitSummary(git: GitStatus): string {
  if (!git.inRepo) {
    return "not a git repository";
  }

  let branch = git.branch;
  if (git.defaultBranch !== "-" && git.branch !== git.defaultBranch) {
    branch = `${branch} (base: ${git.defaultBranch})`;
  }
  if (git.upstream !== "-") {
    branch = `${branch}; sync +${git.ahead}/-${git.behind}`;
  }
  return branch;
}

export function renderWorktreeSummary(git: GitStatus): string {
  if (!git.inRepo) {
    return "-";
  }
  const total = git.staged + git.unstaged + git.untracked;
  return total === 0 ? "clean" : `${git.staged} staged, ${git.unstaged} unstaged, ${git.untracked} untracked`;
}

function wrapValue(value: string, width: number): string[] {
  if (!value) {
    return [""];
  }

  const lines: string[] = [];
  for (const paragraph of value.split(/\r?\n/)) {
    let remaining = paragraph;
    while (remaining.length > width) {
      let cut = remaining.lastIndexOf(" ", width);
      if (cut <= 0) {
        cut = width;
      }
      lines.push(remaining.slice(0, cut).trimEnd());
      remaining = remaining.slice(cut).trimStart();
    }
    lines.push(remaining);
  }
  return lines.length > 0 ? lines : [""];
}

function readinessValue(snapshot: Snapshot): string {
  return `${snapshot.readinessLevel.toUpperCase()} (${snapshot.readinessScore}/100)`;
}

function roleForReadiness(level: Snapshot["readinessLevel"]): keyof Theme {
  if (level === "high") return "good";
  if (level === "medium") return "warn";
  return "bad";
}

export function renderReport(snapshot: Snapshot, themeName: ThemeName = "auto", stream: NodeJS.WriteStream = process.stdout): string {
  const theme = resolveTheme(themeName, stream);
  const labelWidth = 18;
  const valueWidth = 64;
  const totalWidth = labelWidth + valueWidth + 7;

  const border = (left: string, mid: string, right: string, fill = "─") =>
    styleText(left + fill.repeat(labelWidth + 2) + mid + fill.repeat(valueWidth + 2) + right, "border", theme);

  const row = (label: string, value: string, role: keyof Theme | "normal" = "normal") => {
    const wrapped = wrapValue(value, valueWidth);
    return wrapped.map((line, index) => {
      const currentLabel = index === 0 ? label : "";
      return styleText(`│ ${currentLabel.padEnd(labelWidth)} │ ${line.padEnd(valueWidth)} │`, role, theme);
    });
  };

  const worktree = renderWorktreeSummary(snapshot.git);
  const agentFiles = renderPresentFlags(snapshot.agentSurfaces);

  const sections: Array<{ name: string; rows: Array<{ label: string; value: string; role?: keyof Theme | "normal" }> }> = [
    {
      name: "CONTEXT",
      rows: [
        { label: "generated", value: snapshot.generatedAt, role: "muted" },
        { label: "path", value: snapshot.path },
        { label: "repo root", value: snapshot.git.root },
        { label: "branch", value: renderGitSummary(snapshot.git), role: "accent" },
        { label: "worktree", value: worktree, role: worktree === "clean" ? "good" : "warn" },
      ],
    },
    {
      name: "READINESS",
      rows: [
        { label: "score", value: readinessValue(snapshot), role: roleForReadiness(snapshot.readinessLevel) },
        { label: "agent files", value: agentFiles, role: agentFiles === "-" ? "warn" : "accent" },
        { label: "test files", value: String(snapshot.testFileCount), role: snapshot.testFileCount > 0 ? "good" : "warn" },
        { label: "automation", value: renderList(snapshot.automationCommands), role: snapshot.automationCommands.length > 0 ? "accent" : "warn" },
        { label: "tests present", value: formatBool(snapshot.testsPresent), role: snapshot.testsPresent ? "good" : "warn" },
        { label: "ci present", value: formatBool(snapshot.ciPresent), role: snapshot.ciPresent ? "good" : "warn" },
      ],
    },
    {
      name: "GUIDANCE",
      rows: [
        { label: "instructions", value: renderFlagSummary(snapshot.instructions) },
        { label: "markdown docs", value: String(snapshot.docsCount), role: snapshot.docsCount >= 3 ? "good" : "muted" },
        { label: "ecosystems", value: renderList(snapshot.ecosystems), role: snapshot.ecosystems.length > 0 ? "accent" : "warn" },
      ],
    },
    {
      name: "RISK RADAR",
      rows: [
        {
          label: "todo/fixme/hack",
          value: `${snapshot.findings.todo} / ${snapshot.findings.fixme} / ${snapshot.findings.hack}`,
          role: snapshot.findings.todo + snapshot.findings.fixme + snapshot.findings.hack > 0 ? "warn" : "good",
        },
        { label: "env files", value: renderList(snapshot.envFiles), role: snapshot.envFiles.length > 0 ? "bad" : "good" },
        { label: "secret-like", value: renderList(snapshot.secretLikeFiles), role: snapshot.secretLikeFiles.length > 0 ? "bad" : "good" },
        { label: "large files", value: String(snapshot.largeFileCount), role: snapshot.largeFileCount > 0 ? "warn" : "good" },
      ],
    },
    {
      name: "TOOLCHAIN",
      rows:
        snapshot.toolchain.length > 0
          ? snapshot.toolchain.map((tool) => ({ label: tool.name, value: tool.version, role: "muted" as const }))
          : [{ label: "tools", value: "No supported tools detected", role: "warn" as const }],
    },
    {
      name: "NEXT ACTIONS",
      rows: snapshot.nextActions.map((action, index) => ({ label: String(index + 1), value: action, role: "accent" as const })),
    },
  ];

  const lines: string[] = [
    styleText(`╭${"─".repeat(totalWidth - 2)}╮`, "border", theme),
    styleText(`│ ${TITLE.padStart((totalWidth - 4 + TITLE.length) / 2).padEnd(totalWidth - 4)} │`, "title", theme),
    styleText(`│ ${snapshot.repoName.padStart((totalWidth - 4 + snapshot.repoName.length) / 2).padEnd(totalWidth - 4)} │`, "title", theme),
    border("├", "┬", "┤"),
  ];

  sections.forEach((section, sectionIndex) => {
    if (sectionIndex > 0) {
      lines.push(border("├", "┼", "┤"));
    }
    lines.push(...row(section.name, "", "section"));
    lines.push(border("├", "┼", "┤"));
    section.rows.forEach((item, rowIndex) => {
      lines.push(...row(item.label, item.value, item.role));
      if (rowIndex !== section.rows.length - 1) {
        lines.push(border("├", "┼", "┤", "·"));
      }
    });
  });

  lines.push(border("╰", "┴", "╯"));
  return lines.join("\n");
}

export function renderCompactReport(snapshot: Snapshot, themeName: ThemeName = "auto", stream: NodeJS.WriteStream = process.stdout): string {
  const theme = resolveTheme(themeName, stream);
  const riskCount = snapshot.findings.todo + snapshot.findings.fixme + snapshot.findings.hack + snapshot.secretLikeFiles.length + snapshot.largeFileCount;
  return [
    styleText(`AWR | ${snapshot.repoName} | readiness ${snapshot.readinessLevel.toUpperCase()} ${snapshot.readinessScore}/100`, roleForReadiness(snapshot.readinessLevel), theme),
    styleText(`branch: ${renderGitSummary(snapshot.git)} | worktree: ${renderWorktreeSummary(snapshot.git)}`, "accent", theme),
    styleText(
      `guidance: AGENTS=${formatBool(snapshot.instructions["AGENTS.md"])} | tests=${formatBool(snapshot.testsPresent)} | ci=${formatBool(snapshot.ciPresent)} | automation=${renderList(snapshot.automationCommands)}`,
      "muted",
      theme,
    ),
    styleText(
      `risk: todo=${snapshot.findings.todo} fixme=${snapshot.findings.fixme} hack=${snapshot.findings.hack} | env=${snapshot.envFiles.length} | secret-like=${snapshot.secretLikeFiles.length} | large-files=${snapshot.largeFileCount}`,
      riskCount > 0 ? "warn" : "good",
      theme,
    ),
    styleText(`next: ${snapshot.nextActions[0] ?? "-"}`, "accent", theme),
  ].join("\n");
}

function renderScoreBar(score: number, width = 24): string {
  const filled = Math.max(0, Math.min(width, Math.round((score / 100) * width)));
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

function fitTuiValue(value: string, width = 62): string {
  if (value.length <= width) {
    return value.padEnd(width);
  }
  return `${value.slice(0, width - 3)}...`;
}

export function renderTuiReport(snapshot: Snapshot, themeName: ThemeName = "auto", stream: NodeJS.WriteStream = process.stdout): string {
  const theme = resolveTheme(themeName, stream);
  const branch = renderGitSummary(snapshot.git);
  const worktree = renderWorktreeSummary(snapshot.git);
  const agentFiles = renderPresentFlags(snapshot.agentSurfaces);
  const guidance = `AGENTS=${formatBool(snapshot.instructions["AGENTS.md"])} docs=${snapshot.docsCount} tests=${formatBool(snapshot.testsPresent)} ci=${formatBool(snapshot.ciPresent)}`;
  const risk = `todo=${snapshot.findings.todo} fixme=${snapshot.findings.fixme} hack=${snapshot.findings.hack} env=${snapshot.envFiles.length} secret=${snapshot.secretLikeFiles.length} large=${snapshot.largeFileCount}`;
  const lines = [
    styleText(`┏━ ${TITLE} :: ${snapshot.repoName} ━${"━".repeat(24)}┓`, "border", theme),
    styleText(`┃ readiness ${snapshot.readinessLevel.toUpperCase().padEnd(6)} ${String(snapshot.readinessScore).padStart(3)}/100 ${renderScoreBar(snapshot.readinessScore)} ┃`, roleForReadiness(snapshot.readinessLevel), theme),
    styleText(`┃ branch    ${fitTuiValue(branch)} ┃`, "accent", theme),
    styleText(`┃ worktree  ${fitTuiValue(worktree)} ┃`, snapshot.git.inRepo && worktree === "clean" ? "good" : "warn", theme),
    styleText(`┃ guidance  ${fitTuiValue(guidance)} ┃`, "muted", theme),
    styleText(`┃ agents    ${fitTuiValue(agentFiles)} ┃`, agentFiles === "-" ? "warn" : "accent", theme),
    styleText(`┃ automate  ${fitTuiValue(renderList(snapshot.automationCommands))} ┃`, snapshot.automationCommands.length > 0 ? "accent" : "warn", theme),
    styleText(`┃ risk      ${fitTuiValue(risk)} ┃`, (snapshot.findings.todo + snapshot.findings.fixme + snapshot.findings.hack + snapshot.secretLikeFiles.length + snapshot.largeFileCount) > 0 ? "warn" : "good", theme),
    ...snapshot.nextActions.slice(0, 3).map((action, index) => styleText(`┃ next ${index + 1}   ${fitTuiValue(action)} ┃`, "accent", theme)),
    styleText(`┗${"━".repeat(83)}┛`, "border", theme),
  ];

  return lines.join("\n");
}

export function snapshotToJson(snapshot: Snapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseArgs(argv: string[]): CliOptions | { version: true } {
  const options: CliOptions = {
    path: ".",
    json: false,
    compact: false,
    tui: false,
    theme: "auto",
  };

  const rest = [...argv];
  while (rest.length > 0) {
    const current = rest.shift();
    if (!current) continue;

    if (current === "--json") {
      options.json = true;
      continue;
    }
    if (current === "--compact") {
      options.compact = true;
      continue;
    }
    if (current === "--tui") {
      options.tui = true;
      continue;
    }
    if (current === "--theme") {
      const next = rest.shift();
      if (!next || !["auto", "plain", "random-access", "amber", "ocean", "matrix"].includes(next)) {
        throw new Error("--theme must be one of: auto, plain, random-access, amber, ocean, matrix");
      }
      options.theme = next as ThemeName;
      continue;
    }
    if (current === "--version") {
      return { version: true };
    }
    if (current === "--help") {
      throw new Error("HELP");
    }
    if (current.startsWith("-")) {
      throw new Error(`Unknown option: ${current}`);
    }
    options.path = current;
  }

  return options;
}

export function helpText(): string {
  return [
    "agent-work-report",
    "",
    "Usage:",
    "  agent-work-report [path] [--json] [--compact] [--tui] [--theme <name>] [--version]",
    "",
    "Themes:",
    "  auto, plain, random-access, amber, ocean, matrix",
  ].join("\n");
}
