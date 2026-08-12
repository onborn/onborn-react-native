import type { CachedUiIrArtifact } from "@onborn/runtime-ui-ir/artifact";

/**
 * Loads the fonts an artifact carries, from the files already staged on disk.
 *
 * Part of session creation, before first render: a screen that appears in a
 * system font and then snaps into its typography reads as broken, and the
 * fonts are small local files — the download already happened with the
 * artifact. Loading is idempotent per family name, so re-activating an
 * artifact costs nothing.
 */
export async function loadUiIrArtifactFonts(
  artifact: CachedUiIrArtifact,
): Promise<void> {
  const fonts = artifact.artifact.manifest.fonts ?? [];
  if (fonts.length === 0) return;
  // Imported lazily: expo-font is a native module, and a session with no
  // fonts — including every Node-side test — must never evaluate it.
  const { isLoaded, loadAsync } = await import("expo-font");
  const files = new Map(
    artifact.files
      .filter((file) => file.role === "font")
      .map((file) => [file.path, file]),
  );
  await Promise.all(
    fonts.map(async (font) => {
      if (isLoaded(font.fontFamily)) return;
      const file = files.get(font.file);
      if (
        !file ||
        file.contentHash !== font.contentHash ||
        file.byteLength !== font.byteLength
      ) {
        throw new Error(
          `UI IR font "${font.fontFamily}" is missing or does not match its manifest.`,
        );
      }
      await loadAsync({ [font.fontFamily]: file.uri });
    }),
  );
}
