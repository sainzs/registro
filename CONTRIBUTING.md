# Contributing

Thanks for helping improve Registro (Agent Work Report).

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local workflow

```bash
npm install

# typecheck both workspaces
npm run typecheck

# run CLI unit tests
npm test
```

## Layout

- `packages/cli`: `@awr/cli` - work report snapshots as JSON.
- `apps/web`: `@awr/web` - dashboard that visualizes CLI output.

## Guidelines

- Keep each change scoped to one behavior.
- Run `npm run typecheck` and `npm test` before opening a pull request.
- Do not commit runtime state, credentials, or generated reports.
