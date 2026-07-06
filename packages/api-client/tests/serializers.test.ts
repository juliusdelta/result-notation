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

  describe("multipartBodySerializer", () => {
    it("returns undefined for undefined body", () => {
      expect(multipartBodySerializer(undefined)).toBeUndefined();
    });

    it("returns FormData as-is", () => {
      const fd = new FormData();
      fd.set("key", "value");
      const result = multipartBodySerializer(fd);
      expect(result).toBe(fd);
    });

    it("converts object to FormData", () => {
      const result = multipartBodySerializer({ name: "test", count: 42 });
      expect(result).toBeInstanceOf(FormData);
      const fd = result as FormData;
      expect(fd.get("name")).toBe("test");
      expect(fd.get("count")).toBe("42");
    });

    it("skips undefined values", () => {
      const result = multipartBodySerializer({ a: "keep", b: undefined });
      const fd = result as FormData;
      expect(fd.get("a")).toBe("keep");
      expect(fd.has("b")).toBe(false);
    });

    it("handles arrays as repeated keys", () => {
      const result = multipartBodySerializer({ tags: ["a", "b", "c"] });
      const fd = result as FormData;
      expect(fd.getAll("tags")).toEqual(["a", "b", "c"]);
    });

    it("handles Blob values", () => {
      const blob = new Blob(["hello"], { type: "text/plain" });
      const result = multipartBodySerializer({ file: blob });
      const fd = result as FormData;
      expect(fd.get("file")).toBeInstanceOf(Blob);
    });
  });
});
