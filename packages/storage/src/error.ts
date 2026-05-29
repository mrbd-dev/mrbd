export type MrbdStorageErrorCode =
  | "invalid_config"
  | "invalid_request"
  | "invalid_token"
  | "forbidden"
  | "not_found"
  | "payload_too_large"
  | "rate_limited"
  | "network_error"
  | "server_error"
  | "upload_failed"
  | "browser_api_unavailable";

export class MrbdStorageError extends Error {
  readonly code: MrbdStorageErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    code: MrbdStorageErrorCode,
    message: string,
    options?: { status?: number; details?: unknown },
  ) {
    super(message);
    this.name = "MrbdStorageError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
  }
}
