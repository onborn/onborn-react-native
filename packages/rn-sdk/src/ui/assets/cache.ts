export function createAssetCacheKey(input: {
  bucket?: string;
  path?: string;
  src?: string;
  prefix?: string;
}): string | undefined {
  if (input.bucket && input.path) {
    return [input.prefix, input.bucket, input.path].filter(Boolean).join(":");
  }
  return input.src;
}
