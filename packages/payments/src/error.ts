export type MrbdPaymentsErrorCode =
  | "invalid_config"
  | "invalid_request"
  | "invalid_token"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "pin_required"
  | "pin_invalid"
  | "pin_locked"
  | "payment_method_required"
  | "requires_action"
  | "onboarding_incomplete"
  | "network_error"
  | "server_error"
  | "browser_api_unavailable";

export class MrbdPaymentsError extends Error {
  readonly code: MrbdPaymentsErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    code: MrbdPaymentsErrorCode,
    message: string,
    options?: { status?: number; details?: unknown },
  ) {
    super(message);
    this.name = "MrbdPaymentsError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
  }
}
