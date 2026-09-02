/**
 * Dev-only phase timing for the flow load path.
 *
 * A cold start that "takes 7 seconds" is unactionable until it says where:
 * the delivery fetch, the file downloads, the hashing, the fonts, the
 * document parse. Each phase marks itself here and development builds print
 * one line per phase plus a total — production builds print nothing and pay
 * a no-op call.
 */
declare const __DEV__: boolean | undefined;

const isDev = (): boolean =>
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : typeof process !== "undefined" &&
      process.env?.ONBORN_LOAD_TRACE === "1";

export function createUiIrLoadTrace(label: string): {
  mark(phase: string): void;
  end(): void;
} {
  if (!isDev()) {
    return { mark: () => undefined, end: () => undefined };
  }
  const startedAt = Date.now();
  let lastAt = startedAt;
  return {
    mark(phase: string) {
      const now = Date.now();
      console.log(
        `[onborn] ${label}: ${phase} +${now - lastAt}ms (t=${now - startedAt}ms)`,
      );
      lastAt = now;
    },
    end() {
      console.log(`[onborn] ${label}: total ${Date.now() - startedAt}ms`);
    },
  };
}
