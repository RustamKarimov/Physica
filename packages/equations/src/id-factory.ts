import type {
  SemanticEquationIdFactory,
  SemanticEquationNodeId,
} from "./types";

type RuntimeCrypto = {
  randomUUID(): string;
};

export class CryptoSemanticEquationIdFactory implements SemanticEquationIdFactory {
  next(): SemanticEquationNodeId {
    const provider = (globalThis as { crypto?: RuntimeCrypto }).crypto;
    if (!provider) {
      throw new Error("crypto.randomUUID() is unavailable in this runtime.");
    }
    return provider.randomUUID() as SemanticEquationNodeId;
  }
}

export class DeterministicSemanticEquationIdFactory implements SemanticEquationIdFactory {
  private counter: number;

  constructor(seed = 0) {
    if (!Number.isSafeInteger(seed) || seed < 0) {
      throw new RangeError(
        "Deterministic semantic ID seed must be a non-negative safe integer.",
      );
    }
    this.counter = seed;
  }

  next(): SemanticEquationNodeId {
    const suffix = this.counter.toString(16).padStart(12, "0");
    this.counter += 1;
    if (suffix.length > 12) {
      throw new RangeError("Deterministic semantic ID space exhausted.");
    }
    return ("00000000-0000-4000-9000-" + suffix) as SemanticEquationNodeId;
  }
}
