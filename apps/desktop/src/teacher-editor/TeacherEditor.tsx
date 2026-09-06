import "./teacher-editor.css";
import "./lesson-authoring.css";
import { parseProjectJson } from "@physica/serialization";
import { useRef, useState } from "react";
import {
  createEditorSession,
  createEditorSessionFromDocument,
  type EditorSession,
} from "./editor-model";
import { AuthoringWorkspace } from "./AuthoringWorkspace";
import { ProjectHome } from "./ProjectHome";

export function TeacherEditor() {
  const [session, setSession] = useState<EditorSession>();
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function openProject(file: File | undefined) {
    if (!file) return;
    const parsed = parseProjectJson(await file.text());
    if (!parsed.ok) {
      setNotice(parsed.error.message);
      return;
    }
    if (parsed.value.validation.hasErrors) {
      setNotice("The project contains structural errors and was not opened.");
      return;
    }
    setSession(createEditorSessionFromDocument(parsed.value.document));
    setNotice("");
  }

  return (
    <>
      <input
        ref={fileInput}
        className="visually-hidden-file"
        type="file"
        accept=".json,.physica.json,application/json"
        onChange={(event) => {
          void openProject(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {!session ? (
        <ProjectHome
          notice={notice}
          onCreate={(template) => setSession(createEditorSession(template))}
          onOpen={() => fileInput.current?.click()}
        />
      ) : (
        <AuthoringWorkspace
          session={session}
          onHome={() => setSession(undefined)}
          onOpen={() => fileInput.current?.click()}
        />
      )}
    </>
  );
}
