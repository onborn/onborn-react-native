import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  resolveBuilderV2Environment,
  resolveBuilderV2Target,
} from "./runtime-environment";
import { createBuilderV2HostManifest } from "./runtime-manifest";

test("derives the runtime environment from the initialized API key", () => {
  assert.equal(resolveBuilderV2Environment("cf_test_example"), "test");
  assert.equal(resolveBuilderV2Environment("cf_live_example"), "prod");
  assert.throws(
    () => resolveBuilderV2Environment("invalid"),
    /supported environment prefix/,
  );
});

test("accepts only native Builder V2 artifact targets", () => {
  assert.equal(resolveBuilderV2Target("ios"), "ios");
  assert.equal(resolveBuilderV2Target("android"), "android");
  assert.throws(() => resolveBuilderV2Target("web"), /iOS or Android host/);
});

test("advertises only capabilities implemented by the public host runtime", () => {
  const manifest = createBuilderV2HostManifest("ios");

  assert.deepEqual(
    manifest.capabilities.map(({ name }) => name),
    [
      "analytics",
      "assets",
      "billing",
      "google-fonts",
      "image",
      "linking",
      "localization",
      "navigation",
      "phosphor-icons",
      "safe-area",
    ],
  );
  assert.equal(manifest.runtimeVersion, "onborn-runtime-1");
  assert.equal(manifest.target, "ios");
});

/*
 * The manifest is a promise, and an unkept one fails silently: an artifact
 * requiring a capability the host does not name is judged incompatible, the
 * runtime quietly serves the previous release instead, and the flow someone
 * just published never appears on the device. That is how a published paywall
 * went missing with every other part of the chain green.
 *
 * Naming a capability is therefore checked against actually shipping the code
 * that backs it, so the promise cannot drift from the dependency list.
 */
test("every declared capability is backed by a package this SDK ships", () => {
  const manifest = createBuilderV2HostManifest("ios");
  const declared = new Set(manifest.capabilities.map(({ name }) => name));
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const shipped = {
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
  };

  for (const [capability, packageName] of [
    ["phosphor-icons", "phosphor-react-native"],
    ["google-fonts", "expo-font"],
    ["assets", "expo-file-system"],
  ] as const) {
    assert.ok(
      !declared.has(capability) || packageName in shipped,
      `the manifest promises "${capability}" but ${packageName} is not shipped`,
    );
  }
});

/*
 * The dialect has always compiled `runtime.notifications.requestPermission`,
 * the capability enum has always had "notifications", and the manifest has
 * never declared it — so the first flow to ask for permissions would have been
 * judged incompatible and the device would have quietly served the previous
 * release. Exactly the phosphor-icons failure, still waiting.
 *
 * Unlike phosphor, this one cannot simply be added to the list: notifications
 * need expo-notifications, a config plugin and platform permissions, which
 * belong to the host app and not to this SDK. So the promise is made only when
 * the host actually hands over a port to keep it.
 */
test("a host capability is promised only when the host supplies it", () => {
  const without = createBuilderV2HostManifest("ios");

  assert.ok(
    !without.capabilities.map(({ name }) => name).includes("notifications"),
  );

  const withNotifications = createBuilderV2HostManifest("ios", {
    hostCapabilities: ["notifications"],
  });

  assert.ok(
    withNotifications.capabilities
      .map(({ name }) => name)
      .includes("notifications"),
  );
});

test("host capabilities keep the manifest sorted and unique", () => {
  // The manifest is compared and cached elsewhere; a wobbling order would make
  // two identical hosts look like different ones.
  const manifest = createBuilderV2HostManifest("ios", {
    hostCapabilities: ["notifications", "notifications"],
  });
  const names = manifest.capabilities.map(({ name }) => name);

  assert.deepEqual(names, [...new Set(names)].sort());
});
