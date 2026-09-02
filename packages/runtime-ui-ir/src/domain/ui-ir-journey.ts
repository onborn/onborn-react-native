import type {
  BuilderV2ProjectSurface,
  BuilderV2UiIrDocument,
} from "@onborn/sdk-contracts";
import { builderV2JourneySteps } from "@onborn/sdk-contracts/builder-v2-journey-steps";

import type { UiIrStateValues } from "./ui-ir-state";
import { reportedUiIrAnswers } from "./ui-ir-state";
import { resolveUiIrNextPosition } from "./ui-ir-navigation";

export type UiIrJourneyState = {
  activeScreenId: string;
  /**
   * The step the screen stands at, as a progress bar counts steps: the
   * screens an answer chooses between share one, since a person walks
   * exactly one of them. Not an index into the screens.
   */
  position: number;
  /** How many steps the walk has, counted the same way. */
  total: number;
  surface: BuilderV2ProjectSurface;
  isFirst: boolean;
  isLast: boolean;
  /** Steps walked from the first screen — what back() unwinds, one per call. */
  depth: number;
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
  /**
   * Everything answered so far, by state name — what a screen's routes are
   * decided against. Absent means every route with a condition is skipped.
   */
  readVariables?: () => UiIrStateValues;
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

  // Branch members share a step; see builderV2JourneySteps.
  const steps = builderV2JourneySteps(screens);

  let started = false;
  let terminal = false;
  /*
   * The screens the person actually walked through, as positions. Back pops
   * this rather than stepping to position - 1: a route may have skipped two
   * outros, and back has to return to where the person came from.
   */
  const history: number[] = [];
  const listeners = new Set<(state: UiIrJourneyState) => void>();

  const getState = (): UiIrJourneyState => {
    const screen = requiredScreen(screens, position);
    return Object.freeze({
      activeScreenId: screen.screenId,
      position: steps.stepOf.get(screen.screenId) ?? position,
      total: steps.total,
      surface: screen.surface,
      isFirst: history.length === 0,
      isLast: position === screens.length - 1,
      depth: history.length,
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
    const held = input.readAnswers?.(screenId);
    const screen = input.document.screens.find(
      (candidate) => candidate.screenId === screenId,
    );
    const answers =
      held && screen ? reportedUiIrAnswers(screen, held) : held;
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
      const target = resolveUiIrNextPosition({
        screens,
        position,
        values: input.readVariables?.() ?? {},
      });
      if (target === null) {
        terminal = true;
        input.onEvent?.({
          type: "journey.completed",
          screenId: current.screenId,
        });
        input.onComplete();
        return;
      }
      history.push(position);
      position = target;
      emitViewed();
      notify();
    },
    back() {
      if (terminal || history.length === 0) return;
      /*
       * A screen that leaves on its own is not somewhere to return to:
       * back from the outro lands on the question, not on a loading step
       * that would fill again and push the person forward again. Skipped
       * only when there is somewhere earlier to land.
       */
      let target = history.pop()!;
      while (screens[target]?.autoContinue && history.length > 0) {
        target = history.pop()!;
      }
      position = target;
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
