export type Result<TValue, TError> = Ok<TValue, TError> | Err<TError, TValue>;

export class Ok<TValue, TError = never> {
  readonly ok = true as const;
  readonly value: TValue;

  constructor(value: TValue) {
    this.value = value;
  }

  match<A, B>(handlers: { ok: (value: TValue) => A; error: (error: TError) => B }): A | B {
    return handlers.ok(this.value);
  }

  map<U>(fn: (value: TValue) => U): Result<U, TError> {
    return new Ok(fn(this.value));
  }

  unwrapOr<D>(_defaultValue: D): TValue | D {
    return this.value;
  }

  unwrap(): TValue {
    return this.value;
  }
}

export class Err<TError, TValue = never> {
  readonly ok = false as const;
  readonly error: TError;

  constructor(error: TError) {
    this.error = error;
  }

  match<A, B>(handlers: { ok: (value: TValue) => A; error: (error: TError) => B }): A | B {
    return handlers.error(this.error);
  }

  map<U>(_fn: (value: TValue) => U): Result<U, TError> {
    return this as unknown as Result<U, TError>;
  }

  unwrapOr<D>(defaultValue: D): D {
    return defaultValue;
  }

  unwrap(): TValue {
    throw this.error;
  }
}

export function ok<TValue>(value: TValue): Ok<TValue, never> {
  return new Ok(value);
}

export function err<TError>(error: TError): Err<TError, never> {
  return new Err(error);
}
