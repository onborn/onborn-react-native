import type {
  BuilderV2ProjectSurface,
  BuilderV2UiIrDocument,
} from "@onborn/sdk-contracts";

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
  | { type: "screen.completed"; screenId: string }
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
  onComplete: () => void;
  onDismiss: () => void;
  onEvent?: (event: UiIrJourneyEvent) => void;
}): UiIrJourneyController {
  const screens = input.document.screens;
  const initialScreenId =
    input.initialScreenId ?? input.document.entryScreenId;
  let position = screens.findIndex(
    (screen) => screen.screenId === initialScreenId,
  );
  if (position < 0) {
    throw new Error(
      `UI IR initial screen "${initialScreenId}" is not declared.`,
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

  const complete = (): void => {
    if (terminal) return;
    terminal = true;
    const screen = requiredScreen(screens, position);
    input.onEvent?.({
      type: "screen.completed",
      screenId: screen.screenId,
    });
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
      input.onEvent?.({
        type: "screen.completed",
        screenId: current.screenId,
      });
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
          screen.surface === "paywall" &&
          screen.placement === placement,
      );
      if (nextPosition < 0) {
        throw new Error(
          `UI IR paywall placement "${placement}" is not declared.`,
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
