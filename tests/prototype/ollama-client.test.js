import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMindFlowMessages,
  createOllamaClient,
} from "../../src/prototype/ollama-client.mjs";

test("buildMindFlowMessages asks for MindFlow JSON without exposing any secret", () => {
  const messages = buildMindFlowMessages("牙医还没约，周末整理房间");
  const combined = messages.map((message) => message.content).join("\n");

  assert.equal(messages[0].role, "system");
  assert.equal(messages[1].role, "user");
  assert.ok(combined.includes("仅返回 JSON"));
  assert.ok(combined.includes("focusSteps"));
  assert.ok(combined.includes("语义细胞"));
  assert.ok(combined.includes("可开始性 > 清晰度 > 时间线索 > 重要性"));
  assert.ok(combined.includes("nextStep 需要是一个看得见的具体动作"));
  assert.ok(combined.includes("不要按标点、换行或序号直接拆分任务"));
  assert.ok(combined.includes("给 X 增加 Y"));
  assert.ok(combined.includes("不要把一个未覆盖的任务只写进 reason"));
  assert.ok(combined.includes("制作 A 或 B"));
  assert.ok(combined.includes("semanticUnits"));
  assert.ok(combined.includes("sourceUnitIds"));
  assert.ok(combined.includes("coverageCheck"));
  assert.ok(combined.includes("status 只能是 organized 或 empty"));
  assert.ok(combined.includes("不要输出 success、ok、completed"));
  assert.ok(combined.includes("meta 需要包含 modelBehavior 和 safetyLevel"));
  assert.ok(combined.includes("同一件事在多个地方出现"));
  assert.ok(combined.includes("去除口语填充词"));
  assert.ok(combined.includes("title、nextStep、focusSteps 里禁止保留"));
  assert.ok(combined.includes("assignTo"));
  assert.ok(combined.includes("dueAt"));
  assert.ok(combined.includes("tags"));
  assert.ok(combined.includes("今晚、几个小时后、两天后"));
  assert.ok(combined.includes("时间线索只能绑定到原文明确修饰的事项"));
  assert.ok(combined.includes("不要把明天、今晚等时间词套到相邻任务"));
  assert.ok(combined.includes("语气保持低压力"));
  assert.equal(/必须|赶紧|立刻|拖太久|否则|应该早就/.test(combined), false);
  assert.ok(combined.includes("牙医还没约"));
  assert.equal(combined.includes("API_KEY"), false);
  assert.equal(combined.includes("nvapi-"), false);
});

test("buildMindFlowMessages includes resplit strategy instructions", () => {
  const messages = buildMindFlowMessages("牙医还没约，周末整理房间", { strategy: "missing" });
  const combined = messages.map((message) => message.content).join("\n");

  assert.ok(combined.includes("本次是重新拆分"));
  assert.ok(combined.includes("查漏补缺"));
  assert.ok(combined.includes("时间、联系人、材料或验收动作"));
});

test("createOllamaClient posts a non-streaming local JSON chat request", async () => {
  const requests = [];
  const client = createOllamaClient({
    endpoint: "http://127.0.0.1:11434",
    model: "qwen2.5:3b",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            message: {
              content: "{\"status\":\"organized\",\"message\":\"其他想法都还在\",\"suggestions\":[{\"title\":\"约牙医\",\"reason\":\"它很清楚。\",\"nextStep\":\"找电话。\",\"focusSteps\":[\"找电话\"],\"source\":\"牙医\"}],\"savedItems\":[]}",
            },
          };
        },
      };
    },
  });

  const result = await client({ rawText: "牙医还没约", strategy: "finer" });
  const body = JSON.parse(requests[0].options.body);
  const promptText = body.messages.map((message) => message.content).join("\n");

  assert.equal(requests[0].url, "http://127.0.0.1:11434/api/chat");
  assert.equal(body.model, "qwen2.5:3b");
  assert.equal(body.stream, false);
  assert.equal(body.format, "json");
  assert.equal(body.keep_alive, "10m");
  assert.equal(body.options.temperature, 0);
  assert.equal(body.options.num_ctx, 4096);
  assert.equal(body.options.num_predict, 1000);
  assert.ok(promptText.includes("拆得更细"));
  assert.equal(result.includes("\"status\":\"organized\""), true);
});

test("createOllamaClient rejects non-local endpoints", () => {
  assert.throws(
    () => createOllamaClient({ endpoint: "https://example.com" }),
    /local_endpoint_required/,
  );
});
