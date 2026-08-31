import { createUiIrAssetResolver } from "@onborn/runtime-ui-ir/artifact";

/*
 * Nothing here was ever Expo's; the implementation moved to the runtime
 * package so the web funnel host resolves assets the same way. The name
 * stays for the callers that learned it.
 */
export const createExpoUiIrAssetResolver = createUiIrAssetResolver;
