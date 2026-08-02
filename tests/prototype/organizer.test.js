import test from "node:test";
import assert from "node:assert/strict";
import { organizeThoughts } from "../../src/prototype/organizer.mjs";

test("organizeThoughts returns a gentle suggestion and saved items", () => {
  const result = organizeThoughts("牙医还没约，周末整理房间，保险那个事也要看，小王消息没回");

  assert.equal(result.suggestion.priority, 1);
  assert.equal(result.suggestion.title, "给牙医打电话预约");
  assert.equal(result.suggestion.label, "也许可以先看这个");
  assert.equal(result.suggestion.reason, "它比较清楚，不需要一次处理太多。");
  assert.equal(result.suggestion.nextStep, "打开通讯录，找到诊所电话。");
  assert.deepEqual(result.suggestion.focusSteps, [
    "找到诊所电话",
    "问最近可约时间",
    "记下确认时间",
  ]);
  assert.deepEqual(result.actions, ["看一下", "先不管"]);
  assert.ok(result.savedItems.length >= 2);
});

test("organizeThoughts exposes the next recommendation for skip flow", () => {
  const result = organizeThoughts("牙医还没约，周末整理房间，保险那个事也要看，小王消息没回");

  assert.equal(result.suggestions.length, 4);
  assert.equal(result.suggestions[0].priority, 1);
  assert.equal(result.suggestions[0].title, "给牙医打电话预约");
  assert.equal(result.suggestions[1].priority, 2);
  assert.equal(result.suggestions[1].title, "周末整理房间");
  assert.equal(result.suggestions[1].nextStep, "先把桌面上的杯子拿走。");
});

test("organizeThoughts asks for input when text is blank", () => {
  const result = organizeThoughts("   ");

  assert.equal(result.status, "empty");
  assert.equal(result.message, "想到什么都可以先放在这里。");
  assert.equal(result.suggestion, null);
  assert.deepEqual(result.suggestions, []);
});

test("organizeThoughts decomposes a large project into startable work before ranking", () => {
  const result = organizeThoughts("我要找工作，但是简历作品集面试都没弄，好乱。");

  assert.equal(result.suggestion.title, "先打开简历文件");
  assert.equal(result.suggestion.priority, 1);
  assert.equal(result.suggestion.reason, "它是一个很小的入口，不需要现在改完整份。");
  assert.equal(result.suggestion.nextStep, "打开最近那版简历，只看标题和第一段。");
  assert.deepEqual(result.suggestion.focusSteps, [
    "打开最近那版简历",
    "只看标题和第一段",
    "标出一个想改的小地方",
  ]);
  assert.equal(result.suggestion.category, "task");
  assert.equal(result.suggestion.energy, "low");
  assert.ok(result.savedItems.some((item) => item.source === "整理作品集"));
  assert.ok(result.savedItems.some((item) => item.source === "准备面试"));
  assert.equal(result.suggestions.some((item) => item.title.includes("完成找工作")), false);
});

test("organizeThoughts uses time hints without turning the next step into pressure", () => {
  const result = organizeThoughts("明天要交材料，牙医还没约，房间也很乱。");

  assert.equal(result.suggestion.title, "先确认明天要交的材料");
  assert.equal(result.suggestion.timeHint, "明天");
  assert.equal(result.suggestion.priority, 1);
  assert.equal(result.suggestion.nextStep, "打开材料清单，找出还差的一项。");
  assert.equal(result.suggestion.reason.includes("必须"), false);
  assert.equal(result.suggestion.reason.includes("赶紧"), false);
  assert.equal(result.suggestion.reason.includes("拖太久"), false);
});

test("organizeThoughts keeps non-project thoughts when expanding a large project", () => {
  const result = organizeThoughts("我要找工作，但是简历作品集面试都没弄，好乱。明天要交材料，牙医还没约，房间也很乱。");

  assert.equal(result.suggestion.title, "先确认明天要交的材料");
  assert.ok(result.suggestions.some((item) => item.title === "先打开简历文件"));
  assert.ok(result.suggestions.some((item) => item.title === "给牙医打电话预约"));
  assert.ok(result.savedItems.some((item) => item.source === "整理作品集"));
  assert.ok(result.savedItems.some((item) => item.source === "房间"));
});
