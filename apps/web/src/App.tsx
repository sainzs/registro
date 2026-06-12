import { For, Show, createMemo, createSignal } from "solid-js";
import { sampleSnapshot } from "./sampleSnapshot";
import type { Snapshot } from "./types";

const prettyJson = JSON.stringify(sampleSnapshot, null, 2);

function safeParseSnapshot(input: string): Snapshot {
  return JSON.parse(input) as Snapshot;
}

function levelColor(level: Snapshot["readinessLevel"]): string {
  return level === "high" ? "#62d18b" : level === "medium" ? "#f6c65b" : "#ff7a7a";
}

export default function App() {
  const [raw, setRaw] = createSignal(prettyJson);
  const [snapshot, setSnapshot] = createSignal<Snapshot>(sampleSnapshot);
  const [error, setError] = createSignal("");

  const riskTotal = createMemo(
    () => snapshot().findings.todo + snapshot().findings.fixme + snapshot().findings.hack + snapshot().secretLikeFiles.length + snapshot().largeFileCount,
  );

  const applyJson = (value: string) => {
    try {
      const parsed = safeParseSnapshot(value);
      setRaw(value);
      setSnapshot(parsed);
      setError("");
    } catch {
      setError("Invalid JSON snapshot. Generate one from the CLI with --json.");
    }
  };

  const loadFile = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then(applyJson).catch(() => setError("Could not read file."));
  };

  return (
    <main class="main">
      <section class="hero">
        <h1>Agent Work Report Dashboard</h1>
        <p>Paste or upload CLI JSON output to inspect repo readiness in a browser.</p>
      </section>

      <section class="grid">
        <div class="stack">
          <div class="card">
            <h2>Snapshot Input</h2>
            <textarea value={raw()} onInput={(event) => setRaw(event.currentTarget.value)} />
            <div class="actions">
              <button onClick={() => applyJson(raw())}>Parse JSON</button>
              <button onClick={() => applyJson(prettyJson)}>Load example</button>
              <label class="file">
                Upload JSON
                <input type="file" accept="application/json" onChange={loadFile} />
              </label>
            </div>
            <Show when={error()}>
              <div class="error">{error()}</div>
            </Show>
          </div>

          <div class="card section">
            <h2>Automation</h2>
            <div class="list">
              <For each={snapshot().automationCommands.length ? snapshot().automationCommands : ["No commands detected"]}>
                {(command) => <div class="code">{command}</div>}
              </For>
            </div>
          </div>

          <div class="card section">
            <h2>Next Actions</h2>
            <ol>
              <For each={snapshot().nextActions}>{(action) => <li>{action}</li>}</For>
            </ol>
          </div>
        </div>

        <div class="stack">
          <div class="card section">
            <h2>{snapshot().repoName}</h2>
            <div class="muted">{snapshot().path}</div>
            <div class="bar"><span style={{ width: `${snapshot().readinessScore}%`, background: levelColor(snapshot().readinessLevel) }} /></div>
            <div class="pill-row">
              <span>Readiness</span>
              <strong style={{ color: levelColor(snapshot().readinessLevel) }}>
                {snapshot().readinessLevel.toUpperCase()} {snapshot().readinessScore}/100
              </strong>
            </div>
          </div>

          <div class="kpis">
            <div class="kpi"><small>Branch</small><div>{snapshot().git.branch}</div></div>
            <div class="kpi"><small>Test files</small><div>{snapshot().testFileCount}</div></div>
            <div class="kpi"><small>Risk signals</small><div>{riskTotal()}</div></div>
          </div>

          <div class="card section">
            <h2>Guidance</h2>
            <div class="kv">
              <div><span>Instructions</span><strong>{Object.values(snapshot().instructions).filter(Boolean).length}</strong></div>
              <div><span>Agent surfaces</span><strong>{Object.values(snapshot().agentSurfaces).filter(Boolean).length}</strong></div>
              <div><span>Docs count</span><strong>{snapshot().docsCount}</strong></div>
              <div><span>CI</span><strong>{snapshot().ciPresent ? "yes" : "no"}</strong></div>
            </div>
            <div class="pills">
              <For each={snapshot().ecosystems}>{(item) => <span class="pill">{item}</span>}</For>
            </div>
          </div>

          <div class="card section">
            <h2>Risk Radar</h2>
            <div class="kv">
              <div><span>TODO</span><strong>{snapshot().findings.todo}</strong></div>
              <div><span>FIXME</span><strong>{snapshot().findings.fixme}</strong></div>
              <div><span>HACK</span><strong>{snapshot().findings.hack}</strong></div>
              <div><span>Env files</span><strong>{snapshot().envFiles.length}</strong></div>
              <div><span>Secret-like files</span><strong>{snapshot().secretLikeFiles.length}</strong></div>
              <div><span>Large files</span><strong>{snapshot().largeFileCount}</strong></div>
            </div>
          </div>

          <div class="card section">
            <h2>Toolchain</h2>
            <div class="list">
              <For each={snapshot().toolchain}>{(tool) => <div class="code">{tool.name}: {tool.version}</div>}</For>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
