import type {
  BuilderV2ProjectSurface,
  BuilderV2UiIrDocument,
} from "@onborn/sdk-contracts";

import type { UiIrStateValues } from "./ui-ir-state";

export type UiIrJourneyState = {
  activeScreenId: string;
  position: number;
  total: number;
  surface: BuilderV2ProjectSurface;
  isFirst: boolean;
  isLast: boolean;
};

export type UiIrJourneyEvent =
  | { type: "journey.started"; screenId: string }
  | { type: "screen.viewed"; screenId: string }
  | { type: "screen.completed"; screenId: string; answers?: UiIrStateValues }
  | { type: "screen.returned"; screenId: string }
  | { type: "journey.completed"; screenId: string }
  | { type: "journey.dismissed"; screenId: string }
  | { type: "paywall.viewed"; screenId: string; placement?: string }
  | { type: "paywall.dismissed"; screenId: string; placement?: string };

export type UiIrJourneyController = {
  getState(): UiIrJourneyState;
  subscribe(listener: (state: UiIrJourneyState) => void): () => void;
  start(): void;
  next(): void;
  back(): void;
  complete(): void;
  dismiss(): void;
  openPlacement(placement: string): void;
};

export function createUiIrJourneyController(input: {
  document: BuilderV2UiIrDocument;
  initialScreenId?: string;
  /**
   * Present one standalone paywall instead of walking the journey.
   *
   * The app asked for a paywall by name — a locked feature, a settings upsell —
   * so what it gets is that screen and nothing else: no next, no back, no
   * progress through anything. Everything else about it is unchanged, which is
   * the point: the same document, the same bindings, the same events.
   */
  placement?: string;
  /**
   * The delivery channel walking this journey: the app or the web funnel.
   *
   * One artifact composes both surfaces; a screen flagged for one channel
   * simply does not exist on the other — the welcome the ad already replaced,
   * the extra quiz question only the funnel asks. Absent means every screen,
   * which is what a canvas preview wants.
   */
  channel?: "app" | "web";
  onComplete: () => void;
  onDismiss: () => void;
  onEvent?: (event: UiIrJourneyEvent) => void;
  /**
   * The selections the screen currently holds. Read at completion time rather
   * than tracked here, so a quiz answer is reported as the user left it.
   */
  readAnswers?: (screenId: string) => UiIrStateValues | undefined;
}): UiIrJourneyController {
  /*
   * The journey is the screens someone walks, which is not every screen in the
   * document. A standalone paywall ships in the same artifact and is opened by
   * the app where it decides, so counting it here would put a purchase screen
   * in the middle of an onboarding nobody routed there, and would make
   * "step 3 of 5" a lie on every screen before it.
   */
  const presented = input.placement
    ? input.document.screens.find(
        (screen) =>
          screen.placement === input.placement && screen.surface === "paywall",
      )
    : undefined;
  if (input.placement && !presented) {
    throw new Error(
      `UI IR paywall placement "${input.placement}" is not declared.`,
    );
  }
  const screens = presented
    ? [presented]
    : input.document.screens.filter(
        (screen) =>
          !screen.standalone &&
          (!input.channel ||
            !screen.channels ||
            screen.channels.includes(input.channel)),
      );
  const requestedInitial = presented?.screenId ?? input.initialScreenId;
  const initialScreenId = requestedInitial ?? input.document.entryScreenId;
  let position = screens.findIndex(
    (screen) => screen.screenId === initialScreenId,
  );
  /*
   * "Skip the welcome on web" can filter out the entry screen itself: the
   * document's entryScreenId names the app's first screen, and this channel
   * does not have it. The document default softens to the first screen the
   * channel does have; a screen the host asked for by name still throws,
   * because that is a wiring bug, not a composition.
   */
  if (position < 0 && !requestedInitial && screens.length > 0) {
    position = 0;
  }
  if (position < 0) {
    const standalone = input.document.screens.some(
      (screen) => screen.screenId === initialScreenId && screen.standalone,
    );
    throw new Error(
      standalone
        ? `UI IR screen "${initialScreenId}" is a standalone paywall and is presented by placement, not walked to.`
        : `UI IR initial screen "${initialScreenId}" is not declared.`,
    );
  }

  let started = false;
  let terminal = false;
  const listeners = new Set<(state: UiIrJourneyState) => void>();

  const getState = (): UiIrJourneyState => {
    const screen = requiredScreen(screens, position);
    return Object.freeze({
      activeScreenId: screen.screenId,
      position,
      total: screens.length,
      surface: screen.surface,
      isFirst: position === 0,
      isLast: position === screens.length - 1,
    });
  };

  const emitViewed = (): void => {
    const screen = requiredScreen(screens, position);
    input.onEvent?.({ type: "screen.viewed", screenId: screen.screenId });
    if (screen.surface === "paywall") {
      input.onEvent?.({
        type: "paywall.viewed",
        screenId: screen.screenId,
        ...(screen.placement ? { placement: screen.placement } : {}),
      });
    }
  };

  const notify = (): void => {
    const state = getState();
    listeners.forEach((listener) => listener(state));
  };

  const completedEvent = (screenId: string): UiIrJourneyEvent => {
    const answers = input.readAnswers?.(screenId);
    return {
      type: "screen.completed",
      screenId,
      ...(answers ? { answers } : {}),
    };
  };

  const complete = (): void => {
    if (terminal) return;
    terminal = true;
    const screen = requiredScreen(screens, position);
    input.onEvent?.(completedEvent(screen.screenId));
    input.onEvent?.({
      type: "journey.completed",
      screenId: screen.screenId,
    });
    input.onComplete();
  };

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (started || terminal) return;
      started = true;
      const screen = requiredScreen(screens, position);
      input.onEvent?.({
        type: "journey.started",
        screenId: screen.screenId,
      });
      emitViewed();
      notify();
    },
    next() {
      if (terminal) return;
      const current = requiredScreen(screens, position);
      input.onEvent?.(completedEvent(current.screenId));
      if (position === screens.length - 1) {
        terminal = true;
        input.onEvent?.({
          type: "journey.completed",
          screenId: current.screenId,
        });
        input.onComplete();
        return;
      }
      position += 1;
      emitViewed();
      notify();
    },
    back() {
      if (terminal || position === 0) return;
      position -= 1;
      const screen = requiredScreen(screens, position);
      input.onEvent?.({
        type: "screen.returned",
        screenId: screen.screenId,
      });
      emitViewed();
      notify();
    },
    complete,
    dismiss() {
      if (terminal) return;
      terminal = true;
      const screen = requiredScreen(screens, position);
      if (screen.surface === "paywall") {
        input.onEvent?.({
          type: "paywall.dismissed",
          screenId: screen.screenId,
          ...(screen.placement ? { placement: screen.placement } : {}),
        });
      }
      input.onEvent?.({
        type: "journey.dismissed",
        screenId: screen.screenId,
      });
      input.onDismiss();
    },
    openPlacement(placement) {
      if (terminal) return;
      const nextPosition = screens.findIndex(
        (screen) =>
          screen.surface === "paywall" && screen.placement === placement,
      );
      if (nextPosition < 0) {
        const standalone = input.document.screens.some(
          (screen) =>
            screen.placement === placement && screen.standalone,
        );
        throw new Error(
          standalone
            ? `UI IR paywall placement "${placement}" is standalone: present it from the app, not from inside a journey.`
            : `UI IR paywall placement "${placement}" is not declared.`,
        );
      }
      position = nextPosition;
      emitViewed();
      notify();
    },
  };
}

function requiredScreen(
  screens: BuilderV2UiIrDocument["screens"],
  position: number,
): BuilderV2UiIrDocument["screens"][number] {
  const screen = screens[position];
  if (!screen) {
    throw new Error("UI IR journey has no active screen.");
  }
  return screen;
}
