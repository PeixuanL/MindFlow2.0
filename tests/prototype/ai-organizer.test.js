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

test("organizeThoughtsWithAi passes the resplit strategy to the AI client", async () => {
  let request = null;

  await organizeThoughtsWithAi(rawText, {
    strategy: "missing",
    aiClient: async (payload) => {
      request = payload;
      return JSON.stringify(buildValidAiResponse());
    },
  });

  assert.deepEqual(request, {
    rawText,
    strategy: "missing",
  });
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

test("createLocalSemanticResult handles everyday mixed input without waiting for AI", () => {
  const rawText = "牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦";
  const result = createLocalSemanticResult(rawText);

  assert.equal(result.status, "organized");
  assert.equal(result.meta.modelBehavior, "local_semantic");
  assert.deepEqual(result.items.map((item) => item.title), [
    "预约牙医",
    "整理房间",
    "查看保险事项",
    "回复小王消息",
    "整理论文材料",
  ]);
  assert.equal(result.items[0].nextStep, "打开通讯录，找到诊所电话。");
  assert.equal(getOrganizedResultSaveBlocker(result, rawText), null);
});

test("createLocalSemanticResult detects local deadlines and applies priority rules without extra fields", () => {
  const result = createLocalSemanticResult("老板说明天下午前要改方案，周末整理房间", {
    now: "2026-08-09T10:00:00+08:00",
  });

  assert.equal(result.items[0].title, "修改方案");
  assert.equal(result.items[0].timeHint, "明天");
  assert.equal(result.items[0].dueAt, "2026-08-10T15:00:00+08:00");
  assert.equal(result.items[0].remindDaysBefore, 0);
  assert.equal(result.items[0].priority, "high");
  assert.equal("priorityMethod" in result.items[0], false);
  assert.equal("priorityQuadrant" in result.items[0], false);
  assert.equal("urgency" in result.items[0], false);
  assert.equal("importance" in result.items[0], false);
  assert.deepEqual(result.items[0].focusSteps, ["打开方案文件", "标出要改的一处", "保存一版可提交草稿"]);

  const materials = createLocalSemanticResult("今晚交申请材料", {
    now: "2026-08-09T10:00:00+08:00",
  });
  assert.equal(materials.items[0].title, "交申请材料");
  assert.equal(materials.items[0].nextStep, "打开申请材料清单，先确认缺少哪一项。");
  assert.deepEqual(materials.items[0].focusSteps, ["打开申请材料清单", "确认缺少哪一项", "先补最容易提交的文件"]);

  const todayOnly = createLocalSemanticResult("今日交付 Asset Management 框架初稿", {
    now: "2026-08-12T10:00:00+08:00",
  });
  assert.equal(todayOnly.items[0].timeHint, "今日");
  assert.equal(todayOnly.items[0].dueAt, "2026-08-12T23:59:00+08:00");
});

test("createLocalSemanticResult splits local model slowness, login check, and portfolio plan", () => {
  const rawText = "我感觉现在这个本地模型整理得非常慢，然后登录也要自测一下，同时看看作品集计划能不能拆成步骤";
  const result = createLocalSemanticResult(rawText);

  assert.equal(result.status, "organized");
  assert.equal(result.meta.modelBehavior, "local_semantic");
  assert.deepEqual(result.items.map((item) => item.title), [
    "排查本地模型整理耗时",
    "自测登录流程",
    "整理作品集",
  ]);
  assert.equal(getOrganizedResultSaveBlocker(result, rawText), null);
});

test("createLocalSemanticResult applies a finer strategy to regenerated local steps", () => {
  const defaultResult = createLocalSemanticResult("得尽快更新领英，之后找人connect");
  const finerResult = createLocalSemanticResult("得尽快更新领英，之后找人connect", { strategy: "finer" });

  assert.deepEqual(defaultResult.items.map((item) => item.title), ["更新领英", "联系目标人脉"]);
  assert.deepEqual(finerResult.items.map((item) => item.title), ["更新领英", "联系目标人脉"]);
  assert.notDeepEqual(finerResult.items[0].focusSteps, defaultResult.items[0].focusSteps);
  assert.deepEqual(finerResult.items[0].focusSteps, [
    "打开领英个人主页",
    "进入个人资料编辑",
    "补最新经历或项目",
    "保存后检查展示效果",
  ]);
  assert.deepEqual(finerResult.items[1].focusSteps, [
    "列出一个想联系的人",
    "打开领英搜索姓名",
    "写一句简短邀请",
    "发送后记录对方状态",
  ]);
});

test("createLocalSemanticResult makes every resplit strategy visibly different", () => {
  const rawText = "牙医还没约，周末整理房间，保险那个事也要看，小王消息没回";
  const defaultResult = createLocalSemanticResult(rawText);
  const sequenceResult = createLocalSemanticResult(rawText, { strategy: "sequence" });
  const finerResult = createLocalSemanticResult(rawText, { strategy: "finer" });
  const missingResult = createLocalSemanticResult(rawText, { strategy: "missing" });

  assert.equal(sequenceResult.items[0].reason.includes("按你写下的顺序"), true);
  assert.notEqual(sequenceResult.items[0].reason, defaultResult.items[0].reason);
  assert.notEqual(finerResult.items[0].nextStep, defaultResult.items[0].nextStep);
  assert.equal(finerResult.items[0].focusSteps.length > defaultResult.items[0].focusSteps.length, true);
  assert.equal(missingResult.items[0].nextStep.includes("检查"), true);
  assert.notEqual(missingResult.items[0].nextStep, finerResult.items[0].nextStep);
  assert.equal(getOrganizedResultSaveBlocker(sequenceResult, rawText), null);
  assert.equal(getOrganizedResultSaveBlocker(finerResult, rawText), null);
  assert.equal(getOrganizedResultSaveBlocker(missingResult, rawText), null);
});

test("createLocalSemanticResult applies resplit strategy to structured local fast results", () => {
  const rawText = [
    "P0 稳定版自我介绍和项目口径",
    "P1 外企岗位检索提醒",
    "P2 Dify 展示案例",
  ].join("\n");
  const defaultResult = createLocalSemanticResult(rawText);
  const finerResult = createLocalSemanticResult(rawText, { strategy: "finer" });
  const missingResult = createLocalSemanticResult(rawText, { strategy: "missing" });

  assert.equal(defaultResult.meta.modelBehavior, "local_semantic_fast");
  assert.equal(finerResult.meta.resplitStrategy, "finer");
  assert.notEqual(finerResult.items[0].nextStep, defaultResult.items[0].nextStep);
  assert.equal(missingResult.items[0].nextStep.includes("检查"), true);
  assert.notEqual(missingResult.items[0].nextStep, finerResult.items[0].nextStep);
});

const everydayNaturalLanguageCases = [
  {
    name: "family reminder, bill, and kitchen cleanup",
    rawText: "我妈让我周五前把体检报告发给她，然后信用卡账单也没看，周末还想把厨房收拾一下。",
    titles: ["发送体检报告", "查看信用卡账单", "收拾厨房"],
  },
  {
    name: "work revision, message reply, and pickup",
    rawText: "刚才老板说那个方案明天下午前要再改一版，我还没回小陈消息，快递也没去拿。",
    titles: ["修改方案", "回复小陈消息", "取快递"],
  },
  {
    name: "messy worry with documents, bill, and desktop cleanup",
    rawText: "我现在脑子有点乱，护照快过期了，水电费好像也没交，电脑桌面乱七八糟。",
    titles: ["更新护照", "缴水电费", "整理电脑桌面"],
  },
  {
    name: "interview preparation as one broad goal",
    rawText: "下周面试，但我简历还没改，作品集没整理，自我介绍也没练。",
    titles: ["面试准备"],
  },
  {
    name: "low-energy home chores",
    rawText: "今天不太想动，但冰箱里的菜要处理一下，垃圾也该扔了，衣服还没晾。",
    titles: ["处理冰箱食材", "扔垃圾", "晾衣服"],
  },
  {
    name: "local product testing flow",
    rawText: "我想先把 MindFlow 本地登录再测一遍，然后看一下整理速度，最后把改动提交。",
    titles: ["自测 MindFlow 本地登录", "检查整理速度", "提交改动"],
  },
  {
    name: "guest preparation",
    rawText: "明天朋友要来，客厅得收一下，杯子也要洗，顺便买点水果。",
    titles: ["收拾客厅", "洗杯子", "买水果"],
  },
  {
    name: "anxious admin and school tasks",
    rawText: "我有点焦虑，银行卡那个验证码没处理，医院预约也还没确认，论文摘要还差一版。",
    titles: ["处理银行卡验证码", "确认医院预约", "修改论文摘要"],
  },
  {
    name: "application materials and recommendation reminder",
    rawText: "周五之前要把申请材料发出去，推荐信还没提醒老师，作品集链接也要检查。",
    titles: ["发送申请材料", "提醒老师推荐信", "检查作品集链接"],
  },
  {
    name: "errands on the way home",
    rawText: "晚上回家前记得取快递，顺路买洗衣液，然后把物业群里的通知看一下。",
    titles: ["取快递", "买洗衣液", "查看物业通知"],
  },
  {
    name: "pet care and home repair",
    rawText: "猫砂快没了，猫疫苗还没约，房东说洗手间漏水要拍视频给他。",
    titles: ["买猫砂", "预约猫疫苗", "拍漏水视频给房东"],
  },
  {
    name: "travel preparation and balcony laundry",
    rawText: "我下周要出门，身份证不知道放哪了，行李箱也还没收，顺便想把阳台衣服拿进来。",
    titles: ["找身份证", "收拾行李箱", "收阳台衣服"],
  },
  {
    name: "ordered tasks with casual urgency wording",
    rawText: "牙医还没约，然后得尽快更新领英了。",
    titles: ["预约牙医", "更新领英"],
  },
  {
    name: "ordered linkedin update and networking",
    rawText: "得尽快更新领英，之后找人connect",
    titles: ["更新领英", "联系目标人脉"],
  },
  {
    name: "product marketing and localization tasks",
    rawText: "更新领英，把MindFlow制作宣传视频或直接小红书宣传文案，给MindFlow增加英文多语言",
    titles: ["更新领英", "制作 MindFlow 宣传内容", "增加 MindFlow 英文多语言"],
  },
];

for (const fixture of everydayNaturalLanguageCases) {
  test(`createLocalSemanticResult handles everyday natural language: ${fixture.name}`, () => {
    const result = createLocalSemanticResult(fixture.rawText);

    assert.equal(result.status, "organized");
    assert.deepEqual(result.items.map((item) => item.title), fixture.titles);
    assert.equal(getOrganizedResultSaveBlocker(result, fixture.rawText), null);
  });
}

test("createLocalSemanticResult keeps separate tasks joined by repeated need verbs", () => {
  const result = createLocalSemanticResult("得把登录的问题解决了，还得优化语音识别的技术方案");

  assert.equal(result.status, "organized");
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.semanticUnits.map((unit) => unit.role), ["task", "task"]);
  assert.equal(result.items[0].title, "解决登录问题");
  assert.deepEqual(result.items[0].sourceUnitIds, ["u1"]);
  assert.deepEqual(result.items[0].focusSteps, ["复现登录问题", "定位失败环节", "验证登录流程"]);
  assert.equal(result.items[1].title, "优化语音识别技术方案");
  assert.deepEqual(result.items[1].sourceUnitIds, ["u2"]);
  assert.deepEqual(result.items[1].focusSteps, ["梳理识别方案", "对比可选技术", "确定验证指标"]);
  assert.equal(getOrganizedResultSaveBlocker(result, "得把登录的问题解决了，还得优化语音识别的技术方案"), null);
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

test("organizeThoughtsWithAi accepts fenced JSON and common free-model field aliases", async () => {
  const result = await organizeThoughtsWithAi(
    "登录问题没有修好，作品集也需要整理",
    {
      aiClient: async () => [
        "```json",
        JSON.stringify({
          status: "organized",
          message: "其他想法都还在",
          input_mode: "spoken",
          semantic_units: [
            { id: "u1", text: "登录问题没有修好", role: "task", topic_hint: "登录" },
            { id: "u2", text: "作品集也需要整理", role: "task", topic_hint: "作品集" },
          ],
          tasks: [
            {
              id: "item_1",
              title: "修复登录问题",
              priority: "high",
              assign_to: "active",
              reason: "它会影响继续使用。",
              next_step: "打开登录页，复现一次失败流程。",
              focus_steps: ["打开登录页", "复现失败流程", "记录错误提示"],
              category: "product",
              energy: "medium",
            },
            {
              id: "item_2",
              title: "整理作品集",
              priority: "medium",
              assign_to: "parking",
              reason: "它可以稍后继续推进。",
              next_step: "列出作品集需要放进去的项目。",
              focus_steps: ["列出项目", "补齐截图", "整理说明"],
              category: "career",
              energy: "medium",
            },
          ],
          recommended_now: {
            item_id: "item_1",
            next_step: "打开登录页，复现一次失败流程。",
          },
          meta: {},
        }),
        "```",
      ].join("\n"),
    },
  );

  assert.equal(result.meta.modelBehavior, "ai");
  assert.equal(result.suggestion.title, "修复登录问题");
  assert.deepEqual(result.items.map((item) => item.sourceUnitIds), [["u1"], ["u2"]]);
  assert.deepEqual(result.coverageCheck.coveredUnitIds, ["u1", "u2"]);
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

test("normalizeAiResult removes spoken filler from visible AI fields while preserving source evidence", () => {
  const result = normalizeAiResult({
    status: "organized",
    inputMode: "spoken",
    semanticUnits: [
      { id: "u1", text: "就是那个登录问题没有修好", role: "task", topicHint: "登录" },
    ],
    items: [
      {
        id: "item_1",
        title: "就是那个登录问题",
        sourceUnitIds: ["u1"],
        mentions: ["就是那个登录问题没有修好"],
        priority: "medium",
        assignTo: "active",
        reason: "感觉这个比较清楚。",
        nextStep: "就是先打开登录页面。",
        focusSteps: ["那个复现登录问题", "这个确认报错位置"],
      },
    ],
    recommendedNow: { itemId: "item_1" },
    coverageCheck: { coveredUnitIds: ["u1"] },
    meta: { modelBehavior: "ai" },
  });

  assert.equal(result.suggestion.title, "登录问题");
  assert.equal(result.suggestion.reason, "比较清楚。");
  assert.equal(result.suggestion.nextStep, "先打开登录页面。");
  assert.deepEqual(result.suggestion.focusSteps, ["复现登录问题", "确认报错位置"]);
  assert.deepEqual(result.suggestion.mentions, ["就是那个登录问题没有修好"]);
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

test("organizeThoughtsWithAi backfills deadlines when AI omits dueAt", async () => {
  const result = await organizeThoughtsWithAi("老板说明天下午前要改方案，今晚交申请材料", {
    now: "2026-08-09T10:00:00+08:00",
    aiClient: async () => JSON.stringify({
      status: "success",
      semanticUnits: [
        { id: "u1", text: "老板说明天下午前要改方案", role: "task" },
        { id: "u2", text: "今晚交申请材料", role: "task" },
      ],
      items: [
        {
          id: "item_1",
          title: "修改方案",
          sourceUnitIds: ["u1"],
          priority: "high",
          assignTo: "active",
          reason: "老板要求",
          nextStep: "开始修改方案",
          focusSteps: ["开始修改方案", "制定计划"],
        },
        {
          id: "item_2",
          title: "提交申请材料",
          sourceUnitIds: ["u2"],
          priority: "high",
          assignTo: "active",
          reason: "今晚要交",
          nextStep: "准备申请材料",
          focusSteps: ["准备申请材料", "检查文件"],
        },
      ],
      recommendedNow: { itemId: "item_1" },
      coverageCheck: { coveredUnitIds: ["u1", "u2"], unmappedUnitIds: [] },
    }),
  });

  assert.equal(result.suggestions[0].dueAt, "2026-08-10T15:00:00+08:00");
  assert.equal(result.suggestions[0].timeHint, "明天");
  assert.equal(result.suggestions[0].nextStep, "打开方案文件，先标出要改的一处。");
  assert.equal(result.suggestions[1].dueAt, "2026-08-09T20:00:00+08:00");
  assert.equal(result.suggestions[1].timeHint, "今晚");
  assert.equal(result.suggestions[1].nextStep, "打开申请材料清单，先确认缺少哪一项。");
  assert.equal(getOrganizedResultSaveBlocker(result, "老板说明天下午前要改方案，今晚交申请材料"), null);
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
