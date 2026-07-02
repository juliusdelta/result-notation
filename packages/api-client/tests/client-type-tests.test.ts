import { describe, it } from "vitest";
import { createApiClient } from "../src/client";
import { z } from "zod";

describe("type tests", () => {
  it("compiles with registered routes", () => {
    const api = createApiClient({ baseUrl: "http://example.com" }).registerRoutes({
      "/downloads": {
        GET: {
          searchSchema: z.object({ query: z.string() }),
          responseSchema: z.object({
            data: z.array(z.object({ id: z.number(), name: z.string() })),
          }),
        },
      },
      "/downloads/:downloadId": {
        GET: {
          paramsSchema: z.object({ downloadId: z.number() }),
          responseSchema: z.object({ id: z.number(), name: z.string() }),
          errorSchemas: { 404: z.object({ code: z.literal("NOT_FOUND"), message: z.string() }) },
        },
      },
    });

    // Just type-check that these compile
    type _ = Parameters<typeof api.get<"/downloads">>;
  });
});
