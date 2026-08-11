import {
  BaseAnimationBuilder,
  ReduceMotion,
  type EntryOrExitLayoutType,
} from "react-native-reanimated";

import type {
  BuilderV2UiIrEnterTransition,
  BuilderV2UiIrExitTransition,
  BuilderV2UiIrLayoutTransition,
} from "@onborn/sdk-contracts/builder-v2-ui-ir";
import {
  ENTER_BUILDERS,
  EXIT_BUILDERS,
  LAYOUT_BUILDERS,
  type ReanimatedBuilderClass,
} from "./ui-ir-reanimated-presets";

type ReanimatedEnterTransition = Extract<
  BuilderV2UiIrEnterTransition,
  { type: "reanimated" }
>;
type ReanimatedTransition =
  | ReanimatedEnterTransition
  | BuilderV2UiIrExitTransition
  | BuilderV2UiIrLayoutTransition;
type SpringBuilder = BaseAnimationBuilder & {
  springify(duration?: number): SpringBuilder;
  damping(value: number): SpringBuilder;
  stiffness(value: number): SpringBuilder;
  mass(value: number): SpringBuilder;
  energyThreshold(value: number): SpringBuilder;
};

export function createReanimatedEnterBuilder(
  transition: ReanimatedEnterTransition,
): EntryOrExitLayoutType {
  return configureBuilder(ENTER_BUILDERS[transition.preset], transition);
}

export function createReanimatedExitBuilder(
  transition: BuilderV2UiIrExitTransition,
): EntryOrExitLayoutType {
  return configureBuilder(EXIT_BUILDERS[transition.preset], transition);
}

export function createReanimatedLayoutBuilder(
  transition: BuilderV2UiIrLayoutTransition,
): BaseAnimationBuilder {
  return configureBuilder(LAYOUT_BUILDERS[transition.preset], transition);
}

function configureBuilder(
  Builder: ReanimatedBuilderClass,
  transition: ReanimatedTransition,
): BaseAnimationBuilder {
  let builder = Builder.createInstance();
  if (transition.durationMs !== undefined) {
    builder = builder.duration(transition.durationMs);
  }
  if (transition.delayMs !== undefined) {
    builder = builder.delay(transition.delayMs);
  }
  if (transition.spring) {
    const springBuilder = requireSpringBuilder(builder);
    builder = applySpring(springBuilder.springify(), transition.spring);
  }
  return builder.reduceMotion(ReduceMotion.System);
}

function applySpring(
  builder: SpringBuilder,
  spring: NonNullable<ReanimatedTransition["spring"]>,
): SpringBuilder {
  let configured = builder;
  if (spring.damping !== undefined) {
    configured = configured.damping(spring.damping);
  }
  if (spring.stiffness !== undefined) {
    configured = configured.stiffness(spring.stiffness);
  }
  if (spring.mass !== undefined) configured = configured.mass(spring.mass);
  if (spring.energyThreshold !== undefined) {
    configured = configured.energyThreshold(spring.energyThreshold);
  }
  return configured;
}

function requireSpringBuilder(builder: BaseAnimationBuilder): SpringBuilder {
  const candidate = builder as Partial<SpringBuilder>;
  if (
    typeof candidate.springify !== "function" ||
    typeof candidate.damping !== "function" ||
    typeof candidate.stiffness !== "function" ||
    typeof candidate.mass !== "function" ||
    typeof candidate.energyThreshold !== "function"
  ) {
    throw new Error(
      "Validated UI IR requested spring modifiers for an incompatible preset.",
    );
  }
  return builder as SpringBuilder;
}
