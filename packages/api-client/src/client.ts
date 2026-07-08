import type { Result } from "@result-notation/core";
import { ok, err } from "@result-notation/core";
import type { EndpointRegistry, EndpointDefinition, RequestOptions, StandardSchema } from "./types";
import type { Interceptor } from "./interceptor";
import type { ApiClientError, HttpError } from "./errors";
import { unknownError } from "./errors";
import type { SearchSerializer, BodySerializer } from "./serializers";
import { executeRequest } from "./request";
import type { ExecuteOptions } from "./request";
import type { StreamResult, StreamOptions } from "./stream";
import { createStream } from "./stream";

export type ClientConfig = {
  baseUrl: string;
  baseHeaders?: HeadersInit;
  searchSerializer?: SearchSerializer;
  bodySerializer?: BodySerializer;
  normalizeResponse?: (body: unknown) => unknown;
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

export type InferApiOptions<Def> = Omit<RequestOptions, "params" | "search" | "body"> &
  (Def extends { paramsSchema: StandardSchema<infer TInput> } ? { params: TInput } : {}) &
  (Def extends { searchSchema: StandardSchema<infer TInput> } ? { search: TInput } : {}) &
  (Def extends { bodySchema: StandardSchema<infer TInput> } ? { body: TInput } : {});

export class ApiClient<Registry extends EndpointRegistry = {}> {
  private config: ClientConfig;
  private interceptors: Interceptor[];
  private routes: Map<string, Partial<Record<string, EndpointDefinition>>>;

  constructor(config: ClientConfig) {
    this.config = config;
    this.interceptors = [];
    this.routes = new Map();
  }

  use(interceptor: Interceptor): this {
    this.interceptors.push(interceptor);
    return this;
  }

  registerRoutes<const NewRegistry extends EndpointRegistry>(
    registry: NewRegistry,
  ): ApiClient<Registry & NewRegistry> {
    for (const [path, methods] of Object.entries(registry)) {
      const existing = this.routes.get(path) ?? {};
      for (const [method, def] of Object.entries(methods as Record<string, EndpointDefinition>)) {
        existing[method] = def;
      }
      this.routes.set(path, existing);
    }
    return this as unknown as ApiClient<Registry & NewRegistry>;
  }

  private getDefinition(path: string, method: string): EndpointDefinition | undefined {
    const methods = this.routes.get(path);
    if (!methods) return undefined;
    return methods[method];
  }

  private mergeHeaders(base?: HeadersInit, override?: HeadersInit): HeadersInit | undefined {
    if (!base && !override) return undefined;
    const merged = new Headers(base);
    if (override) {
      const overrideHeaders = new Headers(override);
      for (const [key, value] of overrideHeaders.entries()) {
        merged.set(key, value);
      }
    }
    return merged;
  }

  private buildExecOptions(path: string, method: string, options: {}): ExecuteOptions {
    const definition = this.getDefinition(path, method) ?? {};
    const reqOptions = options as RequestOptions;
    const mergedHeaders = this.mergeHeaders(this.config.baseHeaders, reqOptions.headers);
    const execOpts: ExecuteOptions = {
      method,
      baseUrl: this.config.baseUrl,
      path,
      definition,
      options: {
        ...reqOptions,
        ...(mergedHeaders ? { headers: mergedHeaders } : {}),
      },
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
    return executeRequest(this.buildExecOptions(path, "GET", options ?? {})) as Promise<
      Result<InferApiData<Registry[Path]["GET"]>, InferApiError<Registry[Path]["GET"]>>
    >;
  }

  async post<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["POST"]>,
  ): Promise<Result<InferApiData<Registry[Path]["POST"]>, InferApiError<Registry[Path]["POST"]>>> {
    return executeRequest(this.buildExecOptions(path, "POST", options ?? {})) as Promise<
      Result<InferApiData<Registry[Path]["POST"]>, InferApiError<Registry[Path]["POST"]>>
    >;
  }

  async put<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["PUT"]>,
  ): Promise<Result<InferApiData<Registry[Path]["PUT"]>, InferApiError<Registry[Path]["PUT"]>>> {
    return executeRequest(this.buildExecOptions(path, "PUT", options ?? {})) as Promise<
      Result<InferApiData<Registry[Path]["PUT"]>, InferApiError<Registry[Path]["PUT"]>>
    >;
  }

  async patch<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["PATCH"]>,
  ): Promise<
    Result<InferApiData<Registry[Path]["PATCH"]>, InferApiError<Registry[Path]["PATCH"]>>
  > {
    return executeRequest(this.buildExecOptions(path, "PATCH", options ?? {})) as Promise<
      Result<InferApiData<Registry[Path]["PATCH"]>, InferApiError<Registry[Path]["PATCH"]>>
    >;
  }

  async delete<Path extends keyof Registry & string>(
    path: Path,
    options?: InferApiOptions<Registry[Path]["DELETE"]>,
  ): Promise<
    Result<InferApiData<Registry[Path]["DELETE"]>, InferApiError<Registry[Path]["DELETE"]>>
  > {
    return executeRequest(this.buildExecOptions(path, "DELETE", options ?? {})) as Promise<
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
    const result = await executeRequest(this.buildExecOptions(path, "GET", options ?? {}));
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
}

export function createApiClient(config: ClientConfig): ApiClient<{}> {
  return new ApiClient(config);
}
