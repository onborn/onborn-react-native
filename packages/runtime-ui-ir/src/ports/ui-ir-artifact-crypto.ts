export interface UiIrArtifactCryptoPort {
  /**
   * May answer synchronously (a pure-JS hash) or with a promise (a native
   * digest). Callers always await: hashing a multi-megabyte hero image in JS
   * on the device was seconds of a flow's cold start, and the native path is
   * asynchronous by nature.
   */
  sha256(value: string | Uint8Array): string | Promise<string>;
  verifyEd25519(input: {
    keyId: string;
    payload: string;
    signature: string;
  }): Promise<boolean>;
}
