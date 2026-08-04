import { buildMindFlowMessages } from "./ollama-client.mjs";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b:free";
const DEFAULT_TIMEOUT_MS = 90000;
const JSON_INCOMPATIBLE_FREE_MODELS = new Set([
  "inclusionai/ling-3.0-flash:free",
  "google/gemma-4-31b-it:free",
]);

function trimTrailingSlash(value) {
  return String(value ?? "").replace(/\/+$/u, "");
}

function getMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => typeof part?.text === "string" ? part.text : "")
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("openrouter_empty_response");
}

export function buildOpenRouterRequestBody(rawText, options = {}) {
  const model = resolveOpenRouterModel(options.model);

  return {
    model,
    messages: buildMindFlowMessages(rawText, {
      currentDate: options.currentDate,
    }),
    temperature: 0,
    response_format: {
      type: "json_object",
    },
    provider: {
      zdr: true,
    },
    max_price: {
      prompt: 0,
      completion: 0,
    },
  };
}

export function resolveOpenRouterModel(model) {
  const requestedModel = String(model ?? "").trim() || DEFAULT_MODEL;
  return JSON_INCOMPATIBLE_FREE_MODELS.has(requestedModel) ? DEFAULT_MODEL : requestedModel;
}

export function createOpenRouterClient(options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = trimTrailingSlash(options.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL);
  const model = resolveOpenRouterModel(options.model ?? process.env.OPENROUTER_MODEL);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (!apiKey) {
    throw new Error("openrouter_api_key_required");
  }

  if (!fetchImpl) {
    throw new Error("fetch_unavailable");
  }

  return async function openRouterClient({ rawText }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mindflow-mu-tawny.vercel.app",
          "X-Title": "MindFlow private prototype",
        },
        body: JSON.stringify(buildOpenRouterRequestBody(rawText, { model })),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("openrouter_request_failed");
      }

      return getMessageContent(await response.json());
    } finally {
      clearTimeout(timeout);
    }
  };
}
