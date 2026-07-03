import {
  FlowConfigSchema,
  GetFlowResponseSchema,
  GetOfferingResponseSchema,
  GetPaywallResponseSchema,
  CustomerEntitlementsResponseSchema,
  PurchaseValidationResponseSchema,
  type FlowConfig,
  type GetFlowResponse,
  type GetOfferingResponse,
  type GetPaywallResponse,
  type CustomerEntitlementsResponse,
  type PurchaseValidationResponse,
  type RestorePurchasesRequest,
  type ValidatePurchaseRequest,
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

export type PaywallFetchOptions = {
  paywallId: string;
  apiKey: string;
  userId?: string;
  locale?: string;
  platform?: "ios" | "android";
  country?: string;
  appVersion?: string;
  userType?: "new" | "returning";
  fetchImpl?: typeof fetch;
};

export type OfferingFetchOptions = {
  offeringId: string;
  apiKey: string;
  userId?: string;
  locale?: string;
  platform?: "ios" | "android";
  country?: string;
  appVersion?: string;
  fetchImpl?: typeof fetch;
};

export type PurchaseRequestOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export type CustomerEntitlementsFetchOptions = {
  apiKey: string;
  userId?: string;
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

export async function fetchPaywall(
  options: PaywallFetchOptions,
): Promise<GetPaywallResponse> {
  const {
    paywallId,
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
  const url = new URL(`${base}/paywalls/${encodeURIComponent(paywallId)}`);
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
        `[onborn/rn-sdk] Invalid SDK API key. Received ${response.status} when fetching paywall '${paywallId}'.`,
      );
    }
    throw new Error(`Failed to fetch paywall config (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  const parsed = GetPaywallResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid paywall response payload");
  }

  return parsed.data;
}

export async function fetchOffering(
  options: OfferingFetchOptions,
): Promise<GetOfferingResponse> {
  const {
    offeringId,
    apiKey,
    userId,
    locale,
    platform,
    country,
    appVersion,
    fetchImpl = fetch,
  } = options;
  const base = getOnbornApiBaseUrl();
  const url = new URL(`${base}/offerings/${encodeURIComponent(offeringId)}`);
  if (userId) {
    url.searchParams.set("userId", userId);
  }
  if (locale) {
    url.searchParams.set("locale", locale);
  }
  appendRuntimeAudienceParams(url, { platform, country, appVersion });

  const response = await fetchImpl(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      console.error(
        `[onborn/rn-sdk] Invalid SDK API key. Received ${response.status} when fetching offering '${offeringId}'.`,
      );
    }
    throw new Error(`Failed to fetch offering config (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  const parsed = GetOfferingResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid offering response payload");
  }

  return parsed.data;
}

export async function validatePurchaseRequest(
  options: PurchaseRequestOptions & {
    payload: ValidatePurchaseRequest;
  },
): Promise<PurchaseValidationResponse> {
  return sendPurchaseRequest("/purchases/validate", options);
}

export async function restorePurchasesRequest(
  options: PurchaseRequestOptions & {
    payload: RestorePurchasesRequest;
  },
): Promise<PurchaseValidationResponse> {
  return sendPurchaseRequest("/purchases/restore", options);
}

export async function fetchCustomerEntitlements(
  options: CustomerEntitlementsFetchOptions,
): Promise<CustomerEntitlementsResponse> {
  const { apiKey, userId, fetchImpl = fetch } = options;
  const base = getOnbornApiBaseUrl();
  const url = new URL(`${base}/entitlements`);
  if (userId) {
    url.searchParams.set("userId", userId);
  }

  const response = await fetchImpl(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch customer entitlements (${response.status})`);
  }

  const payload = (await response.json()) as unknown;
  const parsed = CustomerEntitlementsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid customer entitlements response payload");
  }

  return parsed.data;
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

async function sendPurchaseRequest(
  path: "/purchases/validate" | "/purchases/restore",
  options: PurchaseRequestOptions & {
    payload: ValidatePurchaseRequest | RestorePurchasesRequest;
  },
): Promise<PurchaseValidationResponse> {
  const { apiKey, fetchImpl = fetch, payload } = options;
  const base = getOnbornApiBaseUrl();
  const response = await fetchImpl(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Purchase request failed (${response.status})`);
  }

  const responsePayload = (await response.json()) as unknown;
  const parsed = PurchaseValidationResponseSchema.safeParse(responsePayload);
  if (!parsed.success) {
    throw new Error("Invalid purchase validation response payload");
  }

  return parsed.data;
}
