const PARAM_REGEX = /:(\w+)/g;

export function extractParams(pattern: string): string[] {
  const params: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = PARAM_REGEX.exec(pattern)) !== null) {
    params.push(match[1]!);
  }
  return params;
}

export function substituteParams(pattern: string, params: Record<string, unknown>): string {
  return pattern.replace(PARAM_REGEX, (_, key: string) => {
    const value = params[key];
    if (value === undefined) {
      return `:${key}`;
    }
    return String(value as string | number | boolean);
  });
}

export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const paramNames = extractParams(pattern);
  const regexStr = pattern.replace(PARAM_REGEX, "([^/]+)");
  const regex = new RegExp(`^${regexStr}$`);
  const match = path.match(regex);
  if (!match) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    const value = match[i + 1];
    if (value !== undefined) {
      params[paramNames[i]!] = value;
    }
  }
  return params;
}
