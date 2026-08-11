import { z } from "zod";

import type { BuilderV2UiIrArtifactManifest } from "./builder-v2-ui-ir-artifact";
import {
  BuilderV2ArtifactTargetSchema,
  BuilderV2RuntimeCapabilitySchema,
  BuilderV2RuntimeVersionSchema,
} from "./builder-v2-runtime-platform";

export const BuilderV2UiIrHostManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    runtimeVersion: BuilderV2RuntimeVersionSchema,
    target: BuilderV2ArtifactTargetSchema,
    capabilities: z.array(BuilderV2RuntimeCapabilitySchema).max(64),
  })
  .strict()
  .superRefine((manifest, context) => {
    const names = new Set<string>();
    manifest.capabilities.forEach((capability, index) => {
      if (names.has(capability.name)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate capability "${capability.name}"`,
          path: ["capabilities", index, "name"],
        });
      }
      names.add(capability.name);
    });
  });

export type BuilderV2UiIrHostManifest = z.infer<
  typeof BuilderV2UiIrHostManifestSchema
>;

export type BuilderV2UiIrCompatibilityIssue =
  | {
      code: "target_mismatch";
      required: BuilderV2UiIrHostManifest["target"];
      actual: BuilderV2UiIrHostManifest["target"];
    }
  | {
      code: "runtime_version_mismatch";
      required: BuilderV2UiIrArtifactManifest["runtimeVersion"];
      actual: BuilderV2UiIrHostManifest["runtimeVersion"];
    }
  | {
      code: "capability_missing";
      name: BuilderV2UiIrArtifactManifest["requiredCapabilities"][number]["name"];
      minimumVersion: number;
    }
  | {
      code: "capability_version_too_low";
      name: BuilderV2UiIrArtifactManifest["requiredCapabilities"][number]["name"];
      minimumVersion: number;
      actualVersion: number;
    };

export type BuilderV2UiIrCompatibilityResult =
  | { compatible: true; issues: [] }
  | { compatible: false; issues: BuilderV2UiIrCompatibilityIssue[] };

export function evaluateBuilderV2UiIrCompatibility(
  artifact: BuilderV2UiIrArtifactManifest,
  requestedTarget: BuilderV2UiIrHostManifest["target"],
  host: BuilderV2UiIrHostManifest,
): BuilderV2UiIrCompatibilityResult {
  const issues: BuilderV2UiIrCompatibilityIssue[] = [];

  if (requestedTarget !== host.target) {
    issues.push({
      code: "target_mismatch",
      required: requestedTarget,
      actual: host.target,
    });
  }
  if (artifact.runtimeVersion !== host.runtimeVersion) {
    issues.push({
      code: "runtime_version_mismatch",
      required: artifact.runtimeVersion,
      actual: host.runtimeVersion,
    });
  }

  const hostCapabilities = new Map(
    host.capabilities.map((capability) => [capability.name, capability.version]),
  );
  for (const requirement of artifact.requiredCapabilities) {
    const actualVersion = hostCapabilities.get(requirement.name);
    if (actualVersion === undefined) {
      issues.push({
        code: "capability_missing",
        name: requirement.name,
        minimumVersion: requirement.minimumVersion,
      });
      continue;
    }
    if (actualVersion < requirement.minimumVersion) {
      issues.push({
        code: "capability_version_too_low",
        name: requirement.name,
        minimumVersion: requirement.minimumVersion,
        actualVersion,
      });
    }
  }

  return issues.length === 0
    ? { compatible: true, issues: [] }
    : { compatible: false, issues };
}
