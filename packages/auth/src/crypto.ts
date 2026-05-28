import { MrbdAuthError } from "./error.js";

const secretBytes = 32;

function getCrypto(): Crypto {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues || !cryptoApi.subtle) {
    throw new MrbdAuthError(
      "browser_api_unavailable",
      "MRBD auth requires Web Crypto to start a sign-in request.",
    );
  }
  return cryptoApi;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function createDeviceSecret(): string {
  const bytes = new Uint8Array(secretBytes);
  getCrypto().getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function createDeviceChallenge(deviceSecret: string): Promise<string> {
  const bytes = new TextEncoder().encode(deviceSecret);
  const digest = await getCrypto().subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(digest));
}
