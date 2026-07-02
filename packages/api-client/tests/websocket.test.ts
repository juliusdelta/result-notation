import { describe, it, expect } from "vitest";
import { createWebSocketSession } from "../src/websocket";

describe("websocket", () => {
  it("returns ok for a WebSocket session", async () => {
    const result = await createWebSocketSession("ws://localhost:0", {}, {}, null);
    // WebSocket constructor doesn't throw synchronously
    // Connection errors are handled asynchronously
    expect(result.ok).toBe(true);
  });
});
