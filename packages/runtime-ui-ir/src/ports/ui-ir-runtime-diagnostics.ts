import type { BuilderV2RuntimeHealthEvent } from "@onborn/sdk-contracts/builder-v2-runtime-control";

export interface UiIrRuntimeDiagnosticsPort {
  report(event: BuilderV2RuntimeHealthEvent): void | Promise<void>;
}
