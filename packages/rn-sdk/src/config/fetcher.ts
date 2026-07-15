import {
  FlowConfigSchema,
  GetFlowResponseSchema,
  type FlowConfig,
  type GetFlowResponse,
} from "@onborn/sdk-contracts";
import { getOnbornApiBaseUrl } from "./runtime";

export type FlowFetchOptions = {
  flowId: string;
  apiKey: string;
  userId?: string;
  locale?: string;
  platform?: "ios" | "android";
  country?: string;
  appVersion?: string;
  userType?: "new" | "returning";
  fetchImpl?: typeof fetch;
};

export type FlowFetchResult = {
  config: FlowConfig;
  experiment?: NonNullable<GetFlowResponse["experiment"]>;
  paywalls?: GetFlowResponse["paywalls"];
};

export async function fetchFlow(options: FlowFetchOptions): Promise<FlowFetchResult> {
  const {
    flowId,
    apiKey,
    userId,
    locale,
    platform,
    country,
    appVersion,
    userType,
    fetchImpl = fetch,
  } = options;
  const base = getOnbornApiBaseUrl();
  const url = new URL(`${base}/flows/${encodeURIComponent(flowId)}`);
  if (userId) {
    url.searchParams.set("userId", userId);
  }
  if (locale) {
    url.searchParams.set("locale", locale);
  }
  appendRuntimeAudienceParams(url, {
    platform,
    country,
    appVersion,
    userType,
  });

  const response = await fetchImpl(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.error(
        `[onborn/rn-sdk] Invalid SDK API key. Received ${response.status} when fetching flow '${flowId}'.`,
      );
    }
    throw new Error(`Failed to fetch flow config (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  const parsed = GetFlowResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid flow response payload");
  }

  const configParsed = FlowConfigSchema.safeParse(parsed.data.config);
  if (!configParsed.success) {
    throw new Error("Invalid FlowConfig in response");
  }

  return {
    config: configParsed.data,
    experiment: parsed.data.experiment,
    paywalls: parsed.data.paywalls,
  };
}

export async function fetchFlowConfig(options: FlowFetchOptions): Promise<FlowConfig> {
  const result = await fetchFlow(options);
  return result.config;
}

function appendRuntimeAudienceParams(
  url: URL,
  params: {
    platform?: "ios" | "android";
    country?: string;
    appVersion?: string;
    userType?: "new" | "returning";
  },
): void {
  if (params.platform) {
    url.searchParams.set("platform", params.platform);
  }
  if (params.country) {
    url.searchParams.set("country", params.country);
  }
  if (params.appVersion) {
    url.searchParams.set("appVersion", params.appVersion);
  }
  if (params.userType) {
    url.searchParams.set("userType", params.userType);
  }
}
