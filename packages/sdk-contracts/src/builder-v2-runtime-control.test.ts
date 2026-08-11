import assert from "node:assert/strict";
import test from "node:test";
import { BuilderV2MobileRuntimeTargetSchema } from "./builder-v2-runtime-control.js";

test("mobile runtime control accepts native targets and rejects web", () => {
  assert.equal(BuilderV2MobileRuntimeTargetSchema.parse("ios"), "ios");
  assert.equal(BuilderV2MobileRuntimeTargetSchema.parse("android"), "android");
  assert.equal(BuilderV2MobileRuntimeTargetSchema.safeParse("web").success, false);
});
