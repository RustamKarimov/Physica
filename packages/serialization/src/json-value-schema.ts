import type { JsonObject, JsonValue } from "@physica/core-model";
import { z } from "zod";

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const JsonObjectSchema = z.record(
  z.string(),
  JsonValueSchema,
) as z.ZodType<JsonObject>;
