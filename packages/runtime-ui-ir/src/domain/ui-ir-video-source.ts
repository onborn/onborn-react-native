import type { ImageSourcePropType } from "react-native";

/**
 * The one address a video plays from.
 *
 * On the device the artifact cache staged the file and the resolver answers
 * `{ uri }`; on the canvas the bundler handed the source a data URL string.
 * Either way the player wants a string, and anything else is a wiring bug
 * worth failing on rather than a silent black box.
 */
export function uiIrVideoUri(source: ImageSourcePropType | string): string {
  if (typeof source === "string") return source;
  if (
    typeof source === "object" &&
    source !== null &&
    !Array.isArray(source) &&
    "uri" in source &&
    typeof source.uri === "string"
  ) {
    return source.uri;
  }
  throw new Error("A UI IR video source must resolve to a URI.");
}
