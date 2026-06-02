import { createContext } from "react";

export type MrbdTextInputRequest = {
  /** Pre-fill the field. */
  initialValue?: string;
  /** Title / placeholder shown above the keyboard. */
  title?: string;
};

export type MrbdKeyboardContextValue = {
  /** Open the head keyboard and resolve with the typed text, or null if cancelled. */
  requestText: (request?: MrbdTextInputRequest) => Promise<string | null>;
  isOpen: boolean;
};

export const MrbdKeyboardContext = createContext<MrbdKeyboardContextValue | null>(null);
