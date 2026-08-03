import test from "node:test";
import assert from "node:assert/strict";
import {
  createLocalSemanticResult,
  getOrganizedResultSaveBlocker,
  normalizeAiResult,
  organizeThoughtsWithAi,
  validateAiResult,
} from "../../src/prototype/ai-organizer.mjs";

const rawText = "牙医还没约，周末整理房间";

function buildValidAiResponse(overrides = {}) {
  return {
    status: "organized",
    message: "其他想法都还在",
    suggestions: [
      {
        label: "也许可以先看这个",
        priority: 1,
        title: "先约牙医",
        reason: "这件事很清楚，可以先看一眼。",
        nextStep: "打开通讯录找到诊所电话。",
        focusSteps: ["找到电话", "问最近时间", "记下预约"],
        source: "牙医还没约",
        category: "task",
        energy: "low",
        timeHint: null,
      },
    ],
    savedItems: [
      {
        source: "周末整理房间",
        category: "task",
        reasonParked: "先安全放着。",
      },
    ],
    meta: {
      modelBehavior: "ai",
      safetyLevel: "normal",
    },
    ...overrides,
  };
}

test("organizeThoughtsWithAi returns a normalized valid AI-shaped response", async () => {
  const result = await organizeThoughtsWithAi(rawText, {
    aiClient: async () => JSON.stringify(buildValidAiResponse()),
  });

  assert.equal(result.status, "organized");
  assert.equal(result.message, "其他想法都还在");
  assert.equal(result.suggestion.title, "先约牙医");
  assert.equal(result.suggestions[0].priority, 1);
  assert.deepEqual(result.suggestions[0].focusSteps, ["找到电话", "问最近时间", "记下预约"]);
  assert.deepEqual(result.actions, ["看一下", "先不管"]);
  assert.equal(result.meta.modelBehavior, "ai");
});

test("organizeThoughtsWithAi can use local fast mode for simple input without calling AI", async () => {
  let aiCalled = false;

  const result = await organizeThoughtsWithAi("牙医还没约，周末整理房间", {
    preferLocalFast: true,
    aiClient: async () => {
      aiCalled = true;
      throw new Error("should not call AI for simple input");
    },
  });

  assert.equal(aiCalled, false);
  assert.equal(result.meta.modelBehavior, "local_fast");
  assert.equal(result.suggestion.title, "给牙医打电话预约");
  assert.equal(result.suggestions.length, 2);
});

test("organizeThoughtsWithAi calls AI for simple input when local rules would be generic", async () => {
  let aiCalled = false;

  const result = await organizeThoughtsWithAi("积分代办要能勾选完成，勾完这一条要有划线", {
    preferLocalFast: true,
    aiClient: async () => {
      aiCalled = true;
      return JSON.stringify({
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
            reason: "它是一个明确的交互闭环。",
            nextStep: "打开积分代办卡片，先给一条待办加完成勾选框。",
            focusSteps: ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"],
          },
        ],
        recommendedNow: { itemId: "item_1" },
        coverageCheck: { coveredUnitIds: ["u1", "u2"] },
        meta: {},
      });
    },
  });

  assert.equal(aiCalled, true);
  assert.equal(result.meta.modelBehavior, "ai");
  assert.equal(result.suggestion.title, "积分代办完成勾选");
  assert.deepEqual(result.suggestion.focusSteps, ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"]);
});

test("createLocalSemanticResult splits product-edit input without generic template steps", () => {
  const result = createLocalSemanticResult("积分代办要能勾选完成，勾完这一条要有划线");

  assert.equal(result.status, "organized");
  assert.equal(result.meta.modelBehavior, "local_semantic");
  assert.equal(result.meta.promptStrategy, "mindflow_system_prompt_local_rules_v1");
  assert.equal(result.items[0].title, "积分代办完成勾选");
  assert.deepEqual(result.items[0].sourceUnitIds, ["u1", "u2"]);
  assert.deepEqual(result.items[0].focusSteps, ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"]);
  assert.equal(getOrganizedResultSaveBlocker(result, "积分代办要能勾选完成，勾完这一条要有划线"), null);
});

test("createLocalSemanticResult decomposes a broad project into startable focus steps", () => {
  const result = createLocalSemanticResult("我要找工作，但是简历作品集面试都没弄，好乱。");

  assert.equal(result.status, "organized");
  assert.equal(result.meta.promptStrategy, "mindflow_system_prompt_local_rules_v1");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, "求职准备");
  assert.equal(result.items[0].isBigEvent, true);
  assert.deepEqual(result.items[0].focusSteps, ["更新简历", "整理作品集", "准备面试素材"]);
  assert.equal(result.items[0].nextStep, "打开简历文件，先补最近一个项目。");
  assert.deepEqual(result.coverageCheck.coveredUnitIds, ["u1", "u2", "u3"]);
  assert.equal(getOrganizedResultSaveBlocker(result, "我要找工作，但是简历作品集面试都没弄，好乱。"), null);
});

test("createLocalSemanticResult filters spoken filler and context from issue reports", () => {
  const raw = [
    "我感觉现在的语义理解还有点问题",
    "现在连着OLYA的那个开人的模型的网千万的模型",
    "以及昨天部署到Vercel之后",
    "那个解决方案就是昨天的拆解",
    "语义拆解的解决方案是跑得挺好的",
    "今天就是并没有把一些语义歧词过滤掉",
  ].join(",");

  const result = createLocalSemanticResult(raw);

  assert.equal(result.status, "organized");
  assert.equal(result.meta.modelBehavior, "local_semantic");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, "过滤语义歧义词");
  assert.deepEqual(result.items[0].sourceUnitIds, ["u1", "u6"]);
  assert.deepEqual(result.items[0].focusSteps, ["复现语义拆解输出", "标记口语和上下文词", "只保留可行动语义单元"]);
  assert.deepEqual(result.semanticUnits.map((unit) => unit.role), [
    "task",
    "context",
    "context",
    "context",
    "context",
    "task",
  ]);
});

test("organizeThoughtsWithAi still calls AI for complex prioritized input in local fast mode", async () => {
  let aiCalled = false;

  const result = await organizeThoughtsWithAi("P0 准备面试资产。P1 学习 Dify。", {
    preferLocalFast: true,
    aiClient: async () => {
      aiCalled = true;
      return {
        status: "organized",
        inputMode: "structured_list",
        semanticUnits: [
          { id: "u1", text: "P0 准备面试资产。", role: "task" },
        ],
        items: [
          {
            id: "item_1",
            title: "准备面试资产",
            sourceUnitIds: ["u1"],
            mentions: ["P0 准备面试资产。"],
            priority: "high",
            assignTo: "active",
            reason: "它是 P0。",
            nextStep: "打开面试资产文档，写 5 句骨架。",
            focusSteps: ["打开文档", "写 5 句骨架"],
          },
        ],
        recommendedNow: { itemId: "item_1" },
        coverageCheck: { coveredUnitIds: ["u1"] },
        meta: {},
      };
    },
  });

  assert.equal(aiCalled, true);
  assert.equal(result.meta.modelBehavior, "ai");
  assert.equal(result.suggestion.title, "准备面试资产");
});

test("organizeThoughtsWithAi uses local semantic fast mode for complex prioritized planning input", async () => {
  let aiCalled = false;
  const raw = [
    "P0 重新梳理稳定版自我介绍和项目经历文稿，包括 1 分钟 / 3 分钟自我介绍，以及 Inspector、Designer、AI Agent 项目定稿口径。",
    "P0 规划后续长期 / 短期路径，做长期职业方向地图 + 2-4 周行动表。",
    "P1 优化面试准备 skill，把 JD 分析、项目映射、高频问答、速练材料流程模板化。",
    "P1 找外企岗位，整理岗位清单、JD 关键词、匹配度、投递优先级。",
    "P1 快速输出可实际应用的 MindFlow MVP。",
    "P1 学习 Dify，做一个可展示的小案例并记录步骤。",
    "P1 设置岗位检索功能，建立关键词、平台、城市/远程条件、筛选字段和提醒机制。",
  ].join("\n");

  const result = await organizeThoughtsWithAi(raw, {
    preferLocalFast: true,
    aiClient: async () => {
      aiCalled = true;
      throw new Error("AI should not be called for prioritized planning input");
    },
  });

  assert.equal(aiCalled, false);
  assert.equal(result.meta.modelBehavior, "local_semantic_fast");
  assert.equal(result.status, "organized");
  assert.equal(result.suggestions.length <= 6, true);
  assert.deepEqual(result.suggestions.map((item) => item.title), [
    "稳定版自我介绍和项目口径",
    "长期职业方向地图和短期行动表",
    "面试准备 skill 模板化",
    "外企岗位检索和投递系统",
    "MindFlow MVP",
    "Dify 展示案例",
  ]);
  assert.equal(result.suggestion.title, "稳定版自我介绍和项目口径");
  assert.deepEqual(result.suggestion.sourceUnitIds, ["u1"]);
  assert.deepEqual(result.coverageCheck.coveredUnitIds, ["u1", "u2", "u3", "u4", "u5", "u6", "u7"]);
  assert.equal(getOrganizedResultSaveBlocker(result, raw), null);
});

test("organizeThoughtsWithAi falls back to the local organizer when AI returns invalid JSON", async () => {
  const result = await organizeThoughtsWithAi(
    "牙医还没约，周末整理房间，保险那个事也要看",
    {
      aiClient: async () => "{not-json",
    },
  );

  assert.equal(result.suggestion.title, "给牙医打电话预约");
  assert.equal(result.suggestion.nextStep, "打开通讯录，找到诊所电话。");
  assert.equal(result.meta.modelBehavior, "fallback");
  assert.equal(result.meta.fallbackReason, "invalid_json");
});

test("organizeThoughtsWithAi falls back when AI omits focusSteps", async () => {
  const missingFocusSteps = buildValidAiResponse({
    suggestions: [
      {
        label: "也许可以先看这个",
        priority: 1,
        title: "先约牙医",
        reason: "这件事很清楚，可以先看一眼。",
        nextStep: "打开通讯录找到诊所电话。",
        source: "牙医还没约",
      },
    ],
  });

  const result = await organizeThoughtsWithAi(rawText, {
    aiClient: async () => missingFocusSteps,
  });

  assert.equal(result.suggestion.title, "给牙医打电话预约");
  assert.deepEqual(result.suggestion.focusSteps, [
    "找到诊所电话",
    "问最近可约时间",
    "记下确认时间",
  ]);
  assert.equal(result.meta.modelBehavior, "fallback");
  assert.equal(result.meta.fallbackReason, "missing_core_fields");
});

test("organizeThoughtsWithAi falls back when the AI client fails", async () => {
  const result = await organizeThoughtsWithAi("小王消息没回，保险那个事也要看", {
    aiClient: async () => {
      throw new Error("AI unavailable");
    },
  });

  assert.equal(result.suggestion.title, "回复一条消息");
  assert.equal(result.meta.modelBehavior, "fallback");
  assert.equal(result.meta.fallbackReason, "ai_failure");
});

test("normalizeAiResult fills optional UI defaults without replacing valid AI content", () => {
  const result = normalizeAiResult(
    buildValidAiResponse({
      message: "",
      suggestions: [
        {
          title: "看一下保险消息",
          reason: "它只需要先确认一下。",
          nextStep: "先找到保险相关的那条消息。",
          focusSteps: ["找到消息", "看要补什么"],
          source: "保险那个事",
        },
      ],
      savedItems: [{ source: "周末整理房间" }],
      meta: {},
    }),
  );

  assert.equal(result.message, "其他想法都还在");
  assert.equal(result.suggestion.label, "也许可以先看这个");
  assert.equal(result.suggestion.priority, 1);
  assert.equal(result.suggestion.category, "unknown");
  assert.equal(result.suggestion.energy, "unknown");
  assert.equal(result.suggestion.timeHint, null);
  assert.equal(result.savedItems[0].category, "unknown");
  assert.equal(result.savedItems[0].reasonParked, "先安全放着。");
  assert.deepEqual(result.actions, ["看一下", "先不管"]);
});

test("normalizeAiResult preserves semantic task fields from AI output", () => {
  const result = normalizeAiResult(
    buildValidAiResponse({
      suggestions: [
        {
          title: "交申请材料",
          reason: "它有明确时间。",
          nextStep: "打开材料清单确认缺什么。",
          focusSteps: ["打开清单", "确认缺口", "补一项材料"],
          source: "我想今晚把申请材料交了",
          priority: "high",
          assignTo: "active",
          dueAt: "2026-08-02T20:00:00+08:00",
          timeHint: "今晚",
          tags: ["申请", "材料"],
          isBigEvent: false,
          remindDaysBefore: 0,
        },
      ],
      savedItems: [
        {
          source: "两天后看新项目方案",
          title: "看新项目方案",
          category: "todo",
          priority: "medium",
          assignTo: "parking",
          reasonParked: "还有明确时间，可以先放在停车场。",
          dueAt: "2026-08-04T09:00:00+08:00",
          timeHint: "两天后",
          tags: ["项目"],
          isBigEvent: false,
          remindDaysBefore: 1,
        },
      ],
    }),
  );

  assert.equal(result.suggestions[0].assignTo, "active");
  assert.equal(result.suggestions[0].dueAt, "2026-08-02T20:00:00+08:00");
  assert.deepEqual(result.suggestions[0].tags, ["申请", "材料"]);
  assert.equal(result.suggestions[0].isBigEvent, false);
  assert.equal(result.suggestions[0].remindDaysBefore, 0);
  assert.equal(result.savedItems[0].title, "看新项目方案");
  assert.equal(result.savedItems[0].assignTo, "parking");
  assert.equal(result.savedItems[0].dueAt, "2026-08-04T09:00:00+08:00");
  assert.deepEqual(result.savedItems[0].tags, ["项目"]);
});

test("normalizeAiResult converts semantic items into UI suggestions with source evidence", () => {
  const result = normalizeAiResult({
    status: "organized",
    message: "其他想法都还在",
    inputMode: "mixed",
    semanticUnits: [
      {
        id: "u1",
        text: "P0 重新梳理稳定版自我介绍",
        role: "task",
        topicHint: "面试资产",
      },
      {
        id: "u2",
        text: "后面 Inspector、Designer、AI Agent 项目口径也要一起定",
        role: "task",
        topicHint: "面试资产",
      },
      {
        id: "u3",
        text: "P1 学习 Dify",
        role: "task",
        topicHint: "学习展示",
      },
    ],
    recommendedNow: {
      itemId: "item_1",
      title: "稳定版自我介绍和项目口径",
      reason: "它是 P0，也能统一后续面试表达。",
      nextStep: "先写 1 分钟自我介绍的 5 句骨架。",
    },
    items: [
      {
        id: "item_1",
        title: "稳定版自我介绍和项目口径",
        parentGoal: "面试核心资产定稿",
        sourceUnitIds: ["u1", "u2"],
        mentions: [
          "P0 重新梳理稳定版自我介绍",
          "后面 Inspector、Designer、AI Agent 项目口径也要一起定",
        ],
        type: "deliverable",
        priority: "high",
        assignTo: "active",
        reason: "它是 P0，也能统一后续面试表达。",
        nextStep: "先写 1 分钟自我介绍的 5 句骨架。",
        focusSteps: ["新建面试资产文档", "写 5 句骨架", "标出 3 个项目入口"],
        deliverables: ["1 分钟自我介绍", "3 分钟自我介绍", "三个项目口径"],
        dependsOn: [],
        tags: ["面试", "项目口径"],
        confidence: 0.86,
        ambiguities: [],
      },
      {
        id: "item_2",
        title: "Dify 展示案例",
        parentGoal: "AI 工具学习展示",
        sourceUnitIds: ["u3"],
        mentions: ["P1 学习 Dify"],
        type: "learning",
        priority: "medium",
        assignTo: "parking",
        reason: "它可以作为 P1 展示资产，先保存着。",
        nextStep: "先确定一个能展示的 Dify 小案例主题。",
        focusSteps: ["选主题", "记录目标", "列步骤"],
        deliverables: ["Dify 小案例", "步骤记录"],
        dependsOn: [],
        tags: ["Dify", "学习"],
        confidence: 0.72,
        ambiguities: [],
      },
    ],
    coverageCheck: {
      coveredUnitIds: ["u1", "u2", "u3"],
      unmappedUnitIds: [],
      possibleDuplicates: [],
      needsClarification: [],
    },
    meta: {
      modelBehavior: "ai",
    },
  });

  assert.equal(result.inputMode, "mixed");
  assert.equal(result.suggestion.title, "稳定版自我介绍和项目口径");
  assert.equal(result.suggestion.id, "item_1");
  assert.equal(result.suggestion.parentGoal, "面试核心资产定稿");
  assert.deepEqual(result.suggestion.sourceUnitIds, ["u1", "u2"]);
  assert.deepEqual(result.suggestion.mentions, [
    "P0 重新梳理稳定版自我介绍",
    "后面 Inspector、Designer、AI Agent 项目口径也要一起定",
  ]);
  assert.deepEqual(result.suggestion.deliverables, ["1 分钟自我介绍", "3 分钟自我介绍", "三个项目口径"]);
  assert.equal(result.savedItems[0].title, "Dify 展示案例");
  assert.deepEqual(result.semanticUnits.map((unit) => unit.id), ["u1", "u2", "u3"]);
  assert.deepEqual(result.coverageCheck.coveredUnitIds, ["u1", "u2", "u3"]);
});

test("organizeThoughtsWithAi accepts local model semantic output with completed status", async () => {
  const result = await organizeThoughtsWithAi("P0 准备面试资产", {
    aiClient: async () => ({
      status: "completed",
      message: "",
      inputMode: "structured_list",
      semanticUnits: [
        {
          id: "unit_001",
          text: "P0 准备面试资产",
          role: "task",
          topicHint: "面试资产",
        },
      ],
      items: [
        {
          id: "item_001",
          title: "准备面试资产",
          parentGoal: "面试核心资产",
          sourceUnitIds: ["unit_001"],
          mentions: ["P0 准备面试资产"],
          type: "deliverable",
          priority: "high",
          assignTo: "active",
          reason: "它是 P0。",
          nextStep: "先写 1 分钟自我介绍的 5 句骨架。",
          focusSteps: ["新建文档", "写 5 句骨架"],
          deliverables: "1 分钟自我介绍",
          dependsOn: [],
          tags: ["面试"],
          confidence: 95,
          ambiguities: [],
        },
      ],
      recommendedNow: {
        itemId: "item_001",
        title: "准备面试资产",
        reason: "它是 P0。",
        nextStep: "先写 1 分钟自我介绍的 5 句骨架。",
      },
      coverageCheck: {
        coveredUnitIds: ["unit_001"],
        unmappedUnitIds: [],
        possibleDuplicates: [],
        needsClarification: [],
      },
      meta: {},
    }),
  });

  assert.equal(result.status, "organized");
  assert.equal(result.meta.modelBehavior, "ai");
  assert.equal(result.suggestion.title, "准备面试资产");
  assert.deepEqual(result.suggestion.deliverables, ["1 分钟自我介绍"]);
});

test("normalizeAiResult accepts string semantic arrays from small local models", () => {
  const result = normalizeAiResult({
    status: "organized",
    items: [
      {
        id: "item_001",
        title: "准备面试资产",
        sourceUnitIds: ["u1"],
        mentions: "P0 准备面试资产",
        reason: "它是 P0。",
        nextStep: "写 5 句骨架。",
        focusSteps: ["新建文档", "写骨架"],
        deliverables: "1 分钟自我介绍",
        dependsOn: "无",
        ambiguities: "是否需要英文版",
      },
    ],
    recommendedNow: { itemId: "item_001" },
    coverageCheck: { coveredUnitIds: ["u1"] },
  });

  assert.deepEqual(result.suggestion.mentions, ["P0 准备面试资产"]);
  assert.deepEqual(result.suggestion.deliverables, ["1 分钟自我介绍"]);
  assert.deepEqual(result.suggestion.dependsOn, ["无"]);
  assert.deepEqual(result.suggestion.ambiguities, ["是否需要英文版"]);
});

test("validateAiResult rejects semantic items without source evidence", () => {
  const result = validateAiResult(
    {
      status: "organized",
      semanticUnits: [{ id: "u1", text: "P0 准备自我介绍", role: "task" }],
      recommendedNow: {
        itemId: "item_1",
        title: "准备自我介绍",
        reason: "它是 P0。",
        nextStep: "写 5 句骨架。",
      },
      items: [
        {
          id: "item_1",
          title: "准备自我介绍",
          reason: "它是 P0。",
          nextStep: "写 5 句骨架。",
          focusSteps: ["新建文档", "写骨架"],
        },
      ],
      coverageCheck: {
        coveredUnitIds: ["u1"],
        unmappedUnitIds: [],
      },
    },
    "P0 准备自我介绍",
  );

  assert.equal(result.valid, false);
  assert.equal(result.reason, "missing_source_evidence");
});

test("validateAiResult rejects missing core suggestion fields for non-empty input", () => {
  const result = validateAiResult(
    {
      status: "organized",
      suggestions: [
        {
          title: "先约牙医",
          reason: "这件事很清楚，可以先看一眼。",
          nextStep: "打开通讯录找到诊所电话。",
        },
      ],
    },
    rawText,
  );

  assert.equal(result.valid, false);
  assert.equal(result.reason, "missing_core_fields");
});

test("organizeThoughtsWithAi falls back when AI returns pressure language", async () => {
  const pressureResponse = buildValidAiResponse({
    suggestions: [
      {
        label: "也许可以先看这个",
        priority: 1,
        title: "马上处理明天材料",
        reason: "这是最紧急的，你必须马上处理。",
        nextStep: "立刻把所有材料整理完。",
        focusSteps: ["赶紧打开材料", "把所有内容都补完"],
        source: "明天要交材料",
        category: "task",
        energy: "high",
        timeHint: "明天",
      },
    ],
  });

  const result = await organizeThoughtsWithAi("明天要交材料，牙医还没约", {
    aiClient: async () => pressureResponse,
  });

  assert.equal(result.meta.modelBehavior, "fallback");
  assert.equal(result.meta.fallbackReason, "pressure_language");
  assert.equal(result.suggestion.title, "先确认明天要交的材料");
  assert.equal(result.suggestion.reason.includes("必须"), false);
});

test("getOrganizedResultSaveBlocker blocks fallback results before they are saved", async () => {
  const result = await organizeThoughtsWithAi("P0 准备面试资产，P1 找岗位", {
    aiClient: async () => {
      throw new Error("AI unavailable");
    },
  });

  assert.equal(getOrganizedResultSaveBlocker(result, "P0 准备面试资产，P1 找岗位"), "fallback_result");
});

test("getOrganizedResultSaveBlocker blocks long complex input when AI returns only legacy suggestions", () => {
  const result = normalizeAiResult(buildValidAiResponse({
    suggestions: [
      {
        title: "准备面试资产",
        reason: "它是 P0。",
        nextStep: "先写 5 句骨架。",
        focusSteps: ["新建文档", "写骨架"],
        source: "P0 准备面试资产",
        priority: "high",
      },
    ],
    savedItems: [],
  }));
  const raw = [
    "P0 重新梳理稳定版自我介绍和项目经历文稿。",
    "P0 规划长期短期路径。",
    "P1 优化面试准备 skill。",
    "P1 找外企岗位。",
  ].join("\n");

  assert.equal(getOrganizedResultSaveBlocker(result, raw), "missing_semantic_evidence");
});

test("getOrganizedResultSaveBlocker blocks over-split results", () => {
  const suggestions = Array.from({ length: 9 }, (_, index) => ({
    title: `碎任务 ${index + 1}`,
    reason: "它可以先看一眼。",
    nextStep: "写一个小步骤。",
    focusSteps: ["写一个小步骤"],
    source: `原文 ${index + 1}`,
    priority: "medium",
  }));
  const result = normalizeAiResult(buildValidAiResponse({ suggestions, savedItems: [] }));

  assert.equal(getOrganizedResultSaveBlocker(result, "一长段混乱输入"), "over_split");
});

test("getOrganizedResultSaveBlocker blocks generic local-model next steps", () => {
  const result = normalizeAiResult({
    status: "completed",
    inputMode: "structured_list",
    semanticUnits: [{ id: "u1", text: "P0 准备面试资产", role: "task" }],
    items: [
      {
        id: "item_1",
        title: "准备面试资产",
        sourceUnitIds: ["u1"],
        mentions: ["P0 准备面试资产"],
        priority: "high",
        assignTo: "active",
        reason: "它是 P0。",
        nextStep: "开始准备面试资产。",
        focusSteps: ["收集资料", "分析内容"],
      },
    ],
    recommendedNow: { itemId: "item_1" },
    coverageCheck: { coveredUnitIds: ["u1"] },
    meta: { modelBehavior: "ai" },
  });

  assert.equal(getOrganizedResultSaveBlocker(result, "P0 准备面试资产"), "generic_next_step");
});
