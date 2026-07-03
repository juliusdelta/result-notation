export type {
  StandardSchema,
  HttpMethod,
  HttpTransport,
  Transport,
  RetryOptions,
  EndpointDefinition,
  EndpointRegistry,
  RequestOptions,
} from "./types";

export { extractParams, substituteParams, matchPath } from "./route-matcher";
export type { ValidationError } from "./standard-schema";
export { validate } from "./standard-schema";

export type {
  RequestInfo,
  ApiErrorBase,
  NetworkError,
  TimeoutError,
  AbortError,
  RequestValidationError,
  ResponseValidationError,
  ResponseParseError,
  SerializationError,
  InterceptorError,
  HttpError,
  UnknownError,
  ApiClientError,
} from "./errors";

export {
  networkError,
  timeoutError,
  abortError,
  requestValidationError,
  responseValidationError,
  responseParseError,
  serializationError,
  interceptorError,
  httpError,
  unknownError,
} from "./errors";

export type { SearchSerializer, BodySerializer } from "./serializers";
export {
  defaultSearchSerializer,
  defaultJsonBodySerializer,
  multipartBodySerializer,
} from "./serializers";

export type {
  MaybePromise,
  RequestContext,
  ResponseContext,
  ErrorContext,
  Interceptor,
} from "./interceptor";
export { executeRequestPipeline } from "./interceptor";

export type { ExecuteOptions } from "./request";
export { executeRequest } from "./request";

export type { ClientConfig, InferApiData, InferApiError, InferApiOptions } from "./client";
export { ApiClient, createApiClient } from "./client";

export type { StreamResult, StreamOptions } from "./stream";
export { createStream } from "./stream";
