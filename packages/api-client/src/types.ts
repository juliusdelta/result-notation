import type { StandardSchemaV1 } from "@standard-schema/spec";

export type StandardSchema<TInput = unknown, TOutput = TInput> = StandardSchemaV1<TInput, TOutput>;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpTransport = "http";
export type SseTransport = "sse";
export type Transport = HttpTransport | SseTransport;

export type RetryOptions = {
  maxAttempts?: number;
  backoffMs?: number | ((attempt: number) => number);
};

export type EndpointDefinition<
  TParams = unknown,
  TSearch = unknown,
  TBody = unknown,
  TResponse = unknown,
  TErrorSchemas = Record<number, unknown>,
  TMeta = Record<string, unknown>,
  TTransport extends Transport = HttpTransport,
> = {
  transport?: TTransport;
  paramsSchema?: StandardSchema<TParams>;
  searchSchema?: StandardSchema<TSearch>;
  bodySchema?: StandardSchema<TBody>;
  responseSchema?: StandardSchema<TResponse>;
  errorSchemas?: TErrorSchemas;
  meta?: TMeta;
  transformResponse?: (raw: unknown) => unknown;
  bodySerializer?: (body: unknown) => BodyInit | undefined;
};

export type EndpointRegistry = Record<
  string,
  Partial<Record<HttpMethod | "sse", EndpointDefinition>>
>;

export type RequestOptions = {
  params?: Record<string, unknown>;
  search?: Record<string, unknown>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  context?: Record<string, unknown>;
  retry?: RetryOptions;
};

export type SocketRegistry = Record<
  string,
  {
    searchSchema?: StandardSchema;
    incoming?: Record<string, StandardSchema>;
    outgoing?: Record<string, StandardSchema>;
    errorSchema?: StandardSchema;
  }
>;
