import { createAuthedClient } from "./supabase.js";

const APP_ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENVIRONMENTS = ["development", "preview", "production"] as const;
const STATUSES = ["active", "disabled", "revoked"] as const;

type AuthApp = {
  app_id: string;
  display_name: string;
  environment: string;
  status: string;
  allowed_origins: string[] | null;
  notes: string | null;
  publisher_name: string | null;
  legal_contact_email: string | null;
  privacy_policy_url: string | null;
  terms_url: string | null;
  use_generated_privacy: boolean | null;
  use_generated_terms: boolean | null;
  created_at: string;
  updated_at: string;
};

type ArgSpec = {
  booleans?: string[];
  arrays?: string[];
};

type ParsedArgs = {
  positionals: string[];
  values: Record<string, string>;
  lists: Record<string, string[]>;
  flags: Record<string, boolean>;
};

function parseArgs(args: string[], spec: ArgSpec): ParsedArgs {
  const booleans = new Set(spec.booleans ?? []);
  const arrays = new Set(spec.arrays ?? []);
  const positionals: string[] = [];
  const values: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  const flags: Record<string, boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const name = arg.slice(2);
    if (name.startsWith("no-") && booleans.has(name.slice(3))) {
      flags[name.slice(3)] = false;
      continue;
    }
    if (booleans.has(name)) {
      flags[name] = true;
      continue;
    }

    const next = args[index + 1];
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`--${name} requires a value.`);
    }
    if (arrays.has(name)) {
      (lists[name] ??= []).push(next);
    } else {
      values[name] = next;
    }
    index += 1;
  }

  return { positionals, values, lists, flags };
}

function assertAppId(value: string): void {
  if (!APP_ID_PATTERN.test(value)) {
    throw new Error(
      "App ID must use reverse-domain notation (e.g. com.example.my-app).",
    );
  }
}

function assertDisplayName(value: string): void {
  if (value.length < 1 || value.length > 256) {
    throw new Error("Display name must be between 1 and 256 characters.");
  }
}

function assertEnvironment(value: string): asserts value is (typeof ENVIRONMENTS)[number] {
  if (!ENVIRONMENTS.includes(value as (typeof ENVIRONMENTS)[number])) {
    throw new Error(`Environment must be one of: ${ENVIRONMENTS.join(", ")}.`);
  }
}

function assertStatus(value: string): asserts value is (typeof STATUSES)[number] {
  if (!STATUSES.includes(value as (typeof STATUSES)[number])) {
    throw new Error(`Status must be one of: ${STATUSES.join(", ")}.`);
  }
}

function assertUrl(value: string, label: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`${label} must be a full URL (e.g. https://app.example.com).`);
  }
}

// Mirrors the portal's legal validation: every app needs a privacy policy
// (a URL or an MRBD-generated one), and generating any document requires
// publisher contact details.
function assertLegalInvariant(state: {
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  useGeneratedPrivacy: boolean;
  useGeneratedTerms: boolean;
  publisherName: string | null;
  legalContactEmail: string | null;
}): void {
  if (!state.privacyPolicyUrl && !state.useGeneratedPrivacy) {
    throw new Error(
      "Provide --privacy-policy-url, or pass --generate-privacy to use an MRBD-generated policy.",
    );
  }

  const generatingPrivacy = state.useGeneratedPrivacy && !state.privacyPolicyUrl;
  const generatingTerms = state.useGeneratedTerms && !state.termsUrl;
  if (generatingPrivacy || generatingTerms) {
    if (!state.publisherName) {
      throw new Error(
        "--publisher-name is required to generate legal documents.",
      );
    }
    if (!state.legalContactEmail) {
      throw new Error(
        "--legal-email is required to generate legal documents.",
      );
    }
  }
}

export async function apps(args: string[]): Promise<void> {
  const subcommand = args[0];
  const rest = args.slice(1);

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    printAppsHelp();
    return;
  }

  switch (subcommand) {
    case "list":
      await listApps(rest);
      return;
    case "get":
      await getApp(rest);
      return;
    case "create":
      await createApp(rest);
      return;
    case "update":
      await updateApp(rest);
      return;
    default:
      console.error(`Unknown apps command: ${subcommand}`);
      printAppsHelp();
      process.exit(1);
  }
}

async function listApps(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("List the auth apps you own.\n\nUsage:\n  mrbd apps list");
    return;
  }

  const { client } = await createAuthedClient();
  const { data, error } = await client
    .from("mrbd_apps")
    .select("app_id, display_name, environment, status, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    console.log("No auth apps yet. Create one with `mrbd apps create`.");
    return;
  }

  const rows = data.map((app) => ({
    appId: app.app_id as string,
    name: app.display_name as string,
    env: app.environment as string,
    status: app.status as string,
  }));

  const widths = {
    appId: Math.max(6, ...rows.map((r) => r.appId.length)),
    name: Math.max(4, ...rows.map((r) => r.name.length)),
    env: Math.max(11, ...rows.map((r) => r.env.length)),
  };

  const header = `${"APP ID".padEnd(widths.appId)}  ${"NAME".padEnd(widths.name)}  ${"ENVIRONMENT".padEnd(widths.env)}  STATUS`;
  console.log(header);
  for (const row of rows) {
    console.log(
      `${row.appId.padEnd(widths.appId)}  ${row.name.padEnd(widths.name)}  ${row.env.padEnd(widths.env)}  ${row.status}`,
    );
  }
}

async function getApp(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Show details for one auth app.\n\nUsage:\n  mrbd apps get <appId>");
    return;
  }

  const appId = args.find((arg) => !arg.startsWith("-"));
  if (!appId) {
    throw new Error("Provide an app ID (e.g. mrbd apps get com.example.app).");
  }

  const { client } = await createAuthedClient();
  const { data, error } = await client
    .from("mrbd_apps")
    .select("*")
    .eq("app_id", appId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(`No auth app found with ID ${appId} (or you do not own it).`);
  }

  const app = data as AuthApp;
  const lines: Array<[string, string]> = [
    ["App ID", app.app_id],
    ["Display name", app.display_name],
    ["Environment", app.environment],
    ["Status", app.status],
    ["Allowed origins", (app.allowed_origins ?? []).join(", ") || "(none)"],
    ["Privacy policy", app.privacy_policy_url ?? (app.use_generated_privacy ? "(MRBD-generated)" : "(none)")],
    ["Terms", app.terms_url ?? (app.use_generated_terms ? "(MRBD-generated)" : "(none)")],
    ["Publisher", app.publisher_name ?? "(none)"],
    ["Legal contact", app.legal_contact_email ?? "(none)"],
    ["Notes", app.notes ?? "(none)"],
    ["Created", app.created_at],
    ["Updated", app.updated_at],
  ];
  const labelWidth = Math.max(...lines.map(([label]) => label.length));
  for (const [label, value] of lines) {
    console.log(`${`${label}:`.padEnd(labelWidth + 1)} ${value}`);
  }
}

async function createApp(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printCreateHelp();
    return;
  }

  const parsed = parseArgs(args, {
    booleans: ["generate-privacy", "generate-terms"],
    arrays: ["origin"],
  });

  const appId = parsed.values["app-id"] ?? parsed.positionals[0];
  if (!appId) {
    throw new Error("--app-id is required.");
  }
  assertAppId(appId);

  const displayName = parsed.values["name"];
  if (!displayName) {
    throw new Error("--name is required.");
  }
  assertDisplayName(displayName);

  const environment = parsed.values["env"] ?? "development";
  assertEnvironment(environment);

  const origins = parsed.lists["origin"] ?? [];
  if (origins.length === 0) {
    throw new Error("Add at least one allowed origin with --origin <url>.");
  }
  for (const origin of origins) {
    assertUrl(origin, "Each --origin");
  }

  const privacyPolicyUrl = parsed.values["privacy-policy-url"] ?? null;
  if (privacyPolicyUrl) {
    assertUrl(privacyPolicyUrl, "--privacy-policy-url");
  }
  const termsUrl = parsed.values["terms-url"] ?? null;
  if (termsUrl) {
    assertUrl(termsUrl, "--terms-url");
  }

  const legalContactEmail = parsed.values["legal-email"] ?? null;
  if (legalContactEmail && !EMAIL_PATTERN.test(legalContactEmail)) {
    throw new Error("--legal-email must be a valid email address.");
  }

  const useGeneratedPrivacy = parsed.flags["generate-privacy"] ?? false;
  const useGeneratedTerms = parsed.flags["generate-terms"] ?? false;
  const publisherName = parsed.values["publisher-name"] ?? null;
  const notes = parsed.values["notes"] ?? null;

  assertLegalInvariant({
    privacyPolicyUrl,
    termsUrl,
    useGeneratedPrivacy,
    useGeneratedTerms,
    publisherName,
    legalContactEmail,
  });

  const { client, userId, email } = await createAuthedClient();
  const { error } = await client.from("mrbd_apps").insert({
    app_id: appId,
    display_name: displayName,
    environment,
    status: "active",
    allowed_origins: origins,
    allowed_redirect_urls: [],
    scopes: [],
    owner_user_id: userId,
    owner_email: email,
    notes,
    publisher_name: publisherName,
    legal_contact_email: legalContactEmail,
    privacy_policy_url: privacyPolicyUrl,
    terms_url: termsUrl,
    use_generated_privacy: useGeneratedPrivacy,
    use_generated_terms: useGeneratedTerms,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("An app with this ID already exists.");
    }
    throw new Error(error.message);
  }

  console.log(`Created auth app ${appId}.`);
}

async function updateApp(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    printUpdateHelp();
    return;
  }

  const parsed = parseArgs(args, {
    booleans: ["generate-privacy", "generate-terms"],
    arrays: ["origin"],
  });

  const appId = parsed.positionals[0] ?? parsed.values["app-id"];
  if (!appId) {
    throw new Error(
      "Provide the app ID to update (e.g. mrbd apps update com.example.app).",
    );
  }

  const { client } = await createAuthedClient();
  const { data: existing, error: fetchError } = await client
    .from("mrbd_apps")
    .select("*")
    .eq("app_id", appId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!existing) {
    throw new Error(`No auth app found with ID ${appId} (or you do not own it).`);
  }
  const current = existing as AuthApp;

  const patch: Record<string, unknown> = {};

  if (parsed.values["name"] !== undefined) {
    assertDisplayName(parsed.values["name"]);
    patch.display_name = parsed.values["name"];
  }
  if (parsed.values["env"] !== undefined) {
    assertEnvironment(parsed.values["env"]);
    patch.environment = parsed.values["env"];
  }
  if (parsed.values["status"] !== undefined) {
    assertStatus(parsed.values["status"]);
    patch.status = parsed.values["status"];
  }
  if (parsed.lists["origin"]) {
    for (const origin of parsed.lists["origin"]) {
      assertUrl(origin, "Each --origin");
    }
    patch.allowed_origins = parsed.lists["origin"];
  }
  if (parsed.values["notes"] !== undefined) {
    patch.notes = parsed.values["notes"] || null;
  }
  if (parsed.values["privacy-policy-url"] !== undefined) {
    const value = parsed.values["privacy-policy-url"];
    if (value) {
      assertUrl(value, "--privacy-policy-url");
    }
    patch.privacy_policy_url = value || null;
  }
  if (parsed.values["terms-url"] !== undefined) {
    const value = parsed.values["terms-url"];
    if (value) {
      assertUrl(value, "--terms-url");
    }
    patch.terms_url = value || null;
  }
  if (parsed.values["publisher-name"] !== undefined) {
    patch.publisher_name = parsed.values["publisher-name"] || null;
  }
  if (parsed.values["legal-email"] !== undefined) {
    const value = parsed.values["legal-email"];
    if (value && !EMAIL_PATTERN.test(value)) {
      throw new Error("--legal-email must be a valid email address.");
    }
    patch.legal_contact_email = value || null;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.flags, "generate-privacy")) {
    patch.use_generated_privacy = parsed.flags["generate-privacy"];
  }
  if (Object.prototype.hasOwnProperty.call(parsed.flags, "generate-terms")) {
    patch.use_generated_terms = parsed.flags["generate-terms"];
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("Nothing to update. Pass at least one field to change.");
  }

  const merged = { ...current, ...patch } as AuthApp;
  assertLegalInvariant({
    privacyPolicyUrl: merged.privacy_policy_url,
    termsUrl: merged.terms_url,
    useGeneratedPrivacy: Boolean(merged.use_generated_privacy),
    useGeneratedTerms: Boolean(merged.use_generated_terms),
    publisherName: merged.publisher_name,
    legalContactEmail: merged.legal_contact_email,
  });

  patch.updated_at = new Date().toISOString();

  const { error } = await client
    .from("mrbd_apps")
    .update(patch)
    .eq("app_id", appId);

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Updated auth app ${appId}.`);
}

function printAppsHelp(): void {
  console.log(`Manage your MRBD auth apps.

Usage:
  mrbd apps <command> [options]

Commands:
  list                 List the auth apps you own
  get <appId>          Show details for one auth app
  create [options]     Register a new auth app
  update <appId>       Update an existing auth app

Run \`mrbd apps <command> --help\` for command options.`);
}

function printCreateHelp(): void {
  console.log(`Register a new MRBD auth app.

Usage:
  mrbd apps create --app-id <id> --name <name> --origin <url> [options]

Required:
  --app-id <id>             Reverse-domain app ID (e.g. com.example.my-app)
  --name <name>             Display name
  --origin <url>            Allowed origin; repeat for multiple origins

Legal (a privacy policy is required):
  --privacy-policy-url <url>  Link to your privacy policy
  --generate-privacy          Use an MRBD-generated privacy policy instead
  --terms-url <url>           Link to your terms of service
  --generate-terms            Use MRBD-generated terms
  --publisher-name <name>     Required when generating legal documents
  --legal-email <email>       Required when generating legal documents

Options:
  --env <environment>       development | preview | production (default development)
  --notes <text>            Internal notes`);
}

function printUpdateHelp(): void {
  console.log(`Update an existing MRBD auth app. Only the fields you pass change.

Usage:
  mrbd apps update <appId> [options]

Options:
  --name <name>               Display name
  --env <environment>         development | preview | production
  --status <status>           active | disabled | revoked
  --origin <url>              Replace allowed origins; repeat for multiple
  --privacy-policy-url <url>  Link to your privacy policy
  --generate-privacy          Use an MRBD-generated privacy policy
  --no-generate-privacy       Stop using an MRBD-generated privacy policy
  --terms-url <url>           Link to your terms of service
  --generate-terms            Use MRBD-generated terms
  --no-generate-terms         Stop using MRBD-generated terms
  --publisher-name <name>     Publisher name for generated legal documents
  --legal-email <email>       Legal contact email
  --notes <text>              Internal notes`);
}
