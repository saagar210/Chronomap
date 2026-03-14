import { mkdirSync, writeFileSync } from "node:fs";

const host = process.env.OLLAMA_EVAL_HOST ?? "http://localhost:11434";
const model = process.env.OLLAMA_EVAL_MODEL ?? "llama3.2";
const outputPath = process.env.AI_EVAL_OUTPUT ?? "release/ai-eval-report.json";

function structuredEventSystem(extraRules) {
  return [
    "You are a historical research assistant.",
    "Return ONLY a valid JSON array.",
    "Every event object must include title, description, start_date, end_date, event_type, importance, confidence.",
    "Date rules: start_date and end_date must be ISO strings in YYYY-MM-DD, YYYY-MM, or YYYY format only.",
    "event_type must be one of point, range, milestone, era.",
    "importance must be an integer from 1 to 5.",
    "confidence must be a decimal from 0.0 to 1.0.",
    "Do not include markdown fences or explanatory text.",
    extraRules,
  ]
    .filter(Boolean)
    .join(" ");
}

let activeModel = model;

async function generate(prompt, system, temperature = 0.2) {
  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: activeModel,
      prompt,
      system,
      stream: false,
      options: {
        temperature,
        num_predict: 2048,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama generate failed: ${response.status}`);
  }

  const payload = await response.json();
  return String(payload.response ?? "");
}

function extractJsonArray(text) {
  const trimmed = text.trim();
  const direct =
    trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed : null;
  if (direct) return direct;

  const codeBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return null;
}

function isIsoDate(value) {
  return /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value);
}

function normalizeDate(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (isIsoDate(trimmed)) return trimmed;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeEventType(value) {
  const normalized = String(value ?? "point")
    .trim()
    .toLowerCase();
  if (["point", "range", "milestone", "era"].includes(normalized)) {
    return normalized;
  }
  if (normalized.includes("era") || normalized.includes("period")) return "era";
  if (
    normalized.includes("range") ||
    normalized.includes("span") ||
    normalized.includes("campaign") ||
    normalized.includes("mission")
  ) {
    return "range";
  }
  if (
    normalized.includes("milestone") ||
    normalized.includes("launch") ||
    normalized.includes("landing") ||
    normalized.includes("first") ||
    normalized.includes("breakthrough")
  ) {
    return "milestone";
  }
  return "point";
}

function normalizeImportance(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(5, Math.max(1, Math.round(parsed)));
}

function normalizeConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed >= 0 && parsed <= 1) return parsed;
  if (parsed > 1 && parsed <= 10) return Math.min(1, parsed / 10);
  if (parsed > 10 && parsed <= 100) return Math.min(1, parsed / 100);
  return null;
}

function normalizeStructuredEvents(events) {
  return events
    .map((event) => ({
      ...event,
      title: String(event.title ?? "").trim(),
      description: String(event.description ?? "").trim(),
      start_date: normalizeDate(event.start_date),
      end_date:
        event.end_date == null || event.end_date === ""
          ? null
          : normalizeDate(event.end_date),
      event_type: normalizeEventType(event.event_type),
      importance: normalizeImportance(event.importance),
      confidence: normalizeConfidence(event.confidence),
    }))
    .filter((event) => event.title && event.start_date);
}

function validateStructuredEvents(events, { normalize = false } = {}) {
  const subject = normalize ? normalizeStructuredEvents(events) : events;

  if (!Array.isArray(events) || events.length === 0) {
    return { valid: false, reasons: ["No events returned"] };
  }

  const reasons = [];
  for (const [index, event] of subject.entries()) {
    if (!event || typeof event !== "object") {
      reasons.push(`Event ${index + 1} is not an object`);
      continue;
    }
    if (!String(event.title ?? "").trim())
      reasons.push(`Event ${index + 1} missing title`);
    if (!String(event.description ?? "").trim()) {
      reasons.push(`Event ${index + 1} missing description`);
    }
    if (!isIsoDate(String(event.start_date ?? ""))) {
      reasons.push(`Event ${index + 1} start_date is not ISO`);
    }
    if (
      event.end_date != null &&
      event.end_date !== "" &&
      !isIsoDate(String(event.end_date))
    ) {
      reasons.push(`Event ${index + 1} end_date is not ISO`);
    }
    if (
      !["point", "range", "milestone", "era"].includes(
        String(event.event_type ?? ""),
      )
    ) {
      reasons.push(`Event ${index + 1} event_type is invalid`);
    }
    const importance = Number(event.importance);
    if (!Number.isInteger(importance) || importance < 1 || importance > 5) {
      reasons.push(`Event ${index + 1} importance is invalid`);
    }
    const confidence = Number(event.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      reasons.push(`Event ${index + 1} confidence is invalid`);
    }
  }

  return { valid: reasons.length === 0, reasons, normalized: subject };
}

async function listModels() {
  const response = await fetch(`${host}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama tags failed: ${response.status}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.models)
    ? payload.models.map((item) => item.name)
    : [];
}

async function runStructuredCase(id, prompt, system) {
  const raw = await generate(prompt, system, 0.2);
  const json = extractJsonArray(raw);
  if (!json) {
    return {
      id,
      pass: false,
      format_valid: false,
      reason: "No JSON array found in response",
      raw_preview: raw.slice(0, 300),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return {
      id,
      pass: false,
      format_valid: false,
      reason: `Invalid JSON: ${error.message}`,
      raw_preview: raw.slice(0, 300),
    };
  }

  const rawValidation = validateStructuredEvents(parsed);
  const normalizedValidation = rawValidation.valid
    ? rawValidation
    : validateStructuredEvents(parsed, { normalize: true });
  return {
    id,
    pass: normalizedValidation.valid,
    format_valid: normalizedValidation.valid,
    raw_format_valid: rawValidation.valid,
    reason: normalizedValidation.valid
      ? ""
      : normalizedValidation.reasons.join("; "),
    event_count: parsed.length,
    raw_preview: raw.slice(0, 300),
  };
}

async function runTextCase(id, prompt, system, checks) {
  const raw = await generate(prompt, system, 0.4);
  const failures = checks
    .filter((check) => !check.test(raw))
    .map((check) => check.label);
  return {
    id,
    pass: failures.length === 0,
    format_valid: true,
    reason: failures.join("; "),
    raw_preview: raw.slice(0, 300),
  };
}

async function runChatCase() {
  const raw = await generate(
    "Research the Apollo program and suggest two timeline events.",
    "You are a helpful timeline research assistant. Reply with short prose first, then include a ```json block containing event suggestions. Each event must include title, description, start_date, end_date, event_type, importance, confidence. Dates must be ISO strings only. event_type must be one of point, range, milestone, era. importance must be 1-5. confidence must be 0.0-1.0.",
    0.4,
  );
  const json = extractJsonArray(raw);
  if (!json) {
    return {
      id: "chat_events",
      pass: false,
      format_valid: false,
      reason: "Missing structured event block",
      raw_preview: raw.slice(0, 300),
    };
  }

  const parsed = JSON.parse(json);
  const rawValidation = validateStructuredEvents(parsed);
  const normalizedValidation = rawValidation.valid
    ? rawValidation
    : validateStructuredEvents(parsed, { normalize: true });
  return {
    id: "chat_events",
    pass: normalizedValidation.valid && raw.length > json.length,
    format_valid: normalizedValidation.valid,
    raw_format_valid: rawValidation.valid,
    reason: normalizedValidation.valid
      ? ""
      : normalizedValidation.reasons.join("; "),
    event_count: parsed.length,
    raw_preview: raw.slice(0, 300),
  };
}

async function checkFallbackPath() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    await fetch("http://127.0.0.1:65530/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return false;
  } catch {
    return true;
  }
}

async function main() {
  const blockedCases = [];
  let models = [];
  let resolvedModel = model;

  try {
    models = await listModels();
  } catch (error) {
    blockedCases.push(`ollama-unreachable: ${error.message}`);
  }

  const aliasMatch = models.find(
    (candidate) => candidate === model || candidate.startsWith(`${model}:`),
  );
  if (aliasMatch) {
    resolvedModel = aliasMatch;
  } else {
    blockedCases.push(`model-missing: ${model}`);
  }
  activeModel = resolvedModel;

  let cases = [];
  if (blockedCases.length === 0) {
    cases = await Promise.all([
      runStructuredCase(
        "research_topic",
        "Apollo program",
        structuredEventSystem("Generate exactly 2 events about the topic."),
      ),
      runStructuredCase(
        "fill_gaps",
        "Topic: Apollo program\nDate range: 1968-01-01 to 1969-12-31\n\nExisting events:\nApollo 8 — 1968-12-21\nApollo 11 — 1969-07-16\n\nGenerate events for gaps in this timeline.",
        structuredEventSystem(
          "Generate exactly 2 events that fill meaningful gaps.",
        ),
      ),
      runTextCase(
        "generate_description",
        "Event: Apollo 11 Moon Landing\nDate: 1969-07-20",
        "Write a concise, informative description in 2 short paragraphs. Be factual and specific.",
        [
          { label: "response too short", test: (raw) => raw.length >= 180 },
          { label: "missing moon reference", test: (raw) => /moon/i.test(raw) },
        ],
      ),
      runTextCase(
        "fact_check",
        "Event: Apollo 11 Moon Landing\nDate: 1969-07-20\nDescription: Apollo 11 landed on the Moon and returned safely to Earth.",
        "Evaluate the accuracy of this event. Include a confidence score and any corrections if needed.",
        [
          { label: "response too short", test: (raw) => raw.length >= 120 },
          {
            label: "missing confidence language",
            test: (raw) => /confidence|accur/i.test(raw),
          },
        ],
      ),
      runChatCase(),
    ]);
  }

  const scoredCases = cases.filter(
    (item) => item.id !== "generate_description" && item.id !== "fact_check",
  );
  const passRate =
    cases.length === 0
      ? 0
      : cases.filter((item) => item.pass).length / cases.length;
  const formatValidityRate =
    scoredCases.length === 0
      ? 0
      : scoredCases.filter((item) => item.format_valid).length /
        scoredCases.length;
  const fallbackPathPassed = await checkFallbackPath();

  const report = {
    suite: "core-ai-fallback",
    host,
    model: resolvedModel,
    generated_at: new Date().toISOString(),
    pass_rate: Number(passRate.toFixed(4)),
    format_validity_rate: Number(formatValidityRate.toFixed(4)),
    fallback_path_passed: fallbackPathPassed,
    blocked_cases: blockedCases,
    cases,
  };

  mkdirSync("release", { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`Wrote ${outputPath}`);

  if (blockedCases.length > 0) {
    process.exitCode = 1;
    return;
  }

  if (
    report.pass_rate < 0.8 ||
    report.format_validity_rate < 0.75 ||
    !report.fallback_path_passed
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
