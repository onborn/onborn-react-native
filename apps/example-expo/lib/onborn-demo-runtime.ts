import Constants from "expo-constants";

const DEFAULT_DEV_ONBORN_API_URL = "http://localhost:3002";
const SDK_OWNED_ONBORN_API_URLS = new Set([
  "api.testing.onborn.app",
  "api.onborn.app",
]);
const ONBORN_API_URL =
  process.env.EXPO_PUBLIC_ONBORN_API_URL?.trim() || inferLanApiUrl();

export const demoOnbornFetch: typeof fetch = (input, init) => {
  return fetch(rewriteOnbornRequest(input), init);
};

export function getDemoOnbornApiUrl(): string {
  return ONBORN_API_URL ?? DEFAULT_DEV_ONBORN_API_URL;
}

function rewriteOnbornRequest(input: RequestInfo | URL): RequestInfo | URL {
  if (!ONBORN_API_URL) {
    return input;
  }
  if (typeof input === "string") {
    return rewriteOnbornUrl(input);
  }
  if (input instanceof URL) {
    return new URL(rewriteOnbornUrl(input.toString()));
  }
  return input;
}

function rewriteOnbornUrl(value: string): string {
  try {
    const url = new URL(value);
    const fallback = new URL(DEFAULT_DEV_ONBORN_API_URL);
    const isLocalFallback =
      url.hostname === fallback.hostname && url.port === fallback.port;
    const isSdkOwnedApi = SDK_OWNED_ONBORN_API_URLS.has(url.hostname);
    if (isLocalFallback || isSdkOwnedApi) {
      const nextBase = new URL(ONBORN_API_URL!);
      url.protocol = nextBase.protocol;
      url.hostname = nextBase.hostname;
      url.port = nextBase.port;
    }
    return url.toString();
  } catch {
    return value;
  }
}

function inferLanApiUrl(): string | undefined {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    readNestedString(Constants, ["manifest2", "extra", "expoClient", "hostUri"]);
  if (!hostUri) {
    return undefined;
  }
  const host = hostUri.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return undefined;
  }
  return `http://${host}:3002`;
}

function readNestedString(value: unknown, path: string[]): string | undefined {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}
