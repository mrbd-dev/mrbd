export type MrbdDataErrorCode =
  | "invalid_config"
  | "invalid_request"
  | "invalid_token"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "payload_too_large"
  | "rate_limited"
  | "network_error"
  | "server_error"
  | "browser_api_unavailable";

export class MrbdDataError extends Error {
  readonly code: MrbdDataErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    code: MrbdDataErrorCode,
    message: string,
    options?: { status?: number; details?: unknown },
  ) {
    super(message);
    this.name = "MrbdDataError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
  }
}
