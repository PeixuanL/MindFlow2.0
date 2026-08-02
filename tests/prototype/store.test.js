import test from "node:test";
import assert from "node:assert/strict";
import {
  createMindFlowStore,
  priorityLabels,
} from "../../src/prototype/store.mjs";

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

const organizedResult = {
  status: "organized",
  message: "其他想法都还在",
  suggestions: [
    {
      title: "给牙医打电话预约",
      priority: 1,
      reason: "它比较清楚，不需要一次处理太多。",
      nextStep: "打开通讯录，找到诊所电话。",
      focusSteps: ["找到诊所电话", "问最近可约时间"],
      source: "牙医还没约",
      category: "task",
      energy: "low",
      timeHint: null,
    },
    {
      title: "周末整理房间",
      priority: 2,
      reason: "它比较清楚，不需要一次处理太多。",
      nextStep: "先把桌面上的杯子拿走。",
      focusSteps: ["拿走桌面杯子", "只清出一小块桌面"],
      source: "周末整理房间",
      category: "task",
      energy: "low",
      timeHint: null,
    },
  ],
  savedItems: [
    {
      source: "保险那个事也要看",
      category: "unknown",
      reasonParked: "先安全放着。",
    },
  ],
  meta: {
    modelBehavior: "fallback",
    fallbackReason: "invalid_json",
  },
};

test("store saves organized items per user and restores them after reload", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });

  const user = store.login(" Jane ");
  const batch = store.saveOrganizedResult(user.id, "牙医还没约，周末整理房间", organizedResult);

  assert.equal(batch.items.length, 3);
  assert.equal(batch.items[0].status, "active");
  assert.equal(batch.items[0].priority, "high");
  assert.equal(batch.items[2].status, "parking");
  assert.equal(batch.items[2].parkingReason, "先安全放着。");
  assert.equal(batch.items[0].aiMeta.modelBehavior, "fallback");

  const restoredStore = createMindFlowStore({ storage, now: () => 2000 });
  const restored = restoredStore.getStateForUser(user.id);

  assert.equal(restored.items.length, 3);
  assert.equal(restored.items[0].title, "给牙医打电话预约");
  assert.equal(restored.items[2].source, "保险那个事也要看");
});

test("store isolates registered accounts by account name instead of display name", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });

  const firstUser = store.register({
    accountName: "jane-work",
    password: "work-password",
    confirmPassword: "work-password",
    displayName: "Jane",
  });
  store.saveOrganizedResult(firstUser.id, "raw", organizedResult);

  const secondUser = store.register({
    accountName: "jane-life",
    password: "life-password",
    confirmPassword: "life-password",
    displayName: "Jane",
  });

  assert.notEqual(firstUser.id, secondUser.id);
  assert.equal(store.getStateForUser(secondUser.id).items.length, 0);
  assert.equal(store.getStateForUser(firstUser.id).items.length, 3);
});

test("store logs in an existing account with the matching password", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });

  const registered = store.register({
    accountName: "jane",
    password: "correct-password",
    confirmPassword: "correct-password",
    displayName: "Jane",
  });
  store.logout();

  const loggedIn = store.login({
    accountName: "jane",
    password: "correct-password",
  });

  assert.equal(loggedIn.id, registered.id);
});

test("store rejects duplicate registration and wrong login password", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });

  store.register({
    accountName: "jane",
    password: "correct-password",
    confirmPassword: "correct-password",
    displayName: "Jane",
  });

  assert.throws(
    () => store.register({
      accountName: "jane",
      password: "another-password",
      confirmPassword: "another-password",
      displayName: "Jane",
    }),
    /account_exists/,
  );

  assert.throws(
    () => store.login({ accountName: "jane", password: "wrong-password" }),
    /invalid_credentials/,
  );
});

test("store recommends active items and does not immediately repeat a skipped item", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });
  const user = store.login("Jane");
  const batch = store.saveOrganizedResult(user.id, "raw", organizedResult);

  assert.equal(store.getRecommendation(user.id).id, batch.items[0].id);

  store.skipItem(user.id, batch.items[0].id);

  assert.equal(store.getRecommendation(user.id).id, batch.items[1].id);

  store.skipItem(user.id, batch.items[1].id);

  assert.equal(store.getRecommendation(user.id), null);
});

test("store updates detail fields, moves items between sections, and exposes a parking candidate", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });
  const user = store.login("Jane");
  const batch = store.saveOrganizedResult(user.id, "raw", organizedResult);

  const updated = store.updateItem(user.id, batch.items[0].id, {
    title: "预约牙医",
    priority: "low",
    status: "parking",
    steps: ["找到电话", "发消息确认"],
  });

  assert.equal(updated.title, "预约牙医");
  assert.equal(updated.priority, "low");
  assert.equal(updated.status, "parking");
  assert.deepEqual(updated.steps, ["找到电话", "发消息确认"]);

  store.updateItem(user.id, batch.items[1].id, { status: "done" });
  assert.equal(store.getRecommendation(user.id), null);
  assert.equal(store.getParkingCandidate(user.id).id, batch.items[0].id);

  const restored = store.updateItem(user.id, batch.items[0].id, { status: "active" });
  assert.equal(restored.status, "active");
  assert.equal(store.getRecommendation(user.id).id, batch.items[0].id);
});

test("store returns visible items filtered by status for item tabs", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });
  const user = store.login("Jane");
  const batch = store.saveOrganizedResult(user.id, "raw", organizedResult);

  store.updateItem(user.id, batch.items[0].id, { status: "done" });

  assert.deepEqual(
    store.getItemsByStatus(user.id, "active").map((item) => item.id),
    [batch.items[1].id],
  );
  assert.deepEqual(
    store.getItemsByStatus(user.id, "parking").map((item) => item.id),
    [batch.items[2].id],
  );
  assert.deepEqual(
    store.getItemsByStatus(user.id, "done").map((item) => item.id),
    [batch.items[0].id],
  );
});

test("store soft deletes an item and undo restores its previous section", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });
  const user = store.login("Jane");
  const batch = store.saveOrganizedResult(user.id, "raw", organizedResult);

  const deleted = store.softDeleteItem(user.id, batch.items[0].id);

  assert.equal(deleted.status, "deleted");
  assert.equal(store.getStateForUser(user.id).items.some((item) => item.id === deleted.id), false);

  const restored = store.undoDelete(user.id, batch.items[0].id);

  assert.equal(restored.status, "active");
  assert.equal(store.getStateForUser(user.id).items.some((item) => item.id === restored.id), true);
});

test("store gives every item in one saved batch a stable unique id", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000, random: () => 0.42 });
  const user = store.login("Jane");
  const batch = store.saveOrganizedResult(user.id, "raw", organizedResult);

  assert.equal(new Set(batch.items.map((item) => item.id)).size, batch.items.length);
});

test("store saves AI assignment, deadline, tags, and big event metadata", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });
  const user = store.login("Jane");

  const batch = store.saveOrganizedResult(user.id, "raw", {
    status: "organized",
    message: "其他想法都还在",
    suggestions: [
      {
        title: "交申请材料",
        priority: "high",
        assignTo: "active",
        reason: "它有明确时间。",
        nextStep: "打开材料清单确认缺什么。",
        focusSteps: ["打开清单", "确认缺口"],
        source: "今晚交申请材料",
        category: "todo",
        energy: "medium",
        dueAt: "2026-08-02T20:00:00+08:00",
        timeHint: "今晚",
        tags: ["申请", "材料"],
        isBigEvent: false,
        remindDaysBefore: 0,
      },
      {
        title: "准备产品发布会",
        priority: "high",
        assignTo: "parking",
        reason: "它比较大，需要拆开。",
        nextStep: "先列出发布会材料清单。",
        focusSteps: ["列材料清单", "确认场地时间", "准备演示内容"],
        source: "准备下个月的产品发布会",
        category: "todo",
        energy: "high",
        dueAt: "2026-09-01T09:00:00+08:00",
        timeHint: "下个月",
        tags: ["发布会", "项目"],
        isBigEvent: true,
        remindDaysBefore: 7,
      },
    ],
    savedItems: [
      {
        title: "看新项目方案",
        source: "两天后看新项目方案",
        priority: "medium",
        category: "todo",
        assignTo: "parking",
        reasonParked: "还有明确时间，可以先放着。",
        dueAt: "2026-08-04T09:00:00+08:00",
        timeHint: "两天后",
        tags: ["项目"],
        isBigEvent: false,
        remindDaysBefore: 1,
      },
    ],
    meta: {
      modelBehavior: "ai",
    },
  });

  assert.equal(batch.items.length, 3);
  assert.equal(batch.items[0].status, "active");
  assert.equal(batch.items[0].dueAt, "2026-08-02T20:00:00+08:00");
  assert.deepEqual(batch.items[0].tags, ["申请", "材料"]);
  assert.equal(batch.items[1].status, "parking");
  assert.equal(batch.items[1].isBigEvent, true);
  assert.equal(batch.items[1].remindDaysBefore, 7);
  assert.equal(batch.items[2].title, "看新项目方案");
  assert.equal(batch.items[2].status, "parking");
  assert.equal(batch.items[2].dueAt, "2026-08-04T09:00:00+08:00");

  const updated = store.updateItem(user.id, batch.items[2].id, {
    dueAt: "2026-08-04T18:00:00+08:00",
    tags: "项目, 晚上",
  });

  assert.equal(updated.dueAt, "2026-08-04T18:00:00+08:00");
  assert.deepEqual(updated.tags, ["项目", "晚上"]);
});

test("store preserves semantic evidence fields from organized items", () => {
  const storage = createMemoryStorage();
  const store = createMindFlowStore({ storage, now: () => 1000 });
  const user = store.login("Jane");

  const batch = store.saveOrganizedResult(user.id, "raw", {
    status: "organized",
    message: "其他想法都还在",
    suggestions: [
      {
        id: "item_1",
        title: "稳定版自我介绍和项目口径",
        priority: "high",
        assignTo: "active",
        reason: "它是 P0，也能统一后续面试表达。",
        nextStep: "先写 1 分钟自我介绍的 5 句骨架。",
        focusSteps: ["新建面试资产文档", "写 5 句骨架"],
        source: "P0 自我介绍；项目口径",
        category: "deliverable",
        parentGoal: "面试核心资产定稿",
        sourceUnitIds: ["u1", "u2"],
        mentions: ["P0 重新梳理自我介绍", "项目定稿口径"],
        type: "deliverable",
        deliverables: ["1 分钟自我介绍", "3 分钟自我介绍"],
        dependsOn: ["item_0"],
        confidence: 0.86,
        ambiguities: ["AI Agent 项目口径是否需要英文版"],
      },
    ],
    savedItems: [],
    semanticUnits: [
      { id: "u1", text: "P0 重新梳理自我介绍", role: "task" },
      { id: "u2", text: "项目定稿口径", role: "task" },
    ],
    coverageCheck: {
      coveredUnitIds: ["u1", "u2"],
      unmappedUnitIds: [],
    },
    meta: {
      modelBehavior: "ai",
    },
  });

  assert.equal(batch.items[0].parentGoal, "面试核心资产定稿");
  assert.deepEqual(batch.items[0].sourceUnitIds, ["u1", "u2"]);
  assert.deepEqual(batch.items[0].mentions, ["P0 重新梳理自我介绍", "项目定稿口径"]);
  assert.deepEqual(batch.items[0].deliverables, ["1 分钟自我介绍", "3 分钟自我介绍"]);
  assert.deepEqual(batch.items[0].dependsOn, ["item_0"]);
  assert.equal(batch.items[0].confidence, 0.86);
  assert.deepEqual(batch.items[0].ambiguities, ["AI Agent 项目口径是否需要英文版"]);
});

test("priorityLabels maps stored priority values to PRD labels", () => {
  assert.equal(priorityLabels.high, "High");
  assert.equal(priorityLabels.medium, "Medium");
  assert.equal(priorityLabels.low, "Low");
});
