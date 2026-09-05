import {
  parsePhysScript,
  physScriptToCommandPlan,
  serializePhysScript,
} from "@physica/commands";
import { useMemo, useState } from "react";
import { EQUATION_PHYSSCRIPT, PROJECTILE_PHYSSCRIPT } from "./editor-model";

export function PhysScriptPanel() {
  const [source, setSource] = useState(PROJECTILE_PHYSSCRIPT);
  const result = useMemo(() => parsePhysScript(source), [source]);
  const plan =
    result.program && result.issues.length === 0
      ? physScriptToCommandPlan(result.program)
      : undefined;
  return (
    <section className="physcript-panel" aria-label="PhysScript editor">
      <div className="script-toolbar">
        <div>
          <b>PhysScript V1</b>
          <span>Declarative authoring — no arbitrary code execution.</span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setSource(PROJECTILE_PHYSSCRIPT)}
          >
            Projectile example
          </button>
          <button type="button" onClick={() => setSource(EQUATION_PHYSSCRIPT)}>
            Equation example
          </button>
          <button
            type="button"
            disabled={!result.program || result.issues.length > 0}
            onClick={() =>
              result.program && setSource(serializePhysScript(result.program))
            }
          >
            Format
          </button>
        </div>
      </div>
      <div className="script-grid">
        <textarea
          spellCheck={false}
          aria-label="PhysScript source"
          value={source}
          onChange={(event) => setSource(event.currentTarget.value)}
        />
        <div className="script-diagnostics" aria-live="polite">
          {result.issues.length > 0 ? (
            result.issues.map((entry, index) => (
              <div key={entry.code + entry.line + index}>
                <b>
                  L{entry.line}:{entry.column} · {entry.code}
                </b>
                <span>{entry.message}</span>
              </div>
            ))
          ) : (
            <div className="script-valid">
              <b>Valid PhysScript</b>
              <span>
                {plan?.intents.length ?? 0} reversible visual command intents
              </span>
              <span>Canonical round trip ready</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
