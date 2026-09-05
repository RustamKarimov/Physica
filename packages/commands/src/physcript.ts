import { REGISTERED_TYPE_ID_PATTERN } from "@physica/core-model";
import type {
  PhysScriptCommandIntent,
  PhysScriptCommandPlan,
  PhysScriptIssue,
  PhysScriptParseResult,
  PhysScriptProgram,
  PhysScriptScalar,
  PhysScriptStatement,
} from "./physcript-types";

const IDENTIFIER = "[A-Za-z_][A-Za-z0-9_-]*";
const MEMBER = `(${IDENTIFIER})\\.([A-Za-z_][A-Za-z0-9_-]*)`;

function issue(
  code: PhysScriptIssue["code"],
  message: string,
  line: number,
  column = 1,
): PhysScriptIssue {
  return { code, severity: "error", message, line, column };
}

function unquote(value: string): string {
  return JSON.parse(value) as string;
}

function parseScalar(source: string): PhysScriptScalar | undefined {
  if (source.startsWith('"') && source.endsWith('"')) return unquote(source);
  if (source === "true") return true;
  if (source === "false") return false;
  const value = Number(source);
  return Number.isFinite(value) ? value : undefined;
}

function parseStatement(
  source: string,
  line: number,
): PhysScriptStatement | PhysScriptIssue {
  let match = source.match(
    new RegExp(`^model\\s+(${IDENTIFIER})\\s+type\\s+(\\S+)$`),
  );
  if (match)
    return {
      kind: "model",
      alias: match[1]!,
      registeredTypeId: match[2]!,
    };

  match = source.match(
    new RegExp(
      `^set\\s+${MEMBER}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|true|false|[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)(?:\\s+(.+))?$`,
    ),
  );
  if (match) {
    const value = parseScalar(match[3]!);
    if (value !== undefined)
      return {
        kind: "set",
        target: match[1]!,
        property: match[2]!,
        value,
        ...(match[4] === undefined ? {} : { unit: match[4].trim() }),
      };
  }

  match = source.match(new RegExp(`^show\\s+(\\S+)\\s+of\\s+(${IDENTIFIER})$`));
  if (match)
    return {
      kind: "show",
      representationTypeId: match[1]!,
      target: match[2]!,
    };

  match = source.match(
    new RegExp(`^graph\\s+${MEMBER}\\s+against\\s+(${IDENTIFIER})$`),
  );
  if (match)
    return {
      kind: "graph",
      target: match[1]!,
      observable: match[2]!,
      against: match[3]!,
    };

  match = source.match(/^step\s+("(?:[^"\\]|\\.)*")$/);
  if (match) return { kind: "step", label: unquote(match[1]!) };

  match = source.match(
    new RegExp(
      `^pause\\s+simulation\\s+when\\s+${MEMBER}\\s*=\\s*([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)(?:\\s+(.+))?$`,
    ),
  );
  if (match)
    return {
      kind: "pause-when",
      target: match[1]!,
      observable: match[2]!,
      value: Number(match[3]),
      ...(match[4] === undefined ? {} : { unit: match[4].trim() }),
    };

  match = source.match(
    new RegExp(
      `^transform\\s+equation\\s+(${IDENTIFIER})\\s+to\\s+(${IDENTIFIER})$`,
    ),
  );
  if (match)
    return {
      kind: "transform-equation",
      source: match[1]!,
      target: match[2]!,
    };

  return issue("syntax-error", "PhysScript statement is not recognized.", line);
}

export function validatePhysScript(
  program: PhysScriptProgram,
): readonly PhysScriptIssue[] {
  const issues: PhysScriptIssue[] = [];
  const aliases = new Set<string>();
  program.statements.forEach((statement, index) => {
    const line = index + 3;
    if (statement.kind === "model") {
      if (aliases.has(statement.alias))
        issues.push(
          issue(
            "duplicate-model",
            `Model alias '${statement.alias}' is declared more than once.`,
            line,
          ),
        );
      aliases.add(statement.alias);
      if (!REGISTERED_TYPE_ID_PATTERN.test(statement.registeredTypeId))
        issues.push(
          issue(
            "invalid-type-id",
            `'${statement.registeredTypeId}' is not a namespaced type ID.`,
            line,
          ),
        );
      return;
    }
    if (
      (statement.kind === "show" ||
        statement.kind === "set" ||
        statement.kind === "graph" ||
        statement.kind === "pause-when") &&
      !aliases.has(statement.target)
    )
      issues.push(
        issue(
          "unknown-model",
          `Model alias '${statement.target}' must be declared before use.`,
          line,
        ),
      );
    if (
      statement.kind === "show" &&
      !REGISTERED_TYPE_ID_PATTERN.test(statement.representationTypeId)
    )
      issues.push(
        issue(
          "invalid-type-id",
          `'${statement.representationTypeId}' is not a namespaced type ID.`,
          line,
        ),
      );
  });
  return issues;
}

export function parsePhysScript(source: string): PhysScriptParseResult {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const issues: PhysScriptIssue[] = [];
  const header = lines[0]?.trim() ?? "";
  const headerMatch = header.match(/^physica\s+(\d+)$/);
  if (!headerMatch)
    issues.push(
      issue("missing-header", "Source must begin with 'physica 1'.", 1),
    );
  else if (headerMatch[1] !== "1")
    issues.push(
      issue(
        "unsupported-version",
        `PhysScript version ${headerMatch[1]} is not supported.`,
        1,
      ),
    );

  const sceneSource = lines[1]?.trim() ?? "";
  const sceneMatch = sceneSource.match(/^scene\s+("(?:[^"\\]|\\.)*")$/);
  if (!sceneMatch)
    issues.push(
      issue("missing-scene", "The second line must declare a quoted scene.", 2),
    );

  const statements: PhysScriptStatement[] = [];
  for (let index = 2; index < lines.length; index += 1) {
    const sourceLine = lines[index]!.trim();
    if (!sourceLine || sourceLine.startsWith("#")) continue;
    const parsed = parseStatement(sourceLine, index + 1);
    if ("severity" in parsed) issues.push(parsed);
    else statements.push(parsed);
  }

  if (!headerMatch || headerMatch[1] !== "1" || !sceneMatch)
    return { issues: Object.freeze(issues) };
  const program: PhysScriptProgram = Object.freeze({
    version: 1,
    scene: unquote(sceneMatch[1]!),
    statements: Object.freeze(statements),
  });
  issues.push(...validatePhysScript(program));
  return { program, issues: Object.freeze(issues) };
}

function scalarSource(value: PhysScriptScalar): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

export function serializePhysScript(program: PhysScriptProgram): string {
  const lines = ["physica 1", `scene ${JSON.stringify(program.scene)}`];
  for (const statement of program.statements) {
    switch (statement.kind) {
      case "model":
        lines.push(
          `model ${statement.alias} type ${statement.registeredTypeId}`,
        );
        break;
      case "set":
        lines.push(
          `set ${statement.target}.${statement.property} = ${scalarSource(statement.value)}${statement.unit ? ` ${statement.unit}` : ""}`,
        );
        break;
      case "show":
        lines.push(
          `show ${statement.representationTypeId} of ${statement.target}`,
        );
        break;
      case "graph":
        lines.push(
          `graph ${statement.target}.${statement.observable} against ${statement.against}`,
        );
        break;
      case "step":
        lines.push(`step ${JSON.stringify(statement.label)}`);
        break;
      case "pause-when":
        lines.push(
          `pause simulation when ${statement.target}.${statement.observable} = ${statement.value}${statement.unit ? ` ${statement.unit}` : ""}`,
        );
        break;
      case "transform-equation":
        lines.push(
          `transform equation ${statement.source} to ${statement.target}`,
        );
        break;
    }
  }
  return `${lines.join("\n")}\n`;
}

export function physScriptToCommandPlan(
  program: PhysScriptProgram,
): PhysScriptCommandPlan {
  const intents = program.statements.map(
    (statement, order): PhysScriptCommandIntent => {
      switch (statement.kind) {
        case "model":
          return {
            type: "add-model",
            order,
            payload: {
              alias: statement.alias,
              registeredTypeId: statement.registeredTypeId,
            },
          };
        case "set":
          return {
            type: "set-property",
            order,
            payload: {
              target: statement.target,
              property: statement.property,
              value: statement.value,
              ...(statement.unit === undefined ? {} : { unit: statement.unit }),
            },
          };
        case "show":
          return {
            type: "add-representation",
            order,
            payload: {
              representationTypeId: statement.representationTypeId,
              target: statement.target,
            },
          };
        case "graph":
          return { type: "add-graph", order, payload: { ...statement } };
        case "step":
          return {
            type: "add-step",
            order,
            payload: { label: statement.label },
          };
        case "pause-when":
          return {
            type: "add-pause-condition",
            order,
            payload: {
              target: statement.target,
              observable: statement.observable,
              value: statement.value,
              ...(statement.unit === undefined ? {} : { unit: statement.unit }),
            },
          };
        case "transform-equation":
          return {
            type: "add-equation-transform",
            order,
            payload: { source: statement.source, target: statement.target },
          };
      }
    },
  );
  return Object.freeze({
    version: 1,
    scene: program.scene,
    intents: Object.freeze(intents),
  });
}

export function commandPlanToPhysScript(
  plan: PhysScriptCommandPlan,
): PhysScriptProgram {
  const statements = [...plan.intents]
    .sort((left, right) => left.order - right.order)
    .map((intent): PhysScriptStatement => {
      switch (intent.type) {
        case "add-model":
          return { kind: "model", ...intent.payload };
        case "set-property":
          return { kind: "set", ...intent.payload };
        case "add-representation":
          return { kind: "show", ...intent.payload };
        case "add-graph":
          return {
            kind: "graph",
            target: intent.payload.target,
            observable: intent.payload.observable,
            against: intent.payload.against,
          };
        case "add-step":
          return { kind: "step", ...intent.payload };
        case "add-pause-condition":
          return { kind: "pause-when", ...intent.payload };
        case "add-equation-transform":
          return { kind: "transform-equation", ...intent.payload };
      }
    });
  return Object.freeze({
    version: 1,
    scene: plan.scene,
    statements: Object.freeze(statements),
  });
}
