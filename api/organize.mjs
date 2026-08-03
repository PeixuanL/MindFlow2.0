import {
  getOrganizedResultSaveBlocker,
  organizeThoughtsWithAi,
} from "../src/prototype/ai-organizer.mjs";
import { buildMindFlowMessages } from "../src/prototype/ollama-client.mjs";

const MAX_BODY_LENGTH = 12000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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

function getOpenAiKey() {
  return String(process.env.OPENAI_API_KEY ?? "").trim();
}

function createOpenAiClient({ fetchImpl = globalThis.fetch, apiKey = getOpenAiKey() } = {}) {
  if (!fetchImpl) {
    throw new Error("fetch_unavailable");
  }

  if (!apiKey) {
    throw new Error("openai_key_missing");
  }

  return async function openAiClient({ rawText }) {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5",
        input: buildMindFlowMessages(rawText),
      }),
    });

    if (!response.ok) {
      throw new Error("openai_request_failed");
    }

    const payload = await response.json();
    const outputText = typeof payload.output_text === "string"
      ? payload.output_text
      : Array.isArray(payload.output)
        ? payload.output
          .flatMap((item) => Array.isArray(item.content) ? item.content : [])
          .map((content) => content.text)
          .filter((text) => typeof text === "string")
          .join("")
        : "";

    if (!outputText.trim()) {
      throw new Error("openai_empty_response");
    }

    return outputText;
  };
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

  try {
    const result = await organizeThoughtsWithAi(rawText, {
      aiClient: createOpenAiClient(),
      preferLocalFast: true,
    });
    const blocker = getOrganizedResultSaveBlocker(result, rawText);

    if (blocker) {
      sendJson(response, 503, { error: "ai_unavailable", reason: blocker });
      return;
    }

    sendJson(response, 200, { aiJson: JSON.stringify(result) });
  } catch {
    sendJson(response, 503, { error: "ai_unavailable" });
  }
}
