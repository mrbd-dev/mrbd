"use client";

import { MrbdKeyboardProvider } from "@mrbd/react";
import type { ReactNode } from "react";

// Wraps the app in the head keyboard. With `autoBind` on (glasses only), any
// native <input>/<textarea> opens the head-aimed keyboard on D-pad Enter and
// writes the typed text back — iOS keyboard style. On phones/computers we leave
// it off so the device's own keyboard is used. Opt a field out with
// data-mrbd-keyboard="off".
//
// The wearer aims with head orientation and pinches to type, or pinch-and-holds
// to swipe a whole word. Pointer smoothing and the swipe decoder use sensible
// defaults tuned for the glasses — pass `config={{ minCutoff, beta }}` to
// MrbdKeyboardProvider only if you need to retune the reticle smoothing.
export function MrbdKeyboardRoot({
  children,
  autoBind,
}: {
  children: ReactNode;
  autoBind: boolean;
}) {
  return <MrbdKeyboardProvider autoBind={autoBind}>{children}</MrbdKeyboardProvider>;
}
