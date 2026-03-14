import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const outputPath =
  process.env.RELEASE_READINESS_OUTPUT ?? "release/readiness-report.json";

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function envPresent(name) {
  return Boolean(process.env[name]);
}

const metadata = readJsonIfExists("release/release-metadata.json");
const signingStatus = readJsonIfExists(".release/signing-status.json");
const notarizationStatus = readJsonIfExists(
  ".release/notarization-status.json",
);
const aiEval = readJsonIfExists("release/ai-eval-report.json");
const stableChannel = readJsonIfExists("release/channels/stable.json");
const devChannel = readJsonIfExists("release/channels/dev.json");

const blockers = [];
const warnings = [];

const credentialsReady =
  envPresent("APPLE_CERTIFICATE_BASE64") &&
  envPresent("APPLE_CERTIFICATE_PASSWORD") &&
  envPresent("APPLE_SIGNING_IDENTITY") &&
  envPresent("APPLE_ID") &&
  envPresent("APPLE_TEAM_ID") &&
  envPresent("APPLE_ID_PASSWORD");

if (!credentialsReady) {
  blockers.push(
    "Apple signing/notarization credentials are not fully configured.",
  );
}

if (!metadata) {
  blockers.push("release/release-metadata.json is missing.");
} else {
  if (!metadata.checksum)
    blockers.push("Release metadata is missing checksum.");
  if (!metadata.signed) blockers.push("Release metadata is not signed yet.");
  if (!metadata.notarized)
    blockers.push("Release metadata is not notarized yet.");
}

if (!signingStatus) {
  blockers.push(".release/signing-status.json is missing.");
}

if (!notarizationStatus) {
  blockers.push(".release/notarization-status.json is missing.");
}

if (!aiEval) {
  blockers.push("release/ai-eval-report.json is missing.");
} else {
  if (Number(aiEval.pass_rate ?? 0) < 0.8) {
    blockers.push(`AI eval pass_rate is below threshold: ${aiEval.pass_rate}`);
  }
  if (Number(aiEval.format_validity_rate ?? 0) < 0.75) {
    blockers.push(
      `AI eval format_validity_rate is below threshold: ${aiEval.format_validity_rate}`,
    );
  }
  if (!aiEval.fallback_path_passed) {
    blockers.push("AI fallback-path check did not pass.");
  }
  if (Array.isArray(aiEval.blocked_cases) && aiEval.blocked_cases.length > 0) {
    blockers.push(`AI eval blocked cases: ${aiEval.blocked_cases.join(", ")}`);
  }
}

if (!stableChannel?.artifact) {
  warnings.push("Stable channel metadata has no published artifact yet.");
}

if (!devChannel?.artifact) {
  warnings.push("Dev channel metadata has no published artifact yet.");
}

const report = {
  generated_at: new Date().toISOString(),
  ready: blockers.length === 0,
  checks: {
    credentials_ready: credentialsReady,
    release_metadata_present: Boolean(metadata),
    signing_status_present: Boolean(signingStatus),
    notarization_status_present: Boolean(notarizationStatus),
    ai_eval_present: Boolean(aiEval),
    stable_channel_published: Boolean(stableChannel?.artifact),
    dev_channel_published: Boolean(devChannel?.artifact),
  },
  blockers,
  warnings,
  artifacts: {
    metadata,
    signing_status: signingStatus,
    notarization_status: notarizationStatus,
    ai_eval: aiEval,
    stable_channel: stableChannel,
    dev_channel: devChannel,
  },
};

mkdirSync("release", { recursive: true });
writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
console.log(`Wrote ${outputPath}`);

if (!report.ready) {
  process.exitCode = 1;
}
