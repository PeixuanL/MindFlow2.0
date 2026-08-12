import {
  createLocalSemanticResult,
  getOrganizedResultSaveBlocker,
  organizeThoughtsWithAi,
} from "../src/prototype/ai-organizer.mjs";
import { createNvidiaClient, resolveNvidiaModel } from "../src/prototype/nvidia-client.mjs";
import { createOpenRouterClient, resolveOpenRouterModel } from "../src/prototype/openrouter-client.mjs";

const MAX_BODY_LENGTH = 12000;
const MAX_RAW_TEXT_LENGTH = 500;
const DEFAULT_DAILY_OPENROUTER_LIMIT = 50;
const openRouterDailyBuckets = new Map();

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > MAX_BODY_LENGTH) {
      throw new Error("body_too_large");
    }
  }

  return JSON.parse(raw || "{}");
}

function sendOrganizedResult(response, rawText, result) {
  const blocker = getOrganizedResultSaveBlocker(result, rawText);

  if (blocker) {
    const safeReason = blocker === "fallback_result" && result?.meta?.fallbackReason
      ? result.meta.fallbackReason
      : blocker;
    sendJson(response, 503, { error: "ai_unavailable", reason: safeReason });
    return;
  }

  sendJson(response, 200, { aiJson: JSON.stringify(result) });
}

function sendLocalSemanticResult(response, rawText) {
  sendOrganizedResult(response, rawText, createLocalSemanticResult(rawText));
}

function getShanghaiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getRequesterId(request) {
  const forwardedFor = request.headers?.["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

  if (typeof forwardedValue === "string" && forwardedValue.trim()) {
    return forwardedValue.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "unknown";
}

function getDailyOpenRouterLimit() {
  const value = Number(process.env.MINDFLOW_DAILY_AI_LIMIT ?? DEFAULT_DAILY_OPENROUTER_LIMIT);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_OPENROUTER_LIMIT;
}

function canUseLocalOrganizeFallback() {
  return process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE === "true";
}

function getAiProvider() {
  const provider = String(process.env.AI_PROVIDER ?? "openrouter").trim().toLocaleLowerCase();
  return provider === "nvidia" ? "nvidia" : "openrouter";
}

function getAiDiagnostics() {
  const configuredModel = process.env.OPENROUTER_MODEL || "";
  const configuredNvidiaModel = process.env.NVIDIA_MODEL || "";
  const requireZdr = process.env.OPENROUTER_REQUIRE_ZDR === "true";

  return {
    aiProvider: getAiProvider(),
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    nvidiaConfigured: Boolean(process.env.NVIDIA_API_KEY),
    configuredModel: configuredModel || null,
    model: resolveOpenRouterModel(configuredModel),
    configuredNvidiaModel: configuredNvidiaModel || null,
    nvidiaModel: resolveNvidiaModel(configuredNvidiaModel),
    requireZdr,
    localFallbackAllowed: canUseLocalOrganizeFallback(),
  };
}

function allowCloudAiRequest(request) {
  const requesterId = getRequesterId(request);
  const dateKey = getShanghaiDateKey();
  const existing = openRouterDailyBuckets.get(requesterId);
  const bucket = existing?.dateKey === dateKey ? existing : { dateKey, count: 0 };

  if (bucket.count >= getDailyOpenRouterLimit()) {
    openRouterDailyBuckets.set(requesterId, bucket);
    return false;
  }

  bucket.count += 1;
  openRouterDailyBuckets.set(requesterId, bucket);
  return true;
}

async function sendOpenRouterResult(response, rawText, strategy = null) {
  const openRouterClient = createOpenRouterClient();
  const result = await organizeThoughtsWithAi(rawText, {
    aiClient: openRouterClient,
    ...(strategy ? { strategy } : {}),
  });

  sendOrganizedResult(response, rawText, result);
}

async function sendNvidiaResult(response, rawText, strategy = null) {
  const nvidiaClient = createNvidiaClient();
  const result = await organizeThoughtsWithAi(rawText, {
    aiClient: nvidiaClient,
    ...(strategy ? { strategy } : {}),
  });

  sendOrganizedResult(response, rawText, result);
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, getAiDiagnostics());
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { error: "invalid_request" });
    return;
  }

  const rawText = typeof body.rawText === "string" ? body.rawText : "";
  const strategy = typeof body.strategy === "string" ? body.strategy : null;

  if (!rawText.trim()) {
    sendJson(response, 400, { error: "empty_input" });
    return;
  }

  if (rawText.length > MAX_RAW_TEXT_LENGTH) {
    sendJson(response, 400, { error: "input_too_long" });
    return;
  }

  if (getAiProvider() === "nvidia") {
    if (!process.env.NVIDIA_API_KEY) {
      sendJson(response, 503, { error: "ai_not_configured" });
      return;
    }

    if (!allowCloudAiRequest(request)) {
      sendJson(response, 429, { error: "ai_rate_limited" });
      return;
    }

    try {
      await sendNvidiaResult(response, rawText, strategy);
      return;
    } catch (error) {
      const reason = typeof error?.message === "string" && error.message.startsWith("nvidia_request_failed_")
        ? error.message
        : "nvidia_failed";
      sendJson(response, 503, { error: "ai_unavailable", reason });
      return;
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    if (!allowCloudAiRequest(request)) {
      sendJson(response, 429, { error: "ai_rate_limited" });
      return;
    }

    try {
      await sendOpenRouterResult(response, rawText, strategy);
      return;
    } catch (error) {
      const reason = typeof error?.message === "string" && error.message.startsWith("openrouter_request_failed_")
        ? error.message
        : "openrouter_failed";
      sendJson(response, 503, { error: "ai_unavailable", reason });
      return;
    }
  }

  if (!canUseLocalOrganizeFallback()) {
    sendJson(response, 503, { error: "ai_not_configured" });
    return;
  }

  sendLocalSemanticResult(response, rawText);
}
