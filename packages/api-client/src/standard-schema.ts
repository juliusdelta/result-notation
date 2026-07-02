import type { StandardSchemaV1 } from "@standard-schema/spec";
import { ok, err } from "@result-notation/core";
import type { Result } from "@result-notation/core";

export type ValidationError = {
  kind: "ValidationError";
  message: string;
  issues?: ReadonlyArray<{ message: string; path?: ReadonlyArray<string | number> }>;
};

export async function validate<T>(
  schema: StandardSchemaV1<T>,
  input: unknown,
): Promise<Result<T, ValidationError>> {
  const result = await schema["~standard"].validate(input);
  if (!result.issues) {
    return ok(result.value);
  }

  const issues: ValidationError["issues"] = result.issues.map((i) => ({
    message: i.message,
    path: i.path?.map((p) =>
      typeof p === "object" && "key" in p
        ? ((p as { key: PropertyKey }).key as string | number)
        : (p as string | number),
    ),
  })) as ValidationError["issues"];

  return err({
    kind: "ValidationError" as const,
    message: result.issues[0]?.message ?? "Validation failed",
    issues,
  } as ValidationError);
}
