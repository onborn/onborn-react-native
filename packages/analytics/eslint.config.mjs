import { config as baseConfig } from "@repo/eslint-config/base";

export default [
  ...baseConfig,
  {
    // Build-time Node scripts, not part of the shipped bundle: the shared
    // config targets the React Native runtime and flags Node globals here.
    ignores: ["scripts/**"],
  },
];
