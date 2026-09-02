import {
  BUILDER_V2_BUILT_IN_CAPABILITIES,
} from "@onborn/sdk-contracts/builder-v2-runtime-platform";
import type {
  BuilderV2ArtifactTarget,
  BuilderV2CapabilityName,
  BuilderV2UiIrHostManifest,
} from "@onborn/sdk-contracts";

/*
 * Derived from the contract's list rather than repeated here.
 *
 * The two copies were the same set by luck, and nothing on the authoring side
 * could read this one — so a run that declared a built-in capability was
 * refused by a check that had no way to know the runtime always provides it.
 */
const BUILT_IN_CAPABILITIES: BuilderV2UiIrHostManifest["capabilities"] =
  BUILDER_V2_BUILT_IN_CAPABILITIES.map((name) => ({ name, version: 1 }));

/**
 * Capabilities this SDK cannot promise on its own.
 *
 * Notifications, camera, haptics and store review need a native module, a
 * config plugin and platform permission strings, all of which belong to the
 * app embedding the SDK. The dialect has compiled
 * `runtime.notifications.requestPermission` from the beginning and the
 * manifest never declared it, so the first flow to ask for permissions would
 * have been judged incompatible and the device would have quietly served the
 * previous release — the phosphor-icons failure again, still waiting.
 *
 * Adding them to the list above would have been the wrong repair: it would
 * promise something the SDK cannot keep and move the failure from a clean
 * incompatibility to a crash. They are declared only when the host hands over
 * a port that implements them.
 */
export type BuilderV2HostCapability = Extract<
  BuilderV2CapabilityName,
  | "notifications"
  | "camera"
  | "haptics"
  | "lottie"
  | "video"
  | "auth"
  | "actions"
>;

export function createBuilderV2HostManifest(
  target: Extract<BuilderV2ArtifactTarget, "ios" | "android">,
  options?: { hostCapabilities?: readonly BuilderV2HostCapability[] },
): BuilderV2UiIrHostManifest {
  const hostCapabilities = [...new Set(options?.hostCapabilities ?? [])].map(
    (name) => ({ name, version: 1 }) as const,
  );
  return {
    schemaVersion: 1,
    runtimeVersion: "onborn-runtime-1",
    target,
    // Sorted, because the manifest is compared and cached: a wobbling order
    // would make two identical hosts look like different ones.
    capabilities: [...BUILT_IN_CAPABILITIES, ...hostCapabilities].sort(
      (left, right) => left.name.localeCompare(right.name),
    ),
  };
}
