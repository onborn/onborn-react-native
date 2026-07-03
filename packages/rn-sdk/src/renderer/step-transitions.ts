import {
  Easing,
  Keyframe,
  ReduceMotion,
  type EntryExitAnimationFunction,
} from "react-native-reanimated";

/** Default step transition length (ms). Tuned for funnel navigation feel. */
export const STEP_TRANSITION_MS = 340;

/** iOS-like ease-out curve (Material emphasized decelerate). */
export const STEP_TRANSITION_EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

const REDUCE_MOTION = ReduceMotion.System;

type StepTransitionDirection = 1 | -1;

export type StepTransitionAnimations = {
  entering: EntryExitAnimationFunction;
  exiting?: EntryExitAnimationFunction;
  durationMs: number;
  exitDurationMs: number;
};

/**
 * Cross-fade between steps — opacity only, no slide or parallax.
 * Direction is kept in the API for forward/back hooks but does not affect motion.
 */
export function createStepTransitionAnimations(
  _direction: StepTransitionDirection,
  durationMs = STEP_TRANSITION_MS,
): StepTransitionAnimations {
  const exitDurationMs = Math.round(durationMs * 0.9);

  const entering = new Keyframe({
    0: {
      opacity: 0,
    },
    100: {
      opacity: 1,
    },
  })
    .duration(durationMs)
    .reduceMotion(REDUCE_MOTION) as unknown as EntryExitAnimationFunction;

  const exiting = new Keyframe({
    0: {
      opacity: 1,
    },
    100: {
      opacity: 0,
    },
  })
    .duration(exitDurationMs)
    .reduceMotion(REDUCE_MOTION) as unknown as EntryExitAnimationFunction;

  return { entering, exiting, durationMs, exitDurationMs };
}
