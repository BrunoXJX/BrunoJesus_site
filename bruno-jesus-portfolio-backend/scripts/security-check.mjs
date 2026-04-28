import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const backendRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const publicRoot = resolve(backendRoot, "public");

const blockedSecretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function fail(message) {
  console.error(`Security check failed: ${message}`);
  process.exitCode = 1;
}

function assertEnvFilesAreIgnored() {
  const trackedFiles = runGit(["ls-files"])
    .split(/\r?\n/)
    .filter(Boolean);

  const trackedEnvFiles = trackedFiles.filter((file) => {
    const normalized = file.replaceAll("\\", "/");
    return /(^|\/)\.env(\.|$)/.test(normalized) && !normalized.endsWith(".env.example");
  });

  if (trackedEnvFiles.length > 0) {
    fail(`environment files are tracked: ${trackedEnvFiles.join(", ")}`);
  }

  for (const envPath of [resolve(projectRoot, ".env"), resolve(backendRoot, ".env")]) {
    if (!existsSync(envPath)) {
      continue;
    }

    try {
      runGit(["check-ignore", "-q", envPath]);
    } catch {
      fail(`local env file is not ignored by git: ${envPath}`);
    }
  }
}

function assertNoObviousSecretsInTrackedFiles() {
  const trackedFiles = runGit(["ls-files"])
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => !file.endsWith("package-lock.json"));

  for (const file of trackedFiles) {
    const absolutePath = resolve(projectRoot, file);
    const content = readFileSync(absolutePath, "utf8");

    for (const pattern of blockedSecretPatterns) {
      if (pattern.test(content)) {
        fail(`possible secret found in tracked file: ${file}`);
      }
    }
  }
}

function assertPublicFolderIsClean() {
  if (!existsSync(publicRoot)) {
    fail("public folder does not exist; run npm run sync:frontend first.");
    return;
  }

  const entries = readdirSync(publicRoot).filter((entry) => entry !== "index.html");

  if (entries.length > 0) {
    fail(`public folder has unexpected files: ${entries.join(", ")}`);
  }
}

assertEnvFilesAreIgnored();
assertNoObviousSecretsInTrackedFiles();
assertPublicFolderIsClean();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Security check passed.");
