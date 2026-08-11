export interface UiIrArtifactCryptoPort {
  sha256(value: string | Uint8Array): string;
  verifyEd25519(input: {
    keyId: string;
    payload: string;
    signature: string;
  }): Promise<boolean>;
}
