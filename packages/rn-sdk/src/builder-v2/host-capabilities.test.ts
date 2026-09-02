import assert from "node:assert/strict";
import test from "node:test";

import {
  createOnbornCapabilityPort,
  hostCapabilityNames,
} from "./host-capabilities";

/** A renderer that draws nothing; these tests are about promises, not pixels. */
const RENDERERS = { lottie: () => null, video: () => null };

/*
 * The manifest is a promise. An app that never lent a notifications
 * implementation must not have one promised on its behalf, or a flow asking
 * for permissions would be judged compatible and then fail on the device —
 * strictly worse than the clean incompatibility it replaces.
 */
test("an app that lends nothing promises nothing and gets no port", () => {
  assert.deepEqual(hostCapabilityNames(undefined), []);
  assert.deepEqual(hostCapabilityNames({}), []);
  assert.equal(createOnbornCapabilityPort({}, RENDERERS), undefined);
});

test("a lent capability is both promised and invocable", async () => {
  const calls: string[] = [];
  const capabilities = {
    notifications: {
      requestPermission: async () => {
        calls.push("requestPermission");
        return { status: "granted" as const, canAskAgain: true };
      },
      getPermissionStatus: async () => ({
        status: "granted" as const,
        canAskAgain: true,
      }),
      schedule: async () => ({
        status: "scheduled" as const,
        notificationId: "n-1",
      }),
    },
  };

  assert.deepEqual(hostCapabilityNames(capabilities), ["notifications"]);
  const port = createOnbornCapabilityPort(capabilities, RENDERERS);
  await port?.invoke({
    capability: "notifications",
    method: "requestPermission",
    screenId: "permissions",
    nodeId: "cta",
  });

  assert.deepEqual(calls, ["requestPermission"]);
});

test("a capability the app never lent fails loudly rather than silently", async () => {
  // Silence here would look like a granted permission that never happened.
  const port = createOnbornCapabilityPort(
    {
      notifications: {
        requestPermission: async () => ({
          status: "granted" as const,
          canAskAgain: true,
        }),
        getPermissionStatus: async () => ({
          status: "granted" as const,
          canAskAgain: true,
        }),
        schedule: async () => ({
          status: "scheduled" as const,
          notificationId: "n-1",
        }),
      },
    },
    RENDERERS,
  );

  await assert.rejects(
    () =>
      Promise.resolve(
        port!.invoke({
          capability: "camera",
          method: "capture",
          screenId: "photo",
          nodeId: "cta",
        }),
      ),
    /did not provide the "camera" capability/,
  );
});

/*
 * Generalised from notifications rather than shipped natively, which is the
 * whole point of lending: an app pays for the modules it actually uses, and
 * one that never asks for the camera does not gain a camera permission prompt
 * because the SDK bundled it.
 *
 * Every capability goes through one table, so adding the next one cannot come
 * with its own private notion of what "declared" means — that gap is exactly
 * what left `notifications` compiled, enumerated, and never promised.
 */
test("every lent capability is declared, and only the lent ones", () => {
  const haptics = { trigger: async () => {} };
  const camera = {
    getPermissionStatus: async () => "granted" as const,
    requestPermission: async () => "granted" as const,
    capture: async () => ({ status: "cancelled" as const }),
  };

  assert.deepEqual(hostCapabilityNames({ haptics }), ["haptics"]);
  assert.deepEqual(hostCapabilityNames({ camera, haptics }).sort(), [
    "camera",
    "haptics",
  ]);
});

test("a lent capability routes every one of its methods", async () => {
  const calls: string[] = [];
  const port = createOnbornCapabilityPort(
    {
      haptics: {
        trigger: async (style) => {
          calls.push(`trigger:${style}`);
        },
      },
    },
    RENDERERS,
  );

  await port?.invoke({
    capability: "haptics",
    method: "trigger",
    input: "medium",
    screenId: "quiz",
    nodeId: "option",
  });

  assert.deepEqual(calls, ["trigger:medium"]);
});

test("an unknown method on a lent capability is refused", async () => {
  // Silence would look like a haptic that fired and did nothing.
  const port = createOnbornCapabilityPort(
    {
      haptics: { trigger: async () => {} },
    },
    RENDERERS,
  );

  await assert.rejects(
    () =>
      Promise.resolve(
        port!.invoke({
          capability: "haptics",
          method: "vibrateForever",
          screenId: "quiz",
          nodeId: "option",
        }),
      ),
    /vibrateForever/,
  );
});

/*
 * The player is lent the way the camera is. An artifact whose screen plays an
 * animation compiles to a "lottie" requirement; a host that lent nothing is
 * judged incompatible up front, and a host that lent the component renders
 * the animation the runtime resolved from the artifact.
 */
test("a lent Lottie player is promised and renders the node through the port", () => {
  const LottieView = () => null;
  const capabilities = { lottie: { LottieView } };
  const rendered: unknown[] = [];

  assert.deepEqual(hostCapabilityNames(capabilities), ["lottie"]);
  const port = createOnbornCapabilityPort(capabilities, {
    lottie: (props) => {
      rendered.push(props);
      return null;
    },
  });
  port?.render({
    screenId: "welcome",
    nodeId: "hero",
    capability: "lottie",
    component: "LottieView",
    props: { animation: { v: "5.7.4", layers: [] }, loop: true, speed: 0.8 },
  });

  assert.deepEqual(rendered, [
    {
      LottieView,
      animation: { v: "5.7.4", layers: [] },
      loop: true,
      speed: 0.8,
    },
  ]);
});

test("a Lottie node on a host that lent no player fails with the fix named", () => {
  const port = createOnbornCapabilityPort(
    {
      haptics: { trigger: async () => {} },
    },
    RENDERERS,
  );
  assert.throws(
    () =>
      port?.render({
        screenId: "welcome",
        nodeId: "hero",
        capability: "lottie",
        component: "LottieView",
        props: { animation: {}, loop: true },
      }),
    /lottie-react-native/,
  );
});

/*
 * Sign-in is a handoff: the flow's button, the app's meaning. The artifact
 * never renders credentials, so the whole capability is two callbacks.
 */
test("lent auth callbacks are promised and routed", async () => {
  const calls: string[] = [];
  const capabilities = {
    auth: {
      signIn: async () => {
        calls.push("signIn");
      },
      signUp: async () => {
        calls.push("signUp");
      },
    },
  };

  assert.deepEqual(hostCapabilityNames(capabilities), ["auth"]);
  const port = createOnbornCapabilityPort(capabilities, RENDERERS);
  await port?.invoke({
    capability: "auth",
    method: "signIn",
    screenId: "welcome",
    nodeId: "sign-in",
  });

  assert.deepEqual(calls, ["signIn"]);
});

/*
 * The video player is lent the way the Lottie player is. A screen playing a
 * clip compiles to a "video" requirement; a host that lent nothing is judged
 * incompatible up front, and one that lent expo-video plays the file the
 * runtime staged from the artifact.
 */
test("a lent video player is promised and renders the node through the port", () => {
  const VideoView = () => null;
  const useVideoPlayer = () => ({ loop: true, muted: true, play() {}, pause() {} });
  const capabilities = { video: { VideoView, useVideoPlayer } };
  const rendered: unknown[] = [];

  assert.deepEqual(hostCapabilityNames(capabilities), ["video"]);
  const port = createOnbornCapabilityPort(capabilities, {
    lottie: () => null,
    video: (props) => {
      rendered.push(props);
      return null;
    },
  });
  port?.render({
    screenId: "thankYou",
    nodeId: "clip",
    capability: "video",
    component: "VideoView",
    props: { uri: "file:///cache/clip.mp4", loop: false, resizeMode: "contain" },
  });

  assert.deepEqual(rendered, [
    {
      video: capabilities.video,
      uri: "file:///cache/clip.mp4",
      loop: false,
      muted: true,
      resizeMode: "contain",
    },
  ]);
  assert.throws(
    () =>
      createOnbornCapabilityPort({ lottie: { LottieView: () => null } }, RENDERERS)?.render({
        screenId: "thankYou",
        nodeId: "clip",
        capability: "video",
        component: "VideoView",
        props: { uri: "file:///cache/clip.mp4" },
      }),
    /did not lend a video player/,
  );
});
