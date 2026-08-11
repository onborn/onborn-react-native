import * as ed25519 from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { UiIrArtifactError } from "../domain/ui-ir-artifact-errors";
import type { UiIrArtifactCryptoPort } from "../ports/ui-ir-artifact-crypto";

const SPKI_PREFIX = hexToBytes("302a300506032b6570032100");
const PUBLIC_KEY_BYTES = 32;
const BASE64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

ed25519.hashes.sha512 = sha512;

export class NobleUiIrArtifactCrypto implements UiIrArtifactCryptoPort {
  private readonly trustedKeys = new Map<string, Uint8Array>();

  constructor(trustedPublicKeys: Readonly<Record<string, string>>) {
    for (const [keyId, encodedKey] of Object.entries(trustedPublicKeys)) {
      if (!/^[A-Za-z0-9._-]{1,120}$/.test(keyId)) {
        throw cryptoError(`Trusted key ID "${keyId}" is invalid.`);
      }
      this.trustedKeys.set(keyId, decodeSpkiKey(encodedKey));
    }
    if (this.trustedKeys.size === 0) {
      throw cryptoError("At least one trusted UI IR signing key is required.");
    }
  }

  sha256(value: string | Uint8Array): string {
    return bytesToHex(
      sha256(typeof value === "string" ? utf8ToBytes(value) : value),
    );
  }

  async verifyEd25519(input: {
    keyId: string;
    payload: string;
    signature: string;
  }): Promise<boolean> {
    const publicKey = this.trustedKeys.get(input.keyId);
    if (!publicKey) return false;
    try {
      return ed25519.verify(
        decodeBase64Url(input.signature),
        utf8ToBytes(input.payload),
        publicKey,
        { zip215: false },
      );
    } catch {
      return false;
    }
  }
}

function decodeSpkiKey(encoded: string): Uint8Array {
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(encoded);
  } catch (error) {
    throw cryptoError("Trusted Ed25519 public key is not valid base64.", error);
  }
  if (
    bytes.byteLength !== SPKI_PREFIX.byteLength + PUBLIC_KEY_BYTES ||
    !equalBytes(bytes.subarray(0, SPKI_PREFIX.byteLength), SPKI_PREFIX)
  ) {
    throw cryptoError("Trusted Ed25519 public key must use SPKI DER encoding.");
  }
  return bytes.slice(SPKI_PREFIX.byteLength);
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid base64url value.");
  }
  return decodeBase64(value.replace(/-/g, "+").replace(/_/g, "/"));
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.trim().replace(/\s+/g, "");
  if (
    normalized.length === 0 ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw new Error("Invalid base64 value.");
  }
  const unpadded = normalized.replace(/=+$/g, "");
  const output = new Uint8Array(Math.floor((unpadded.length * 6) / 8));
  let accumulator = 0;
  let bits = 0;
  let offset = 0;
  for (const character of unpadded) {
    accumulator = (accumulator << 6) | BASE64.indexOf(character);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[offset] = (accumulator >> bits) & 0xff;
      offset += 1;
    }
  }
  return output;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let mismatch = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    mismatch |= left[index]! ^ right[index]!;
  }
  return mismatch === 0;
}

function hexToBytes(value: string): Uint8Array {
  return Uint8Array.from(
    value.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
  );
}

function cryptoError(message: string, cause?: unknown): UiIrArtifactError {
  return new UiIrArtifactError("signature_invalid", message, { cause });
}
