import type { Result } from "./result";

export function match<T, E, A, B>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => A; error: (error: E) => B },
): A | B {
  return result.ok ? handlers.ok(result.value) : handlers.error(result.error);
}
