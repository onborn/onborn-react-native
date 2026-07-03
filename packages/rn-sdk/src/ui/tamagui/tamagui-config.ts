import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";

export const subscriptionTamaguiConfig = createTamagui(defaultConfig);

export type SubscriptionTamaguiConfig = typeof subscriptionTamaguiConfig;
