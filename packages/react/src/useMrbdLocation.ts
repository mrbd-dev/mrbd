import { getCurrentMrbdPosition, type MrbdLocationOptions, type MrbdLocationResult } from "@mrbd/core";
import { useCallback, useState } from "react";

export type UseMrbdLocationResult = {
  result: MrbdLocationResult | null;
  loading: boolean;
  getCurrentPosition: (options?: MrbdLocationOptions) => Promise<MrbdLocationResult>;
};

export function useMrbdLocation(): UseMrbdLocationResult {
  const [result, setResult] = useState<MrbdLocationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = useCallback(async (options?: MrbdLocationOptions) => {
    setLoading(true);
    const nextResult = await getCurrentMrbdPosition(options);
    setResult(nextResult);
    setLoading(false);
    return nextResult;
  }, []);

  return { result, loading, getCurrentPosition };
}
