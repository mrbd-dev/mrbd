import { createContext } from "react";
import type { MrbdKeyboardLayout } from "./layout.js";

export type MrbdTextInputRequest = {
  /** Pre-fill the field. */
  initialValue?: string;
  /** Title / placeholder shown above the keyboard. */
  title?: string;
  /** Override the keyboard layout for this request (e.g. numeric). */
  layout?: MrbdKeyboardLayout;
  /** Maximum number of characters the wearer can enter. */
  maxLength?: number;
};

export type MrbdKeyboardContextValue = {
  /** Open the head keyboard and resolve with the typed text, or null if cancelled. */
  requestText: (request?: MrbdTextInputRequest) => Promise<string | null>;
  isOpen: boolean;
};

export const MrbdKeyboardContext = createContext<MrbdKeyboardContextValue | null>(null);
