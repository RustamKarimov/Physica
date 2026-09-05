import {
  parsePhysScript,
  physScriptToCommandPlan,
  serializePhysScript,
} from "@physica/commands";

export const source = `physica 1
scene "Projectile explanation"
model Ball type physica:model/projectile-v1
set Ball.speed = 20 m/s
set Ball.launch_angle = 45 deg
show physica:representation/trajectory-v1 of Ball
graph Ball.vertical_position against time
step "Maximum height"
pause simulation when Ball.vertical_velocity = 0 m/s
`;

export function runPhysScriptProjectile() {
  const parsed = parsePhysScript(source);
  if (!parsed.program || parsed.issues.length > 0)
    throw new Error(parsed.issues[0]?.message ?? "PhysScript did not parse.");
  const plan = physScriptToCommandPlan(parsed.program);
  return {
    id: "physcript-projectile",
    scene: parsed.program.scene,
    statementCount: parsed.program.statements.length,
    intentTypes: plan.intents.map((intent) => intent.type),
    canonicalLines: serializePhysScript(parsed.program).trimEnd().split("\n"),
    arbitraryCode: false,
  };
}
