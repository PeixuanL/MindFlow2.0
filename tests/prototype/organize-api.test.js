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

test("organize API returns local semantic output without calling external AI", async (t) => {
  const previousFetch = globalThis.fetch;

  t.after(() => {
    globalThis.fetch = previousFetch;
  });

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
