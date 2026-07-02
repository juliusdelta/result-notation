import { describe, it, expect } from "vitest";
import { extractParams, substituteParams, matchPath } from "../src/route-matcher";

describe("route-matcher", () => {
  describe("extractParams", () => {
    it("extracts single param", () => {
      expect(extractParams("/downloads/:downloadId")).toEqual(["downloadId"]);
    });

    it("extracts multiple params", () => {
      expect(extractParams("/users/:userId/posts/:postId")).toEqual(["userId", "postId"]);
    });

    it("returns empty array for no params", () => {
      expect(extractParams("/downloads")).toEqual([]);
    });
  });

  describe("substituteParams", () => {
    it("substitutes single param", () => {
      expect(substituteParams("/downloads/:downloadId", { downloadId: 123 })).toBe(
        "/downloads/123",
      );
    });

    it("substitutes multiple params", () => {
      expect(substituteParams("/users/:userId/posts/:postId", { userId: 1, postId: 42 })).toBe(
        "/users/1/posts/42",
      );
    });

    it("returns pattern unchanged if param missing", () => {
      expect(substituteParams("/downloads/:downloadId", {})).toBe("/downloads/:downloadId");
    });
  });

  describe("matchPath", () => {
    it("matches single param", () => {
      expect(matchPath("/downloads/:downloadId", "/downloads/123")).toEqual({ downloadId: "123" });
    });

    it("matches multiple params", () => {
      expect(matchPath("/users/:userId/posts/:postId", "/users/1/posts/42")).toEqual({
        userId: "1",
        postId: "42",
      });
    });

    it("returns null for non-matching path", () => {
      expect(matchPath("/downloads/:downloadId", "/other")).toBeNull();
    });
  });
});
