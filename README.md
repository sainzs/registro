# Registro (Agent Work Report Dashboard)

Reporting/dashboard package for agentic engineering tooling.

## Package Role
- `registro` is the reporting surface (CLI snapshots + dashboard visualization).

## Stack
- `packages/cli`: TypeScript CLI, Bun-friendly, Node-compatible
- `apps/web`: Vite + SolidJS dashboard for pasted/uploaded `--json` output
- TUI mode included in the CLI via `--tui`

## Quickstart
```bash
npm install
npm run build
npm test
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
