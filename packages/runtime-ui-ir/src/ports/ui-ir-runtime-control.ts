import type { BuilderV2RuntimeControl } from "@onborn/sdk-contracts/builder-v2-runtime-control";

export type UiIrRuntimeControlInput = {
  flowId: string;
  environment: "test" | "prod";
  target: "ios" | "android";
};

export interface UiIrRuntimeControlPort {
  resolve(input: UiIrRuntimeControlInput): Promise<BuilderV2RuntimeControl>;
}
