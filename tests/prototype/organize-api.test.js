import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import handler from "../../api/organize.mjs";

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

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
  });

  delete process.env.OPENROUTER_API_KEY;
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

test("organize API calls OpenRouter with privacy and zero-cost guardrails when configured", async (t) => {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousModel = process.env.OPENROUTER_MODEL;
  const previousLimit = process.env.MINDFLOW_DAILY_AI_LIMIT;
  const requests = [];

  t.after(() => {
    globalThis.fetch = previousFetch;
    restoreEnvValue("OPENROUTER_API_KEY", previousKey);
    restoreEnvValue("OPENROUTER_MODEL", previousModel);
    restoreEnvValue("MINDFLOW_DAILY_AI_LIMIT", previousLimit);
  });

  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  process.env.OPENROUTER_MODEL = "openrouter/free";
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
  assert.equal(body.model, "openrouter/free");
  assert.equal(body.provider.zdr, true);
  assert.deepEqual(body.max_price, { prompt: 0, completion: 0 });
  assert.equal(body.messages[1].content, "牙医还没约");
  assert.equal(payload.aiJson.includes("\"预约牙医\""), true);
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

test("organize API handles active card sync input locally", async () => {
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
