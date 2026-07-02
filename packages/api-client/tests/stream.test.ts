import { describe, it, expect } from "vitest";
import { ok } from "@result-notation/core";
import { createStream } from "../src/stream";

describe("stream", () => {
  it("reads newline-delimited stream", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"id":1}\n{"id":2}\n'));
        controller.close();
      },
    });

    const response = new Response(body);
    const stream = await createStream(response, (chunk) => {
      return ok(JSON.parse(chunk));
    });

    const results: unknown[] = [];
    for await (const event of stream) {
      if (event.ok) results.push(event.value);
    }

    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("cancel stops iteration", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"id":1}\n'));
      },
    });

    const response = new Response(body);
    const stream = await createStream(response, (chunk) => ok(JSON.parse(chunk)));
    await stream.cancel();

    const results: unknown[] = [];
    for await (const event of stream) {
      if (event.ok) results.push(event.value);
    }
    expect(results).toEqual([]);
  });
});
