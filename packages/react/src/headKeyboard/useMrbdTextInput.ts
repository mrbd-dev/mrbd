import { useContext } from "react";
import { MrbdKeyboardContext, type MrbdKeyboardContextValue } from "./MrbdKeyboardContext.js";

/**
 * Access the imperative head-keyboard input API. Must be used within a
 * `MrbdKeyboardProvider`.
 *
 * @example
 * const { requestText } = useMrbdTextInput();
 * const reply = await requestText({ title: "Reply" });
 * if (reply !== null) send(reply);
 */
export function useMrbdTextInput(): MrbdKeyboardContextValue {
  const ctx = useContext(MrbdKeyboardContext);
  if (!ctx) {
    throw new Error("useMrbdTextInput must be used within a <MrbdKeyboardProvider>.");
  }
  return ctx;
}
