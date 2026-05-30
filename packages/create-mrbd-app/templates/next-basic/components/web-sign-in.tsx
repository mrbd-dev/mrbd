"use client";

import { MrbdAuthGate, MrbdAuthProvider, MrbdSignInScreen, useMrbdAuth } from "@mrbd/auth/react";
import Link from "next/link";

import { MRBD_APP_ID } from "@/lib/mrbd-app";

// Sign-in demo as it appears on a phone or computer: the same real MRBD auth
// flow, laid out as a normal, responsive, centered page instead of the fixed
// 600x600 glasses frame.
export function WebSignIn() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a0a0f] px-6 py-16 text-white">
      <div className="w-full max-w-md">
        <MrbdAuthProvider appId={MRBD_APP_ID}>
          <MrbdAuthGate fallback={<MrbdSignInScreen className="w-full" />}>
            <SignedIn />
          </MrbdAuthGate>
        </MrbdAuthProvider>
      </div>

      <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300 hover:text-cyan-200">
        Back home
      </Link>
    </main>
  );
}

function SignedIn() {
  const { session, signOut } = useMrbdAuth();

  return (
    <div className="rounded-3xl border border-white/10 bg-[#16181d] p-8">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-300">Signed in</p>
      <h1 className="mt-2 text-3xl font-black leading-tight">Welcome back</h1>
      <p className="mt-3 break-all text-sm text-zinc-400">User: {session?.userId}</p>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-black transition-colors hover:bg-cyan-300"
      >
        Sign out
      </button>
    </div>
  );
}
