#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACK_CACHE="${NPM_CONFIG_CACHE:-/tmp/onborn-npm-cache}"

cd "$ROOT_DIR"

PACKAGE_DIRS=(
  "packages/sdk-contracts"
  "packages/analytics"
  "packages/billing"
  "packages/runtime-ui-ir"
  "packages/runtime-expo-ui-ir"
  "packages/rn-sdk"
)

BUILD_ORDER=(
  "@onborn/sdk-contracts"
  "@onborn/analytics"
  "@onborn/billing"
  "@onborn/runtime-ui-ir"
  "@onborn/runtime-expo-ui-ir"
  "@onborn/rn-sdk"
)

for package_name in "${BUILD_ORDER[@]}"; do
  yarn workspace "$package_name" check-types
  yarn workspace "$package_name" lint
  yarn workspace "$package_name" build
done

TEST_PACKAGES=(
  "@onborn/sdk-contracts"
  "@onborn/analytics"
  "@onborn/runtime-ui-ir"
  "@onborn/runtime-expo-ui-ir"
  "@onborn/rn-sdk"
)

for package_name in "${TEST_PACKAGES[@]}"; do
  yarn workspace "$package_name" test
done

for package_dir in "${PACKAGE_DIRS[@]}"; do
  (
    cd "$ROOT_DIR/$package_dir"
    npm_config_cache="$PACK_CACHE" npm pack --dry-run
  )
done
