export interface GitStatus {
  inRepo: boolean;
  root: string;
  branch: string;
  defaultBranch: string;
  upstream: string;
  ahead: number;
  behind: number;
  staged: number;
  unstaged: number;
  untracked: number;
}

export interface ToolInfo {
  name: string;
  version: string;
}

export interface Snapshot {
  generatedAt: string;
  path: string;
  repoName: string;
  git: GitStatus;
  instructions: Record<string, boolean>;
  agentSurfaces: Record<string, boolean>;
  docsCount: number;
  ecosystems: string[];
  automationCommands: string[];
  ciPresent: boolean;
  testsPresent: boolean;
  testFileCount: number;
  largeFileCount: number;
  findings: Record<string, number>;
  envFiles: string[];
  secretLikeFiles: string[];
  toolchain: ToolInfo[];
  readinessScore: number;
  readinessLevel: "low" | "medium" | "high";
  nextActions: string[];
}
