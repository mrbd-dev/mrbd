import type { MrbdAuthErrorCode } from "./types.js";

export class MrbdAuthError extends Error {
  readonly code: MrbdAuthErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(code: MrbdAuthErrorCode, message: string, options?: { status?: number; details?: unknown }) {
    super(message);
    this.name = "MrbdAuthError";
    this.code = code;
    this.status = options?.status;
    this.details = options?.details;
  }
}
