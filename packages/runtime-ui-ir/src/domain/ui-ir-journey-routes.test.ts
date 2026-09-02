import assert from "node:assert/strict";
import test from "node:test";

import type { BuilderV2UiIrDocument } from "@onborn/sdk-contracts";

import { createUiIrJourneyController } from "./ui-ir-journey";

const view = (id: string) => ({ id: `node:${id}`, type: "view" as const, children: [] });

function branchingDocument(): BuilderV2UiIrDocument {
  return {
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "fit",
    assets: [],
    screens: [
      {
        screenId: "fit",
        surface: "onboarding",
        state: { fit: { initial: null } },
        next: [
          { to: "fitBeginner", when: { state: "fit", equals: "beginner" } },
          { to: "fitAdvanced", when: { state: "fit", equals: "advanced" } },
          { to: "fitAverage" },
        ],
        root: view("fit"),
      },
      { screenId: "fitBeginner", surface: "onboarding", next: [{ to: "reserves" }], root: view("b") },
      { screenId: "fitAverage", surface: "onboarding", next: [{ to: "reserves" }], root: view("a") },
      { screenId: "fitAdvanced", surface: "onboarding", root: view("x") },
      { screenId: "reserves", surface: "onboarding", root: view("r") },
    ],
  };
}

/*
 * A fitness quiz shows one of three outros and then rejoins the path. The
 * journey used to be a list walked one step at a time, so every outro was
 * seen by everyone, in order.
 */
test("routes follow the answer, rejoin the path, and back retraces the walk", () => {
  let fit: string | null = null;
  const viewed: string[] = [];
  const controller = createUiIrJourneyController({
    document: branchingDocument(),
    onComplete: () => viewed.push("done"),
    onDismiss: () => undefined,
    onEvent: (event) => {
      if (event.type === "screen.viewed") viewed.push(event.screenId);
    },
    readVariables: () => (fit ? { fit } : {}),
  });
  controller.start();
  fit = "beginner";
  controller.next();
  assert.equal(controller.getState().activeScreenId, "fitBeginner");
  assert.equal(controller.getState().isFirst, false);
  controller.next();
  assert.equal(controller.getState().activeScreenId, "reserves");
  // Back retraces: reserves → fitBeginner → fit, never through fitAverage.
  controller.back();
  assert.equal(controller.getState().activeScreenId, "fitBeginner");
  controller.back();
  assert.equal(controller.getState().activeScreenId, "fit");
  assert.equal(controller.getState().isFirst, true);
  controller.back();
  assert.equal(controller.getState().activeScreenId, "fit");
  assert.deepEqual(viewed, ["fit", "fitBeginner", "reserves", "fitBeginner", "fit"]);
});

/*
 * Three outros for one question are one step of the walk: a bar that counted
 * them as three jumped past two screens nobody saw.
 */
test("branch members share one step of the progress", () => {
  let fit: string | null = "advanced";
  const controller = createUiIrJourneyController({
    document: branchingDocument(),
    onComplete: () => undefined,
    onDismiss: () => undefined,
    readVariables: () => (fit ? { fit } : {}),
  });
  controller.start();
  assert.deepEqual(
    [controller.getState().position, controller.getState().total],
    [0, 3],
  );
  controller.next();
  assert.equal(controller.getState().activeScreenId, "fitAdvanced");
  assert.equal(controller.getState().position, 1);
  fit = "beginner";
  controller.back();
  controller.next();
  assert.equal(controller.getState().activeScreenId, "fitBeginner");
  assert.equal(controller.getState().position, 1);
  controller.next();
  assert.deepEqual(
    [controller.getState().activeScreenId, controller.getState().position],
    ["reserves", 2],
  );
});

/*
 * Back from the outro used to land on the loading step, which filled again
 * and pushed the person forward again. The app this recreates goes straight
 * to the question.
 */
test("back skips a screen that leaves on its own", () => {
  const document: BuilderV2UiIrDocument = {
    schemaVersion: 1,
    format: "onborn-ui-ir-v1",
    entryScreenId: "question",
    assets: [],
    screens: [
      { screenId: "question", surface: "onboarding", root: view("q") },
      {
        screenId: "loading",
        surface: "onboarding",
        autoContinue: { afterMs: 500 },
        root: view("l"),
      },
      { screenId: "outro", surface: "onboarding", root: view("o") },
    ],
  };
  const controller = createUiIrJourneyController({
    document,
    onComplete: () => undefined,
    onDismiss: () => undefined,
  });
  controller.start();
  controller.next();
  assert.equal(controller.getState().activeScreenId, "loading");
  controller.next();
  assert.equal(controller.getState().activeScreenId, "outro");
  assert.equal(controller.getState().depth, 2);
  controller.back();
  assert.equal(controller.getState().activeScreenId, "question");
  assert.equal(controller.getState().depth, 0);
});

test("no answer takes the default route; an unrouted last screen completes", () => {
  const controller = createUiIrJourneyController({
    document: branchingDocument(),
    onComplete: () => undefined,
    onDismiss: () => undefined,
  });
  controller.start();
  controller.next();
  assert.equal(controller.getState().activeScreenId, "fitAverage");
  controller.next();
  assert.equal(controller.getState().activeScreenId, "reserves");
  assert.equal(controller.getState().isLast, true);
});
