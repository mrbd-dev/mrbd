export type MrbdAuthStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type MrbdAuthConfig = {
  appId: string;
  authUrl?: string;
  storageKey?: string;
  storage?: MrbdAuthStorage | null;
  fetch?: typeof fetch;
  eventSource?: typeof EventSource;
  webSocket?: typeof WebSocket;
};

export type StartSignInOptions = {
  onEvent?: (event: MrbdAuthEvent) => void;
};

export type SignInWithCodeOptions = StartSignInOptions & {
  onRequest?: (request: MrbdAuthRequest) => void;
  getOtp: (request: MrbdAuthRequest) => Promise<string> | string;
};

export type MrbdAuthRequest = {
  requestId: string;
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
  status: MrbdAuthRequestStatus;
  email?: string;
};

export type MrbdAuthRequestStatus =
  | "pending"
  | "paired"
  | "email_submitted"
  | "otp_sent"
  | "verified"
  | "expired"
  | "error";

export type MrbdAuthEvent =
  | { type: "paired"; requestId: string }
  | { type: "email_submitted"; requestId: string; email: string }
  | { type: "otp_sent"; requestId: string; email?: string }
  | { type: "verified"; requestId: string }
  | { type: "expired"; requestId: string }
  | { type: "error"; requestId?: string; code: string; message: string };

export type MrbdSession = {
  appId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: "bearer" | string;
  expiresAt: string;
  scope?: string;
};

export type CreateAuthRequestBody = {
  appId: string;
  deviceChallenge: string;
  deviceChallengeMethod: "S256";
};

export type CreateAuthRequestResponse = {
  requestId: string;
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
  events?: MrbdAuthEventStream;
};

export type MrbdAuthEventStream =
  | { type: "sse"; url: string }
  | { type: "websocket"; url: string };

export type SendOtpRequest = {
  appId: string;
  requestId: string;
  deviceCode: string;
  email: string;
};

export type VerifyOtpRequest = {
  appId: string;
  requestId: string;
  deviceCode: string;
  deviceSecret: string;
  token: string;
};

export type VerifyOtpResponse = {
  session: MrbdSession;
};

export type RefreshSessionRequest = {
  appId: string;
  refreshToken: string;
};

export type RefreshSessionResponse = {
  session: MrbdSession;
};

export type RevokeSessionRequest = {
  appId: string;
  refreshToken?: string;
  accessToken?: string;
};

export type MrbdAuthStateCallback = (session: MrbdSession | null) => void;

export type MrbdAuthErrorCode =
  | "invalid_config"
  | "invalid_session"
  | "browser_api_unavailable"
  | "request_unavailable"
  | "email_unavailable"
  | "session_unavailable"
  | "network_error"
  | "server_error"
  | "storage_unavailable"
  | "event_stream_unavailable";
