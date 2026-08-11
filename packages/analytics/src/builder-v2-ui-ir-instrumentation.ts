import type {
  BuilderV2InstrumentationManifest,
  BuilderV2SignedUiIrArtifact,
  BuilderV2UiIrDocument,
  BuilderV2UiIrRelease,
} from "@onborn/sdk-contracts";

export type SignedScreenContext = {
  position: number;
  surface: "onboarding" | "paywall";
};

export type SignedUiIrAnalyticsContext = {
  flowName: string;
  screens: Map<string, SignedScreenContext>;
  nodes: Set<string>;
  interactions: Map<
    string,
    BuilderV2InstrumentationManifest["interactions"][number]
  >;
};

export function readSignedUiIrAnalyticsContext(input: {
  flowId: string;
  environment: "test" | "prod";
  artifact: BuilderV2SignedUiIrArtifact;
  release: BuilderV2UiIrRelease;
  document: BuilderV2UiIrDocument;
}): SignedUiIrAnalyticsContext {
  assertReleaseMatches(input);
  const instrumentation = input.artifact.manifest.instrumentation;
  if (!instrumentation) {
    throw new Error("UI IR analytics requires signed instrumentation.");
  }
  const flowName = input.document.metadata?.flowName;
  if (typeof flowName !== "string" || !flowName.trim()) {
    throw new Error("UI IR analytics requires a signed flow name.");
  }
  return {
    flowName: flowName.trim(),
    screens: indexSignedScreens(input.document, instrumentation),
    nodes: new Set(instrumentation.nodes.map((node) => node.nodeId)),
    interactions: indexSignedInteractions(instrumentation),
  };
}

function assertReleaseMatches(input: {
  flowId: string;
  environment: "test" | "prod";
  artifact: BuilderV2SignedUiIrArtifact;
  release: BuilderV2UiIrRelease;
}): void {
  if (input.release.flowId !== input.flowId) {
    throw new Error("UI IR analytics release does not belong to this flow.");
  }
  if (input.release.environment !== input.environment) {
    throw new Error(
      "UI IR analytics release does not belong to this environment.",
    );
  }
  if (
    input.release.artifactId !== input.artifact.manifest.artifactId ||
    input.release.runtimeVersion !== input.artifact.manifest.runtimeVersion
  ) {
    throw new Error("UI IR analytics release and artifact do not match.");
  }
}

function indexSignedScreens(
  document: BuilderV2UiIrDocument,
  instrumentation: BuilderV2InstrumentationManifest,
): Map<string, SignedScreenContext> {
  if (
    instrumentation.entryScreenId !== document.entryScreenId ||
    instrumentation.screens.length !== document.screens.length
  ) {
    throw new Error("UI IR signed screen instrumentation is incomplete.");
  }
  const screens = new Map<string, SignedScreenContext>();
  document.screens.forEach((screen, position) => {
    const signed = instrumentation.screens[position];
    if (
      !signed ||
      signed.screenId !== screen.screenId ||
      signed.position !== position ||
      signed.surface !== screen.surface ||
      signed.placement !== screen.placement
    ) {
      throw new Error(
        `UI IR signed screen instrumentation does not match "${screen.screenId}".`,
      );
    }
    screens.set(screen.screenId, { position, surface: screen.surface });
  });
  return screens;
}

function indexSignedInteractions(
  instrumentation: BuilderV2InstrumentationManifest,
): SignedUiIrAnalyticsContext["interactions"] {
  const interactions: SignedUiIrAnalyticsContext["interactions"] = new Map();
  instrumentation.interactions.forEach((interaction) => {
    const key = interactionKey(
      interaction.screenId,
      interaction.nodeId,
    );
    if (interactions.has(key)) {
      throw new Error(
        `UI IR analytics has ambiguous interaction instrumentation for "${interaction.nodeId}".`,
      );
    }
    interactions.set(key, interaction);
  });
  return interactions;
}

export function interactionKey(screenId: string, nodeId: string): string {
  return `${screenId}\u0000${nodeId}`;
}
