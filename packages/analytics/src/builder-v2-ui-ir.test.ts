import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BuilderV2SignedUiIrArtifactSchema,
  BuilderV2UiIrDocumentSchema,
  BuilderV2UiIrReleaseSchema,
  type BuilderV2RuntimeEvent,
} from "@onborn/sdk-contracts";
import { createBuilderV2UiIrAnalyticsBridge } from "./builder-v2-ui-ir";

const ARTIFACT_ID = "a".repeat(64);
const RELEASE_ID = "b".repeat(64);
const SOURCE_HASH = "c".repeat(64);
const MANIFEST_HASH = "d".repeat(64);
const CONTENT_HASH = "e".repeat(64);
const REVISION_ID = "82fb0833-63c4-47d2-954f-20a504c4b1b2";

describe("Builder V2 UI IR analytics bridge", () => {
  it("emits lifecycle and interaction events from signed instrumentation", async () => {
    const emitted: BuilderV2RuntimeEvent[] = [];
    const bridge = createBuilderV2UiIrAnalyticsBridge({
      flowId: "flow-runtime",
      environment: "test",
      target: "ios",
      artifact: artifact(),
      release: release(),
      document: document(),
      sessionId: "session-runtime",
      now: () => new Date("2026-07-30T10:00:00.000Z"),
      emit: (event) => {
        emitted.push(event);
      },
    });

    await bridge.track({ event: "journey.started" });
    await bridge.track({
      event: "screen.viewed",
      screenId: "welcome",
    });
    await bridge.track({
      event: "ui_interaction",
      screenId: "welcome",
      nodeId: "welcome.cta",
    });

    assert.equal(emitted.length, 3);
    assert.deepEqual(emitted[0]?.action, { type: "flow_started" });
    assert.deepEqual(emitted[1], {
      schemaVersion: 1,
      action: { type: "screen_viewed", screenId: "welcome" },
      flowId: "flow-runtime",
      flowName: "Runtime flow",
      sessionId: "session-runtime",
      environment: "test",
      target: "ios",
      runtimeVersion: "onborn-runtime-1",
      artifactId: ARTIFACT_ID,
      releaseId: RELEASE_ID,
      occurredAt: "2026-07-30T10:00:00.000Z",
      screenContext: { position: 0, surface: "onboarding" },
    });
    assert.deepEqual(emitted[2]?.action, {
      type: "interaction_triggered",
      screenId: "welcome",
      nodeId: "welcome.cta",
      interactionId: "welcome.cta:press",
      kind: "press",
    });
  });

  it("emits custom events only with signed screen and node context", async () => {
    const emitted: BuilderV2RuntimeEvent[] = [];
    const bridge = createBridge(emitted);

    await bridge.track({
      event: "quiz_answered",
      screenId: "welcome",
      nodeId: "welcome.cta",
      properties: { answer: "strength", score: 3 },
    });

    assert.deepEqual(emitted[0]?.action, {
      type: "custom_event",
      screenId: "welcome",
      nodeId: "welcome.cta",
      eventName: "quiz_answered",
      properties: { answer: "strength", score: 3 },
    });
  });

  it("rejects unsigned nodes before analytics transport", async () => {
    const emitted: BuilderV2RuntimeEvent[] = [];
    const bridge = createBridge(emitted);

    await assert.rejects(
      bridge.track({
        event: "ui_interaction",
        screenId: "welcome",
        nodeId: "model-invented-node",
      }),
      /unsigned node/,
    );
    assert.equal(emitted.length, 0);
  });

  it("rejects instrumentation that does not match the signed document", () => {
    const invalidArtifact = artifact();
    invalidArtifact.manifest.instrumentation!.screens[0]!.position = 1;

    assert.throws(
      () =>
        createBuilderV2UiIrAnalyticsBridge({
          flowId: "flow-runtime",
          environment: "test",
          target: "ios",
          artifact: invalidArtifact,
          release: release(),
          document: document(),
          sessionId: "session-runtime",
          emit: () => undefined,
        }),
      /does not match/,
    );
  });
});

function createBridge(emitted: BuilderV2RuntimeEvent[]) {
  return createBuilderV2UiIrAnalyticsBridge({
    flowId: "flow-runtime",
    environment: "test",
    target: "ios",
    artifact: artifact(),
    release: release(),
    document: document(),
    sessionId: "session-runtime",
    emit: (event) => {
      emitted.push(event);
    },
  });
}

function artifact() {
  return BuilderV2SignedUiIrArtifactSchema.parse({
    manifest: {
      schemaVersion: 1,
      artifactId: ARTIFACT_ID,
      runtimeVersion: "onborn-runtime-1",
      format: "onborn-ui-ir-v1",
      target: "universal",
      source: source(),
      entry: { documentFile: "ui-ir/document.json" },
      files: [
        {
          path: "ui-ir/document.json",
          role: "document",
          contentHash: CONTENT_HASH,
          byteLength: 512,
        },
      ],
      requiredCapabilities: [],
      instrumentation: {
        schemaVersion: 1,
        entryScreenId: "welcome",
        screens: [
          {
            screenId: "welcome",
            file: "screens/Welcome.tsx",
            position: 0,
            surface: "onboarding",
          },
        ],
        nodes: [
          instrumentedNode("welcome.root", "View", 0, 120),
          instrumentedNode("welcome.cta", "Pressable", 40, 100),
          instrumentedNode("welcome.cta.label", "Text", 60, 80),
        ],
        interactions: [
          {
            interactionId: "welcome.cta:press",
            nodeId: "welcome.cta",
            screenId: "welcome",
            kind: "press",
          },
        ],
      },
    },
    signature: {
      schemaVersion: 1,
      algorithm: "ed25519",
      keyId: "testing-key",
      manifestHash: MANIFEST_HASH,
      value: "signed-value",
    },
  });
}

function release() {
  return BuilderV2UiIrReleaseSchema.parse({
    schemaVersion: 1,
    releaseId: RELEASE_ID,
    flowId: "flow-runtime",
    environment: "test",
    source: source(),
    runtimeVersion: "onborn-runtime-1",
    artifactId: ARTIFACT_ID,
    createdAt: "2026-07-30T09:00:00.000Z",
    activatedAt: "2026-07-30T09:01:00.000Z",
  });
}

function document() {
  return BuilderV2UiIrDocumentSchema.parse({
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "welcome",
    screens: [
      {
        screenId: "welcome",
        surface: "onboarding",
        root: {
          id: "welcome.root",
          type: "view",
          source: sourceRef(0, 120),
          children: [
            {
              id: "welcome.cta",
              type: "pressable",
              source: sourceRef(40, 100),
              action: { type: "navigation.complete" },
              children: [
                {
                  id: "welcome.cta.label",
                  type: "text",
                  source: sourceRef(60, 80),
                  text: { kind: "literal", value: "Continue" },
                },
              ],
            },
          ],
        },
      },
    ],
    assets: [],
    metadata: { flowName: "Runtime flow" },
  });
}

function source() {
  return {
    revisionId: REVISION_ID,
    sequence: 1,
    sourceHash: SOURCE_HASH,
    specificationLineage: null,
  };
}

function sourceRef(start: number, end: number) {
  return { file: "screens/Welcome.tsx", start, end };
}

function instrumentedNode(
  nodeId: string,
  component: string,
  start: number,
  end: number,
) {
  return {
    nodeId,
    screenId: "welcome",
    file: "screens/Welcome.tsx",
    component,
    sourceRange: { start, end, line: 1, column: start + 1 },
  };
}
