#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const cleanScript = path.join(scriptDir, "clean.mjs");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chronomap-lean-dev-"));

const env = {
  ...process.env,
  CARGO_TARGET_DIR: path.join(tmpRoot, "cargo-target"),
  VITE_CACHE_DIR: path.join(tmpRoot, "vite-cache"),
};

console.log("[lean:dev] Starting with temporary build caches:");
console.log(`[lean:dev] CARGO_TARGET_DIR=${env.CARGO_TARGET_DIR}`);
console.log(`[lean:dev] VITE_CACHE_DIR=${env.VITE_CACHE_DIR}`);

let finished = false;
let childExitCode = 0;

const cleanUp = () => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  const cleanResult = spawnSync(process.execPath, [cleanScript, "--heavy"], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (cleanResult.status !== 0) {
    console.warn("[lean:dev] Warning: heavy cleanup exited non-zero.");
  }
};

const finish = (code) => {
  if (finished) return;
  finished = true;
  childExitCode = code;
  cleanUp();
  process.exit(childExitCode);
};

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(pnpmCmd, ["tauri", "dev"], {
  cwd: rootDir,
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`[lean:dev] Failed to start: ${error.message}`);
  finish(1);
});

child.on("exit", (code, signal) => {
  if (signal && code === null) {
    finish(1);
    return;
  }
  finish(code ?? 0);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
