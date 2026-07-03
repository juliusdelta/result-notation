# @result-notation

A type-safe Result monad and HTTP client toolkit for TypeScript.

## Packages

| Package                                                     | Description                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| [`@result-notation/core`](#result-notationcore)             | Lightweight Result monad with zero dependencies                 |
| [`@result-notation/api-client`](#result-notationapi-client) | Type-safe HTTP client with interceptors, schemas, and streaming |

---

## `@result-notation/core`

A `Result<T, E>` discriminated union — `Ok<T>` or `Err<E>` — that makes error handling explicit and type-safe without try/catch.

### Construction

```typescript
import { ok, err } from "@result-notation/core";

const success = ok(42);
const failure = err("something broke");
```

### Narrowing

```typescript
if (success.ok) {
  success.value; // 42
}

if (!failure.ok) {
  failure.error; // "something broke"
}
```

### `result.match`

```typescript
import { match } from "@result-notation/core";

match(result, {
  ok: (value) => `Got: ${value}`,
  error: (e) => `Error: ${e}`,
});
```

### `result.map`

```typescript
const doubled = result.map((n) => n * 2);
// Ok(84) or passes the Err through
```

### `result.unwrap` / `result.unwrapOr`

```typescript
result.unwrap(); // 42, or throws error on Err
result.unwrapOr(0); // 42, or 0 on Err
```

---

## `@result-notation/api-client`

A non-throwing, type-safe HTTP client built on `@result-notation/core`.

### Setup

```typescript
import { createApiClient } from "@result-notation/api-client";
import { z } from "zod";
```

### Basic request

```typescript
const api = createApiClient({ baseUrl: "https://api.example.com" }).registerRoutes({
  "/health": {
    GET: {
      responseSchema: z.object({ status: z.string() }),
    },
  },
});

const result = await api.get("/health");

if (result.ok) {
  result.value.status; // string
}
```

### Route params, search, and typed errors

```typescript
const api = createApiClient({ baseUrl: "https://api.example.com" }).registerRoutes({
  "/downloads/:downloadId": {
    GET: {
      paramsSchema: z.object({ downloadId: z.number() }),
      searchSchema: z.object({
        fields: z.array(z.string()).optional(),
      }),
      responseSchema: z.object({
        id: z.number(),
        name: z.string(),
        url: z.string(),
      }),
      errorSchemas: {
        404: z.object({ code: z.literal("NOT_FOUND"), message: z.string() }),
        403: z.object({ code: z.literal("FORBIDDEN") }),
      },
    },
  },
});

const result = await api.get("/downloads/:downloadId", {
  params: { downloadId: 42 },
  search: { fields: ["name", "url"] },
});

if (result.ok) {
  result.value.name;
} else if (result.error.kind === "HttpError" && result.error.status === 404) {
  result.error.body; // { code: "NOT_FOUND", message: string }
}
```

### POST with body validation

```typescript
const api = createApiClient({ baseUrl: "https://api.example.com" }).registerRoutes({
  "/items": {
    POST: {
      bodySchema: z.object({
        title: z.string(),
        price: z.number().positive(),
      }),
      responseSchema: z.object({ id: z.number() }),
    },
  },
});

const result = await api.post("/items", {
  body: { title: "Widget", price: 9.99 },
});
```

### Interceptors

Interceptors hook into the request lifecycle: `onRequest`, `onResponse`, `onError`.

```typescript
const authInterceptor = {
  name: "auth",
  onRequest: async (ctx) => {
    ctx.headers.set("Authorization", `Bearer ${getToken()}`);
    return ok(ctx);
  },
  onError: async (ctx) => {
    // Automatic retry on 401
    if (ctx.error.kind === "HttpError" && ctx.error.status === 401) {
      await refreshToken();
      return ctx.request.retry();
    }
    // Re-throw non-recoverable errors
    return err(ctx.error);
  },
};

const api = createApiClient({ baseUrl: "https://api.example.com" })
  .use(authInterceptor)
  .registerRoutes({
    "/me": { GET: { responseSchema: z.object({ name: z.string() }) } },
  });
```

### Throwing variant

Use `getOrThrow`, `postOrThrow`, etc. when you want conventional exceptions.

```typescript
const data = await api.getOrThrow("/health");
data.status; // string — throws ApiClientError on failure
```

### Streaming (newline-delimited JSON)

```typescript
const stream = await api.stream("/events");

for await (const event of stream) {
  if (event.ok) {
    event.value; // parsed JSON object per line
  }
}

await stream.cancel();
```

### Standalone utilities

Route parameter helpers:

```typescript
import { extractParams, substituteParams, matchPath } from "@result-notation/api-client";

extractParams("/downloads/:downloadId"); // ["downloadId"]
substituteParams("/downloads/:downloadId", { downloadId: 123 }); // "/downloads/123"
matchPath("/downloads/:downloadId", "/downloads/123"); // { downloadId: "123" }
```

Request pipeline (low level):

```typescript
import {
  executeRequest,
  executeRequestPipeline,
  defaultSearchSerializer,
  defaultJsonBodySerializer,
} from "@result-notation/api-client";
```

Validation:

```typescript
import { validate } from "@result-notation/api-client";

const result = await validate(z.object({ name: z.string() }), { name: "hello" });
// result.ok === true
```

Error construction:

```typescript
import { httpError, networkError, timeoutError } from "@result-notation/api-client";

httpError(404, { message: "Not found" }, new Headers());
networkError("Failed to connect");
timeoutError("Request timed out");
```

---

## Development

```bash
vp install        # Install dependencies
vp run -r test    # Run all tests
vp run -r build   # Build all packages
vp check          # Format, lint, type check
```
