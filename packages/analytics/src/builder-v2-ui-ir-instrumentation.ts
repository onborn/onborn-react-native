import type {
  BuilderV2InstrumentationManifest,
  BuilderV2SignedUiIrArtifact,
  BuilderV2UiIrDocument,
  BuilderV2UiIrRelease,
} from "@onborn/sdk-contracts";

export type SignedScreenContext = {
  position: number;
  surface: "onboarding" | "paywall";
  /** The selections this screen declares, with every value it can hold. */
  answers: Map<string, Set<string | null>>;
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
    screens.set(screen.screenId, {
      position,
      surface: screen.surface,
      answers: indexScreenAnswers(screen),
    });
  });
  return screens;
}

/**
 * What each named selection on a screen is allowed to report.
 *
 * The initial value plus every value a `state.set` action in the same screen
 * can write. Reporting is then bounded by the document itself: a runtime that
 * claimed some other answer is claiming the screen could produce a value it
 * demonstrably cannot.
 */
function indexScreenAnswers(
  screen: BuilderV2UiIrDocument["screens"][number],
): Map<string, Set<string | null>> {
  const answers = new Map<string, Set<string | null>>();
  for (const [name, state] of Object.entries(screen.state ?? {})) {
    answers.set(name, new Set<string | null>([state.initial]));
  }
  collectStateSetValues(screen.root, answers);
  return answers;
}

function collectStateSetValues(
  node: unknown,
  answers: Map<string, Set<string | null>>,
): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectStateSetValues(item, answers);
    return;
  }
  const record = node as Record<string, unknown>;
  if (
    record.type === "state.set" &&
    typeof record.state === "string" &&
    (typeof record.value === "string" || record.value === null)
  ) {
    const values = answers.get(record.state);
    if (values) values.add(record.value as string | null);
  }
  for (const value of Object.values(record)) {
    collectStateSetValues(value, answers);
  }
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
