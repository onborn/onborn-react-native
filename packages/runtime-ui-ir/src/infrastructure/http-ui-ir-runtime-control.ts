import {
  BuilderV2RuntimeControlSchema,
  type BuilderV2RuntimeControl,
} from "@onborn/sdk-contracts/builder-v2-runtime-control";

import type {
  UiIrRuntimeControlInput,
  UiIrRuntimeControlPort,
} from "../ports/ui-ir-runtime-control";

export class HttpUiIrRuntimeControl implements UiIrRuntimeControlPort {
  constructor(
    private readonly config: {
      apiBaseUrl: string;
      apiKey: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async resolve(
    input: UiIrRuntimeControlInput,
  ): Promise<BuilderV2RuntimeControl> {
    const url = new URL(
      `/runtime/v2/flows/${encodeURIComponent(input.flowId)}/control`,
      ensureTrailingSlash(this.config.apiBaseUrl),
    );
    url.searchParams.set("target", input.target);
    const response = await (this.config.fetchImpl ?? fetch)(url.toString(), {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`UI IR runtime control failed with ${response.status}.`);
    }
    return BuilderV2RuntimeControlSchema.parse(await response.json());
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
