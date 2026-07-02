export type Result<TValue, TError> = Ok<TValue> | Err<TError>;

export class Ok<TValue> {
  readonly ok = true as const;
  readonly value: TValue;

  constructor(value: TValue) {
    this.value = value;
  }

  match<A, B>(handlers: { ok: (value: TValue) => A; error: (error: unknown) => B }): A | B {
    return handlers.ok(this.value);
  }

  map<U>(fn: (value: TValue) => U): Result<U, unknown> {
    return new Ok(fn(this.value));
  }

  unwrapOr<D>(_defaultValue: D): TValue | D {
    return this.value;
  }

  unwrap(): TValue {
    return this.value;
  }
}

export class Err<TError> {
  readonly ok = false as const;
  readonly error: TError;

  constructor(error: TError) {
    this.error = error;
  }

  match<A, B>(handlers: { ok: (value: unknown) => A; error: (error: TError) => B }): A | B {
    return handlers.error(this.error);
  }

  map<U>(_fn: (value: unknown) => U): Result<U, TError> {
    return this as unknown as Result<U, TError>;
  }

  unwrapOr<D>(defaultValue: D): TError extends never ? unknown : D {
    return defaultValue;
  }

  unwrap(): unknown {
    throw this.error;
  }
}

export function ok<TValue>(value: TValue): Ok<TValue> {
  return new Ok(value);
}

export function err<TError>(error: TError): Err<TError> {
  return new Err(error);
}
