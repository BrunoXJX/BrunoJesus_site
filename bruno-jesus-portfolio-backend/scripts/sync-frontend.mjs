import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const backendRoot = resolve(import.meta.dirname, "..");
const projectRoot = resolve(backendRoot, "..");
const source = resolve(projectRoot, "portfolio.html");
const target = resolve(backendRoot, "public", "index.html");

if (!existsSync(source)) {
  throw new Error(`Frontend source not found: ${source}`);
}

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

console.log("Synced portfolio.html to public/index.html");
