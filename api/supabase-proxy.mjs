const MAX_BODY_LENGTH = 250000;
const ALLOWED_METHODS = new Set(["GET", "POST"]);
const ALLOWED_PATHS = ["/auth/v1/", "/rest/v1/"];

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let raw = "";

  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > MAX_BODY_LENGTH) {
      throw new Error("body_too_large");
    }
  }

  return JSON.parse(raw || "{}");
}

function isAllowedPath(path) {
  return ALLOWED_PATHS.some((prefix) => path.startsWith(prefix));
}

function pickForwardHeaders(headers = {}) {
  const forwardHeaders = {
    apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  };

  if (typeof headers.Authorization === "string" && headers.Authorization.startsWith("Bearer ")) {
    forwardHeaders.Authorization = headers.Authorization;
  }

  if (typeof headers.Prefer === "string") {
    forwardHeaders.Prefer = headers.Prefer;
  }

  return forwardHeaders;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "method_not_allowed" });
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
    sendJson(response, 503, { error: "cloud_config_missing" });
    return;
  }

  try {
    const body = await readJsonBody(request);
    const path = typeof body.path === "string" ? body.path : "";
    const method = typeof body.method === "string" ? body.method.toUpperCase() : "GET";

    if (!path.startsWith("/") || !isAllowedPath(path) || !ALLOWED_METHODS.has(method)) {
      sendJson(response, 400, { error: "invalid_supabase_proxy_request" });
      return;
    }

    const upstream = await fetch(`${process.env.SUPABASE_URL.replace(/\/+$/u, "")}${path}`, {
      method,
      headers: pickForwardHeaders(body.headers),
      body: method === "GET" ? undefined : body.body ?? null,
    });
    const text = await upstream.text();

    response.statusCode = upstream.status;
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    response.end(text);
  } catch {
    sendJson(response, 400, { error: "supabase_proxy_failed" });
  }
}
