import {
  createRemoteJWKSet,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
} from "jose";

import { MrbdAuthError } from "../error.js";

const DEFAULT_AUTH_URL = "https://auth.mrbd.io";

export type MrbdTokenVerifierConfig = {
  /** The appId this backend serves. Tokens minted for any other app are rejected. */
  appId: string;
  /** MRBD auth service base URL. Defaults to the hosted broker. */
  authUrl?: string;
  /**
   * Expected token issuer. Defaults to `authUrl`. Override only if your broker
   * is configured with a custom `AUTH_JWT_ISSUER`.
   */
  issuer?: string;
  /** Optional clock tolerance (e.g. "30s" or seconds) for `exp`/`nbf` checks. */
  clockTolerance?: string | number;
};

export type MrbdVerifiedToken = {
  /** Supabase user id (the JWT `sub`). */
  userId: string;
  /** The app the token was issued for (the JWT `aud`). */
  appId: string;
  email?: string;
  scope: string[];
  expiresAt: Date;
  issuedAt?: Date;
  payload: JWTPayload;
};

export interface MrbdTokenVerifier {
  verify(accessToken: string): Promise<MrbdVerifiedToken>;
}

/**
 * Creates a reusable verifier for MRBD app-scoped access tokens.
 *
 * Tokens are signed by the MRBD auth broker and carry `aud = appId`. This
 * verifier fetches the broker's public keys from `/.well-known/jwks.json`
 * (cached internally) and enforces the audience, so a token minted through a
 * different app is rejected. Construct one per app and reuse it across
 * requests to benefit from JWKS caching.
 */
export function createMrbdTokenVerifier(config: MrbdTokenVerifierConfig): MrbdTokenVerifier {
  if (!config.appId.trim()) {
    throw new MrbdAuthError("invalid_config", "MRBD token verification requires a non-empty appId.");
  }

  const authUrl = normalizeAuthUrl(config.authUrl ?? DEFAULT_AUTH_URL);
  const issuer = (config.issuer ?? authUrl).replace(/\/+$/, "");
  const jwks = createRemoteJWKSet(new URL(`${authUrl}/.well-known/jwks.json`));

  return {
    async verify(accessToken: string): Promise<MrbdVerifiedToken> {
      if (!accessToken) {
        throw new MrbdAuthError("invalid_session", "No access token was provided.");
      }

      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(accessToken, jwks, {
          audience: config.appId,
          issuer,
          ...(config.clockTolerance !== undefined
            ? { clockTolerance: config.clockTolerance }
            : {}),
        }));
      } catch (error) {
        throw toVerifyError(error);
      }

      if (!payload.sub) {
        throw new MrbdAuthError("invalid_session", "Token is missing a subject (sub) claim.");
      }

      const result: MrbdVerifiedToken = {
        userId: payload.sub,
        appId: config.appId,
        scope: parseScope(payload.scope),
        expiresAt: new Date((payload.exp ?? 0) * 1000),
        payload,
      };
      if (typeof payload.email === "string") result.email = payload.email;
      if (typeof payload.iat === "number") result.issuedAt = new Date(payload.iat * 1000);
      return result;
    },
  };
}

/** Convenience one-shot verify. Prefer {@link createMrbdTokenVerifier} for reuse. */
export async function verifyMrbdAccessToken(
  accessToken: string,
  config: MrbdTokenVerifierConfig,
): Promise<MrbdVerifiedToken> {
  return createMrbdTokenVerifier(config).verify(accessToken);
}

function parseScope(scope: unknown): string[] {
  if (typeof scope === "string") {
    return scope.split(" ").filter(Boolean);
  }
  if (Array.isArray(scope)) {
    return scope.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function toVerifyError(error: unknown): MrbdAuthError {
  if (error instanceof joseErrors.JWTExpired) {
    return new MrbdAuthError("invalid_session", "The access token has expired.", { details: error });
  }
  if (error instanceof joseErrors.JWTClaimValidationFailed) {
    const claim = error.claim;
    const message =
      claim === "aud"
        ? "The access token was issued for a different app."
        : `The access token failed a claim check (${claim}).`;
    return new MrbdAuthError("invalid_session", message, { details: error });
  }
  if (error instanceof joseErrors.JOSEError) {
    return new MrbdAuthError("invalid_session", "The access token could not be verified.", {
      details: error,
    });
  }
  return new MrbdAuthError("network_error", "Unable to verify the access token.", { details: error });
}

function normalizeAuthUrl(authUrl: string): string {
  return authUrl.replace(/\/+$/, "");
}
