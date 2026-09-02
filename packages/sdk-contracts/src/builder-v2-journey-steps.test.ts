import assert from "node:assert/strict";
import test from "node:test";
import { builderV2JourneySteps } from "./builder-v2-journey-steps";

const when = (equals: string) => ({ state: "fit", equals });

test("the screens an answer chooses between are one step", () => {
  const steps = builderV2JourneySteps([
    { screenId: "welcome" },
    {
      screenId: "fit",
      next: [
        { to: "newbie", when: when("not_fit") },
        { to: "athlete", when: when("athlete") },
        { to: "standard" },
      ],
    },
    { screenId: "newbie", next: "reserves" },
    { screenId: "standard", next: "reserves" },
    { screenId: "athlete", next: "reserves" },
    { screenId: "reserves" },
  ]);
  assert.equal(steps.total, 4);
  assert.deepEqual([...steps.stepOf], [
    ["welcome", 0],
    ["fit", 1],
    ["newbie", 2],
    ["standard", 2],
    ["athlete", 2],
    ["reserves", 3],
  ]);
  assert.deepEqual([...steps.branches], [["fit", ["newbie", "athlete", "standard"]]]);
});

test("a default route that is the rejoin point stays a step of its own", () => {
  const steps = builderV2JourneySteps([
    { screenId: "fit", next: [{ to: "athlete", when: when("athlete") }, { to: "reserves" }] },
    { screenId: "athlete", next: "reserves" },
    { screenId: "reserves" },
  ]);
  assert.equal(steps.total, 3);
  assert.deepEqual([...steps.branches], [["fit", ["athlete"]]]);
  assert.equal(steps.stepOf.get("reserves"), 2);
});

test("a plain walk counts every screen, and IR-shaped routes read the same", () => {
  const plain = builderV2JourneySteps([
    { screenId: "a", next: "c" },
    { screenId: "b", next: [{ to: "c" }] },
    { screenId: "c" },
  ]);
  assert.equal(plain.total, 3);
  assert.equal(plain.branches.size, 0);
});
