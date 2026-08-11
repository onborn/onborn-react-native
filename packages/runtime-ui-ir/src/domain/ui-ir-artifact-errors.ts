export type UiIrArtifactFailureCode =
  | "delivery_invalid"
  | "delivery_scope_mismatch"
  | "delivery_expired"
  | "runtime_incompatible"
  | "manifest_integrity_failed"
  | "signature_invalid"
  | "download_failed"
  | "file_integrity_failed"
  | "cache_activation_failed"
  | "document_invalid"
  | "runtime_disabled";

export class UiIrArtifactError extends Error {
  constructor(
    readonly code: UiIrArtifactFailureCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "UiIrArtifactError";
  }
}
