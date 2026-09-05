import { describe, expect, it } from "vitest";
import {
  commandPlanToPhysScript,
  parsePhysScript,
  physScriptToCommandPlan,
  serializePhysScript,
} from "../src";

const projectile = `physica 1
scene "Projectile explanation"
model Ball type physica:model/projectile-v1
set Ball.speed = 20 m/s
set Ball.visible = true
show physica:representation/trajectory-v1 of Ball
graph Ball.vertical_position against time
step "Maximum height"
pause simulation when Ball.vertical_velocity = 0 m/s
`;

describe("PhysScript V1", () => {
  it("parses and canonically round-trips a projectile explanation", () => {
    const parsed = parsePhysScript(projectile);
    expect(parsed.issues).toEqual([]);
    expect(parsed.program?.statements).toHaveLength(7);
    if (!parsed.program) return;
    const canonical = serializePhysScript(parsed.program);
    expect(serializePhysScript(parsePhysScript(canonical).program!)).toBe(
      canonical,
    );
  });

  it("round-trips semantic command intents without executable callbacks", () => {
    const program = parsePhysScript(projectile).program!;
    const plan = physScriptToCommandPlan(program);
    expect(plan.intents.map((intent) => intent.type)).toEqual([
      "add-model",
      "set-property",
      "set-property",
      "add-representation",
      "add-graph",
      "add-step",
      "add-pause-condition",
    ]);
    expect(commandPlanToPhysScript(plan)).toEqual(program);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
  });

  it("recovers by line and reports duplicate, reference and type errors", () => {
    const parsed = parsePhysScript(`physica 1
scene "Broken"
set Ghost.mass = 2 kg
model Ball type not-namespaced
model Ball type physica:model/body-v1
execute javascript now
`);
    expect(parsed.program).toBeDefined();
    expect(parsed.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "unknown-model",
        "invalid-type-id",
        "duplicate-model",
        "syntax-error",
      ]),
    );
    expect(
      parsed.issues.find((entry) => entry.code === "syntax-error")?.line,
    ).toBe(6);
  });

  it("supports equation transform authoring", () => {
    const parsed = parsePhysScript(`physica 1
scene "Equation rearrangement"
step "Start from Newton's second law"
transform equation EqStart to EqSolved
`);
    expect(parsed.issues).toEqual([]);
    expect(parsed.program?.statements[1]).toEqual({
      kind: "transform-equation",
      source: "EqStart",
      target: "EqSolved",
    });
  });
});
