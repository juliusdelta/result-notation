import type { Result } from "@result-notation/core";
import { ok, err } from "@result-notation/core";
import type {
  EndpointRegistry,
  SocketRegistry,
  EndpointDefinition,
  RequestOptions,
  StandardSchema,
} from "./types";
import type { Interceptor } from "./interceptor";
import type { ApiClientError, HttpError } from "./errors";
import { unknownError } from "./errors";
import type { SearchSerializer, BodySerializer } from "./serializers";
import { defaultSearchSerializer } from "./serializers";
import { executeRequest } from "./request";
import type { ExecuteOptions } from "./request";
import type { StreamResult, StreamOptions } from "./stream";
import { createStream } from "./stream";
import type { SseStream, SseOptions } from "./sse";
import { createSseStream } from "./sse";
import type { WebSocketSession, WebSocketOptions } from "./websocket";
import { createWebSocketSession } from "./websocket";

export type ClientConfig = {
  baseUrl: string;
  baseHeaders?: HeadersInit;
  searchSerializer?: SearchSerializer;
  bodySerializer?: BodySerializer;
  normalizeResponse?: (body: unknown) => unknown | Promise<unknown>;
  fetch?: typeof globalThis.fetch;
};

export type InferApiData<Def> = Def extends { responseSchema: StandardSchema<infer _, infer TOut> }
  ? TOut
  : unknown;

export type InferApiError<Def, TDefaultError = ApiClientError> =
  | TDefaultError
  | (Def extends { errorSchemas: infer S }
      ? {
          [K in keyof S & number]: HttpError<
            K,
            S[K] extends StandardSchema<infer _, infer TOut> ? TOut : unknown
          >;
        }[keyof S & number]
      : never);

export type InferApiOptions<Def> = (Def extends { paramsSchema: StandardSchema }
  ? { params: Record<string, unknown> }
  : {}) &
  (Def extends { searchSchema: StandardSchema } ? { search: Record<string, unknown> } : {}) &
  (Def extends { bodySchema: StandardSchema } ? { body: Record<string, unknown> } : {}) & {
    headers?: HeadersInit;
    signal?: AbortSignal;
    context?: Record<string, unknown>;
    retry?: { maxAttempts?: number; backoffMs?: number | ((attempt: number) => number) };
  };

export class ApiClient<
  Registry extends EndpointRegistry = {},
  Sockets extends SocketRegistry = {},
> {
  private config: ClientConfig;
  private interceptors: Interceptor[];
  private routes: Map<string, Partial<Record<string, EndpointDefinition>>>;
  private sockets: Map<string, SocketRegistry[string]>;

  constructor(config: ClientConfig) {
    this.config = config;
    this.interceptors = [];
    this.routes = new Map();
    this.sockets = new Map();
  }

  use(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  registerRoutes<const NewRegistry extends EndpointRegistry>(
    registry: NewRegistry,
  ): ApiClient<Registry & NewRegistry, Sockets> {
    for (const [path, methods] of Object.entries(registry)) {
      const existing = this.routes.get(path) ?? {};
      for (const [method, def] of Object.entries(methods as Record<string, EndpointDefinition>)) {
        existing[method] = def;
      }
      this.routes.set(path, existing);
    }
    return this as unknown as ApiClient<Registry & NewRegistry, Sockets>;
  }

  registerSockets<const NewSockets extends SocketRegistry>(
    sockets: NewSockets,
  ): ApiClient<Registry, Sockets & NewSockets> {
    for (const [path, def] of Object.entries(sockets)) {
      this.sockets.set(path, def);
    }
    return this as unknown as ApiClient<Registry, Sockets & NewSockets>;
  }

  private getDefinition(path: string, method: string): EndpointDefinition | undefined {
    const methods = this.routes.get(path);
    if (!methods) return undefined;
    return methods[method];
  }

  private buildExecOptions(path: string, method: string, options: RequestOptions): ExecuteOptions {
    const definition = this.getDefinition(path, method) ?? {};
    const execOpts: ExecuteOptions = {
      method,
      baseUrl: this.config.baseUrl,
      path,
      definition,
      options,
      interceptors: this.interceptors,
    };
    if (this.config.searchSerializer) execOpts.searchSerializer = this.config.searchSerializer;
    if (this.config.bodySerializer) execOpts.bodySerializer = this.config.bodySerializer;
    if (this.config.normalizeResponse) execOpts.normalizeResponse = this.config.normalizeResponse;
    return execOpts;
  }

  async get<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["GET"]>,
  ): Promise<Result<InferApiData<Registry[Path]["GET"]>, InferApiError<Registry[Path]["GET"]>>> {
    return executeRequest(
      this.buildExecOptions(path, "GET", (options ?? {}) as RequestOptions),
    ) as Promise<Result<InferApiData<Registry[Path]["GET"]>, InferApiError<Registry[Path]["GET"]>>>;
  }

  async post<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["POST"]>,
  ): Promise<Result<InferApiData<Registry[Path]["POST"]>, InferApiError<Registry[Path]["POST"]>>> {
    return executeRequest(
      this.buildExecOptions(path, "POST", (options ?? {}) as RequestOptions),
    ) as Promise<
      Result<InferApiData<Registry[Path]["POST"]>, InferApiError<Registry[Path]["POST"]>>
    >;
  }

  async put<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["PUT"]>,
  ): Promise<Result<InferApiData<Registry[Path]["PUT"]>, InferApiError<Registry[Path]["PUT"]>>> {
    return executeRequest(
      this.buildExecOptions(path, "PUT", (options ?? {}) as RequestOptions),
    ) as Promise<Result<InferApiData<Registry[Path]["PUT"]>, InferApiError<Registry[Path]["PUT"]>>>;
  }

  async patch<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["PATCH"]>,
  ): Promise<
    Result<InferApiData<Registry[Path]["PATCH"]>, InferApiError<Registry[Path]["PATCH"]>>
  > {
    return executeRequest(
      this.buildExecOptions(path, "PATCH", (options ?? {}) as RequestOptions),
    ) as Promise<
      Result<InferApiData<Registry[Path]["PATCH"]>, InferApiError<Registry[Path]["PATCH"]>>
    >;
  }

  async delete<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["DELETE"]>,
  ): Promise<
    Result<InferApiData<Registry[Path]["DELETE"]>, InferApiError<Registry[Path]["DELETE"]>>
  > {
    return executeRequest(
      this.buildExecOptions(path, "DELETE", (options ?? {}) as RequestOptions),
    ) as Promise<
      Result<InferApiData<Registry[Path]["DELETE"]>, InferApiError<Registry[Path]["DELETE"]>>
    >;
  }

  async getOrThrow<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["GET"]>,
  ): Promise<InferApiData<Registry[Path]["GET"]>> {
    const result = await this.get(path, options);
    if (!result.ok) throw result.error;
    return result.value;
  }

  async postOrThrow<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["POST"]>,
  ): Promise<InferApiData<Registry[Path]["POST"]>> {
    const result = await this.post(path, options);
    if (!result.ok) throw result.error;
    return result.value;
  }

  async putOrThrow<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["PUT"]>,
  ): Promise<InferApiData<Registry[Path]["PUT"]>> {
    const result = await this.put(path, options);
    if (!result.ok) throw result.error;
    return result.value;
  }

  async patchOrThrow<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["PATCH"]>,
  ): Promise<InferApiData<Registry[Path]["PATCH"]>> {
    const result = await this.patch(path, options);
    if (!result.ok) throw result.error;
    return result.value;
  }

  async deleteOrThrow<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["DELETE"]>,
  ): Promise<InferApiData<Registry[Path]["DELETE"]>> {
    const result = await this.delete(path, options);
    if (!result.ok) throw result.error;
    return result.value;
  }

  async stream<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["GET"]> & StreamOptions,
  ): Promise<
    Result<StreamResult<InferApiData<Registry[Path]["GET"]>, ApiClientError>, ApiClientError>
  > {
    const result = await executeRequest(
      this.buildExecOptions(path, "GET", (options ?? {}) as RequestOptions),
    );
    if (!result.ok) {
      return err(result.error as ApiClientError);
    }

    const response = (result as unknown as { value: { response: Response } }).value.response;

    try {
      const stream = await createStream(response, (chunk: string) => {
        try {
          const parsed = JSON.parse(chunk);
          return ok(parsed);
        } catch {
          return err({
            kind: "ResponseParseError",
            message: "Failed to parse stream chunk",
          } as ApiClientError);
        }
      });
      return ok(stream as StreamResult<InferApiData<Registry[Path]["GET"]>, ApiClientError>);
    } catch (error) {
      return err(unknownError(error));
    }
  }

  async sse<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["GET"]> & SseOptions,
  ): Promise<Result<SseStream<unknown, ApiClientError>, ApiClientError>> {
    const result = await executeRequest(
      this.buildExecOptions(path, "GET", (options ?? {}) as RequestOptions),
    );
    if (!result.ok) {
      return err(result.error as ApiClientError);
    }

    const response = (result as unknown as { value: { response: Response } }).value.response;
    const definition = this.getDefinition(path, "GET");
    const eventSchemas = (definition as Record<string, unknown>)["eventSchemas"] as
      | Record<string, never>
      | undefined;

    try {
      const sseStream = await createSseStream(
        response,
        (eventSchemas ?? {}) as Record<string, never>,
        options?.reconnect,
        this.config.fetch,
      );
      return ok(sseStream);
    } catch (error) {
      return err(unknownError(error));
    }
  }

  async websocket<Path extends keyof Sockets & string>(
    path: Path,
    options?: { search?: Record<string, unknown> } & WebSocketOptions,
  ): Promise<
    Result<WebSocketSession<Record<string, never>, Record<string, never>, unknown>, ApiClientError>
  > {
    const socketDef = this.sockets.get(path);
    if (!socketDef) {
      return err({
        kind: "UnknownError",
        message: `No socket registered for path: ${path}`,
      } as ApiClientError);
    }

    const baseUrl = this.config.baseUrl.replace(/\/+$/, "");
    let searchString = "";
    if (options?.search) {
      searchString = `?${(this.config.searchSerializer ?? defaultSearchSerializer)(
        options.search as Record<string, unknown>,
      ).toString()}`;
    }

    const wsUrl = baseUrl.replace(/^http/, "ws") + path + searchString;

    try {
      const session = await createWebSocketSession<
        Record<string, never>,
        Record<string, never>,
        unknown
      >(
        wsUrl,
        (socketDef.incoming ?? {}) as Record<string, never>,
        (socketDef.outgoing ?? {}) as Record<string, never>,
        socketDef.errorSchema ?? null,
        options,
      );
      return session;
    } catch (error) {
      return err(unknownError(error));
    }
  }
}

export function createApiClient(config: ClientConfig): ApiClient<{}, {}> {
  return new ApiClient(config);
}
