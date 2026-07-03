import { expect, test, describe } from "vitest";
import { ok, err, Ok, Err, match } from "../src/index";
import type { Result } from "../src/index";

describe("ok", () => {
  test("constructs Ok with ok === true and value", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
    expect(result).toBeInstanceOf(Ok);
  });
});

describe("err", () => {
  test("constructs Err with ok === false and error", () => {
    const result = err("something broke");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("something broke");
    expect(result).toBeInstanceOf(Err);
  });
});

describe("match", () => {
  test("calls ok handler on Ok", () => {
    const result: Result<number, string> = ok(42);
    const output = match(result, {
      ok: (v) => String(v),
      error: (e) => e,
    });
    expect(output).toBe("42");
  });

  test("calls error handler on Err", () => {
    const result: Result<number, string> = err("fail");
    const output = match(result, {
      ok: (v) => String(v),
      error: (e) => e,
    });
    expect(output).toBe("fail");
  });
});

describe("map", () => {
  test("transforms value on Ok", () => {
    const result: Result<number, string> = ok(42);
    const mapped = result.map((v) => v * 2);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value).toBe(84);
    }
  });

  test("passes through on Err", () => {
    const result: Result<number, string> = err("fail");
    const mapped = result.map(() => 0);
    expect(mapped.ok).toBe(false);
    if (!mapped.ok) {
      expect(mapped.error).toBe("fail");
    }
  });
});

describe("unwrapOr", () => {
  test("returns value on Ok", () => {
    const result: Result<number, string> = ok(42);
    expect(result.unwrapOr(0)).toBe(42);
  });

  test("returns default on Err", () => {
    const result: Result<number, string> = err("fail");
    expect(result.unwrapOr(0)).toBe(0);
  });
});

describe("unwrap", () => {
  test("returns value on Ok", () => {
    const result: Result<number, string> = ok(42);
    expect(result.unwrap()).toBe(42);
  });

  test("throws on Err", () => {
    const result: Result<number, string> = err("fail");
    expect(() => result.unwrap()).toThrow("fail");
  });
});

describe("type narrowing", () => {
  test("narrows to value when ok is true", () => {
    const result: Result<number, string> = ok(42);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  test("narrows to error when ok is false", () => {
    const result: Result<number, string> = err("fail");
    if (!result.ok) {
      expect(result.error).toBe("fail");
    }
  });
});
