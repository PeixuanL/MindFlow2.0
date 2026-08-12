import { buildMindFlowMessages } from "./ollama-client.mjs";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "openai/gpt-oss-20b";
const DEFAULT_TIMEOUT_MS = 90000;
const DEFAULT_MAX_TOKENS = 1400;
const DEFAULT_MAX_ATTEMPTS = 3;

export const MIND_FLOW_GUIDED_JSON_SCHEMA = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["organized", "empty"],
    },
    message: {
      type: "string",
    },
    inputMode: {
      type: "string",
      enum: ["spoken", "structured_list", "mixed", "messy_story"],
    },
    semanticUnits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          role: {
            type: "string",
            enum: ["task", "context", "emotion", "constraint", "priority", "time", "filler", "unknown"],
          },
          topicHint: { type: "string" },
        },
        required: ["id", "text", "role", "topicHint"],
      },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          sourceUnitIds: {
            type: "array",
            items: { type: "string" },
          },
          mentions: {
            type: "array",
            items: { type: "string" },
          },
          type: { type: "string" },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          assignTo: {
            type: "string",
            enum: ["active", "parking"],
          },
          reason: { type: "string" },
          nextStep: { type: "string" },
          focusSteps: {
            type: "array",
            items: { type: "string" },
          },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          isBigEvent: { type: "boolean" },
          timeHint: { type: "string" },
          dueAt: { type: "string" },
          remindDaysBefore: { type: "integer" },
        },
        required: [
          "id",
          "title",
          "sourceUnitIds",
          "mentions",
          "type",
          "priority",
          "assignTo",
          "reason",
          "nextStep",
          "focusSteps",
          "tags",
          "isBigEvent",
        ],
      },
    },
    recommendedNow: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        title: { type: "string" },
        reason: { type: "string" },
        nextStep: { type: "string" },
      },
      required: ["itemId", "title", "reason", "nextStep"],
    },
    coverageCheck: {
      type: "object",
      properties: {
        coveredUnitIds: {
          type: "array",
          items: { type: "string" },
        },
        unmappedUnitIds: {
          type: "array",
          items: { type: "string" },
        },
        possibleDuplicates: {
          type: "array",
          items: { type: "string" },
        },
        needsClarification: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["coveredUnitIds", "unmappedUnitIds", "possibleDuplicates", "needsClarification"],
    },
    meta: {
      type: "object",
      properties: {
        modelBehavior: { type: "string" },
        safetyLevel: { type: "string" },
      },
      required: ["modelBehavior", "safetyLevel"],
    },
  },
  required: [
    "status",
    "message",
    "inputMode",
    "semanticUnits",
    "items",
    "recommendedNow",
    "coverageCheck",
    "meta",
  ],
};

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

  throw new Error("nvidia_empty_response");
}

export function resolveNvidiaModel(model) {
  return String(model ?? "").trim() || DEFAULT_MODEL;
}

export function buildNvidiaRequestBody(rawText, options = {}) {
  return {
    model: resolveNvidiaModel(options.model),
    messages: buildMindFlowMessages(rawText, {
      currentDate: options.currentDate,
      strategy: options.strategy,
    }),
    temperature: 0,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    stream: false,
    reasoning_effort: options.reasoningEffort ?? "low",
    response_format: {
      type: "json_object",
    },
    ...(options.guidedJson ? { guided_json: options.guidedJson } : {}),
  };
}

export function createNvidiaClient(options = {}) {
  const apiKey = options.apiKey ?? process.env.NVIDIA_API_KEY;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const baseUrl = trimTrailingSlash(options.baseUrl ?? process.env.NVIDIA_BASE_URL ?? DEFAULT_BASE_URL);
  const model = resolveNvidiaModel(options.model ?? process.env.NVIDIA_MODEL);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  if (!apiKey) {
    throw new Error("nvidia_api_key_required");
  }

  if (!fetchImpl) {
    throw new Error("fetch_unavailable");
  }

  return async function nvidiaClient({ rawText, strategy = null }) {
    const attempts = Math.max(1, maxAttempts);
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildNvidiaRequestBody(rawText, { model, strategy })),
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = new Error(`nvidia_request_failed_${response.status}`);
          if (response.status >= 500 && attempt < attempts) {
            lastError = error;
            continue;
          }

          throw error;
        }

        return getMessageContent(await response.json());
      } catch (error) {
        lastError = error;
        if (
          attempt >= attempts ||
          (typeof error?.message === "string" && error.message.startsWith("nvidia_request_failed_4"))
        ) {
          throw error;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  };
}
