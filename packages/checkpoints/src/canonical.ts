import type { RuntimeCheckpointBodyV1, RuntimeCheckpointV1 } from "./types";
import type { CheckpointResult } from "./errors";

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => canonicalValue(entry));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalValue(entry)]),
    );
  return value;
}

export function cloneAndFreeze<T>(value: T): T {
  if (Array.isArray(value))
    return Object.freeze(value.map((entry) => cloneAndFreeze(entry))) as T;
  if (value !== null && typeof value === "object")
    return Object.freeze(
      Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          cloneAndFreeze(entry),
        ]),
      ),
    ) as T;
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function utf8Bytes(value: string): readonly number[] {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      } else codePoint = 0xfffd;
    } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) codePoint = 0xfffd;

    if (codePoint <= 0x7f) bytes.push(codePoint);
    else if (codePoint <= 0x7ff)
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint <= 0xffff)
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    else
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
  }
  return bytes;
}

function crc32(value: string): number {
  let crc = 0xffffffff;
  for (const byte of utf8Bytes(value)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function calculateCheckpointChecksum(
  body: RuntimeCheckpointBodyV1,
): string {
  return `crc32:${crc32(canonicalJson(body)).toString(16).padStart(8, "0")}`;
}

export function sealCheckpoint(
  body: RuntimeCheckpointBodyV1,
): RuntimeCheckpointV1 {
  const frozenBody = cloneAndFreeze(body);
  return cloneAndFreeze({
    ...frozenBody,
    checksum: calculateCheckpointChecksum(frozenBody),
  });
}

export function verifyCheckpointChecksum(
  checkpoint: RuntimeCheckpointV1,
): CheckpointResult<void> {
  const { checksum, ...body } = checkpoint;
  const expected = calculateCheckpointChecksum(body);
  return checksum === expected
    ? { ok: true, value: undefined }
    : {
        ok: false,
        error: {
          kind: "checksum-mismatch",
          checkpointId: checkpoint.checkpointId,
          expected,
          actual: checksum,
        },
      };
}
