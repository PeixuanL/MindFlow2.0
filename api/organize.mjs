import {
  createLocalSemanticResult,
  getOrganizedResultSaveBlocker,
} from "../src/prototype/ai-organizer.mjs";

const MAX_BODY_LENGTH = 12000;

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
    sendJson(response, 503, { error: "ai_unavailable", reason: blocker });
    return;
  }

  sendJson(response, 200, { aiJson: JSON.stringify(result) });
}

function sendLocalSemanticResult(response, rawText) {
  sendOrganizedResult(response, rawText, createLocalSemanticResult(rawText));
}

export default async function handler(request, response) {
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

  if (!rawText.trim()) {
    sendJson(response, 400, { error: "empty_input" });
    return;
  }

  sendLocalSemanticResult(response, rawText);
}
