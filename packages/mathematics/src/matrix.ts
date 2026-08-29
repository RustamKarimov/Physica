import { fail, ok, type MathResult } from "./errors";
import {
  DEFAULT_NUMERICS_POLICY,
  approximatelyEqual,
  requireFinite,
  type NumericsPolicy,
} from "./numerics";
import { vec2, vec3, type Vec2, type Vec3 } from "./vector";

export interface Matrix {
  readonly rows: number;
  readonly columns: number;
  readonly data: readonly number[];
}

export function matrix(
  rows: number,
  columns: number,
  data: readonly number[],
): Matrix {
  if (
    !Number.isSafeInteger(rows) ||
    rows < 1 ||
    !Number.isSafeInteger(columns) ||
    columns < 1
  ) {
    throw new RangeError(
      "Matrix rows and columns must be positive safe integers.",
    );
  }
  if (data.length !== rows * columns) {
    throw new RangeError("Matrix data length does not match its shape.");
  }
  const values = data.map((value, index) =>
    requireFinite(value, `data[${index}]`),
  );
  return Object.freeze({ rows, columns, data: Object.freeze(values) });
}

export function zeroMatrix(rows: number, columns: number): Matrix {
  return matrix(
    rows,
    columns,
    Array.from({ length: rows * columns }, () => 0),
  );
}

export function identityMatrix(size: number): Matrix {
  const data = Array.from({ length: size * size }, () => 0);
  for (let index = 0; index < size; index += 1) data[index * size + index] = 1;
  return matrix(size, size, data);
}

export function matrixAt(value: Matrix, row: number, column: number): number {
  if (
    !Number.isSafeInteger(row) ||
    !Number.isSafeInteger(column) ||
    row < 0 ||
    column < 0 ||
    row >= value.rows ||
    column >= value.columns
  ) {
    throw new RangeError("Matrix index is outside the matrix shape.");
  }
  return value.data[row * value.columns + column]!;
}

function sameShape(a: Matrix, b: Matrix, operation: string): MathResult<void> {
  return a.rows === b.rows && a.columns === b.columns
    ? ok(undefined)
    : fail({
        kind: "shape-mismatch",
        operation,
        left: [a.rows, a.columns],
        right: [b.rows, b.columns],
      });
}

export function addMatrix(a: Matrix, b: Matrix): MathResult<Matrix> {
  const shape = sameShape(a, b, "addMatrix");
  return shape.ok
    ? ok(
        matrix(
          a.rows,
          a.columns,
          a.data.map((value, index) => value + b.data[index]!),
        ),
      )
    : shape;
}

export function subtractMatrix(a: Matrix, b: Matrix): MathResult<Matrix> {
  const shape = sameShape(a, b, "subtractMatrix");
  return shape.ok
    ? ok(
        matrix(
          a.rows,
          a.columns,
          a.data.map((value, index) => value - b.data[index]!),
        ),
      )
    : shape;
}

export function scaleMatrix(value: Matrix, scalar: number): Matrix {
  requireFinite(scalar, "scalar");
  return matrix(
    value.rows,
    value.columns,
    value.data.map((entry) => entry * scalar),
  );
}

export function transposeMatrix(value: Matrix): Matrix {
  const data: number[] = [];
  for (let column = 0; column < value.columns; column += 1) {
    for (let row = 0; row < value.rows; row += 1)
      data.push(matrixAt(value, row, column));
  }
  return matrix(value.columns, value.rows, data);
}

export function multiplyMatrix(a: Matrix, b: Matrix): MathResult<Matrix> {
  if (a.columns !== b.rows) {
    return fail({
      kind: "shape-mismatch",
      operation: "multiplyMatrix",
      left: [a.rows, a.columns],
      right: [b.rows, b.columns],
    });
  }
  const data: number[] = [];
  for (let row = 0; row < a.rows; row += 1) {
    for (let column = 0; column < b.columns; column += 1) {
      let sum = 0;
      for (let inner = 0; inner < a.columns; inner += 1) {
        sum += matrixAt(a, row, inner) * matrixAt(b, inner, column);
      }
      data.push(sum);
    }
  }
  return ok(matrix(a.rows, b.columns, data));
}

export function multiplyMatrixVec2(
  value: Matrix,
  vector: Vec2,
): MathResult<Vec2> {
  if (value.rows !== 2 || value.columns !== 2) {
    return fail({
      kind: "shape-mismatch",
      operation: "multiplyMatrixVec2",
      left: [value.rows, value.columns],
      right: [2, 2],
    });
  }
  return ok(
    vec2(
      matrixAt(value, 0, 0) * vector.x + matrixAt(value, 0, 1) * vector.y,
      matrixAt(value, 1, 0) * vector.x + matrixAt(value, 1, 1) * vector.y,
    ),
  );
}

export function multiplyMatrixVec3(
  value: Matrix,
  vector: Vec3,
): MathResult<Vec3> {
  if (value.rows !== 3 || value.columns !== 3) {
    return fail({
      kind: "shape-mismatch",
      operation: "multiplyMatrixVec3",
      left: [value.rows, value.columns],
      right: [3, 3],
    });
  }
  return ok(
    vec3(
      matrixAt(value, 0, 0) * vector.x +
        matrixAt(value, 0, 1) * vector.y +
        matrixAt(value, 0, 2) * vector.z,
      matrixAt(value, 1, 0) * vector.x +
        matrixAt(value, 1, 1) * vector.y +
        matrixAt(value, 1, 2) * vector.z,
      matrixAt(value, 2, 0) * vector.x +
        matrixAt(value, 2, 1) * vector.y +
        matrixAt(value, 2, 2) * vector.z,
    ),
  );
}

function squareOrError(value: Matrix, operation: string): MathResult<void> {
  return value.rows === value.columns
    ? ok(undefined)
    : fail({
        kind: "shape-mismatch",
        operation,
        left: [value.rows, value.columns],
        right: [value.rows, value.rows],
      });
}

export function determinantMatrix(
  value: Matrix,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<number> {
  const shape = squareOrError(value, "determinantMatrix");
  if (!shape.ok) return shape;
  const size = value.rows;
  const work = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => matrixAt(value, row, column)),
  );
  let determinant = 1;
  let sign = 1;
  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(work[row]![column]!) > Math.abs(work[pivotRow]![column]!))
        pivotRow = row;
    }
    const pivot = work[pivotRow]![column]!;
    if (Math.abs(pivot) <= policy.singularityThreshold) return ok(0);
    if (pivotRow !== column) {
      [work[column], work[pivotRow]] = [work[pivotRow]!, work[column]!];
      sign *= -1;
    }
    determinant *= work[column]![column]!;
    for (let row = column + 1; row < size; row += 1) {
      const targetRow = work[row]!;
      const pivotValues = work[column]!;
      const factor = targetRow[column]! / pivotValues[column]!;
      for (let inner = column + 1; inner < size; inner += 1) {
        targetRow[inner] = targetRow[inner]! - factor * pivotValues[inner]!;
      }
    }
  }
  return ok(sign * determinant);
}

export function inverseMatrix(
  value: Matrix,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): MathResult<Matrix> {
  const shape = squareOrError(value, "inverseMatrix");
  if (!shape.ok) return shape;
  const size = value.rows;
  const work = Array.from({ length: size }, (_, row) => [
    ...Array.from({ length: size }, (_, column) =>
      matrixAt(value, row, column),
    ),
    ...Array.from({ length: size }, (_, column) => (row === column ? 1 : 0)),
  ]);
  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(work[row]![column]!) > Math.abs(work[pivotRow]![column]!))
        pivotRow = row;
    }
    if (Math.abs(work[pivotRow]![column]!) <= policy.singularityThreshold) {
      return fail({ kind: "singular-matrix", operation: "inverseMatrix" });
    }
    if (pivotRow !== column)
      [work[column], work[pivotRow]] = [work[pivotRow]!, work[column]!];
    const pivotValues = work[column]!;
    const pivot = pivotValues[column]!;
    for (let index = 0; index < size * 2; index += 1) {
      pivotValues[index] = pivotValues[index]! / pivot;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const targetRow = work[row]!;
      const factor = targetRow[column]!;
      for (let index = 0; index < size * 2; index += 1) {
        targetRow[index] = targetRow[index]! - factor * pivotValues[index]!;
      }
    }
  }
  return ok(
    matrix(
      size,
      size,
      work.flatMap((row) => row.slice(size)),
    ),
  );
}

export function approximatelyEqualMatrix(
  a: Matrix,
  b: Matrix,
  policy: NumericsPolicy = DEFAULT_NUMERICS_POLICY,
): boolean {
  return (
    a.rows === b.rows &&
    a.columns === b.columns &&
    a.data.every((entry, index) =>
      approximatelyEqual(entry, b.data[index]!, policy),
    )
  );
}
