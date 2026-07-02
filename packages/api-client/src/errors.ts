export type RequestInfo = { method: string; path: string; url: string };

export type ApiErrorBase<TKind extends string> = {
  kind: TKind;
  message: string;
  cause?: unknown;
  request?: RequestInfo;
};

export type NetworkError = ApiErrorBase<"NetworkError">;
export type TimeoutError = ApiErrorBase<"TimeoutError">;
export type AbortError = ApiErrorBase<"AbortError">;
export type RequestValidationError = ApiErrorBase<"RequestValidationError"> & {
  issues: unknown;
};
export type ResponseValidationError = ApiErrorBase<"ResponseValidationError"> & {
  issues: unknown;
};
export type ResponseParseError = ApiErrorBase<"ResponseParseError">;
export type SerializationError = ApiErrorBase<"SerializationError">;
export type InterceptorError = ApiErrorBase<"InterceptorError">;

export type HttpError<
  TStatus extends number = number,
  TBody = unknown,
> = ApiErrorBase<"HttpError"> & {
  status: TStatus;
  body: TBody;
  headers: Headers;
};

export type UnknownError = ApiErrorBase<"UnknownError">;

export type ApiClientError =
  | NetworkError
  | TimeoutError
  | AbortError
  | RequestValidationError
  | ResponseValidationError
  | ResponseParseError
  | SerializationError
  | InterceptorError
  | HttpError
  | UnknownError;

function withRequest<T extends ApiErrorBase<string>>(obj: T, request?: RequestInfo): T {
  if (request !== undefined) {
    (obj as { request?: RequestInfo }).request = request;
  }
  return obj;
}

export function networkError(
  message: string,
  cause?: unknown,
  request?: RequestInfo,
): NetworkError {
  return withRequest({ kind: "NetworkError" as const, message, cause }, request);
}

export function timeoutError(
  message: string,
  cause?: unknown,
  request?: RequestInfo,
): TimeoutError {
  return withRequest({ kind: "TimeoutError" as const, message, cause }, request);
}

export function abortError(message: string, cause?: unknown, request?: RequestInfo): AbortError {
  return withRequest({ kind: "AbortError" as const, message, cause }, request);
}

export function requestValidationError(
  message: string,
  issues: unknown,
  request?: RequestInfo,
): RequestValidationError {
  return withRequest({ kind: "RequestValidationError" as const, message, issues }, request);
}

export function responseValidationError(
  message: string,
  issues: unknown,
  request?: RequestInfo,
): ResponseValidationError {
  return withRequest({ kind: "ResponseValidationError" as const, message, issues }, request);
}

export function responseParseError(
  message: string,
  cause?: unknown,
  request?: RequestInfo,
): ResponseParseError {
  return withRequest({ kind: "ResponseParseError" as const, message, cause }, request);
}

export function serializationError(
  message: string,
  cause?: unknown,
  request?: RequestInfo,
): SerializationError {
  return withRequest({ kind: "SerializationError" as const, message, cause }, request);
}

export function interceptorError(
  message: string,
  cause?: unknown,
  request?: RequestInfo,
): InterceptorError {
  return withRequest({ kind: "InterceptorError" as const, message, cause }, request);
}

export function httpError<TStatus extends number, TBody>(
  status: TStatus,
  body: TBody,
  headers: Headers,
  request?: RequestInfo,
): HttpError<TStatus, TBody> {
  return withRequest(
    { kind: "HttpError" as const, message: `HTTP ${status}`, status, body, headers },
    request,
  );
}

export function unknownError(cause?: unknown, request?: RequestInfo): UnknownError {
  return withRequest(
    { kind: "UnknownError" as const, message: "An unknown error occurred", cause },
    request,
  );
}
