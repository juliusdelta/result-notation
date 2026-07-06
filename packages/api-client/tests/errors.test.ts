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
import type { RequestInfo } from "../src/errors";

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

  it("timeoutError", () => {
    const cause = new Error("timed out");
    const request: RequestInfo = { method: "GET", path: "/slow", url: "http://example.com/slow" };
    const err = timeoutError("Request timed out", cause, request);
    expect(err.kind).toBe("TimeoutError");
    expect(err.message).toBe("Request timed out");
    expect(err.cause).toBe(cause);
    expect(err.request).toEqual(request);
  });

  it("timeoutError without optional fields", () => {
    const err = timeoutError("Request timed out");
    expect(err.kind).toBe("TimeoutError");
    expect(err.message).toBe("Request timed out");
    expect(err.cause).toBeUndefined();
    expect(err.request).toBeUndefined();
  });

  it("abortError", () => {
    const cause = new DOMException("Aborted", "AbortError");
    const request: RequestInfo = {
      method: "POST",
      path: "/upload",
      url: "http://example.com/upload",
    };
    const err = abortError("Request aborted", cause, request);
    expect(err.kind).toBe("AbortError");
    expect(err.message).toBe("Request aborted");
    expect(err.cause).toBe(cause);
    expect(err.request).toEqual(request);
  });

  it("requestValidationError", () => {
    const issues = [{ path: ["name"], message: "Required" }];
    const request: RequestInfo = {
      method: "POST",
      path: "/users",
      url: "http://example.com/users",
    };
    const err = requestValidationError("Params validation failed", issues, request);
    expect(err.kind).toBe("RequestValidationError");
    expect(err.message).toBe("Params validation failed");
    expect(err.issues).toEqual(issues);
    expect(err.request).toEqual(request);
  });

  it("responseValidationError", () => {
    const issues = [{ path: ["id"], message: "Expected number" }];
    const request: RequestInfo = {
      method: "GET",
      path: "/users/1",
      url: "http://example.com/users/1",
    };
    const err = responseValidationError("Response validation failed", issues, request);
    expect(err.kind).toBe("ResponseValidationError");
    expect(err.message).toBe("Response validation failed");
    expect(err.issues).toEqual(issues);
    expect(err.request).toEqual(request);
  });

  it("responseParseError", () => {
    const cause = new SyntaxError("Unexpected token");
    const request: RequestInfo = { method: "GET", path: "/data", url: "http://example.com/data" };
    const err = responseParseError("Failed to parse response body", cause, request);
    expect(err.kind).toBe("ResponseParseError");
    expect(err.message).toBe("Failed to parse response body");
    expect(err.cause).toBe(cause);
    expect(err.request).toEqual(request);
  });

  it("serializationError", () => {
    const cause = new TypeError("Cannot serialize");
    const request: RequestInfo = { method: "POST", path: "/data", url: "http://example.com/data" };
    const err = serializationError("Serialization failed", cause, request);
    expect(err.kind).toBe("SerializationError");
    expect(err.message).toBe("Serialization failed");
    expect(err.cause).toBe(cause);
    expect(err.request).toEqual(request);
  });

  it("interceptorError", () => {
    const cause = new Error("interceptor threw");
    const request: RequestInfo = { method: "GET", path: "/api", url: "http://example.com/api" };
    const err = interceptorError("Interceptor failed", cause, request);
    expect(err.kind).toBe("InterceptorError");
    expect(err.message).toBe("Interceptor failed");
    expect(err.cause).toBe(cause);
    expect(err.request).toEqual(request);
  });

  it("unknownError", () => {
    const err = unknownError(new Error("boom"));
    expect(err.kind).toBe("UnknownError");
    expect(err.message).toBe("An unknown error occurred");
  });

  it("unknownError with request info", () => {
    const cause = new Error("boom");
    const request: RequestInfo = { method: "GET", path: "/test", url: "http://example.com/test" };
    const err = unknownError(cause, request);
    expect(err.kind).toBe("UnknownError");
    expect(err.cause).toBe(cause);
    expect(err.request).toEqual(request);
  });
});
