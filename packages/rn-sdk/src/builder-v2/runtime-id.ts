export function createBuilderV2RuntimeId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  const suffix =
    randomUuid ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${suffix}`;
}
