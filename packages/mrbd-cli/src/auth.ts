import {
  clearCredentials,
  getSupabaseConfig,
  readCredentials,
  writeCredentials,
} from "./config.js";
import { prompt } from "./prompt.js";
import { createAnonClient, createAuthedClient } from "./supabase.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_PATTERN = /^\d{6}$/;

function parseFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

export async function login(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printLoginHelp();
    return;
  }

  let email = parseFlag(args, "--email");
  if (!email) {
    email = await prompt("Developer email: ");
  }
  email = email.trim();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  const supabase = createAnonClient();
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (otpError) {
    throw new Error(`Could not send a sign-in code: ${otpError.message}`);
  }

  console.log(`We sent a 6-digit sign-in code to ${email}.`);
  const token = (await prompt("Enter the code: ")).trim();
  if (!OTP_PATTERN.test(token)) {
    throw new Error("Enter the 6-digit code from your email.");
  }

  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (verifyError || !data.session) {
    throw new Error(
      `Sign-in failed: ${verifyError?.message ?? "no session returned."}`,
    );
  }

  const config = getSupabaseConfig();
  await writeCredentials({
    supabaseUrl: config.url,
    publishableKey: config.publishableKey,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? null,
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? email,
    },
  });

  console.log(`Signed in as ${data.session.user.email ?? email}.`);
}

export async function logout(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Sign out of your MRBD developer account.\n\nUsage:\n  mrbd logout");
    return;
  }

  const credentials = await readCredentials();
  if (!credentials) {
    console.log("You are not signed in.");
    return;
  }

  // Best-effort server-side revoke; always clear local credentials regardless.
  try {
    const supabase = createAnonClient();
    await supabase.auth.setSession({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });
    await supabase.auth.signOut();
  } catch {
    // Ignore revoke failures; clearing the local session is what matters.
  }

  await clearCredentials();
  console.log("Signed out.");
}

export async function whoami(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Show the currently signed-in MRBD developer.\n\nUsage:\n  mrbd whoami");
    return;
  }

  const { email, userId } = await createAuthedClient();
  console.log(email ?? "(no email on account)");
  console.log(`User ID: ${userId}`);
}

function printLoginHelp(): void {
  console.log(`Sign in to your MRBD developer account with an email code.

Usage:
  mrbd login [options]

Options:
  --email <email>   Developer email to sign in with. Prompted if omitted.`);
}
