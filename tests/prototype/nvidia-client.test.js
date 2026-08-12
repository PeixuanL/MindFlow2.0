import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNvidiaRequestBody,
  createNvidiaClient,
  resolveNvidiaModel,
} from "../../src/prototype/nvidia-client.mjs";

test("buildNvidiaRequestBody uses JSON mode for MindFlow output", () => {
  const body = buildNvidiaRequestBody("明天要交材料，牙医还没约", {
    model: "openai/gpt-oss-20b",
    currentDate: "2026-08-12",
  });
  const combined = body.messages.map((message) => message.content).join("\n");

  assert.equal(body.model, "openai/gpt-oss-20b");
  assert.equal(body.temperature, 0);
  assert.equal(body.max_tokens, 1400);
  assert.equal(body.stream, false);
  assert.equal(body.reasoning_effort, "low");
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(body.guided_json, undefined);
  assert.ok(combined.includes("2026-08-12"));
  assert.ok(combined.includes("仅返回 JSON"));
  assert.ok(combined.includes("coverageCheck"));
});

test("createNvidiaClient posts through the NVIDIA NIM chat completions API", async () => {
  const requests = [];
  const client = createNvidiaClient({
    apiKey: "test-nvidia-key",
    model: "openai/gpt-oss-20b",
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

  const result = await client({ rawText: "牙医还没约", strategy: "finer" });
  const body = JSON.parse(requests[0].options.body);

  assert.equal(requests[0].url, "https://integrate.api.nvidia.com/v1/chat/completions");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-nvidia-key");
  assert.equal(body.messages[1].content, "牙医还没约");
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.equal(result.includes("\"status\":\"organized\""), true);
});

test("createNvidiaClient retries transient fetch failures before returning success", async () => {
  const requests = [];
  const client = createNvidiaClient({
    apiKey: "test-nvidia-key",
    model: "openai/gpt-oss-20b",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (requests.length < 3) {
        throw new Error("fetch failed");
      }

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

  assert.equal(requests.length, 3);
  assert.equal(result.includes("\"status\":\"organized\""), true);
});

test("createNvidiaClient does not retry a retired model response", async () => {
  const requests = [];
  const client = createNvidiaClient({
    apiKey: "test-nvidia-key",
    model: "qwen/qwen3-next-80b-a3b-instruct",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: false,
        status: 410,
        async json() {
          return {
            error: "model_gone",
          };
        },
      };
    },
  });

  await assert.rejects(
    () => client({ rawText: "牙医还没约" }),
    /nvidia_request_failed_410/,
  );
  assert.equal(requests.length, 1);
});

test("resolveNvidiaModel falls back to a current NVIDIA-hosted model", () => {
  assert.equal(resolveNvidiaModel(""), "openai/gpt-oss-20b");
  assert.equal(resolveNvidiaModel(" qwen/qwen3.5-122b-a10b "), "qwen/qwen3.5-122b-a10b");
});

test("createNvidiaClient requires an API key", () => {
  assert.throws(
    () => createNvidiaClient({ apiKey: "" }),
    /nvidia_api_key_required/,
  );
});
