import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const commandFile = process.argv[2] ?? ".codex/verify.commands";
const reportDir = process.env.GATE_REPORT_DIR ?? ".codex/reports";
const reportPath = path.join(reportDir, "gate-report.json");
const logsDir = path.join(reportDir, "logs");
const waiversPath = process.env.GATE_WAIVERS_FILE ?? ".codex/waivers.json";

if (!existsSync(commandFile)) {
  console.error(`Missing command file: ${commandFile}`);
  process.exit(2);
}

const rawLines = readFileSync(commandFile, "utf8").split(/\r?\n/);

function slugify(input) {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unnamed_gate"
  );
}

function parseRequired(raw) {
  return ["true", "required", "1", "yes"].includes(
    (raw ?? "").trim().toLowerCase(),
  );
}

function parseGate(line, index) {
  const segments = line.split("|");
  if (segments.length >= 5) {
    const [gateId, required, owner, threshold, command, envVar] = segments;
    return {
      gate_id: gateId.trim(),
      required: parseRequired(required),
      owner: owner.trim() || "unassigned",
      threshold: threshold.trim() || "n/a",
      command: command.trim(),
      env_var: (envVar ?? "").trim() || null,
      index,
    };
  }

  const gateId = `legacy_${String(index + 1).padStart(2, "0")}_${slugify(line.slice(0, 32))}`;
  return {
    gate_id: gateId,
    required: true,
    owner: "unassigned",
    threshold: "legacy command must pass",
    command: line.trim(),
    env_var: null,
    index,
  };
}

function loadWaivers() {
  if (!existsSync(waiversPath)) {
    return new Map();
  }

  try {
    const parsed = JSON.parse(readFileSync(waiversPath, "utf8"));
    const rows = Array.isArray(parsed?.waivers)
      ? parsed.waivers
      : Array.isArray(parsed)
        ? parsed
        : Object.entries(parsed ?? {}).map(([gate_id, waiver]) => ({
            gate_id,
            ...waiver,
          }));

    const map = new Map();
    for (const row of rows) {
      if (!row?.gate_id) continue;
      map.set(row.gate_id, row);
    }
    return map;
  } catch (error) {
    console.error(`Unable to parse waivers from ${waiversPath}:`, error);
    process.exit(2);
  }
}

function isWaiverActive(waiver) {
  if (!waiver) return false;
  if (!waiver.expires_at) return false;
  const expiresAt = Date.parse(waiver.expires_at);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt > Date.now();
}

mkdirSync(reportDir, { recursive: true });
mkdirSync(logsDir, { recursive: true });

const waivers = loadWaivers();
const reportRows = [];

for (const [index, line] of rawLines.entries()) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const gate = parseGate(trimmed, index);
  const timestamp = new Date().toISOString();
  const logPath = path.join(logsDir, `${gate.gate_id}.log`);

  let status = "pass";
  let exitCode = 0;
  let logOutput = "";

  if (!gate.command) {
    status = "not-run";
    exitCode = 2;
    logOutput = "Gate has no command configured.\n";
  } else if (gate.env_var && !process.env[gate.env_var]) {
    status = "not-run";
    exitCode = 0;
    logOutput = `Skipped because env var ${gate.env_var} is not set.\n`;
  } else {
    console.log(`>> [${gate.gate_id}] ${gate.command}`);
    const result = spawnSync("bash", ["-lc", gate.command], {
      encoding: "utf8",
      env: process.env,
    });

    exitCode = typeof result.status === "number" ? result.status : 1;
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    logOutput = `${stdout}${stderr}`;

    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);

    if (exitCode !== 0) {
      status = "fail";
    }
  }

  let waiverId = null;
  if (status !== "pass") {
    const waiver = waivers.get(gate.gate_id);
    if (isWaiverActive(waiver)) {
      status = "waived";
      waiverId = waiver.waiver_id ?? `${gate.gate_id}-waiver`;
      logOutput += `\nWaived by ${waiver.owner ?? "unknown"} until ${waiver.expires_at}.\n`;
    }
  }

  writeFileSync(logPath, logOutput || "(no output)\n");

  reportRows.push({
    gate_id: gate.gate_id,
    status,
    threshold: gate.threshold,
    evidence_uri: logPath,
    timestamp,
    owner: gate.owner,
    waiver_id: waiverId,
    required: gate.required,
    command: gate.command,
    exit_code: exitCode,
    env_var: gate.env_var,
  });
}

const blocking = reportRows.filter(
  (row) => row.required && (row.status === "fail" || row.status === "not-run"),
);

const report = {
  generated_at: new Date().toISOString(),
  command_file: commandFile,
  overall_status: blocking.length > 0 ? "fail" : "pass",
  gates: reportRows,
  counts: {
    total: reportRows.length,
    pass: reportRows.filter((row) => row.status === "pass").length,
    fail: reportRows.filter((row) => row.status === "fail").length,
    not_run: reportRows.filter((row) => row.status === "not-run").length,
    waived: reportRows.filter((row) => row.status === "waived").length,
    blocking: blocking.length,
  },
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Wrote ${reportPath}`);
if (blocking.length > 0) {
  console.error("Blocking gates detected:");
  for (const gate of blocking) {
    console.error(`- ${gate.gate_id} (${gate.status})`);
  }
  process.exit(1);
}
