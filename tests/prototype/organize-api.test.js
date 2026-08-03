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

test("organize API returns local semantic output when AI is not configured", async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;

  t.after(() => {
    process.env.OPENAI_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  });

  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = async () => {
    throw new Error("should_not_call_fetch_without_key");
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

test("organize API uses OpenAI semantic output when configured", async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  const previousFetch = globalThis.fetch;
  const requests = [];

  t.after(() => {
    process.env.OPENAI_API_KEY = previousKey;
    process.env.OPENAI_MODEL = previousModel;
    globalThis.fetch = previousFetch;
  });

  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "test-model";
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        status: "organized",
        message: "其他想法都还在",
        semanticUnits: [
          { id: "u1", text: "积分代办要能勾选完成", role: "task" },
          { id: "u2", text: "勾完这一条要有划线", role: "task" },
        ],
        items: [
          {
            id: "item_1",
            title: "积分代办完成勾选",
            sourceUnitIds: ["u1", "u2"],
            mentions: ["积分代办要能勾选完成", "勾完这一条要有划线"],
            priority: "medium",
            assignTo: "active",
            reason: "它是明确的交互闭环。",
            nextStep: "打开积分代办卡片，先给一条待办加完成勾选框。",
            focusSteps: ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"],
          },
        ],
        recommendedNow: { itemId: "item_1" },
        coverageCheck: { coveredUnitIds: ["u1", "u2"] },
        meta: {},
      }),
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const response = createResponse();
  await handler(createRequest({
    rawText: "积分代办要能勾选完成，勾完这一条要有划线",
  }), response);
  const payload = JSON.parse(response.body);
  const result = JSON.parse(payload.aiJson);

  assert.equal(response.statusCode, 200);
  assert.equal(requests[0].url, "https://api.openai.com/v1/responses");
  assert.equal(requests[0].options.headers.Authorization, "Bearer test-key");
  assert.equal(JSON.parse(requests[0].options.body).model, "test-model");
  assert.equal(result.items[0].title, "积分代办完成勾选");
  assert.deepEqual(result.items[0].focusSteps, ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"]);
});

test("organize API falls back to local semantic output when OpenAI fails", async (t) => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;

  t.after(() => {
    process.env.OPENAI_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  });

  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async () => new Response(JSON.stringify({ error: "nope" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });

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
