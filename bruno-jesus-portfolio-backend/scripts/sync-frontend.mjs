import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const backendRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const source = resolve(projectRoot, "portfolio.html");
const publicRoot = resolve(backendRoot, "public");
const target = resolve(publicRoot, "index.html");

function assertInside(parent, child) {
  if (!child.startsWith(`${parent}\\`) && !child.startsWith(`${parent}/`)) {
    throw new Error(`Refusing to touch path outside expected directory: ${child}`);
  }
}

if (!existsSync(source)) {
  throw new Error(`Frontend source not found: ${source}`);
}

mkdirSync(dirname(target), { recursive: true });
for (const entry of readdirSync(publicRoot, { withFileTypes: true })) {
  const entryPath = resolve(publicRoot, entry.name);
  assertInside(publicRoot, entryPath);
  rmSync(entryPath, { recursive: true, force: true });
}

copyFileSync(source, target);

console.log("Synced portfolio.html to public/index.html");
