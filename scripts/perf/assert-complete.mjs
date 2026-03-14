import { existsSync, readFileSync } from "node:fs";

const summaryPath = process.argv[2] ?? ".perf-results/summary.json";
const requiredMetrics = (
  process.env.PERF_REQUIRED_METRICS ?? "bundle,build,assets,memory"
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

if (!existsSync(summaryPath)) {
  console.error(`Missing summary file: ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const metrics = summary.metrics ?? {};
const failures = [];

for (const metric of requiredMetrics) {
  const payload = metrics[metric];
  if (!payload) {
    failures.push(`${metric} is missing from perf summary.`);
    continue;
  }

  if (payload.status === "not-run") {
    failures.push(`${metric} is marked as not-run.`);
    continue;
  }

  if (payload.status === "fail") {
    failures.push(`${metric} is marked as fail.`);
  }
}

if (summary.status !== "pass") {
  failures.push(`Summary status is ${summary.status}, expected pass.`);
}

if (failures.length > 0) {
  console.error("Performance completeness assertion failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Performance completeness assertion passed.");
