import type { BuilderV2ArtifactTarget } from "@onborn/sdk-contracts";

export type BuilderV2RuntimeEnvironment = "test" | "prod";

export const ONBORN_BUILDER_V2_API_BASE_URL =
  "https://api.testing.onborn.app";

export function resolveBuilderV2Environment(
  apiKey: string,
): BuilderV2RuntimeEnvironment {
  if (apiKey.startsWith("cf_test_")) return "test";
  if (apiKey.startsWith("cf_live_")) return "prod";
  throw new Error(
    "Onborn.init received an API key without a supported environment prefix.",
  );
}

export function resolveBuilderV2Target(
  platform: string,
): Extract<BuilderV2ArtifactTarget, "ios" | "android"> {
  if (platform === "ios" || platform === "android") return platform;
  throw new Error(
    `OnbornFlow requires an iOS or Android host, received "${platform}".`,
  );
}
