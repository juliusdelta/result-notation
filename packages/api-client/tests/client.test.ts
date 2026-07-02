import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient } from "../src/client";
import { z } from "zod";

describe("ApiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a client", () => {
    const api = createApiClient({ baseUrl: "http://example.com" });
    expect(api).toBeDefined();
  });

  it("allows registering routes", () => {
    const api = createApiClient({ baseUrl: "http://example.com" }).registerRoutes({
      "/test": {
        GET: {
          responseSchema: z.object({ ok: z.boolean() }),
        },
      },
    });
    expect(api).toBeDefined();
  });

  it("allows chaining use and registerRoutes", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const api = createApiClient({ baseUrl: "http://example.com" }).registerRoutes({
      "/test": {
        GET: {
          responseSchema: z.object({ ok: z.boolean() }),
        },
      },
    });

    const result = await api.get("/test");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ ok: true });
    }
  });
});
