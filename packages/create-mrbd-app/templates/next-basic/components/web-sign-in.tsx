"use client";

import { MrbdAuthGate, MrbdAuthProvider, MrbdEmailSignInScreen, useMrbdAuth } from "@mrbd/auth/react";
import Link from "next/link";

import { MRBD_APP_ID } from "@/lib/mrbd-app";

// Sign-in demo as it appears on a phone or computer. Because this surface has a
// keyboard, it uses the direct email-OTP flow (MrbdEmailSignInScreen) instead of
// the glasses device-pairing screen: the user types their email and the one-time
// code right here. The resulting session shares the same MRBD user as the glasses.
export function WebSignIn() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-6 py-16 text-white">
      <div className="w-full max-w-sm">
        <MrbdAuthProvider appId={MRBD_APP_ID}>
          <MrbdAuthGate fallback={<MrbdEmailSignInScreen className="w-full" />}>
            <SignedIn />
          </MrbdAuthGate>
        </MrbdAuthProvider>
      </div>

      <Link href="/" className="text-sm text-neutral-400 underline hover:text-white">
        Back home
      </Link>
    </main>
  );
}

function SignedIn() {
  const { session, signOut } = useMrbdAuth();

  return (
    <div className="border border-white p-4">
      <h1 className="text-xl font-semibold">Signed in</h1>
      <p className="mt-2 break-all text-sm text-neutral-400">User: {session?.userId}</p>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-4 w-full border border-white bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
      >
        Sign out
      </button>
    </div>
  );
}
