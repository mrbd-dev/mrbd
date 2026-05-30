"use client";

import { MrbdAuthGate, MrbdAuthProvider, useMrbdAuth } from "@mrbd/auth/react";
import { MrbdButton, MrbdViewport } from "@mrbd/react";

import { MRBD_APP_ID } from "@/lib/mrbd-app";

// Sign-in demo as it appears on the glasses: the built-in 600x600, D-pad
// numpad pairing flow inside MrbdViewport.
export function GlassesSignIn() {
  return (
    <MrbdViewport className="text-white">
      <MrbdAuthProvider appId={MRBD_APP_ID}>
        <MrbdAuthGate>
          <SignedIn />
        </MrbdAuthGate>
      </MrbdAuthProvider>
    </MrbdViewport>
  );
}

function SignedIn() {
  const { session, signOut } = useMrbdAuth();

  return (
    <main className="flex h-full flex-col gap-4 rounded-[28px] bg-[#0a0a0f] p-6">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">Signed in</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">Welcome back</h1>
        <p className="mt-3 break-all text-sm text-zinc-300">User: {session?.userId}</p>
      </section>

      <div className="mt-auto">
        <MrbdButton className="w-full" onClick={() => void signOut()}>
          Sign out
        </MrbdButton>
      </div>
    </main>
  );
}
