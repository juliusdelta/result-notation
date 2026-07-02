import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validate } from "../src/standard-schema";

describe("standard-schema", () => {
  it("validates correct data", async () => {
    const schema = z.object({ name: z.string() });
    const result = await validate(schema, { name: "hello" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: "hello" });
    }
  });

  it("rejects invalid data", async () => {
    const schema = z.object({ name: z.string() });
    const result = await validate(schema, { name: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("ValidationError");
    }
  });
});
