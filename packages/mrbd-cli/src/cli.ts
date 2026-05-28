#!/usr/bin/env node
import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { chmod, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { stdout } from "node:process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import extractZip from "extract-zip";
import * as tar from "tar";
import type { ChildProcess } from "node:child_process";

const require = createRequire(import.meta.url);
const qrcode = require("qrcode-terminal") as typeof import("qrcode-terminal");

const DEFAULT_API_URL = "https://api.mrbd.host";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_DEV_COMMAND = "npm run dev";
const DEFAULT_WAIT_MS = 30_000;
const DEFAULT_TUNNEL_WAIT_MS = 15_000;
const SESSION_CREATE_ATTEMPTS = 3;
const FRP_VERSION = "0.61.2";
const FRP_RELEASE_BASE_URL = `https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}`;
const FRP_CHECKSUMS = {
  "frp_0.61.2_darwin_amd64.tar.gz": "77765c608c1e38122d2e0f39b73f093891b659b8cb52d09e3088d04fa6e3b73d",
  "frp_0.61.2_darwin_arm64.tar.gz": "c70069876a72959daca6876a44255b65f0155b5ba54f918438a07b5db9d31cf2",
  "frp_0.61.2_linux_amd64.tar.gz": "4738edbd4bf88db5fe0ccee946d63da3b498c9cc50b0c7317d017fe7d28a05ea",
  "frp_0.61.2_linux_arm64.tar.gz": "6c80eb8549899e4a6f0d1c04cda58bfba47be949c308f6e55662f20b807296c2",
  "frp_0.61.2_windows_amd64.zip": "5173739890fe7462eed6c9ca4e8ed2f98fca3604174bc596b0e955a4c58a50f2",
  "frp_0.61.2_windows_arm64.zip": "6b1a374a95971911e0b7d962d3e6a879c45d6676e8b741f981c5759c892f0797",
} as const;

type StartOptions = {
  apiUrl: string;
  command: string | null;
  frpcPath: string | null;
  host: string;
  port: number;
  ttlSeconds: number | null;
};

type TunnelSession = {
  tunnelId: string;
  tunnelUrl: string;
  expiresAt?: string;
  frp: {
    serverAddr: string;
    serverPort: number;
    authToken: string;
    gateToken?: string;
    proxyName: string;
    customDomains?: string[];
    useTls?: boolean;
  };
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "start") {
    await start(args.slice(1));
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

async function start(args: string[]) {
  const options = parseStartOptions(args);
  let devProcess: ChildProcess | null = null;
  let configPath: string | null = null;
  let frpcProcess: ChildProcess | null = null;
  let session: TunnelSession | null = null;
  let cleaningUp = false;

  const cleanup = async (reason: "user_quit" | "process_exit" | "error") => {
    if (cleaningUp) {
      return;
    }
    cleaningUp = true;
    frpcProcess?.kill("SIGTERM");
    if (session) {
      await revokeTunnelSession(options.apiUrl, session, reason);
    }
    devProcess?.kill("SIGTERM");
    if (configPath) {
      await rm(configPath, { force: true });
    }
  };

  process.once("SIGINT", () => {
    void cleanup("user_quit").finally(() => process.exit(130));
  });
  process.once("SIGTERM", () => {
    void cleanup("user_quit").finally(() => process.exit(143));
  });

  try {
    if (!(await isPortOpen(options.host, options.port))) {
      if (!options.command) {
        throw new Error(`No server is listening at ${options.host}:${options.port}. Start it first or remove --no-dev.`);
      }

      console.log(`Starting local dev server with \`${options.command}\`...`);
      devProcess = spawnShell(options.command);
      await waitForPort(options.host, options.port, DEFAULT_WAIT_MS);
    }

    console.log("Requesting MRBD tunnel session...");
    session = await createTunnelSession(options);

    const frpcPath = await resolveFrpcPath(options.frpcPath);
    const safeTunnelId = session.tunnelId.replace(/[^a-zA-Z0-9_-]/g, "_");
    configPath = join(tmpdir(), `mrbd-${safeTunnelId}.toml`);
    await writeFile(configPath, createFrpcConfig(session, options), { encoding: "utf8", mode: 0o600 });

    if (!session.frp.gateToken) {
      console.warn("Tunnel API did not return frp.gateToken. frpc login may fail until the gate token is enabled.");
    }

    console.log("Opening MRBD tunnel...");
    const child = spawn(frpcPath, ["-c", configPath], { stdio: ["ignore", "pipe", "pipe"] });
    frpcProcess = child;

    await waitForTunnelStart(child, DEFAULT_TUNNEL_WAIT_MS);
    tailChildOutput(child);

    const appName = await readAppName();
    const deepLinkUrl = buildMetaAiDeepLink(appName, session.tunnelUrl);

    console.log("");
    console.log(`MRBD tunnel ready: ${session.tunnelUrl}`);
    if (session.expiresAt) {
      console.log(`Expires: ${session.expiresAt}`);
    }
    console.log("");
    console.log(`Scan this QR code with your phone to open "${appName}" in the Meta AI app:`);
    console.log("");
    qrcode.generate(deepLinkUrl, { small: true });
    console.log("");
    console.log(`Meta AI deep link: ${deepLinkUrl}`);
    console.log("");
    console.log("Or paste the HTTPS URL above directly in the Meta AI app. Press Ctrl+C to stop.");

    await waitForExit(child);
    await cleanup("process_exit");
  } catch (error) {
    await cleanup("error");
    throw error;
  }
}

function parseStartOptions(args: string[]): StartOptions {
  const options: StartOptions = {
    apiUrl: process.env.MRBD_TUNNEL_API_URL ?? DEFAULT_API_URL,
    command: DEFAULT_DEV_COMMAND,
    frpcPath: process.env.MRBD_FRPC_PATH ?? null,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    ttlSeconds: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--help" || arg === "-h") {
      printStartHelp();
      process.exit(0);
    }
    if (arg === "--no-dev") {
      options.command = null;
      continue;
    }
    if (arg === "--api-url") {
      options.apiUrl = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === "--command") {
      options.command = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === "--frpc-path") {
      options.frpcPath = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === "--host") {
      options.host = requireValue(arg, next);
      index += 1;
      continue;
    }
    if (arg === "--port") {
      options.port = parsePositiveInt(requireValue(arg, next), arg);
      index += 1;
      continue;
    }
    if (arg === "--ttl") {
      options.ttlSeconds = parsePositiveInt(requireValue(arg, next), arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

async function createTunnelSession(options: StartOptions): Promise<TunnelSession> {
  for (let attempt = 1; attempt <= SESSION_CREATE_ATTEMPTS; attempt += 1) {
    const response = await fetch(new URL("/v1/tunnels", options.apiUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "mrbd-cli",
      },
      body: JSON.stringify({
        localHost: options.host,
        localPort: options.port,
        ttlSeconds: options.ttlSeconds,
        client: {
          name: "@mrbd/cli",
          platform: process.platform,
          arch: process.arch,
          node: process.version,
        },
      }),
    });

    if (response.ok) {
      const session = (await response.json()) as Partial<TunnelSession>;
      validateTunnelSession(session);
      return session;
    }

    const message = await readTunnelError(response);
    if (response.status >= 500 && attempt < SESSION_CREATE_ATTEMPTS) {
      await delay(500 * attempt);
      continue;
    }

    throw new Error(`Tunnel session request failed (${response.status}): ${message}`);
  }

  throw new Error("Tunnel session request failed.");
}

async function revokeTunnelSession(apiUrl: string, session: TunnelSession, reason: string) {
  try {
    await fetch(new URL(`/v1/tunnels/${encodeURIComponent(session.tunnelId)}`, apiUrl), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.frp.authToken}`,
        "Content-Type": "application/json",
        "User-Agent": "mrbd-cli",
      },
      body: JSON.stringify({ reason }),
    });
  } catch {
    // The session will expire server-side; shutdown should not hang on revoke failures.
  }
}

async function readTunnelError(response: Response) {
  const requestId = response.headers.get("x-request-id");
  let message = response.statusText || "Request failed";
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { message?: unknown; code?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      message = payload.message;
    } else if (typeof payload.code === "string" && payload.code.trim()) {
      message = payload.code;
    }
  } catch {
    if (text.trim()) {
      message = text.trim();
    }
  }

  return requestId ? `${message} (request ${requestId})` : message;
}

function createFrpcConfig(session: TunnelSession, options: StartOptions) {
  const lines = [
    `serverAddr = ${tomlString(session.frp.serverAddr)}`,
    `serverPort = ${session.frp.serverPort}`,
    "loginFailExit = true",
    `transport.tls.enable = ${session.frp.useTls ? "true" : "false"}`,
    "",
    "[auth]",
    "method = \"token\"",
    `token = ${tomlString(session.frp.gateToken ?? "")}`,
    "",
  ];

  lines.push(
    "[[proxies]]",
    `name = ${tomlString(session.frp.proxyName)}`,
    "type = \"http\"",
    `localIP = ${tomlString(options.host)}`,
    `localPort = ${options.port}`,
  );

  if (session.frp.customDomains?.length) {
    lines.push(`customDomains = [${session.frp.customDomains.map(tomlString).join(", ")}]`);
  }

  lines.push(`metadatas.session_token = ${tomlString(session.frp.authToken)}`);

  return `${lines.join("\n")}\n`;
}

async function resolveFrpcPath(explicitPath: string | null) {
  if (explicitPath) {
    await assertExecutable(explicitPath);
    return explicitPath;
  }

  return ensureManagedFrpc();
}

async function ensureManagedFrpc() {
  const target = getFrpTarget();
  const installDir = join(homedir(), ".mrbd", "bin", `frp-v${FRP_VERSION}-${target.id}`);
  const executablePath = join(installDir, process.platform === "win32" ? "frpc.exe" : "frpc");

  if (await exists(executablePath)) {
    return executablePath;
  }

  console.log(`Installing frpc v${FRP_VERSION} for ${target.id}...`);
  await mkdir(installDir, { recursive: true, mode: 0o755 });

  const archivePath = join(tmpdir(), target.assetName);
  await downloadFile(`${FRP_RELEASE_BASE_URL}/${target.assetName}`, archivePath);
  await verifySha256(archivePath, FRP_CHECKSUMS[target.assetName]);
  await extractFrpArchive(archivePath, installDir, target.assetName);
  await rm(archivePath, { force: true });

  if (!(await exists(executablePath))) {
    throw new Error(`Downloaded frpc archive did not contain ${process.platform === "win32" ? "frpc.exe" : "frpc"}.`);
  }

  if (process.platform !== "win32") {
    await chmod(executablePath, 0o755);
  }

  return executablePath;
}

function getFrpTarget() {
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  const platform = process.platform;

  if (platform === "darwin" && (arch === "amd64" || arch === "arm64")) {
    return {
      id: `darwin-${arch}`,
      assetName: `frp_${FRP_VERSION}_darwin_${arch}.tar.gz`,
    } as const;
  }

  if (platform === "linux" && (arch === "amd64" || arch === "arm64")) {
    return {
      id: `linux-${arch}`,
      assetName: `frp_${FRP_VERSION}_linux_${arch}.tar.gz`,
    } as const;
  }

  if (platform === "win32" && (arch === "amd64" || arch === "arm64")) {
    return {
      id: `win32-${arch}`,
      assetName: `frp_${FRP_VERSION}_windows_${arch}.zip`,
    } as const;
  }

  throw new Error(
    `Automatic frpc install is not available for ${process.platform}/${process.arch}. Pass --frpc-path /path/to/frpc.`,
  );
}

async function downloadFile(url: string, destination: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "mrbd-cli",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download frpc (${response.status}). Pass --frpc-path /path/to/frpc to use a local binary.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, buffer, { mode: 0o600 });
}

async function verifySha256(path: string, expected: string) {
  const { readFile } = await import("node:fs/promises");
  const buffer = await readFile(path);
  const actual = createHash("sha256").update(buffer).digest("hex");

  if (actual !== expected) {
    await rm(path, { force: true });
    throw new Error("Downloaded frpc archive failed checksum verification.");
  }
}

async function extractFrpArchive(archivePath: string, installDir: string, assetName: string) {
  await rm(installDir, { recursive: true, force: true });
  await mkdir(installDir, { recursive: true, mode: 0o755 });

  if (assetName.endsWith(".zip")) {
    await extractZip(archivePath, { dir: installDir });
    await flattenExtractedFrpDirectory(installDir);
    return;
  }

  await tar.x({
    file: archivePath,
    cwd: installDir,
    strip: 1,
  });
}

async function flattenExtractedFrpDirectory(installDir: string) {
  const { readdir, rename } = await import("node:fs/promises");
  const entries = await readdir(installDir, { withFileTypes: true });
  const extractedDir = entries.find((entry) => entry.isDirectory() && entry.name.startsWith(`frp_${FRP_VERSION}_`));

  if (!extractedDir) {
    return;
  }

  const nestedDir = join(installDir, extractedDir.name);
  const nestedEntries = await readdir(nestedDir);
  for (const entry of nestedEntries) {
    await rename(join(nestedDir, entry), join(installDir, entry));
  }
  await rm(nestedDir, { recursive: true, force: true });
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function assertExecutable(path: string) {
  try {
    await access(path, constants.X_OK);
  } catch {
    throw new Error(`frpc is not executable: ${path}`);
  }
}

async function isPortOpen(host: string, port: number) {
  const net = await import("node:net");
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(host: string, port: number, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(host, port)) {
      return;
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${host}:${port}.`);
}

function spawnShell(command: string) {
  return spawn(command, {
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
  });
}

function tailChildOutput(child: ChildProcess) {
  child.stdout?.on("data", (chunk) => stdout.write(chunk));
  child.stderr?.on("data", (chunk) => stdout.write(chunk));
}

async function waitForTunnelStart(child: ChildProcess, timeoutMs: number) {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let output = "";
    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      child.stdout?.off("data", onData);
      child.stderr?.off("data", onData);
      child.off("exit", onExit);
      callback();
    };
    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      stdout.write(chunk);
      if (/start proxy success/i.test(output)) {
        settle(resolve);
      }
    };
    const onExit = (code: number | null) => {
      settle(() => reject(new Error(`frpc exited before the tunnel was ready with code ${code ?? "unknown"}.`)));
    };
    const timeout = setTimeout(() => {
      settle(() => reject(new Error("Timed out waiting for frpc to report proxy startup.")));
    }, timeoutMs);

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("exit", onExit);
  });
}

async function waitForExit(child: ChildProcess) {
  await new Promise<void>((resolve, reject) => {
    child.once("exit", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`frpc exited with code ${code}.`));
      }
    });
  });
}

function validateTunnelSession(value: Partial<TunnelSession>): asserts value is TunnelSession {
  if (
    !value.tunnelId ||
    !value.tunnelUrl ||
    !value.frp?.serverAddr ||
    typeof value.frp.serverPort !== "number" ||
    !value.frp.authToken ||
    !value.frp.proxyName
  ) {
    throw new Error("Tunnel API returned an invalid session payload.");
  }
}

function requireValue(flag: string, value: string | undefined) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function parsePositiveInt(value: string, flag: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

function tomlString(value: string) {
  return JSON.stringify(value);
}

function buildMetaAiDeepLink(appName: string, appUrl: string) {
  const params = new URLSearchParams({ appName, appUrl });
  return `https://facebook.com/fb_viewapp/web_app_deep_link?${params.toString()}`;
}

async function readAppName(): Promise<string> {
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { mrbd?: { appName?: unknown }; displayName?: unknown; name?: unknown };

    const candidates = [pkg.mrbd?.appName, pkg.displayName, pkg.name];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return formatAppName(candidate);
      }
    }
  } catch {
    // Fall through to default if we can't read the local package.json.
  }
  return "MRBD App";
}

function formatAppName(raw: string) {
  const trimmed = raw.trim();
  const withoutScope = trimmed.startsWith("@") ? trimmed.split("/").slice(1).join("/") || trimmed : trimmed;
  return withoutScope || "MRBD App";
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function printHelp() {
  console.log(`MRBD command-line tools.

Usage:
  mrbd start [options]

Run \`mrbd start --help\` for tunnel options.`);
}

function printStartHelp() {
  console.log(`Start a local MRBD app and expose it through a hosted tunnel.

Usage:
  mrbd start [options]

Options:
  --api-url <url>       Tunnel control API URL. Defaults to ${DEFAULT_API_URL}
  --command <command>   Dev command to run when the port is not listening. Defaults to "${DEFAULT_DEV_COMMAND}"
  --frpc-path <path>    Path to the FRP client binary. Defaults to a bundled frpc installed under ~/.mrbd/bin
  --host <host>         Local host to forward. Defaults to ${DEFAULT_HOST}
  --no-dev              Do not start a dev server automatically
  --port <port>         Local port to forward. Defaults to ${DEFAULT_PORT}
  --ttl <seconds>       Requested tunnel lifetime
`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
