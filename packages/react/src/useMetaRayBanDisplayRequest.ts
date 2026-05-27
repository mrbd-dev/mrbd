import { isMetaRayBanDisplayRequest, type MrbdHeaderSource } from "@mrbd/core";
import { useMemo } from "react";

export function useMetaRayBanDisplayRequest(headers: MrbdHeaderSource): boolean {
  return useMemo(() => isMetaRayBanDisplayRequest(headers), [headers]);
}
