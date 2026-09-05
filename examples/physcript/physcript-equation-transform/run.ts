import {
  commandPlanToPhysScript,
  parsePhysScript,
  physScriptToCommandPlan,
  serializePhysScript,
} from "@physica/commands";

const source = `physica 1
scene "Equation rearrangement"
step "Begin with Newton's second law"
transform equation EqStart to EqSolved
`;

export function runPhysScriptEquationTransform() {
  const parsed = parsePhysScript(source);
  if (!parsed.program || parsed.issues.length > 0)
    throw new Error(parsed.issues[0]?.message ?? "PhysScript did not parse.");
  const plan = physScriptToCommandPlan(parsed.program);
  const restored = commandPlanToPhysScript(plan);
  return {
    id: "physcript-equation-transform",
    scene: restored.scene,
    intentTypes: plan.intents.map((intent) => intent.type),
    semanticRoundTrip:
      serializePhysScript(restored) === serializePhysScript(parsed.program),
    transform: restored.statements[1],
  };
}
