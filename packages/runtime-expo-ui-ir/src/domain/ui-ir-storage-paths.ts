import {
  UiIrArtifactError,
  type UiIrArtifactCacheScope,
} from "@onborn/runtime-ui-ir/artifact";

const SAFE_IDENTIFIER = /^[A-Za-z0-9._-]{1,160}$/;

export function assertSafeUiIrIdentifier(
  value: string,
  label: string,
): string {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw storageError(
      `Builder V2 UI IR ${label} contains unsafe filesystem characters.`,
    );
  }
  return value;
}

export function assertSafeUiIrPath(path: string): string {
  const segments = path.split("/");
  if (
    !path ||
    path.startsWith("/") ||
    path.includes("\\") ||
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    throw storageError("Builder V2 UI IR contains an unsafe file path.");
  }
  return path;
}

export function uiIrScopeStorageKey(
  scope: UiIrArtifactCacheScope,
): string {
  return [
    assertSafeUiIrIdentifier(scope.flowId, "flow ID"),
    scope.environment,
  ].join("--");
}

export function uiIrStorageError(
  message: string,
  cause?: unknown,
): UiIrArtifactError {
  return new UiIrArtifactError("cache_activation_failed", message, {
    cause,
  });
}

function storageError(message: string): UiIrArtifactError {
  return uiIrStorageError(message);
}
