import {
  descriptors,
  type MechanicsLibraryDescriptor,
} from "./library-model-descriptors";

export const OSCILLATION_LIBRARY_DESCRIPTORS: readonly MechanicsLibraryDescriptor[] =
  [
    ...descriptors(
      "smart-model",
      17,
      [
        "SHMOscillator",
        "MassSpringOscillator",
        "SmallAnglePendulum",
        "DampedOscillator",
        "DrivenOscillator",
        "ResonanceModel",
        "CoupledOscillatorExtension",
      ],
      ["oscillation", "periodic-system", "model"],
    ),
    ...descriptors(
      "prefab",
      17,
      [
        "Horizontal Mass–Spring",
        "Vertical Mass–Spring",
        "Simple Pendulum",
        "Damped Oscillator",
        "Driven Spring Oscillator",
        "Resonance Demonstration",
        "Coupled-Oscillator Extension",
      ],
      ["oscillation", "apparatus"],
    ),
    ...descriptors(
      "visual-object",
      17,
      [
        "mass",
        "spring",
        "pendulum bob",
        "string",
        "support",
        "damper",
        "driver/motor",
        "oscillating platform",
        "equilibrium marker",
      ],
      ["oscillation", "visual"],
    ),
    ...descriptors(
      "representation",
      17,
      [
        "displacement vector",
        "velocity vector",
        "acceleration vector",
        "force vector",
        "x–t graph",
        "v–t graph",
        "a–t graph",
        "energy graph",
        "resonance curve",
        "phase indicator",
      ],
      ["oscillation", "bound-representation"],
    ),
  ];
