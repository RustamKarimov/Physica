import { useState } from "react";
import { PROJECT_TEMPLATES, type ProjectTemplate } from "./editor-model";

export function ProjectHome({
  notice,
  onCreate,
  onOpen,
}: {
  readonly notice: string;
  readonly onCreate: (template: ProjectTemplate) => void;
  readonly onOpen: () => void;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("motion");
  const starters = PROJECT_TEMPLATES.slice(0, 3);
  const selected =
    PROJECT_TEMPLATES.find((template) => template.id === selectedTemplateId) ??
    PROJECT_TEMPLATES[0]!;
  return (
    <main className="project-home teacher-first-home">
      <section className="home-intro">
        <span className="eyebrow">Teacher workspace</span>
        <h1>Build the explanation, then present it.</h1>
        <p>
          Create a lesson from scenes. Arrange apparatus and representations,
          edit the physical starting values, add your teaching notes, and
          preview the same saved project as a presentation.
        </p>
        <div className="home-primary-actions">
          <button
            type="button"
            className="home-primary"
            onClick={() => onCreate(PROJECT_TEMPLATES[0]!)}
          >
            Create blank lesson
          </button>
          <button type="button" onClick={onOpen}>
            Open saved project
          </button>
        </div>
        {notice && (
          <p className="home-error" role="alert">
            {notice}
          </p>
        )}
      </section>
      <section className="teacher-journey" aria-label="Teacher workflow">
        <span>
          <b>1</b>Create scenes
        </span>
        <i>→</i>
        <span>
          <b>2</b>Add physics and explanations
        </span>
        <i>→</i>
        <span>
          <b>3</b>Preview the lesson
        </span>
      </section>
      <section className="starter-heading">
        <div>
          <span className="eyebrow">Starter lessons</span>
          <h2>Begin with structure, not a finished demo.</h2>
        </div>
        <label>
          <span>All available starters</span>
          <select
            value={selectedTemplateId}
            onChange={(event) =>
              setSelectedTemplateId(event.currentTarget.value)
            }
          >
            {PROJECT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onCreate(selected)}>
            Open selected starter
          </button>
        </label>
      </section>
      <section className="template-grid compact" aria-label="Featured starters">
        {starters.map((template, index) => (
          <button
            type="button"
            className="template-card"
            key={template.id}
            onClick={() => onCreate(template)}
          >
            <span className="template-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={"template-art " + template.id}>
              <i />
              <i />
              <i />
            </div>
            <b>{template.title}</b>
            <p>{template.description}</p>
            <small>{template.question}</small>
            <em>Create lesson →</em>
          </button>
        ))}
      </section>
      <div className="home-contract">
        <b>Early acceptance checkpoint</b>
        <span>
          This workflow is intentionally exposed before the remaining curriculum
          is built so teacher-facing problems can be corrected early.
        </span>
        <small>
          JSON project snapshots are a development bridge. Atomic ZIP-based
          .physica packaging and final exports remain later release work.
        </small>
      </div>
    </main>
  );
}
