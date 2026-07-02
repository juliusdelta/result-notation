export type SearchSerializer = (params: Record<string, unknown>) => URLSearchParams;

export type BodySerializer = (body: unknown) => BodyInit | undefined;

export const defaultSearchSerializer: SearchSerializer = (params: Record<string, unknown>) => {
  const usp = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        usp.append(key, serializeValue(item));
      }
    } else {
      usp.set(key, serializeValue(value));
    }
  }

  return usp;
};

function serializeValue(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export const defaultJsonBodySerializer: BodySerializer = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  return JSON.stringify(body);
};

export const multipartBodySerializer: BodySerializer = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;

  const formData = new FormData();

  if (typeof body === "object" && body !== null) {
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          formData.append(key, String(item));
        }
      } else if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else {
        formData.set(key, String(value));
      }
    }
  }

  return formData;
};
