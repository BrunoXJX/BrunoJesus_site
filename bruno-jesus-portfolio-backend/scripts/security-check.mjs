import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const backendRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const publicRoot = resolve(backendRoot, "public");
const frontendRoot = resolve(projectRoot, "frontend");

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

function assertGeneratedFilesAreNotTracked() {
  const trackedFiles = runGit(["ls-files"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => file.replaceAll("\\", "/"));

  const trackedPublicFiles = trackedFiles.filter((file) =>
    file.startsWith("bruno-jesus-portfolio-backend/public/")
  );

  if (trackedPublicFiles.length > 0) {
    fail(`generated public files are tracked: ${trackedPublicFiles.join(", ")}`);
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

  const entries = readdirSync(publicRoot).filter((entry) => !["index.html", "assets"].includes(entry));

  if (entries.length > 0) {
    fail(`public folder has unexpected files: ${entries.join(", ")}`);
  }
}

function walkFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function assertFrontendAssetsAreSafe() {
  for (const root of [frontendRoot, publicRoot]) {
    const indexPath = resolve(root, "index.html");

    if (!existsSync(indexPath)) {
      fail(`frontend index is missing: ${indexPath}`);
      continue;
    }

    const html = readFileSync(indexPath, "utf8");

    if (/<style[\s>]/i.test(html)) {
      fail(`inline style block found in ${relative(projectRoot, indexPath)}`);
    }

    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
      fail(`inline script block found in ${relative(projectRoot, indexPath)}`);
    }

    if (/\sstyle=/.test(html)) {
      fail(`inline style attribute found in ${relative(projectRoot, indexPath)}`);
    }

    if (/lucide@latest/i.test(html)) {
      fail(`unpinned lucide CDN found in ${relative(projectRoot, indexPath)}`);
    }

    const externalScriptTags = html.match(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/gi) ?? [];

    for (const tag of externalScriptTags) {
      if (!/\bintegrity=["'][^"']+["']/i.test(tag) || !/\bcrossorigin=["']anonymous["']/i.test(tag)) {
        fail(`external script without SRI/crossorigin found in ${relative(projectRoot, indexPath)}: ${tag}`);
      }
    }

    const externalBlankLinks = html.match(/<a\b[^>]*\btarget=["']_blank["'][^>]*>/gi) ?? [];

    for (const tag of externalBlankLinks) {
      if (!/\brel=["'][^"']*\bnoopener\b[^"']*\bnoreferrer\b[^"']*["']/i.test(tag)) {
        fail(`target=_blank link without noopener noreferrer found in ${relative(projectRoot, indexPath)}: ${tag}`);
      }
    }

    if (/data:image\/png/i.test(html)) {
      fail(`large base64 image found in ${relative(projectRoot, indexPath)}`);
    }
  }

  const publicFiles = walkFiles(publicRoot);
  const oversizedHtml = publicFiles.filter((file) => file.endsWith(".html") && statSync(file).size > 100_000);

  if (oversizedHtml.length > 0) {
    fail(`oversized HTML file found: ${oversizedHtml.map((file) => relative(projectRoot, file)).join(", ")}`);
  }
}

assertEnvFilesAreIgnored();
assertGeneratedFilesAreNotTracked();
assertNoObviousSecretsInTrackedFiles();
assertPublicFolderIsClean();
assertFrontendAssetsAreSafe();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("Security check passed.");
