#!/usr/bin/env node

import path from "node:path";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  VERSION,
  collectSnapshot,
  helpText,
  parseArgs,
  renderCompactReport,
  renderReport,
  renderTuiReport,
  snapshotToJson,
} from "./lib.js";

export function main(argv = process.argv.slice(2)): number {
  try {
    const parsed = parseArgs(argv);

    if ("version" in parsed) {
      console.log(`agent-work-report ${VERSION}`);
      return 0;
    }

    const snapshot = collectSnapshot(path.resolve(parsed.path));

    if (parsed.json) {
      console.log(snapshotToJson(snapshot));
      return 0;
    }

    if (parsed.compact) {
      console.log(renderCompactReport(snapshot, parsed.theme, process.stdout));
      return 0;
    }

    if (parsed.tui) {
      console.log(renderTuiReport(snapshot, parsed.theme, process.stdout));
      return 0;
    }

    console.log(renderReport(snapshot, parsed.theme, process.stdout));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "HELP") {
      console.log(helpText());
      return 0;
    }
    console.error(message);
    console.error();
    console.error(helpText());
    return 1;
  }
}

const entryPath = (() => {
  try {
    return process.argv[1] ? realpathSync(process.argv[1]) : "";
  } catch {
    return process.argv[1] ?? "";
  }
})();

if (fileURLToPath(import.meta.url) === entryPath) {
  process.exit(main());
}
