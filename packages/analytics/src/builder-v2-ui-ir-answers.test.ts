import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BuilderV2SignedUiIrArtifactSchema,
  BuilderV2UiIrDocumentSchema,
  BuilderV2UiIrReleaseSchema,
  type BuilderV2RuntimeEvent,
} from "@onborn/sdk-contracts";
import { createBuilderV2UiIrAnalyticsBridge } from "./builder-v2-ui-ir";
import { BuilderV2RuntimeEventMapper } from "./builder-v2-runtime";

const ARTIFACT_ID = "a".repeat(64);
const RELEASE_ID = "b".repeat(64);
const SOURCE_HASH = "c".repeat(64);
const MANIFEST_HASH = "d".repeat(64);
const CONTENT_HASH = "e".repeat(64);
const REVISION_ID = "82fb0833-63c4-47d2-954f-20a504c4b1b2";

describe("Builder V2 quiz answers", () => {
  it("reports the selections a quiz screen declares", async () => {
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

    await bridge.track({ event: "screen.viewed", screenId: "goal" });
    await bridge.track({
      event: "screen.completed",
      screenId: "goal",
      properties: { answers: { goal: "lose_weight" } },
    });

    assert.deepEqual(emitted[1]?.action, {
      type: "screen_completed",
      screenId: "goal",
      answers: { goal: "lose_weight" },
    });
  });

  it("drops an answer the document cannot produce", async () => {
    const emitted: BuilderV2RuntimeEvent[] = [];
    const bridge = createBuilderV2UiIrAnalyticsBridge({
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

    await bridge.track({
      event: "screen.completed",
      screenId: "goal",
      properties: {
        answers: { goal: "something-nobody-declared", other: "value" },
      },
    });

    assert.deepEqual(emitted[0]?.action, {
      type: "screen_completed",
      screenId: "goal",
    });
  });

  it("carries the answer into the dashboard step_completed event", () => {
    const mapper = new BuilderV2RuntimeEventMapper();
    const mapped = mapper.map({
      schemaVersion: 1,
      action: {
        type: "screen_completed",
        screenId: "goal",
        answers: { goal: "gain_muscle" },
      },
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

    assert.equal(mapped.input.type, "step_completed");
    assert.deepEqual(
      (mapped.input as { answer?: unknown }).answer,
      { goal: "gain_muscle" },
    );
  });
});

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
        entryScreenId: "goal",
        screens: [
          {
            screenId: "goal",
            file: "screens/Goal.tsx",
            position: 0,
            surface: "onboarding",
          },
        ],
        nodes: [
          {
            nodeId: "goal.root",
            screenId: "goal",
            file: "screens/Goal.tsx",
            component: "View",
            sourceRange: { start: 0, end: 200, line: 1, column: 1 },
          },
        ],
        interactions: [],
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
    entryScreenId: "goal",
    screens: [
      {
        screenId: "goal",
        surface: "onboarding",
        state: { goal: { initial: null } },
        root: {
          id: "goal.root",
          type: "view",
          source: sourceRef(0, 200),
          children: [
            {
              id: "goal.lose",
              type: "pressable",
              source: sourceRef(20, 80),
              action: { type: "state.set", state: "goal", value: "lose_weight" },
              children: [],
            },
            {
              id: "goal.gain",
              type: "pressable",
              source: sourceRef(90, 150),
              action: { type: "state.set", state: "goal", value: "gain_muscle" },
              children: [],
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
  return { file: "screens/Goal.tsx", start, end };
}
