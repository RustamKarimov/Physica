import {
  rk4,
  rk45Adaptive,
  semiImplicitEuler,
  velocityVerlet,
} from "@physica/solver-ode";
const derivative = (_t: number, s: readonly number[]) => [
  s[1] ?? 0,
  -(s[0] ?? 0) - 0.2 * (s[1] ?? 0),
];
const acceleration = (
  _t: number,
  p: readonly number[],
  v: readonly number[],
) => [-(p[0] ?? 0) - 0.2 * (v[0] ?? 0)];
export function runExample() {
  let ep = [1],
    ev = [0],
    vp = [1],
    vv = [0],
    r = [1, 0];
  for (let i = 0; i < 100; i += 1) {
    const e = semiImplicitEuler(ep, ev, acceleration, i / 100, 0.01);
    ep = [...e.position];
    ev = [...e.velocity];
    const v = velocityVerlet(vp, vv, acceleration, i / 100, 0.01);
    vp = [...v.position];
    vv = [...v.velocity];
    r = [...rk4(derivative, r, i / 100, 0.01).state];
  }
  const adaptive = rk45Adaptive(derivative, [1, 0], 0, 1);
  return {
    timeSeconds: 1,
    euler: Number((ep[0] ?? 0).toFixed(6)),
    verlet: Number((vp[0] ?? 0).toFixed(6)),
    rk4: Number((r[0] ?? 0).toFixed(6)),
    rk45: Number((adaptive.state[0] ?? 0).toFixed(6)),
    adaptiveAcceptedSteps: adaptive.acceptedSteps,
  };
}
