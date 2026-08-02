import { organizeThoughts } from "../src/prototype/organizer.mjs";

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

function toApiResult(rawText) {
  const localResult = organizeThoughts(rawText);

  if (localResult.status === "empty") {
    return {
      status: "empty",
      message: localResult.message,
      suggestions: [],
      savedItems: [],
      meta: {
        modelBehavior: "local_rules",
        safetyLevel: "normal",
      },
    };
  }

  return {
    status: "organized",
    message: localResult.message,
    suggestions: localResult.suggestions.map((suggestion, index) => ({
      ...suggestion,
      assignTo: index === 0 ? "active" : "parking",
      tags: [],
      dueAt: null,
      isBigEvent: false,
      remindDaysBefore: null,
    })),
    savedItems: localResult.savedItems,
    meta: {
      modelBehavior: "local_rules",
      safetyLevel: "normal",
    },
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const rawText = typeof body.rawText === "string" ? body.rawText : "";

    if (!rawText.trim()) {
      sendJson(response, 400, { error: "empty_input" });
      return;
    }

    sendJson(response, 200, { aiJson: JSON.stringify(toApiResult(rawText)) });
  } catch {
    sendJson(response, 400, { error: "invalid_request" });
  }
}
