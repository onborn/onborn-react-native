import type { BuilderV2RuntimeControl } from "@onborn/sdk-contracts/builder-v2-runtime-control";

import type {
  UiIrRuntimeControlInput,
  UiIrRuntimeControlPort,
} from "../ports/ui-ir-runtime-control";

type CachedControl = {
  control: BuilderV2RuntimeControl;
  expiresAt: number;
};

export class CachedUiIrRuntimeControl implements UiIrRuntimeControlPort {
  private readonly cache = new Map<string, CachedControl>();

  constructor(
    private readonly dependencies: {
      source: UiIrRuntimeControlPort;
      now?: () => number;
      maxEntries?: number;
    },
  ) {}

  async resolve(
    input: UiIrRuntimeControlInput,
  ): Promise<BuilderV2RuntimeControl> {
    const now = this.dependencies.now?.() ?? Date.now();
    const key = controlKey(input);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.control;
    }
    if (cached) {
      this.cache.delete(key);
    }

    const control = await this.dependencies.source.resolve(input);
    this.cache.set(key, {
      control,
      expiresAt: now + control.recheckAfterSeconds * 1_000,
    });
    this.prune(now);
    return control;
  }

  private prune(now: number): void {
    for (const [key, value] of this.cache) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
    const maxEntries = this.dependencies.maxEntries ?? 100;
    while (this.cache.size > maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (!oldest) return;
      this.cache.delete(oldest);
    }
  }
}

function controlKey(input: UiIrRuntimeControlInput): string {
  return [input.flowId, input.environment, input.target].join(":");
}
