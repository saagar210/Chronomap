import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function ensureFile(filePath) {
  if (!existsSync(filePath)) {
    fail(`Missing required file: ${filePath}`);
  }
}

ensureFile(".codex/verify.commands");
ensureFile(".codex/scripts/run_verify_commands.mjs");
ensureFile("package.json");
ensureFile("src-tauri/tauri.conf.json");

if (existsSync("package.json")) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const scripts = pkg.scripts ?? {};
  const workflowDir = ".github/workflows";
  const referenced = new Set();

  if (existsSync(workflowDir)) {
    for (const file of readdirSync(workflowDir)) {
      if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
      const fullPath = path.join(workflowDir, file);
      const content = readFileSync(fullPath, "utf8");
      const matches = content.matchAll(/pnpm\s+([a-zA-Z0-9:_-]+)/g);
      for (const match of matches) {
        referenced.add(match[1]);
      }
    }
  }

  const ignore = new Set([
    "install",
    "exec",
    "dlx",
    "add",
    "remove",
    "up",
    "update",
  ]);
  for (const cmd of referenced) {
    if (cmd.startsWith("-")) continue;
    if (ignore.has(cmd)) continue;
    if (!(cmd in scripts)) {
      fail(`Workflow references missing pnpm script: ${cmd}`);
    }
  }
}

for (const baselinePath of [
  [".perf-baselines/bundle.json", "totalBytes"],
  [".perf-baselines/build-time.json", "buildMs"],
]) {
  const [filePath, metric] = baselinePath;
  if (!existsSync(filePath)) {
    fail(`Missing baseline file: ${filePath}`);
    continue;
  }

  const payload = JSON.parse(readFileSync(filePath, "utf8"));
  const value = payload[metric];
  if (typeof value !== "number" || value <= 0) {
    fail(
      `Baseline metric ${metric} in ${filePath} must be > 0. Current: ${value}`,
    );
  }
}

if (existsSync("src-tauri/tauri.conf.json")) {
  const tauriConfig = JSON.parse(
    readFileSync("src-tauri/tauri.conf.json", "utf8"),
  );
  const csp = tauriConfig?.app?.security?.csp;
  if (csp == null || String(csp).trim() === "") {
    fail(
      "Tauri CSP is unset (null/empty). Strict CSP is required for this cycle.",
    );
  }
}

if (warnings.length > 0) {
  console.warn("Preflight warnings:");
  for (const message of warnings) {
    console.warn(`- ${message}`);
  }
}

if (failures.length > 0) {
  console.error("Preflight failed:");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log("Preflight passed.");
