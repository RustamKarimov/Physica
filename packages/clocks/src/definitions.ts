import {
  createValidationReport,
  registeredTypeId,
  type ClockDefinition,
  type ClockId,
  type IdFactory,
  type JsonObject,
  type ValidationIssue,
  type ValidationReport,
} from "@physica/core-model";

export const CLOCK_DOMAIN_TYPE_ID = registeredTypeId("physica:clock/domain-v1");
export const CLOCK_KEY_PATTERN = /^[a-z][a-z0-9.-]*$/;

export type ClockDomainKind =
  | "simulation"
  | "presentation"
  | "acquisition"
  | "audio"
  | "experiment"
  | "custom";

export interface ClockLinkDefinition {
  readonly parentClockId: ClockId;
  readonly rateMultiplier: number;
  readonly offsetSeconds: number;
  readonly synchronization: "always" | "conditional";
  readonly conditionKey?: string;
}

export interface ClockDomainConfigurationV1 {
  readonly key: string;
  readonly kind: ClockDomainKind;
  readonly initialTimeSeconds: number;
  readonly initialRate: number;
  readonly initiallyPaused: boolean;
  readonly link?: ClockLinkDefinition;
}

export interface ParsedClockDefinition {
  readonly definition: ClockDefinition;
  readonly configuration: ClockDomainConfigurationV1;
}

export type ClockDefinitionResult =
  | { readonly ok: true; readonly value: ParsedClockDefinition }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

function issue(
  code: string,
  message: string,
  path: string,
  relatedIds: readonly string[] = [],
): ValidationIssue {
  return {
    code,
    severity: "error",
    message,
    path,
    source: "semantic",
    recoverable: true,
    relatedIds,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const CLOCK_KINDS = new Set<ClockDomainKind>([
  "simulation",
  "presentation",
  "acquisition",
  "audio",
  "experiment",
  "custom",
]);

export function parseClockDefinition(
  definition: ClockDefinition,
  path = "clockDefinitions",
): ClockDefinitionResult {
  const issues: ValidationIssue[] = [];
  if (
    definition.typeId !== CLOCK_DOMAIN_TYPE_ID ||
    definition.schemaVersion !== 1
  ) {
    return {
      ok: false,
      issues: [
        issue(
          "unsupported-clock-definition",
          "Clock definition is not the built-in V1 clock domain type.",
          path,
          [definition.id],
        ),
      ],
    };
  }
  const source = definition.configuration as Record<string, unknown>;
  const key = source.key;
  const kind = source.kind;
  const initialTimeSeconds = source.initialTimeSeconds;
  const initialRate = source.initialRate;
  const initiallyPaused = source.initiallyPaused;
  if (typeof key !== "string" || !CLOCK_KEY_PATTERN.test(key)) {
    issues.push(
      issue(
        "invalid-clock-key",
        "Clock key is invalid.",
        `${path}.configuration.key`,
        [definition.id],
      ),
    );
  }
  if (typeof kind !== "string" || !CLOCK_KINDS.has(kind as ClockDomainKind)) {
    issues.push(
      issue(
        "invalid-clock-kind",
        "Clock kind is invalid.",
        `${path}.configuration.kind`,
        [definition.id],
      ),
    );
  }
  if (!Number.isFinite(initialTimeSeconds)) {
    issues.push(
      issue(
        "invalid-clock-time",
        "Initial clock time must be finite.",
        `${path}.configuration.initialTimeSeconds`,
        [definition.id],
      ),
    );
  }
  if (!Number.isFinite(initialRate)) {
    issues.push(
      issue(
        "invalid-clock-rate",
        "Initial clock rate must be finite.",
        `${path}.configuration.initialRate`,
        [definition.id],
      ),
    );
  }
  if (typeof initiallyPaused !== "boolean") {
    issues.push(
      issue(
        "invalid-clock-paused",
        "initiallyPaused must be boolean.",
        `${path}.configuration.initiallyPaused`,
        [definition.id],
      ),
    );
  }
  let link: ClockLinkDefinition | undefined;
  if (source.link !== undefined) {
    if (!isObject(source.link)) {
      issues.push(
        issue(
          "invalid-clock-link",
          "Clock link must be an object.",
          `${path}.configuration.link`,
          [definition.id],
        ),
      );
    } else {
      const parentClockId = source.link.parentClockId;
      const rateMultiplier = source.link.rateMultiplier;
      const offsetSeconds = source.link.offsetSeconds;
      const synchronization = source.link.synchronization;
      const conditionKey = source.link.conditionKey;
      if (typeof parentClockId !== "string")
        issues.push(
          issue(
            "invalid-clock-parent",
            "Clock link parent ID must be a string.",
            `${path}.configuration.link.parentClockId`,
            [definition.id],
          ),
        );
      if (!Number.isFinite(rateMultiplier))
        issues.push(
          issue(
            "invalid-clock-link-rate",
            "Clock link rate multiplier must be finite.",
            `${path}.configuration.link.rateMultiplier`,
            [definition.id],
          ),
        );
      if (!Number.isFinite(offsetSeconds))
        issues.push(
          issue(
            "invalid-clock-link-offset",
            "Clock link offset must be finite.",
            `${path}.configuration.link.offsetSeconds`,
            [definition.id],
          ),
        );
      if (synchronization !== "always" && synchronization !== "conditional")
        issues.push(
          issue(
            "invalid-clock-synchronization",
            "Clock synchronization mode is invalid.",
            `${path}.configuration.link.synchronization`,
            [definition.id],
          ),
        );
      if (
        synchronization === "conditional" &&
        (typeof conditionKey !== "string" || conditionKey.length === 0)
      )
        issues.push(
          issue(
            "missing-clock-condition",
            "Conditional clock links require conditionKey.",
            `${path}.configuration.link.conditionKey`,
            [definition.id],
          ),
        );
      if (issues.length === 0) {
        link = {
          parentClockId: parentClockId as ClockId,
          rateMultiplier: rateMultiplier as number,
          offsetSeconds: offsetSeconds as number,
          synchronization: synchronization as "always" | "conditional",
          ...(conditionKey === undefined
            ? {}
            : { conditionKey: conditionKey as string }),
        };
      }
    }
  }
  if (issues.length > 0) return { ok: false, issues };
  const configuration: ClockDomainConfigurationV1 = Object.freeze({
    key: key as string,
    kind: kind as ClockDomainKind,
    initialTimeSeconds: initialTimeSeconds as number,
    initialRate: initialRate as number,
    initiallyPaused: initiallyPaused as boolean,
    ...(link === undefined ? {} : { link: Object.freeze(link) }),
  });
  return { ok: true, value: Object.freeze({ definition, configuration }) };
}

export function createClockDefinition(
  idFactory: IdFactory,
  configuration: ClockDomainConfigurationV1,
  enabled = true,
): ClockDefinition {
  const link = configuration.link;
  const jsonConfiguration: JsonObject = {
    key: configuration.key,
    kind: configuration.kind,
    initialTimeSeconds: configuration.initialTimeSeconds,
    initialRate: configuration.initialRate,
    initiallyPaused: configuration.initiallyPaused,
    ...(link === undefined
      ? {}
      : {
          link: {
            parentClockId: link.parentClockId,
            rateMultiplier: link.rateMultiplier,
            offsetSeconds: link.offsetSeconds,
            synchronization: link.synchronization,
            ...(link.conditionKey === undefined
              ? {}
              : { conditionKey: link.conditionKey }),
          },
        }),
  };
  return {
    id: idFactory.clockId(),
    typeId: CLOCK_DOMAIN_TYPE_ID,
    schemaVersion: 1,
    configuration: jsonConfiguration,
    enabled,
  };
}

export function createDefaultClockDefinitions(
  idFactory: IdFactory,
  initiallyPaused = true,
): readonly [ClockDefinition, ClockDefinition] {
  return Object.freeze([
    createClockDefinition(idFactory, {
      key: "simulation",
      kind: "simulation",
      initialTimeSeconds: 0,
      initialRate: 1,
      initiallyPaused,
    }),
    createClockDefinition(idFactory, {
      key: "presentation",
      kind: "presentation",
      initialTimeSeconds: 0,
      initialRate: 1,
      initiallyPaused,
    }),
  ]);
}

export function validateClockDefinitions(
  definitions: readonly ClockDefinition[],
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const parsed: ParsedClockDefinition[] = [];
  const ids = new Set<ClockId>();
  const keys = new Set<string>();
  definitions.forEach((definition, index) => {
    if (!definition.enabled) return;
    if (ids.has(definition.id))
      issues.push(
        issue(
          "duplicate-clock-id",
          "Clock ID occurs more than once.",
          `clockDefinitions[${index}].id`,
          [definition.id],
        ),
      );
    ids.add(definition.id);
    const result = parseClockDefinition(
      definition,
      `clockDefinitions[${index}]`,
    );
    if (!result.ok) issues.push(...result.issues);
    else {
      parsed.push(result.value);
      if (keys.has(result.value.configuration.key))
        issues.push(
          issue(
            "duplicate-clock-key",
            "Clock key occurs more than once.",
            `clockDefinitions[${index}].configuration.key`,
            [definition.id],
          ),
        );
      keys.add(result.value.configuration.key);
    }
  });
  for (const required of ["simulation", "presentation"] as const) {
    const matches = parsed.filter(
      ({ configuration }) =>
        configuration.kind === required && configuration.key === required,
    );
    if (matches.length !== 1)
      issues.push(
        issue(
          "mandatory-clock-count",
          `Exactly one enabled ${required} clock is required.`,
          "clockDefinitions",
        ),
      );
  }
  const byId = new Map(parsed.map((entry) => [entry.definition.id, entry]));
  for (const entry of parsed) {
    const parent = entry.configuration.link?.parentClockId;
    if (!parent) continue;
    if (parent === entry.definition.id)
      issues.push(
        issue(
          "self-linked-clock",
          "A clock cannot link to itself.",
          "clockDefinitions",
          [entry.definition.id],
        ),
      );
    else if (!byId.has(parent))
      issues.push(
        issue(
          "dangling-clock-link",
          "Clock link parent does not exist.",
          "clockDefinitions",
          [entry.definition.id, parent],
        ),
      );
  }
  const completed = new Set<ClockId>();
  for (const entry of parsed) {
    if (completed.has(entry.definition.id)) continue;
    const path: ClockId[] = [];
    const positions = new Map<ClockId, number>();
    let current: ParsedClockDefinition | undefined = entry;
    while (current) {
      const position = positions.get(current.definition.id);
      if (position !== undefined) {
        issues.push(
          issue(
            "clock-link-cycle",
            "Clock link graph contains a cycle.",
            "clockDefinitions",
            path.slice(position),
          ),
        );
        break;
      }
      if (completed.has(current.definition.id)) break;
      positions.set(current.definition.id, path.length);
      path.push(current.definition.id);
      const parent: ClockId | undefined =
        current.configuration.link?.parentClockId;
      current = parent === undefined ? undefined : byId.get(parent);
    }
    path.forEach((id) => completed.add(id));
  }
  return createValidationReport(issues);
}
