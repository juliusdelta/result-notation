import { describe, it, expect } from "vitest";
import {
  networkError,
  timeoutError,
  abortError,
  requestValidationError,
  responseValidationError,
  responseParseError,
  serializationError,
  interceptorError,
  httpError,
  unknownError,
} from "../src/errors";

describe("errors", () => {
  it("networkError", () => {
    const err = networkError("connection failed", undefined, {
      method: "GET",
      path: "/test",
      url: "http://example.com",
    });
    expect(err.kind).toBe("NetworkError");
    expect(err.message).toBe("connection failed");
  });

  it("httpError", () => {
    const headers = new Headers();
    const err = httpError(404, { message: "Not Found" }, headers, {
      method: "GET",
      path: "/test",
      url: "http://example.com",
    });
    expect(err.kind).toBe("HttpError");
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ message: "Not Found" });
  });

  it("unknownError", () => {
    const err = unknownError(new Error("boom"));
    expect(err.kind).toBe("UnknownError");
    expect(err.message).toBe("An unknown error occurred");
  });
});
