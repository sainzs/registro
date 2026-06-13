# Registro (Agent Work Report Dashboard)

Reporting/dashboard package for agentic engineering tooling.

## Package Role
- `registro` is the reporting surface (CLI snapshots + dashboard visualization).

## Stack
- **Runtime: Node.js 20+** — declared in `packages/cli` `engines`; `build`, `test`, and `start` all run on Node. Bun is an optional accelerator for `dev` and faster tests, not a requirement.
- `packages/cli` (`@awr/cli`): TypeScript CLI — repo snapshots, `--tui`, `--json`.
- `apps/web` (`@awr/web`): Vite + SolidJS dashboard for pasted/uploaded `--json` output.

## Quickstart
```bash
npm install
npm run build
npm test
```

Run the CLI:
```bash
node packages/cli/dist/src/cli.js --compact   # one-line repo summary
node packages/cli/dist/src/cli.js --tui       # interactive TUI
node packages/cli/dist/src/cli.js --json      # JSON snapshot for the web dashboard
```

Optional Bun path (faster dev/tests):
```bash
bun install
bun packages/cli/src/cli.ts --tui
cd packages/cli && bun test
```

CLI:
```bash
node packages/cli/dist/src/cli.js --compact
node packages/cli/dist/src/cli.js --tui
node packages/cli/dist/src/cli.js --json
```

Web dashboard:
```bash
npm run dev:web
```
Then paste JSON from:
```bash
node packages/cli/dist/src/cli.js --json
```

## Bun-friendly commands
```bash
npm run bun:install
npm run bun:dev:cli
npm run bun:dev:web
npm run bun:test:cli
```

## Workspaces
- `packages/cli`
- `apps/web`

## Shell integration
Source:
```bash
source /path/to/repo/packages/registro/packages/cli/shell/agent-work-report.sh
```

## Notes
- Browser app consumes JSON snapshots; it does not execute local shell commands.
- CLI remains the source of truth for repo analysis.

## Portfolio

Registro is the reporting surface of the Random Access agent-workbench ecosystem:

- [reckoner](https://github.com/sainzs/reckoner) — agent memory, verification, and guardrails package
- [santiagosainz-skills](https://github.com/sainzs/santiagosainz-skills) — portable maintainer workflows
- [random-access-themes](https://github.com/sainzs/random-access-themes) — the design system the dashboard and CLI themes are built from
