import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler from "../../api/supabase-proxy.mjs";

function createRequest(body) {
  const request = Readable.from([JSON.stringify(body)]);
  request.method = "POST";
  return request;
}

function createResponse() {
  const chunks = [];

  return {
    statusCode: 0,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(value) {
      chunks.push(String(value ?? ""));
    },
    get body() {
      return chunks.join("");
    },
  };
}

test("Supabase proxy forwards only allowed Supabase API paths", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const forwarded = [];

  t.after(() => {
    globalThis.fetch = previousFetch;
    process.env.SUPABASE_URL = previousUrl;
    process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
  });

  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-key";
  globalThis.fetch = async (url, options = {}) => {
    forwarded.push({ url, options });
    return new Response(JSON.stringify([{ state: {} }]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const response = createResponse();
  await handler(createRequest({
    path: "/rest/v1/mindflow_user_states?select=state",
    method: "GET",
    headers: { Authorization: "Bearer token" },
  }), response);

  assert.equal(response.statusCode, 200);
  assert.equal(forwarded[0].url, "https://project.supabase.co/rest/v1/mindflow_user_states?select=state");
  assert.equal(forwarded[0].options.headers.apikey, "publishable-key");
  assert.equal(forwarded[0].options.headers.Authorization, "Bearer token");

  const blockedResponse = createResponse();
  await handler(createRequest({
    path: "/storage/v1/object/private",
    method: "GET",
  }), blockedResponse);

  assert.equal(blockedResponse.statusCode, 400);
  assert.equal(forwarded.length, 1);
});
