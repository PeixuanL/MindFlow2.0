import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler from "../../api/organize.mjs";

function createRequest(body, method = "POST") {
  const request = Readable.from([JSON.stringify(body)]);
  request.method = method;
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

function restoreEnvValue(key, value) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

test("organize API returns local semantic output without calling external AI", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousAllowLocal = process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE;

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("MINDFLOW_ALLOW_LOCAL_ORGANIZE", previousAllowLocal);
  });

  delete process.env.OPENROUTER_API_KEY;
  process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE = "true";
  globalThis.fetch = async () => {
    throw new Error("should_not_call_external_ai");
  };

  const response = createResponse();
  await handler(createRequest({
    rawText: "积分代办要能勾选完成，勾完这一条要有划线",
  }), response);
  const payload = JSON.parse(response.body);
  const result = JSON.parse(payload.aiJson);

  assert.equal(response.statusCode, 200);
  assert.equal(result.meta.modelBehavior, "local_semantic");
  assert.equal(result.items[0].title, "积分代办完成勾选");
  assert.deepEqual(result.items[0].focusSteps, ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"]);
});

test("organize API reports AI diagnostics without exposing secrets", async (t) => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  const previousRequireZdr = process.env.OPENROUTER_REQUIRE_ZDR;
  const previousAllowLocal = process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE;

  t.after(() => {
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("OPENROUTER_MODEL", previousModel);
    restoreEnvValue("OPENROUTER_REQUIRE_ZDR", previousRequireZdr);
    restoreEnvValue("MINDFLOW_ALLOW_LOCAL_ORGANIZE", previousAllowLocal);
  });

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.OPENROUTER_MODEL = "inclusionai/ling-3.0-flash:free";
  process.env.OPENROUTER_REQUIRE_ZDR = "true";
  process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE = "false";

  const response = createResponse();
  await handler(createRequest({}, "GET"), response);
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.openRouterConfigured, true);
  assert.equal(payload.configuredModel, "inclusionai/ling-3.0-flash:free");
  assert.equal(payload.model, "openai/gpt-oss-20b:free");
  assert.equal(payload.requireZdr, true);
  assert.equal(payload.localFallbackAllowed, false);
  assert.equal(JSON.stringify(payload).includes("test-openrouter-key"), false);
});

test("organize API does not silently fall back locally when cloud AI is not configured", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousAllowLocal = process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE;
  let called = false;

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("MINDFLOW_ALLOW_LOCAL_ORGANIZE", previousAllowLocal);
  });

  delete process.env.OPENROUTER_API_KEY;
  process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE = "false";
  globalThis.fetch = async () => {
    called = true;
    throw new Error("should_not_call_external_ai");
  };

  const response = createResponse();
  await handler(createRequest({ rawText: "登录问题没有修好" }), response);
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 503);
  assert.equal(payload.error, "ai_not_configured");
  assert.equal(called, false);
});

test("organize API calls OpenRouter with zero-cost guardrails when configured", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  const previousRequireZdr = process.env.OPENROUTER_REQUIRE_ZDR;
  const previousLimit = process.env.MINDFLOW_DAILY_AI_LIMIT;
  const requests = [];

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("OPENROUTER_MODEL", previousModel);
    restoreEnvValue("OPENROUTER_REQUIRE_ZDR", previousRequireZdr);
    restoreEnvValue("MINDFLOW_DAILY_AI_LIMIT", previousLimit);
  });

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.OPENROUTER_MODEL = "inclusionai/ling-3.0-flash:free";
  process.env.OPENROUTER_REQUIRE_ZDR = "false";
  process.env.MINDFLOW_DAILY_AI_LIMIT = "50";
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      async json() {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  status: "organized",
                  message: "其他想法都还在",
                  inputMode: "mixed",
                  semanticUnits: [
                    { id: "u1", text: "牙医还没约", role: "task", topicHint: "牙医" },
                  ],
                  items: [
                    {
                      id: "item_1",
                      title: "预约牙医",
                      parentGoal: "",
                      sourceUnitIds: ["u1"],
                      mentions: ["牙医还没约"],
                      type: "task",
                      priority: "medium",
                      assignTo: "active",
                      reason: "它比较清楚，可以先看一眼。",
                      nextStep: "找到诊所电话。",
                      focusSteps: ["打开通讯录", "找到诊所电话"],
                      deliverables: [],
                      dependsOn: [],
                      category: "task",
                      energy: "low",
                      timeHint: null,
                      dueAt: null,
                      tags: ["预约"],
                      isBigEvent: false,
                      remindDaysBefore: null,
                      confidence: 0.8,
                      ambiguities: [],
                    },
                  ],
                  recommendedNow: {
                    itemId: "item_1",
                    title: "预约牙医",
                    reason: "它比较清楚，可以先看一眼。",
                    nextStep: "找到诊所电话。",
                  },
                  coverageCheck: {
                    coveredUnitIds: ["u1"],
                    unmappedUnitIds: [],
                    possibleDuplicates: [],
                    needsClarification: [],
                  },
                  meta: { modelBehavior: "ai", safetyLevel: "normal" },
                }),
              },
            },
          ],
        };
      },
    };
  };

  const response = createResponse();
  await handler(createRequest({ rawText: "牙医还没约" }), response);
  const payload = JSON.parse(response.body);
  const body = JSON.parse(requests[0].options.body);

  assert.equal(response.statusCode, 200);
  assert.equal(requests[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-openrouter-key");
  assert.equal(body.model, "openai/gpt-oss-20b:free");
  assert.equal(body.provider, undefined);
  assert.deepEqual(body.max_price, { prompt: 0, completion: 0 });
  assert.equal(body.messages[1].content, "牙医还没约");
  assert.equal(payload.aiJson.includes("\"预约牙医\""), true);
  assert.equal(JSON.parse(payload.aiJson).meta.modelBehavior, "ai");
});

test("organize API blocks OpenRouter responses that ignore semantic evidence", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousLimit = process.env.MINDFLOW_DAILY_AI_LIMIT;

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("MINDFLOW_DAILY_AI_LIMIT", previousLimit);
  });

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.MINDFLOW_DAILY_AI_LIMIT = "50";
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                status: "organized",
                message: "其他想法都还在",
                suggestions: [
                  {
                    title: "就是整理一下",
                    reason: "感觉可以先看。",
                    nextStep: "开始处理。",
                    focusSteps: ["开始处理"],
                    source: "就是有很多事情",
                  },
                ],
                savedItems: [],
              }),
            },
          },
        ],
      };
    },
  });

  const response = createResponse();
  await handler(createRequest({
    rawText: "P0 重新梳理自我介绍\nP1 找外企岗位\nP1 优化面试准备 skill",
  }), response);
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 503);
  assert.equal(payload.error, "ai_unavailable");
  assert.equal(payload.reason, "generic_next_step");
});

test("organize API reports safe AI validation failure reasons", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousLimit = process.env.MINDFLOW_DAILY_AI_LIMIT;

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("MINDFLOW_DAILY_AI_LIMIT", previousLimit);
  });

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.MINDFLOW_DAILY_AI_LIMIT = "50";
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: "{not-json",
            },
          },
        ],
      };
    },
  });

  const response = createResponse();
  await handler(createRequest({ rawText: "登录问题没有修好" }), response);
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 503);
  assert.equal(payload.error, "ai_unavailable");
  assert.equal(payload.reason, "invalid_json");
  assert.equal(JSON.stringify(payload).includes("登录问题没有修好"), false);
});

test("organize API rejects overly long input before external AI", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  let called = false;

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
  });

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  globalThis.fetch = async () => {
    called = true;
    throw new Error("should_not_call_external_ai");
  };

  const response = createResponse();
  await handler(createRequest({ rawText: "想".repeat(501) }), response);
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 400);
  assert.equal(payload.error, "input_too_long");
  assert.equal(called, false);
});

test("organize API handles active card sync input locally when explicitly allowed", async (t) => {
  const previousAllowLocal = process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE;
  const previousKey = process.env.OPENROUTER_API_KEY;

  t.after(() => {
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("MINDFLOW_ALLOW_LOCAL_ORGANIZE", previousAllowLocal);
  });

  delete process.env.OPENROUTER_API_KEY;
  process.env.MINDFLOW_ALLOW_LOCAL_ORGANIZE = "true";

  const response = createResponse();
  await handler(createRequest({
    rawText: "active卡片的标题和具体拆分的代办没有生效",
  }), response);
  const payload = JSON.parse(response.body);
  const result = JSON.parse(payload.aiJson);

  assert.equal(response.statusCode, 200);
  assert.equal(result.meta.modelBehavior, "local_semantic");
  assert.equal(result.items[0].title, "同步 Active 卡片标题和拆分待办");
  assert.deepEqual(result.items[0].focusSteps, ["保存卡片标题编辑", "保存拆分待办编辑", "换设备刷新验证"]);
});
