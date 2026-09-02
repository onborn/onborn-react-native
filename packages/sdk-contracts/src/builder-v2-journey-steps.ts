/**
 * The steps of a journey, as a progress bar counts them.
 *
 * A screen whose routes carry a condition is a fork, and the screens its
 * routes choose between are one step, not one each: a person walks exactly
 * one of them. Counted as three, the bar jumped past two screens nobody saw
 * and the canvas drew three consecutive steps where there was a choice.
 *
 * The rule is shared by everything that counts: the device runtime, the web
 * funnel, the builder's live preview and the canvas layout, so "step 7 of 9"
 * means the same thing everywhere.
 */

export type BuilderV2JourneyRouteLike = {
  readonly to: string;
  /** Present on a conditional route; its shape is the caller's business. */
  readonly when?: unknown;
};

export type BuilderV2JourneyStepScreen = {
  readonly screenId: string;
  readonly next?: string | readonly BuilderV2JourneyRouteLike[];
};

export type BuilderV2JourneySteps = {
  /**
   * The screens an answer chooses between, by the screen that asks, in route
   * order. The fork's unconditional target is a member too, unless it is
   * where the conditional branches themselves rejoin — "athletes see an
   * outro, everyone else goes straight on" keeps straight-on a step of its
   * own.
   */
  readonly branches: ReadonlyMap<string, readonly string[]>;
  /** The step each screen stands at, from 0; branch members share one. */
  readonly stepOf: ReadonlyMap<string, number>;
  /** How many steps the walk has. */
  readonly total: number;
};

export function builderV2JourneySteps(
  screens: readonly BuilderV2JourneyStepScreen[],
): BuilderV2JourneySteps {
  const byId = new Map(screens.map((screen) => [screen.screenId, screen]));
  const branches = new Map<string, string[]>();
  const forkOf = new Map<string, string>();
  for (const screen of screens) {
    const routes = Array.isArray(screen.next) ? screen.next : null;
    if (!routes || !routes.some((route) => route.when !== undefined)) continue;
    const rejoins = new Set(
      routes
        .filter((route) => route.when !== undefined)
        .flatMap((route) => unconditionalTargets(byId.get(route.to))),
    );
    const members: string[] = [];
    for (const route of routes) {
      if (!byId.has(route.to) || forkOf.has(route.to)) continue;
      if (route.when === undefined && rejoins.has(route.to)) continue;
      if (members.includes(route.to)) continue;
      members.push(route.to);
      forkOf.set(route.to, screen.screenId);
    }
    if (members.length > 0) branches.set(screen.screenId, members);
  }

  const stepOf = new Map<string, number>();
  const stepOfFork = new Map<string, number>();
  let total = 0;
  for (const screen of screens) {
    const fork = forkOf.get(screen.screenId);
    if (fork === undefined) {
      stepOf.set(screen.screenId, total++);
      continue;
    }
    let step = stepOfFork.get(fork);
    if (step === undefined) {
      step = total++;
      stepOfFork.set(fork, step);
    }
    stepOf.set(screen.screenId, step);
  }
  return { branches, stepOf, total };
}

function unconditionalTargets(
  screen: BuilderV2JourneyStepScreen | undefined,
): string[] {
  const next = screen?.next;
  if (typeof next === "string") return [next];
  if (Array.isArray(next)) {
    return next
      .filter((route) => route.when === undefined)
      .map((route) => route.to);
  }
  return [];
}
