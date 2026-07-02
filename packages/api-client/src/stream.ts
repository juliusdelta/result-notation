import type { Result } from "@result-notation/core";

export type StreamResult<TEvent, TError> = {
  [Symbol.asyncIterator](): AsyncIterator<Result<TEvent, TError>>;
  cancel(): Promise<void>;
};

export type StreamOptions = {
  signal?: AbortSignal;
};

export async function createStream<TEvent, TError>(
  response: Response,
  parseEvent: (chunk: string) => Result<TEvent, TError>,
): Promise<StreamResult<TEvent, TError>> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let cancelled = false;

  const iterator: AsyncIterator<Result<TEvent, TError>> = {
    async next(): Promise<IteratorResult<Result<TEvent, TError>>> {
      if (cancelled) {
        return { done: true, value: undefined as never };
      }

      while (!cancelled) {
        const chunk = buffer.indexOf("\n");
        if (chunk !== -1) {
          const line = buffer.slice(0, chunk);
          buffer = buffer.slice(chunk + 1);

          const trimmed = line.trim();
          if (!trimmed) continue;

          return { done: false, value: parseEvent(trimmed) };
        }

        const result = await reader!.read();
        if (result.done) {
          cancelled = true;
          if (buffer.trim()) {
            const last = buffer.trim();
            buffer = "";
            return { done: false, value: parseEvent(last) };
          }
          return { done: true, value: undefined as never };
        }

        buffer += decoder.decode(result.value, { stream: true });
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
        // ignore cancellation errors
      }
    },
  };
}
