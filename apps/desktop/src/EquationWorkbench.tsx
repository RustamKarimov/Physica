import { useMemo, useRef, useState } from "react";
import { CryptoIdFactory } from "@physica/core-model";
import {
  collectSemanticEquationIds,
  countSemanticEquationNodes,
  createEquationModel,
  CryptoSemanticEquationIdFactory,
  editEquationModel,
  renderEquationToMarkup,
  type EquationError,
} from "@physica/equations";
import { MathLiveEditor } from "./MathLiveEditor";
import "./equation-workbench.css";

const semanticIds = new CryptoSemanticEquationIdFactory();
const initialEquation = createEquationModel({
  id: new CryptoIdFactory().equationId(),
  name: "Constant-acceleration displacement",
  latex: String.raw`x=x_0+ut+\frac{1}{2}at^2`,
  idFactory: semanticIds,
  metadata: { example: "edit-and-render" },
});

if (!initialEquation.ok) {
  throw new Error(initialEquation.error.kind);
}
const initialModel = initialEquation.value;

function shortId(value: string): string {
  return value.slice(-8);
}

function errorMessage(error: EquationError): string {
  return "message" in error ? error.message : error.kind;
}

export function EquationWorkbench() {
  const idFactory = useRef(semanticIds);
  const [model, setModel] = useState(initialModel);
  const [draft, setDraft] = useState(initialModel.source.value);
  const [error, setError] = useState<string>();
  const [retainedCount, setRetainedCount] = useState(
    countSemanticEquationNodes(initialModel.semanticRoot),
  );
  const rendered = useMemo(() => renderEquationToMarkup(model), [model]);
  const nodeIds = collectSemanticEquationIds(model.semanticRoot);

  const updateEquation = (latex: string) => {
    setDraft(latex);
    const edited = editEquationModel({
      previous: model,
      latex,
      idFactory: idFactory.current,
    });
    if (!edited.ok) {
      setError(errorMessage(edited.error));
      return;
    }
    const priorIds = new Set(nodeIds);
    setRetainedCount(
      collectSemanticEquationIds(edited.value.semanticRoot).filter((id) =>
        priorIds.has(id),
      ).length,
    );
    setModel(edited.value);
    setError(undefined);
  };

  return (
    <section
      className="eq-lab"
      id="equation-workbench"
      aria-labelledby="equation-app-title"
    >
      <div className="eq-eyebrow">
        <span>EDITABLE MEANING · STABLE IDENTITY · FINAL TYPESETTING</span>
        <b>LIVE</b>
      </div>
      <div className="eq-hero">
        <div>
          <h1 id="equation-app-title">
            Edit the notation.
            <br />
            <em>Keep hold of the meaning.</em>
          </h1>
          <p>
            MathLive captures intent, Physica owns each semantic identity, and
            KaTeX produces the final visual. Change a term below: every
            unchanged subtree keeps its identity.
          </p>
        </div>
        <dl className="eq-meta">
          <div>
            <dt>NODES</dt>
            <dd>{nodeIds.length}</dd>
          </div>
          <div>
            <dt>RETAINED</dt>
            <dd>{retainedCount}</dd>
          </div>
          <div>
            <dt>STATUS</dt>
            <dd>{error ? "DRAFT" : "VALID"}</dd>
          </div>
        </dl>
      </div>

      <div className="eq-workbench">
        <section
          className="eq-editor"
          aria-labelledby="equation-editor-heading"
        >
          <div className="eq-panel-heading">
            <span>01</span>
            <div>
              <h2 id="equation-editor-heading">MathLive input</h2>
              <p>Keyboard, palette or LaTeX—edit the same source.</p>
            </div>
          </div>
          <label className="eq-field-label" id="equation-label">
            Constant-acceleration displacement
          </label>
          <p className="eq-field-help" id="equation-help">
            Try changing the coefficient, adding a term, or rearranging the
            equation.
          </p>
          <MathLiveEditor
            value={draft}
            labelledBy="equation-label"
            describedBy="equation-help equation-status"
            onInput={updateEquation}
          />
          <div
            id="equation-status"
            className={"eq-status " + (error ? "is-invalid" : "is-valid")}
            role="status"
          >
            <span>
              {error ? "LAST VALID MODEL PRESERVED" : "SEMANTIC PARSE VALID"}
            </span>
            <strong>
              {error ??
                retainedCount +
                  " of " +
                  nodeIds.length +
                  " semantic identities retained"}
            </strong>
          </div>

          <div
            className="eq-final-render"
            aria-labelledby="equation-render-heading"
          >
            <div className="eq-mini-heading">
              <span id="equation-render-heading">KATEX FINAL RENDER</span>
              <b>TRUST OFF</b>
            </div>
            {rendered.ok ? (
              <div
                className="eq-katex-output"
                role="img"
                aria-label={"Rendered equation: " + model.source.value}
                dangerouslySetInnerHTML={{ __html: rendered.value.markup }}
              />
            ) : (
              <p className="eq-render-error">{errorMessage(rendered.error)}</p>
            )}
          </div>
        </section>

        <section
          className="eq-semantics"
          aria-labelledby="equation-semantic-heading"
        >
          <div className="eq-panel-heading">
            <span>02</span>
            <div>
              <h2 id="equation-semantic-heading">Canonical MathJSON</h2>
              <p>Meaning is persisted independently from visual glyphs.</p>
            </div>
          </div>
          <pre className="eq-canonical-json">
            {JSON.stringify(model.canonicalMathJson, null, 2)}
          </pre>
          <div
            className="eq-identity-strip"
            aria-label="Semantic node identities"
          >
            {nodeIds.slice(0, 12).map((id, index) => (
              <span key={id} title={id}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                {shortId(id)}
              </span>
            ))}
            {nodeIds.length > 12 && <span>+{nodeIds.length - 12} more</span>}
          </div>
        </section>

        <aside className="eq-contract" aria-label="Equation architecture">
          <div className="eq-panel-heading">
            <span>03</span>
            <div>
              <h2>Identity contract</h2>
              <p>Three layers, one direction of authority.</p>
            </div>
          </div>
          <ol className="eq-layer-stack">
            <li>
              <b>MATHLIVE</b>
              <span>editable LaTeX input</span>
            </li>
            <li>
              <b>PHYSICA</b>
              <span>canonical tree + UUID identities</span>
            </li>
            <li>
              <b>KATEX</b>
              <span>stable final glyphs + MathML</span>
            </li>
          </ol>
          <div className="eq-authority-note">
            <span>AUTHORITY</span>
            <p>
              Glyphs never own meaning. Re-rendering cannot replace semantic
              IDs, and an invalid edit cannot overwrite the last valid model.
            </p>
          </div>
          <dl className="eq-details">
            <div>
              <dt>MODEL</dt>
              <dd>physica:equation/model-v1</dd>
            </div>
            <div>
              <dt>CANONICALIZER</dt>
              <dd>Compute Engine 0.120.0</dd>
            </div>
            <div>
              <dt>EQUATION ID</dt>
              <dd>{shortId(model.id)}</dd>
            </div>
          </dl>
        </aside>
      </div>
      <a className="eq-previous-proof" href="#rendering-lab">
        Previous proof retained: Camera animation and object library ↓
      </a>
    </section>
  );
}
