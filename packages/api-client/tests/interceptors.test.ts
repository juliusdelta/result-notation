import { describe, it, expect, vi } from "vitest";
import { ok, err } from "@result-notation/core";
import { executeRequestPipeline } from "../src/interceptor";
import type { RequestContext, Interceptor } from "../src/interceptor";

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    method: "GET",
    path: "/test",
    url: "http://example.com/test",
    headers: new Headers(),
    context: {},
    retryCount: 0,
    maxRetries: 0,
    endpoint: {},
    retry: () => Promise.resolve(err({ kind: "UnknownError", message: "retry" } as never)),
    ...overrides,
  };
}

describe("interceptor pipeline", () => {
  it("passes through without interceptors", async () => {
    const ctx = makeCtx();
    const result = await executeRequestPipeline([], ctx);
    expect(result.ok).toBe(true);
  });

  it("runs onRequest interceptor", async () => {
    const fn = vi.fn().mockResolvedValue(ok(makeCtx({ method: "POST" })));
    const interceptor: Interceptor = { onRequest: fn };
    const ctx = makeCtx();
    await executeRequestPipeline([interceptor], ctx);
    expect(fn).toHaveBeenCalled();
  });

  it("short-circuits on onRequest error", async () => {
    const fn = vi.fn().mockResolvedValue(err({ kind: "NetworkError", message: "fail" } as never));
    const interceptor: Interceptor = { onRequest: fn };
    const ctx = makeCtx();
    const result = await executeRequestPipeline([interceptor], ctx);
    expect(result.ok).toBe(false);
  });
});
