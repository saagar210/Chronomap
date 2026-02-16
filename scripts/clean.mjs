#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const args = new Set(process.argv.slice(2));
const full = args.has("--full") || args.has("--deep");

const removePaths = [
  "dist",
  path.join("src-tauri", "target"),
  path.join("node_modules", ".vite"),
];

if (full) {
  removePaths.push("node_modules");
}

for (const relPath of removePaths) {
  fs.rmSync(path.join(rootDir, relPath), { recursive: true, force: true });
}

const walkAndDeleteDsStore = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndDeleteDsStore(fullPath);
      continue;
    }

    if (entry.name === ".DS_Store") {
      fs.rmSync(fullPath, { force: true });
    }
  }
};

walkAndDeleteDsStore(rootDir);

console.log(`Clean complete${full ? " (full)" : " (heavy)"}.`);
