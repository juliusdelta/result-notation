import { describe, it, expect } from "vitest";
import {
  defaultSearchSerializer,
  defaultJsonBodySerializer,
  multipartBodySerializer,
} from "../src/serializers";

describe("serializers", () => {
  describe("defaultSearchSerializer", () => {
    it("serializes simple params", () => {
      const result = defaultSearchSerializer({ query: "hello", page: 1 });
      expect(result.toString()).toContain("query=hello");
      expect(result.toString()).toContain("page=1");
    });

    it("skips null and undefined", () => {
      const result = defaultSearchSerializer({ a: null, b: undefined, c: "keep" });
      expect(result.toString()).not.toContain("a=");
      expect(result.toString()).not.toContain("b=");
      expect(result.toString()).toContain("c=keep");
    });

    it("serializes arrays as repeated keys", () => {
      const result = defaultSearchSerializer({ ids: [1, 2, 3] });
      expect(result.getAll("ids")).toEqual(["1", "2", "3"]);
    });
  });

  describe("defaultJsonBodySerializer", () => {
    it("serializes objects to JSON", () => {
      const result = defaultJsonBodySerializer({ name: "test" });
      expect(result).toBe('{"name":"test"}');
    });

    it("returns undefined for undefined body", () => {
      expect(defaultJsonBodySerializer(undefined)).toBeUndefined();
    });
  });
});
