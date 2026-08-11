import { BuilderV2RuntimeHealthEventSchema } from "@onborn/sdk-contracts/builder-v2-runtime-control";

import type { UiIrRuntimeDiagnosticsPort } from "../ports/ui-ir-runtime-diagnostics";

export class HttpUiIrRuntimeDiagnostics implements UiIrRuntimeDiagnosticsPort {
  constructor(
    private readonly config: {
      apiBaseUrl: string;
      apiKey: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async report(
    event: Parameters<UiIrRuntimeDiagnosticsPort["report"]>[0],
  ): Promise<void> {
    const response = await (this.config.fetchImpl ?? fetch)(
      new URL(
        "/runtime/v2/health",
        ensureTrailingSlash(this.config.apiBaseUrl),
      ).toString(),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(BuilderV2RuntimeHealthEventSchema.parse(event)),
      },
    );
    if (!response.ok) {
      throw new Error(`UI IR runtime health report failed with ${response.status}.`);
    }
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
