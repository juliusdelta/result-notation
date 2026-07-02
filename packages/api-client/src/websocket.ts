import type { Result } from "@result-notation/core";
import { ok, err } from "@result-notation/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ApiClientError } from "./errors";
import { unknownError } from "./errors";
import { validate } from "./standard-schema";

export type WebSocketSession<TIncoming, TOutgoing, TError> = {
  send<T extends keyof TOutgoing>(type: T, payload: TOutgoing[T]): void;
  close(): void;
  closed: Promise<void>;
  readyState: number;
  onClose(): Promise<void>;
  onError(): Promise<TError>;
  [Symbol.asyncIterator](): AsyncIterator<Result<TIncoming[keyof TIncoming], TError>>;
};

export type WebSocketOptions = {
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    backoffMs?: number | ((attempt: number) => number);
  };
};

export async function createWebSocketSession<
  TIncoming extends Record<string, StandardSchemaV1>,
  TOutgoing extends Record<string, StandardSchemaV1>,
  TError,
>(
  url: string,
  incomingSchemas: TIncoming,
  outgoingSchemas: TOutgoing,
  errorSchema: StandardSchemaV1<TError> | null,
  _options?: WebSocketOptions,
): Promise<Result<WebSocketSession<TIncoming, TOutgoing, TError>, ApiClientError>> {
  let ws: WebSocket;
  let closedResolve: (() => void) | undefined;
  let errorResolve: ((error: TError) => void) | undefined;
  let errorPromise: Promise<TError>;

  const closedPromise = new Promise<void>((resolve) => {
    closedResolve = resolve;
  });

  errorPromise = new Promise<TError>((resolve) => {
    errorResolve = resolve;
  });

  try {
    ws = new WebSocket(url);
  } catch (error) {
    return err(unknownError(error));
  }

  const messageQueue: Array<Result<TIncoming[keyof TIncoming], TError>> = [];
  let messageResolve: (() => void) | undefined;

  function pushMessage(msg: Result<TIncoming[keyof TIncoming], TError>) {
    messageQueue.push(msg);
    messageResolve?.();
    messageResolve = undefined;
  }

  function waitForMessage(): Promise<void> {
    if (messageQueue.length > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      messageResolve = resolve;
    });
  }

  ws.onmessage = (event: MessageEvent) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      pushMessage(
        err({
          kind: "ResponseParseError",
          message: "Failed to parse WebSocket message as JSON",
        } as unknown as TError),
      );
      return;
    }

    if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) {
      pushMessage(
        err({
          kind: "ResponseParseError",
          message: "WebSocket message missing 'type' field",
        } as unknown as TError),
      );
      return;
    }

    const parsedMsg = parsed as { type: string } & Record<string, unknown>;
    const { type, ...payload } = parsedMsg;
    const schema = incomingSchemas[type];

    if (schema) {
      void validate(schema, payload).then((validationResult) => {
        if (validationResult.ok) {
          pushMessage(
            ok({ type, data: validationResult.value } as unknown as TIncoming[keyof TIncoming]),
          );
        } else {
          pushMessage(
            err({
              kind: "ResponseValidationError",
              message: `WebSocket incoming message '${type}' validation failed`,
              issues: validationResult.error.issues,
            } as unknown as TError),
          );
        }
      });
    } else {
      pushMessage(ok({ type, data: payload } as unknown as TIncoming[keyof TIncoming]));
    }
  };

  ws.onclose = () => {
    closedResolve?.();
  };

  ws.onerror = () => {
    if (errorResolve && errorSchema) {
      void validate(errorSchema, {}).then((result) => {
        if (result.ok) {
          errorResolve!(result.value);
        } else {
          errorResolve!(undefined as unknown as TError);
        }
      });
    } else if (errorResolve) {
      errorResolve!(undefined as unknown as TError);
    }
  };

  const session: WebSocketSession<TIncoming, TOutgoing, TError> = {
    send<T extends keyof TOutgoing>(type: T, payload: TOutgoing[T]) {
      const schema = outgoingSchemas[type as string];
      if (schema) {
        void validate(schema, payload as unknown as Record<string, unknown>).then((result) => {
          if (result.ok) {
            ws.send(JSON.stringify({ type, ...(result.value as Record<string, unknown>) }));
          }
        });
      } else {
        ws.send(JSON.stringify({ type, ...(payload as unknown as Record<string, unknown>) }));
      }
    },

    close() {
      ws.close();
    },

    get closed() {
      return closedPromise;
    },

    get readyState() {
      return ws.readyState;
    },

    async onClose() {
      await closedPromise;
    },

    async onError() {
      return errorPromise;
    },

    [Symbol.asyncIterator]() {
      return {
        next: async (): Promise<IteratorResult<Result<TIncoming[keyof TIncoming], TError>>> => {
          await waitForMessage();
          const msg = messageQueue.shift();
          if (msg !== undefined) {
            return { done: false, value: msg };
          }
          return { done: true, value: undefined as never };
        },
      };
    },
  };

  return ok(session);
}
