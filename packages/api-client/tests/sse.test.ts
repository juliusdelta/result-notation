import { describe, it, expect } from "vitest";
import { createSseStream } from "../src/sse";

describe("sse", () => {
  it("parses SSE events", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: message\ndata: {"text":"hello"}\n\n'));
        controller.close();
      },
    });

    const response = new Response(body);
    const stream = await createSseStream(response, {});

    const results: unknown[] = [];
    for await (const event of stream) {
      if (event.ok) results.push(event.value);
    }

    expect(results).toHaveLength(1);
    if (results[0]) {
      expect((results[0] as { type: string; data: unknown }).type).toBe("message");
    }
  });
});
