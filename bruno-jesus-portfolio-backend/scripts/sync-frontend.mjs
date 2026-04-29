import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const backendRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const source = resolve(projectRoot, "frontend");
const publicRoot = resolve(backendRoot, "public");

function assertInside(parent, child) {
  if (!child.startsWith(`${parent}\\`) && !child.startsWith(`${parent}/`)) {
    throw new Error(`Refusing to touch path outside expected directory: ${child}`);
  }
}

if (!existsSync(source)) {
  throw new Error(`Frontend source folder not found: ${source}`);
}

mkdirSync(publicRoot, { recursive: true });
for (const entry of readdirSync(publicRoot, { withFileTypes: true })) {
  const entryPath = resolve(publicRoot, entry.name);
  assertInside(publicRoot, entryPath);
  rmSync(entryPath, { recursive: true, force: true });
}

cpSync(source, publicRoot, {
  recursive: true,
  force: true,
  verbatimSymlinks: false
});

console.log("Synced frontend/ to public/");
