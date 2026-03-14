import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const files = {
  bundle: ".perf-results/bundle.json",
  build: ".perf-results/build-time.json",
  assets: ".perf-results/assets.json",
  memory: ".perf-results/memory.json",
  api: ".perf-results/api-summary.json",
};

const requiredMetrics = new Set(["bundle", "build", "assets", "memory"]);
const summary = {
  capturedAt: new Date().toISOString(),
  metrics: {},
  status: "pass",
};

for (const [key, file] of Object.entries(files)) {
  if (!existsSync(file)) {
    summary.metrics[key] = { status: "not-run" };
    if (requiredMetrics.has(key)) {
      summary.status = "fail";
    }
    continue;
  }

  const payload = JSON.parse(readFileSync(file, "utf8"));
  if (!payload.status) {
    payload.status = "pass";
  }

  if (payload.status === "fail") {
    summary.status = "fail";
  }

  summary.metrics[key] = payload;
}

mkdirSync(".perf-results", { recursive: true });
writeFileSync(
  ".perf-results/summary.json",
  `${JSON.stringify(summary, null, 2)}\n`,
);
console.log("wrote .perf-results/summary.json");
