import { isMetaRayBanDisplayRequest } from "@mrbd/core";
import { headers } from "next/headers";

// Server-only check for the current request. The Meta Ray-Ban Display browser
// sends an `x-requested-with` header that @mrbd/core recognizes, so we can pick
// the right experience before any HTML is sent to the client.
export async function isOnMetaRayBanDisplay(): Promise<boolean> {
  return isMetaRayBanDisplayRequest(await headers());
}
