import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenRouterRequestBody,
  createOpenRouterClient,
  resolveOpenRouterModel,
} from "../../src/prototype/openrouter-client.mjs";

test("buildOpenRouterRequestBody uses JSON and zero-cost routing guardrails by default", () => {
  const body = buildOpenRouterRequestBody("明天要交材料，牙医还没约", {
    model: "openai/gpt-oss-20b:free",
    currentDate: "2026-08-04",
  });
  const combined = body.messages.map((message) => message.content).join("\n");

  assert.equal(body.model, "openai/gpt-oss-20b:free");
  assert.equal(body.temperature, 0);
  assert.equal(body.max_tokens, 1400);
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(body.provider, undefined);
  assert.deepEqual(body.max_price, { prompt: 0, completion: 0 });
  assert.ok(combined.includes("2026-08-04"));
  assert.ok(combined.includes("仅返回 JSON"));
  assert.ok(combined.includes("coverageCheck"));
});

test("buildOpenRouterRequestBody can require ZDR when configured", () => {
  const body = buildOpenRouterRequestBody("牙医还没约", {
    requireZdr: true,
  });

  assert.deepEqual(body.provider, { zdr: true });
  assert.deepEqual(body.max_price, { prompt: 0, completion: 0 });
});

test("buildOpenRouterRequestBody keeps ZDR disabled when explicitly configured", () => {
  const body = buildOpenRouterRequestBody("牙医还没约", {
    requireZdr: false,
  });

  assert.equal(body.provider, undefined);
  assert.deepEqual(body.max_price, { prompt: 0, completion: 0 });
});

test("createOpenRouterClient posts through the OpenAI-compatible chat completions API", async () => {
  const requests = [];
  const client = createOpenRouterClient({
    apiKey: "test-key",
    model: "openai/gpt-oss-20b:free",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  content: "{\"status\":\"organized\",\"items\":[]}",
                },
              },
            ],
          };
        },
      };
    },
  });

  const result = await client({ rawText: "牙医还没约" });
  const body = JSON.parse(requests[0].options.body);

  assert.equal(requests[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-key");
  assert.equal(body.messages[1].content, "牙医还没约");
  assert.equal(result.includes("\"status\":\"organized\""), true);
});

test("createOpenRouterClient passes the optional ZDR routing requirement", async () => {
  const requests = [];
  const client = createOpenRouterClient({
    apiKey: "test-key",
    requireZdr: true,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  content: "{\"status\":\"organized\",\"items\":[]}",
                },
              },
            ],
          };
        },
      };
    },
  });

  await client({ rawText: "牙医还没约" });
  const body = JSON.parse(requests[0].options.body);

  assert.deepEqual(body.provider, { zdr: true });
});

test("resolveOpenRouterModel replaces known free models that cannot honor JSON mode", () => {
  assert.equal(resolveOpenRouterModel("inclusionai/ling-3.0-flash:free"), "openai/gpt-oss-20b:free");
  assert.equal(resolveOpenRouterModel("google/gemma-4-31b-it:free"), "openai/gpt-oss-20b:free");
  assert.equal(resolveOpenRouterModel("openai/gpt-oss-20b:free"), "openai/gpt-oss-20b:free");
  assert.equal(resolveOpenRouterModel("nvidia/nemotron-nano-9b-v2:free"), "nvidia/nemotron-nano-9b-v2:free");
});

test("createOpenRouterClient requires an API key", () => {
  assert.throws(
    () => createOpenRouterClient({ apiKey: "" }),
    /openrouter_api_key_required/,
  );
});
