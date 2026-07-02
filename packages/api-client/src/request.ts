import type { Result } from "@result-notation/core";
import { ok, err } from "@result-notation/core";
import type { EndpointDefinition, RequestOptions } from "./types";
import type { ApiClientError, RequestInfo } from "./errors";
import { responseParseError, httpError, unknownError } from "./errors";
import type { Interceptor, RequestContext } from "./interceptor";
import { executeRequestPipeline } from "./interceptor";
import type { SearchSerializer, BodySerializer } from "./serializers";
import { defaultSearchSerializer, defaultJsonBodySerializer } from "./serializers";
import { substituteParams } from "./route-matcher";
import { validate } from "./standard-schema";

export type ExecuteOptions = {
  method: string;
  baseUrl: string;
  path: string;
  definition: EndpointDefinition;
  options: RequestOptions;
  interceptors: Interceptor[];
  searchSerializer?: SearchSerializer;
  bodySerializer?: BodySerializer;
  normalizeResponse?: (body: unknown) => unknown | Promise<unknown>;
};

export async function executeRequest<TData, TError>(
  opts: ExecuteOptions,
): Promise<Result<TData, TError>> {
  const { method, path, definition, options, interceptors, normalizeResponse } = opts;

  const baseUrl = opts.baseUrl.replace(/\/+$/, "");
  const searchSerializer = opts.searchSerializer ?? defaultSearchSerializer;
  const bodySerializer = opts.bodySerializer ?? defaultJsonBodySerializer;

  let resolvedPath = path;
  if (definition.paramsSchema && options.params) {
    const paramsResult = await validate(definition.paramsSchema, options.params);
    if (!paramsResult.ok) {
      return err({
        kind: "RequestValidationError",
        message: "Params validation failed",
        issues: paramsResult.error.issues,
      } as ApiClientError as TError);
    }
    resolvedPath = substituteParams(path, paramsResult.value as Record<string, unknown>);
  } else if (options.params) {
    resolvedPath = substituteParams(path, options.params);
  }

  let searchString = "";
  if (definition.searchSchema && options.search) {
    const searchResult = await validate(definition.searchSchema, options.search);
    if (!searchResult.ok) {
      return err({
        kind: "RequestValidationError",
        message: "Search validation failed",
        issues: searchResult.error.issues,
      } as ApiClientError as TError);
    }
    searchString = searchSerializer(searchResult.value as Record<string, unknown>).toString();
  } else if (options.search) {
    searchString = searchSerializer(options.search as Record<string, unknown>).toString();
  }

  let body: unknown = options.body;
  if (definition.bodySchema && options.body !== undefined) {
    const bodyResult = await validate(definition.bodySchema, options.body);
    if (!bodyResult.ok) {
      return err({
        kind: "RequestValidationError",
        message: "Body validation failed",
        issues: bodyResult.error.issues,
      } as ApiClientError as TError);
    }
    body = bodyResult.value;
  }

  const url = `${baseUrl}${resolvedPath}${searchString ? `?${searchString}` : ""}`;

  const serializedBody =
    body !== undefined ? (definition.bodySerializer ?? bodySerializer)(body) : undefined;

  const reqInfo: RequestInfo = { method, path, url };
  const endpointMeta = definition.meta;

  const initialCtx: RequestContext = {
    method,
    path,
    url,
    headers: new Headers(options.headers),
    context: options.context ?? {},
    retryCount: 0,
    maxRetries: options.retry?.maxAttempts ?? 0,
    endpoint: endpointMeta ? { meta: endpointMeta as Record<string, unknown> } : {},
    retry: () =>
      Promise.resolve(
        err({ kind: "UnknownError", message: "Retry not implemented" } as ApiClientError),
      ),
  };
  if (serializedBody !== undefined) initialCtx.body = serializedBody;
  if (options.signal !== undefined) initialCtx.signal = options.signal;

  const pipelineResult = await executeRequestPipeline(interceptors, initialCtx);
  if (!pipelineResult.ok) {
    return err(pipelineResult.error as TError);
  }

  const response = pipelineResult.value.response;

  let parsedBody: unknown;
  try {
    parsedBody = await parseResponseBody(response);
  } catch (parseError) {
    return err(responseParseError("Failed to parse response body", parseError, reqInfo) as TError);
  }

  if (!response.ok) {
    if (definition.errorSchemas) {
      const statusKey =
        response.status.toString() as unknown as keyof typeof definition.errorSchemas;
      const errorSchema = definition.errorSchemas[statusKey];
      if (errorSchema) {
        const errorResult = await validate(errorSchema as never, parsedBody);
        if (errorResult.ok) {
          return err(
            httpError(
              response.status as never,
              errorResult.value,
              response.headers,
              reqInfo,
            ) as TError,
          );
        }
      }
    }

    return err(
      httpError(response.status as never, parsedBody, response.headers, reqInfo) as TError,
    );
  }

  let normalizedBody = parsedBody;

  if (normalizeResponse) {
    try {
      normalizedBody = await normalizeResponse(normalizedBody);
    } catch {
      return err(unknownError(undefined, reqInfo) as TError);
    }
  }

  if (definition.transformResponse) {
    try {
      normalizedBody = definition.transformResponse(normalizedBody);
    } catch {
      return err(unknownError(undefined, reqInfo) as TError);
    }
  }

  if (definition.responseSchema) {
    const responseResult = await validate(definition.responseSchema as never, normalizedBody);
    if (!responseResult.ok) {
      return err({
        kind: "ResponseValidationError",
        message: "Response validation failed",
        issues: responseResult.error.issues,
        request: reqInfo,
      } as ApiClientError as TError);
    }
    return ok(responseResult.value as TData);
  }

  return ok(normalizedBody as TData);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}
