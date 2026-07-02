import type { Result } from "@result-notation/core";
import { ok, err } from "@result-notation/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ApiClientError } from "./errors";

export type SseEvent<Types extends Record<string, StandardSchemaV1>> = {
  [K in keyof Types]: { type: K; data: StandardSchemaV1.InferOutput<Types[K]> };
}[keyof Types];

export type SseStream<TEvent, TError> = {
  [Symbol.asyncIterator](): AsyncIterator<Result<TEvent, TError>>;
  cancel(): Promise<void>;
  close(): Promise<void>;
};

export type SseOptions = {
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    backoffMs?: number | ((attempt: number) => number);
  };
};

type SseState = {
  eventType: string;
  data: string[];
  id: string;
};

function initialState(): SseState {
  return { eventType: "message", data: [], id: "" };
}

export async function createSseStream<Types extends Record<string, StandardSchemaV1>>(
  response: Response,
  _eventSchemas: Types,
  _reconnect?: SseOptions["reconnect"],
  _fetchFn?: typeof fetch,
): Promise<SseStream<SseEvent<Types>, ApiClientError>> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let state = initialState();
  let cancelled = false;

  async function processLines(): Promise<IteratorResult<Result<SseEvent<Types>, ApiClientError>>> {
    while (!cancelled) {
      const nlIdx = buffer.indexOf("\n");
      if (nlIdx === -1) {
        const result = await reader!.read();
        if (result.done) {
          cancelled = true;
          return { done: true, value: undefined as never };
        }
        buffer += decoder.decode(result.value, { stream: true });
        continue;
      }

      const line = buffer.slice(0, nlIdx);
      buffer = buffer.slice(nlIdx + 1);

      const trimmed = line.trim();

      if (trimmed === "") {
        const event = dispatchEvent(state);
        state = initialState();
        if (event) return { done: false, value: event };
        continue;
      }

      if (trimmed.startsWith("event:")) {
        state.eventType = trimmed.slice(6).trim();
      } else if (trimmed.startsWith("data:")) {
        state.data.push(trimmed.slice(5).trim());
      } else if (trimmed.startsWith("id:")) {
        state.id = trimmed.slice(3).trim();
      }
    }

    return { done: true, value: undefined as never };
  }

  function dispatchEvent(sseState: SseState): Result<SseEvent<Types>, ApiClientError> | undefined {
    const rawData = sseState.data.join("\n");
    if (!rawData) return undefined;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return err({
        kind: "ResponseParseError",
        message: "Failed to parse SSE data as JSON",
      } as ApiClientError);
    }

    return ok({
      type: sseState.eventType,
      data: parsed,
    } as SseEvent<Types>);
  }

  const iterator: AsyncIterator<Result<SseEvent<Types>, ApiClientError>> = {
    async next() {
      if (cancelled) {
        return { done: true, value: undefined as never };
      }

      while (!cancelled) {
        const result = await processLines();
        if (result.done) return result;
        if (result.value) return result;
      }

      return { done: true, value: undefined as never };
    },
  };

  return {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    async cancel() {
      cancelled = true;
      try {
        await reader!.cancel();
      } catch {
        // ignore
      }
    },
    async close() {
      cancelled = true;
      try {
        await reader!.cancel();
      } catch {
        // ignore
      }
    },
  };
}
