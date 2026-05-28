#!/usr/bin/env node
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(__dirname, "../templates/next-basic");

const args = process.argv.slice(2);
const help = args.includes("--help") || args.includes("-h");
const force = args.includes("--force");
const install = args.includes("--install");
const argName = args.find((arg) => !arg.startsWith("-"));

if (help) {
  console.log(`Create a Meta Ray-Ban Display web app.

Usage:
  npm create mrbd-app@latest
  npx create-mrbd-app

The scaffold includes mrbd-cli and an npm run mrbd:start script for HTTPS tunnel testing.

Options:
  --force     Write into an existing directory
  --install   Run npm install after scaffolding
`);
  process.exit(0);
}

const appName = argName ?? (await prompt());
if (!appName) {
  console.error("A project name is required.");
  process.exit(1);
}

const targetDir = resolve(process.cwd(), appName);
const packageName = toPackageName(appName);
const title = toTitle(appName);

if (!force && (await exists(targetDir))) {
  console.error(`Target directory already exists: ${targetDir}`);
  console.error("Use --force to write into it.");
  process.exit(1);
}

await copyTemplate(TEMPLATE_DIR, targetDir, {
  "__MRBD_APP_NAME__": packageName,
  "__MRBD_APP_TITLE__": title,
});

console.log(`Created ${title} in ${targetDir}

Next steps:
  cd ${appName}
  npm install
  npm run mrbd:start

Test locally with a 600 x 600 browser viewport and Arrow keys + Enter.
Use the printed HTTPS URL and QR code to add the app in the Meta AI app.`);

if (install) {
  const { spawn } = await import("node:child_process");
  await new Promise((resolveInstall, rejectInstall) => {
    const child = spawn("npm", ["install"], { cwd: targetDir, stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolveInstall() : rejectInstall(new Error("npm install failed"))));
  });
}

async function prompt() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question("Project name: ");
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function copyTemplate(from, to, replacements) {
  await mkdir(to, { recursive: true });

  for (const entry of await readdir(from)) {
    const source = join(from, entry);
    const destination = join(to, entry === "_gitignore" ? ".gitignore" : entry);
    const info = await stat(source);

    if (info.isDirectory()) {
      await copyTemplate(source, destination, replacements);
      continue;
    }

    if (isTextFile(entry)) {
      let content = await readFile(source, "utf8");
      for (const [token, value] of Object.entries(replacements)) {
        content = content.replaceAll(token, value);
      }
      await writeFile(destination, content);
    } else {
      await copyFile(source, destination);
    }
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function isTextFile(filename) {
  return /\.(css|html|js|json|md|mjs|ts|tsx|webmanifest)$/.test(filename) || filename === "_gitignore";
}

function toPackageName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitle(value) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
