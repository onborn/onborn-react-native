import {
  isPaywallStepId,
  type FlowConfig,
  type PaywallStep,
  type Step,
} from "@onborn/sdk-contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConversionFlowClient } from "../core/client";
import { STEP_TRANSITION_MS } from "../renderer/step-transitions";

export type RuntimeStep = Step | PaywallStep;
export type RuntimeFlowConfig = Omit<FlowConfig, "steps"> & {
  steps: RuntimeStep[];
};

export type UseSubscriptionFlowInnerOptions = {
  flow: RuntimeFlowConfig;
  client: ConversionFlowClient;
  sessionId: string;
  variantId?: string;
  initialStepId?: string;
  onNextStep?: (event: {
    step: RuntimeStep;
    stepIndex: number;
    answer?: unknown;
    nextStep?: RuntimeStep;
    nextStepIndex: number;
    completed: boolean;
  }) => void;
  onBack?: (event: {
    step: RuntimeStep;
    stepIndex: number;
    previousStep?: RuntimeStep;
    previousStepIndex: number;
  }) => void;
  onSkip?: (event: { step: RuntimeStep; stepIndex: number }) => void;
  onFlowCompleted?: () => void;
  stepTransitionMs?: number;
};

export type UseSubscriptionFlowInnerResult = {
  currentStep: RuntimeStep | undefined;
  stepIndex: number;
  onBack: () => void;
  onSkip: () => void;
  onNext: (extra?: {
    answer?: unknown;
    converted?: boolean;
    skipped?: boolean;
    targetStepId?: string;
  }) => void;
  transitionDirection: 1 | -1;
};

export function useSubscriptionFlowInner(
  options: UseSubscriptionFlowInnerOptions,
): UseSubscriptionFlowInnerResult {
  const {
    flow,
    client,
    initialStepId,
    sessionId,
    variantId,
    onBack: onBackEvent,
    onSkip: onSkipEvent,
    onFlowCompleted,
    onNextStep,
  } = options;
  const transitionMs = options.stepTransitionMs ?? STEP_TRANSITION_MS;
  const linkedQuizAnswerStepIds = collectLinkedQuizAnswerStepIds(flow);
  const initialStepIndex =
    initialStepId != null
      ? Math.max(
          0,
          flow.steps.findIndex((step) => step.id === initialStepId),
        )
      : 0;

  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentStep = flow.steps[stepIndex];

  const startedRef = useRef(false);
  const viewedRef = useRef<Set<string>>(new Set());
  const flowStartedAtRef = useRef<number>(0);
  const stepEnteredAtRef = useRef<number>(Date.now());
  const completedStepsRef = useRef<number>(0);
  const historyRef = useRef<number[]>([]);
  const transitionUnlockRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);

  useEffect(() => {
    return () => {
      if (transitionUnlockRef.current) {
        clearTimeout(transitionUnlockRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setStepIndex((current) => {
      if (current === initialStepIndex) {
        return current;
      }
      historyRef.current = [];
      return initialStepIndex;
    });
  }, [initialStepId, initialStepIndex]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    flowStartedAtRef.current = Date.now();
    stepEnteredAtRef.current = Date.now();
    void client
      .trackFlowStarted(sessionId, variantId)
      .then(() => client.flushEvents());
  }, [client, sessionId, variantId]);

  useEffect(() => {
    if (!currentStep) {
      return;
    }
    stepEnteredAtRef.current = Date.now();
  }, [currentStep?.id]);

  useEffect(() => {
    if (!currentStep) {
      return;
    }

    const key = `${sessionId}:${currentStep.id}`;
    if (viewedRef.current.has(key)) {
      return;
    }

    viewedRef.current.add(key);
    void client
      .trackStepViewed({
        sessionId,
        stepId: currentStep.id,
        stepType: currentStep.type,
        stepIndex,
      })
      .then(() => client.flushEvents());
  }, [client, currentStep, sessionId, stepIndex, variantId]);

  const onNext = (extra?: {
    answer?: unknown;
    converted?: boolean;
    skipped?: boolean;
    targetStepId?: string;
  }) => {
    if (!currentStep || isTransitioning) {
      return;
    }

    const stepTimeMs = Math.max(0, Date.now() - stepEnteredAtRef.current);
    const targetIndex = resolveTargetQuizAnswerStepIndex(
      flow,
      extra?.targetStepId,
    );
    const next =
      targetIndex ??
      resolveSequentialNextStepIndex(flow, stepIndex, linkedQuizAnswerStepIds);
    const completed = next == null;
    const nextEvent = {
      step: currentStep,
      stepIndex,
      answer: extra?.answer,
      nextStep: next == null ? undefined : flow.steps[next],
      nextStepIndex: next ?? stepIndex,
      completed,
    };
    onNextStep?.(nextEvent);
    void (async () => {
      if (extra?.skipped) {
        await client.trackStepSkipped({
          sessionId,
          stepId: currentStep.id,
          stepIndex,
        });
      } else {
        completedStepsRef.current += 1;
        await client.trackStepCompleted({
          sessionId,
          stepId: currentStep.id,
          stepType: currentStep.type,
          stepIndex,
          timeSpentMs: stepTimeMs,
          answer: extra?.answer,
        });
      }

      if (completed) {
        const totalTimeMs = Math.max(0, Date.now() - flowStartedAtRef.current);
        await client.trackFlowCompleted({
          sessionId,
          totalTimeMs,
          stepsCompleted: completedStepsRef.current,
          variant: variantId,
        });
      }

      await client.flushEvents();
    })();

    if (completed) {
      onFlowCompleted?.();
      return;
    }

    navigateToStep(next, 1, { recordHistory: true });
  };

  const onBack = () => {
    if (!currentStep || isTransitioning) {
      return;
    }

    const previous = historyRef.current.pop() ?? Math.max(0, stepIndex - 1);
    if (previous === stepIndex) {
      return;
    }
    onBackEvent?.({
      step: currentStep,
      stepIndex,
      previousStep: flow.steps[previous],
      previousStepIndex: previous,
    });
    navigateToStep(previous, -1);
  };

  const onSkip = () => {
    if (!currentStep || isTransitioning) {
      return;
    }

    const paywallStepIndex = flow.steps.findIndex(
      (step, index) => index > stepIndex && isPaywallStepId(step.id),
    );
    const hasPaywallAfterCurrentStep = paywallStepIndex >= 0;
    onSkipEvent?.({ step: currentStep, stepIndex });
    void (async () => {
      await client.trackStepSkipped({
        sessionId,
        stepId: currentStep.id,
        stepIndex,
      });
      if (hasPaywallAfterCurrentStep) {
        await client.flushEvents();
        return;
      }
      const totalTimeMs = Math.max(0, Date.now() - flowStartedAtRef.current);
      await client.trackFlowCompleted({
        sessionId,
        totalTimeMs,
        stepsCompleted: completedStepsRef.current,
        variant: variantId,
      });
      await client.flushEvents();
    })();
    if (hasPaywallAfterCurrentStep) {
      navigateToStep(paywallStepIndex, 1, { recordHistory: true });
      return;
    }
    onFlowCompleted?.();
  };

  const settleStepTransition = useCallback(() => {
    if (transitionUnlockRef.current) {
      clearTimeout(transitionUnlockRef.current);
      transitionUnlockRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  const navigateToStep = (
    targetIndex: number,
    direction: 1 | -1,
    options?: { recordHistory?: boolean },
  ) => {
    if (options?.recordHistory) {
      historyRef.current.push(stepIndex);
    }
    setIsTransitioning(true);
    setTransitionDirection(direction);
    setStepIndex(targetIndex);
    if (transitionUnlockRef.current) {
      clearTimeout(transitionUnlockRef.current);
    }
    transitionUnlockRef.current = setTimeout(() => {
      settleStepTransition();
    }, Math.round(transitionMs * 1.25));
  };

  return {
    currentStep,
    stepIndex,
    onBack,
    onSkip,
    onNext,
    transitionDirection,
  };
}

function resolveTargetQuizAnswerStepIndex(
  flow: RuntimeFlowConfig,
  targetStepId: string | undefined,
): number | undefined {
  if (!targetStepId) {
    return undefined;
  }
  const index = flow.steps.findIndex(
    (step) => step.id === targetStepId && step.type === "quiz_answer",
  );
  return index >= 0 ? index : undefined;
}

function resolveSequentialNextStepIndex(
  flow: RuntimeFlowConfig,
  currentIndex: number,
  linkedQuizAnswerStepIds: Set<string>,
): number | undefined {
  const currentStep = flow.steps[currentIndex];
  if (!currentStep) {
    return undefined;
  }

  if (currentStep.type === "quiz_answer") {
    const nextBaselineIndex = flow.steps.findIndex(
      (step, index) =>
        index > currentIndex &&
        (step.type !== "quiz_answer" || !linkedQuizAnswerStepIds.has(step.id)),
    );
    return nextBaselineIndex >= 0 ? nextBaselineIndex : undefined;
  }

  const nextIndex = currentIndex + 1;
  return nextIndex < flow.steps.length ? nextIndex : undefined;
}

function collectLinkedQuizAnswerStepIds(flow: RuntimeFlowConfig): Set<string> {
  const targetIds = new Set<string>();
  for (const step of flow.steps) {
    if (step.type !== "quiz") {
      continue;
    }
    Object.values(step.primitives).forEach((primitive) => {
      collectQuizAnswerTargetIds(primitive, targetIds);
    });
  }

  const quizAnswerStepIds = new Set(
    flow.steps
      .filter((step) => step.type === "quiz_answer")
      .map((step) => step.id),
  );
  return new Set(
    [...targetIds].filter((targetId) => quizAnswerStepIds.has(targetId)),
  );
}

function collectQuizAnswerTargetIds(
  primitive: unknown,
  targetIds: Set<string>,
) {
  if (!primitive || typeof primitive !== "object" || Array.isArray(primitive)) {
    return;
  }

  const record = primitive as { type?: unknown; props?: unknown };
  if (
    !record.props ||
    typeof record.props !== "object" ||
    Array.isArray(record.props)
  ) {
    return;
  }

  const props = record.props as Record<string, unknown>;
  if (record.type === "quiz" && Array.isArray(props.options)) {
    props.options.forEach((option) => {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        return;
      }
      const nextStepId = (option as { nextStepId?: unknown }).nextStepId;
      if (typeof nextStepId === "string" && nextStepId.trim()) {
        targetIds.add(nextStepId.trim());
      }
    });
  }

  if (Array.isArray(props.children)) {
    props.children.forEach((child) =>
      collectQuizAnswerTargetIds(child, targetIds),
    );
  }
}
