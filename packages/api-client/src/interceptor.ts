import type { Result } from "@result-notation/core";
import { ok, err } from "@result-notation/core";
import type { ApiClientError, RequestInfo } from "./errors";

export type MaybePromise<T> = T | Promise<T>;

export type RequestContext = {
  method: string;
  path: string;
  url: string;
  headers: Headers;
  body?: unknown;
  signal?: AbortSignal;
  context: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
  endpoint: { meta?: Record<string, unknown> };
  retry: (overrides?: Partial<RequestContext>) => Promise<Result<ResponseContext, ApiClientError>>;
};

export type ResponseContext = {
  request: RequestContext;
  response: Response;
};

export type ErrorContext = {
  request: RequestContext;
  error: ApiClientError;
};

export type Interceptor = {
  name?: string;
  onRequest?: (ctx: RequestContext) => MaybePromise<Result<RequestContext, ApiClientError>>;
  onResponse?: (ctx: ResponseContext) => MaybePromise<Result<ResponseContext, ApiClientError>>;
  onError?: (ctx: ErrorContext) => MaybePromise<Result<ResponseContext, ApiClientError>>;
};

export async function executeRequestPipeline(
  interceptors: Interceptor[],
  initialCtx: RequestContext,
): Promise<Result<ResponseContext, ApiClientError>> {
  let ctx = initialCtx;

  for (const interceptor of interceptors) {
    if (!interceptor.onRequest) continue;
    const result = await interceptor.onRequest(ctx);
    if (!result.ok) {
      return runOnError(interceptors, ctx, result.error);
    }
    ctx = result.value;
  }

  let responseResult: { request: RequestContext; response: Response };

  try {
    const init: RequestInit & { signal?: AbortSignal } = {
      method: ctx.method,
      headers: ctx.headers,
    };
    if (ctx.body !== undefined) init.body = ctx.body as BodyInit;
    if (ctx.signal !== undefined) init.signal = ctx.signal;

    const response = await fetch(ctx.url, init);
    responseResult = { request: ctx, response };
  } catch (error) {
    const errVal = toApiClientError(error, ctx);
    return runOnError(interceptors, ctx, errVal);
  }

  for (const interceptor of interceptors) {
    if (!interceptor.onResponse) continue;
    const result = await interceptor.onResponse(responseResult);
    if (!result.ok) {
      return runOnError(interceptors, ctx, result.error);
    }
    responseResult = result.value;
  }

  return ok(responseResult);

  async function runOnError(
    interceptors: Interceptor[],
    requestCtx: RequestContext,
    errorVal: ApiClientError,
  ): Promise<Result<ResponseContext, ApiClientError>> {
    for (const interceptor of interceptors) {
      if (!interceptor.onError) continue;
      const result = await interceptor.onError({ request: requestCtx, error: errorVal });
      if (result.ok) {
        return result;
      }
    }
    return err(errorVal);
  }
}

function toApiClientError(error: unknown, ctx: RequestContext): ApiClientError {
  const req: RequestInfo | undefined = { method: ctx.method, path: ctx.path, url: ctx.url };
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return { kind: "NetworkError", message: "Failed to fetch", cause: error, request: req };
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return { kind: "AbortError", message: "Request was aborted", cause: error, request: req };
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return { kind: "TimeoutError", message: error.message, cause: error, request: req };
  }
  if (error instanceof Error) {
    return {
      kind: "UnknownError",
      message: "An unknown error occurred",
      cause: error,
      request: req,
    };
  }
  return { kind: "UnknownError", message: "An unknown error occurred", cause: error, request: req };
}
