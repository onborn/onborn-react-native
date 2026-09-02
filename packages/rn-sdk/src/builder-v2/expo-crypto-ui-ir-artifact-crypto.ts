import { CryptoDigestAlgorithm, digest } from "expo-crypto";

import {
  NobleUiIrArtifactCrypto,
  type UiIrArtifactCryptoPort,
} from "@onborn/runtime-ui-ir/artifact";

/**
 * The artifact crypto with hashing done by the platform.
 *
 * Pure-JS SHA-256 was the device's single biggest cost on a cold flow start:
 * every downloaded file is integrity-hashed, and a couple of megabytes of
 * hero imagery took seconds on Hermes — longer than downloading them.
 * expo-crypto digests natively in milliseconds. Signature verification stays
 * with the noble implementation: ed25519 over a manifest-sized payload is
 * already fast, and the trusted-key handling lives there.
 */
export class ExpoCryptoUiIrArtifactCrypto implements UiIrArtifactCryptoPort {
  private readonly noble: NobleUiIrArtifactCrypto;
  /**
   * Once the native digest fails it stays off: the one realistic failure is
   * the expo-crypto native module missing from the binary (an app that
   * updated the SDK's JS without rebuilding the dev client), and that does
   * not heal between calls. Hashing must never be the reason a flow fails to
   * load — the noble path is merely slower.
   */
  private nativeDigestBroken = false;

  constructor(trustedKeys: ConstructorParameters<typeof NobleUiIrArtifactCrypto>[0]) {
    this.noble = new NobleUiIrArtifactCrypto(trustedKeys);
  }

  async sha256(value: string | Uint8Array): Promise<string> {
    if (this.nativeDigestBroken) {
      return this.noble.sha256(value);
    }
    const bytes =
      typeof value === "string" ? new TextEncoder().encode(value) : value;
    try {
      const digested = await digest(
        CryptoDigestAlgorithm.SHA256,
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      );
      return toHex(new Uint8Array(digested));
    } catch {
      this.nativeDigestBroken = true;
      return this.noble.sha256(value);
    }
  }

  verifyEd25519(
    input: Parameters<UiIrArtifactCryptoPort["verifyEd25519"]>[0],
  ): Promise<boolean> {
    return this.noble.verifyEd25519(input);
  }
}

const HEX = Array.from({ length: 256 }, (_, byte) =>
  byte.toString(16).padStart(2, "0"),
);

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += HEX[byte];
  }
  return out;
}
