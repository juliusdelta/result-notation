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

  describe("baseHeaders", () => {
    it("merges baseHeaders with request headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      const api = createApiClient({
        baseUrl: "http://example.com",
        baseHeaders: { "X-Api-Key": "secret", "X-Client": "test" },
      }).registerRoutes({
        "/test": {
          GET: {
            responseSchema: z.object({ ok: z.boolean() }),
          },
        },
      });

      await api.get("/test", { headers: { "X-Request-Id": "123" } });

      const calledHeaders = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get("X-Api-Key")).toBe("secret");
      expect(calledHeaders.get("X-Client")).toBe("test");
      expect(calledHeaders.get("X-Request-Id")).toBe("123");
    });

    it("request headers override baseHeaders", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      const api = createApiClient({
        baseUrl: "http://example.com",
        baseHeaders: { Authorization: "Bearer base-token", "X-Client": "test" },
      }).registerRoutes({
        "/test": {
          GET: {
            responseSchema: z.object({ ok: z.boolean() }),
          },
        },
      });

      await api.get("/test", { headers: { Authorization: "Bearer override-token" } });

      const calledHeaders = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get("Authorization")).toBe("Bearer override-token");
      expect(calledHeaders.get("X-Client")).toBe("test");
    });

    it("works without request headers", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      const api = createApiClient({
        baseUrl: "http://example.com",
        baseHeaders: { "X-Api-Key": "secret" },
      }).registerRoutes({
        "/test": {
          GET: {
            responseSchema: z.object({ ok: z.boolean() }),
          },
        },
      });

      await api.get("/test");

      const calledHeaders = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get("X-Api-Key")).toBe("secret");
    });

    it("works without baseHeaders", async () => {
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

      await api.get("/test", { headers: { "X-Request-Id": "123" } });

      const calledHeaders = mockFetch.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get("X-Request-Id")).toBe("123");
    });
  });
});
