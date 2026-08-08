import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createOllamaClient } from "./ollama-client.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 18811);
const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434";
const ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const MAX_RAW_TEXT_LENGTH = 500;
const ollamaClient = createOllamaClient({
  endpoint: ollamaEndpoint,
  model: ollamaModel,
});

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let raw = "";

  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 12000) {
      throw new Error("body_too_large");
    }
  }

  return JSON.parse(raw || "{}");
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${host}:${port}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Content-Length": stats.size,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/supabase-config") {
    if (!supabaseUrl || !supabasePublishableKey) {
      sendJson(response, 503, { error: "cloud_config_missing" });
      return;
    }

    sendJson(response, 200, {
      supabaseProxyUrl: "/api/supabase-proxy",
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/supabase-proxy") {
    if (!supabaseUrl || !supabasePublishableKey) {
      sendJson(response, 503, { error: "cloud_config_missing" });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const path = typeof body.path === "string" ? body.path : "";
      const method = typeof body.method === "string" ? body.method.toUpperCase() : "GET";

      if (
        !path.startsWith("/") ||
        !(path.startsWith("/auth/v1/") || path.startsWith("/rest/v1/")) ||
        !(method === "GET" || method === "POST")
      ) {
        sendJson(response, 400, { error: "invalid_supabase_proxy_request" });
        return;
      }

      const headers = {
        apikey: supabasePublishableKey,
        "Content-Type": "application/json",
      };

      if (typeof body.headers?.Authorization === "string" && body.headers.Authorization.startsWith("Bearer ")) {
        headers.Authorization = body.headers.Authorization;
      }

      if (typeof body.headers?.Prefer === "string") {
        headers.Prefer = body.headers.Prefer;
      }

      const upstream = await fetch(`${supabaseUrl.replace(/\/+$/u, "")}${path}`, {
        method,
        headers,
        body: method === "GET" ? undefined : body.body ?? null,
      });
      const text = await upstream.text();

      response.writeHead(upstream.status, {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      });
      response.end(text);
    } catch {
      sendJson(response, 400, { error: "supabase_proxy_failed" });
    }
    return;
  }

  if (request.method === "GET" && request.url === "/api/organize") {
    sendJson(response, 200, {
      provider: "ollama",
      endpoint: ollamaEndpoint,
      model: ollamaModel,
      localOnly: true,
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/organize") {
    try {
      const body = await readJsonBody(request);
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

      const aiJson = await ollamaClient({ rawText, strategy });
      sendJson(response, 200, { aiJson });
    } catch {
      sendJson(response, 503, { error: "local_ai_unavailable" });
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end("Method not allowed");
    return;
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`MindFlow prototype running at http://${host}:${port}`);
  console.log(`Local AI endpoint: ${ollamaEndpoint} (${ollamaModel})`);
});
