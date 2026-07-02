import test from "node:test";
import assert from "node:assert/strict";
import { organizeThoughts } from "../../src/prototype/organizer.mjs";

test("organizeThoughts returns a gentle suggestion and saved items", () => {
  const result = organizeThoughts("牙医还没约，周末整理房间，保险那个事也要看，小王消息没回");

  assert.equal(result.suggestion.title, "给牙医打电话预约");
  assert.equal(result.suggestion.label, "也许可以先看这个");
  assert.equal(result.suggestion.reason, "它比较清楚，不需要一次处理太多。");
  assert.deepEqual(result.actions, ["看一下", "先不管"]);
  assert.ok(result.savedItems.length >= 2);
});

test("organizeThoughts asks for input when text is blank", () => {
  const result = organizeThoughts("   ");

  assert.equal(result.status, "empty");
  assert.equal(result.message, "想到什么都可以先放在这里。");
  assert.equal(result.suggestion, null);
});
