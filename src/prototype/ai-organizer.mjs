import { organizeThoughts } from "./organizer.mjs";

const DEFAULT_MESSAGE = "其他想法都还在";
const DEFAULT_LABEL = "也许可以先看这个";
const DEFAULT_ACTIONS = ["看一下", "先不管"];
const DEFAULT_META = {
  modelBehavior: "ai",
  safetyLevel: "normal",
};
const PRESSURE_LANGUAGE_PATTERN = /必须|赶紧|立刻|拖太久|否则|应该早就/;
const TITLE_FILLER_PATTERN = /^(我想|我觉得|我需要|我得|我要|想要|想|然后|同时|顺便|就是|那个|这个|其实|感觉|有点|啊+|嗯+|呃+|额+)+/u;
const TITLE_TIME_PATTERN = /(今天|今晚|明天|后天|大后天|几小时后|几个小时后|[一二两三四五六七八九十0-9]+个?小时后|[一二两三四五六七八九十0-9]+天后|下周[一二三四五六日天]?|下个月|上午|中午|下午|晚上|早上|凌晨|今晚|明晚)/gu;

function toInputText(rawText) {
  return typeof rawText === "string" ? rawText : String(rawText ?? "");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeAssignTo(value) {
  return value === "parking" || value === "active" ? value : "active";
}

function normalizePriority(priority, fallback) {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }

  if (Number.isInteger(priority) && priority > 0) {
    return priority;
  }

  return fallback;
}

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags ?? "").split(/[,，、]/u);
  const seen = new Set();

  return values
    .map((tag) => String(tag ?? "").trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function normalizeTextArray(values) {
  if (hasText(values)) {
    return String(values)
      .split(/[，,、；;]/u)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value ?? "").trim()).filter(Boolean);
}

function normalizeSemanticUnits(units) {
  if (!Array.isArray(units)) {
    return [];
  }

  return units
    .filter(isObject)
    .map((unit, index) => ({
      id: hasText(unit.id) ? unit.id.trim() : `u${index + 1}`,
      text: hasText(unit.text) ? unit.text.trim() : "",
      role: hasText(unit.role) ? unit.role.trim() : "unknown",
      topicHint: hasText(unit.topicHint) ? unit.topicHint.trim() : null,
    }))
    .filter((unit) => unit.text);
}

function normalizeCoverageCheck(coverageCheck) {
  if (!isObject(coverageCheck)) {
    return {
      coveredUnitIds: [],
      unmappedUnitIds: [],
      possibleDuplicates: [],
      needsClarification: [],
    };
  }

  return {
    coveredUnitIds: normalizeTextArray(coverageCheck.coveredUnitIds),
    unmappedUnitIds: normalizeTextArray(coverageCheck.unmappedUnitIds),
    possibleDuplicates: normalizeTextArray(coverageCheck.possibleDuplicates),
    needsClarification: normalizeTextArray(coverageCheck.needsClarification),
  };
}

function cleanTaskTitle(title, timeHint, dueAt) {
  const cleaned = String(title ?? "")
    .replace(TITLE_FILLER_PATTERN, "")
    .replace(dueAt && hasText(timeHint) ? String(timeHint).trim() : "", "")
    .replace(dueAt ? TITLE_TIME_PATTERN : /$^/u, "")
    .replace(/^[，,。.\s、]+|[，,。.\s、]+$/gu, "")
    .trim();

  return cleaned || String(title ?? "").trim();
}

function fallback(rawText, fallbackOrganizer, reason) {
  return {
    ...fallbackOrganizer(rawText),
    meta: {
      modelBehavior: "fallback",
      fallbackReason: reason,
    },
  };
}

function parseAiJson(aiOutput) {
  if (typeof aiOutput === "string") {
    return JSON.parse(aiOutput);
  }

  return aiOutput;
}

function normalizeAiStatus(status) {
  if (status === "organized" || status === "empty") {
    return status;
  }

  if (status === "completed" || status === "complete" || status === "success") {
    return "organized";
  }

  return status;
}

function normalizeSuggestion(suggestion, index) {
  const timeHint = suggestion.timeHint ?? null;
  const dueAt = hasText(suggestion.dueAt) ? suggestion.dueAt.trim() : null;
  const title = cleanTaskTitle(suggestion.title, timeHint, dueAt);

  return {
    label: hasText(suggestion.label) ? suggestion.label : DEFAULT_LABEL,
    priority: normalizePriority(suggestion.priority, index + 1),
    title,
    reason: suggestion.reason,
    nextStep: suggestion.nextStep,
    focusSteps: suggestion.focusSteps,
    source: hasText(suggestion.source) ? suggestion.source : suggestion.title,
    category: hasText(suggestion.category) ? suggestion.category : "unknown",
    energy: hasText(suggestion.energy) ? suggestion.energy : "unknown",
    timeHint,
    assignTo: normalizeAssignTo(suggestion.assignTo),
    dueAt,
    tags: normalizeTags(suggestion.tags),
    isBigEvent: suggestion.isBigEvent === true,
    remindDaysBefore: Number.isInteger(suggestion.remindDaysBefore) && suggestion.remindDaysBefore >= 0
      ? suggestion.remindDaysBefore
      : null,
  };
}

function normalizeSemanticItem(item, index, recommendedNow) {
  const isRecommended = hasText(recommendedNow?.itemId) && recommendedNow.itemId === item.id;
  const timeHint = item.timeHint ?? null;
  const dueAt = hasText(item.dueAt) ? item.dueAt.trim() : null;
  const title = cleanTaskTitle(item.title, timeHint, dueAt);
  const nextStep = hasText(item.nextStep) ? item.nextStep : recommendedNow?.nextStep;
  const focusSteps = Array.isArray(item.focusSteps)
    ? item.focusSteps
    : normalizeTextArray(item.steps);
  const mentions = normalizeTextArray(item.mentions);
  const source = hasText(item.source)
    ? item.source.trim()
    : mentions.join("；") || title;

  return {
    label: hasText(item.label) ? item.label : DEFAULT_LABEL,
    id: hasText(item.id) ? item.id.trim() : `item_${index + 1}`,
    priority: normalizePriority(item.priority, index + 1),
    title,
    reason: hasText(item.reason) ? item.reason : recommendedNow?.reason,
    nextStep,
    focusSteps: focusSteps.length > 0 ? focusSteps : normalizeTextArray([nextStep]),
    source,
    category: hasText(item.category) ? item.category : hasText(item.type) ? item.type : "unknown",
    energy: hasText(item.energy) ? item.energy : "unknown",
    timeHint,
    assignTo: normalizeAssignTo(item.assignTo ?? (isRecommended ? "active" : "parking")),
    dueAt,
    tags: normalizeTags(item.tags),
    isBigEvent: item.isBigEvent === true,
    remindDaysBefore: Number.isInteger(item.remindDaysBefore) && item.remindDaysBefore >= 0
      ? item.remindDaysBefore
      : null,
    parentGoal: hasText(item.parentGoal) ? item.parentGoal.trim() : null,
    sourceUnitIds: normalizeTextArray(item.sourceUnitIds),
    mentions,
    type: hasText(item.type) ? item.type.trim() : "task",
    deliverables: normalizeTextArray(item.deliverables),
    dependsOn: normalizeTextArray(item.dependsOn),
    confidence: typeof item.confidence === "number" ? item.confidence : null,
    ambiguities: normalizeTextArray(item.ambiguities),
  };
}

function normalizeSavedItem(item) {
  if (typeof item === "string") {
    return {
      source: item,
      title: item,
      category: "unknown",
      priority: "low",
      assignTo: "parking",
      reasonParked: "先安全放着。",
      dueAt: null,
      timeHint: null,
      tags: [],
      isBigEvent: false,
      remindDaysBefore: null,
    };
  }

  const timeHint = item.timeHint ?? null;
  const dueAt = hasText(item.dueAt) ? item.dueAt.trim() : null;
  const title = hasText(item.title)
    ? cleanTaskTitle(item.title, timeHint, dueAt)
    : cleanTaskTitle(item.source, timeHint, dueAt);

  return {
    source: hasText(item.source) ? item.source : "",
    title,
    category: hasText(item.category) ? item.category : "unknown",
    priority: normalizePriority(item.priority, "low"),
    assignTo: normalizeAssignTo(item.assignTo) === "active" ? "active" : "parking",
    reasonParked: hasText(item.reasonParked) ? item.reasonParked : "先安全放着。",
    dueAt,
    timeHint,
    tags: normalizeTags(item.tags),
    isBigEvent: item.isBigEvent === true,
    remindDaysBefore: Number.isInteger(item.remindDaysBefore) && item.remindDaysBefore >= 0
      ? item.remindDaysBefore
      : null,
  };
}

function normalizeSavedItemFromSuggestion(suggestion) {
  return {
    ...suggestion,
    assignTo: "parking",
    reasonParked: suggestion.reasonParked || suggestion.parkingReason || "先安全放着。",
  };
}

function containsPressureLanguage(value) {
  if (typeof value === "string") {
    return PRESSURE_LANGUAGE_PATTERN.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(containsPressureLanguage);
  }

  if (isObject(value)) {
    return Object.values(value).some(containsPressureLanguage);
  }

  return false;
}

function isComplexInput(rawText) {
  const inputText = toInputText(rawText).trim();
  const priorityMatches = inputText.match(/\bP[0-2]\b/gu) ?? [];
  const lineCount = inputText.split(/\n+/u).filter((line) => line.trim()).length;

  return inputText.length > 120 || lineCount >= 3 || priorityMatches.length >= 2;
}

function shouldUseLocalFast(rawText) {
  const inputText = toInputText(rawText).trim();

  if (!inputText || isComplexInput(inputText)) {
    return false;
  }

  return !/\bP[0-2]\b/u.test(inputText);
}

function localFast(rawText, fallbackOrganizer) {
  return {
    ...fallbackOrganizer(rawText),
    meta: {
      modelBehavior: "local_fast",
    },
  };
}

function hasGenericNextStep(result) {
  const displayItems = Array.isArray(result.suggestions) ? result.suggestions : [];
  const genericPattern = /^(开始|处理|整理|学习|准备|完成|推进|制定计划|规划|研究|分析|先把这件事写成|把这件事改写成)/u;

  return displayItems.some((item) => genericPattern.test(String(item.nextStep ?? "").trim()));
}

function canUseLocalFastResult(rawText, fallbackOrganizer) {
  const result = fallbackOrganizer(rawText);
  return result.status === "organized" && !hasGenericNextStep(result);
}

function splitPlanningUnits(rawText) {
  return toInputText(rawText)
    .replace(/\s+(?=P[0-2]\s)/gu, "\n")
    .split(/\n+/u)
    .map((unit) => unit.trim())
    .filter(Boolean);
}

function getPlanningGroupKey(text) {
  if (/岗位|外企|投递|检索|关键词|平台|城市|远程|筛选|提醒/u.test(text)) {
    return "job_search";
  }

  if (/自我介绍|项目经历|Inspector|Designer|AI Agent|项目定稿|项目口径/u.test(text)) {
    return "interview_assets";
  }

  if (/长期|短期|职业方向|行动表|路径|方向地图/u.test(text)) {
    return "career_path";
  }

  if (/面试准备|JD|项目映射|高频问答|速练|skill|模板化/u.test(text)) {
    return "interview_skill";
  }

  if (/MindFlow|MVP/u.test(text)) {
    return "mindflow_mvp";
  }

  if (/Dify/u.test(text)) {
    return "dify_case";
  }

  return "other";
}

const PLANNING_GROUPS = {
  interview_assets: {
    title: "稳定版自我介绍和项目口径",
    parentGoal: "面试核心资产定稿",
    type: "deliverable",
    tags: ["面试", "项目口径"],
    deliverables: ["1 分钟自我介绍", "3 分钟自我介绍", "Inspector / Designer / AI Agent 项目口径"],
    nextStep: "新建面试资产文档，先写 1 分钟自我介绍的 5 句骨架。",
    focusSteps: ["新建面试资产文档", "写 5 句自我介绍骨架", "列出 3 个项目口径标题"],
    reason: "它是 P0，会直接影响后续面试表达。",
  },
  career_path: {
    title: "长期职业方向地图和短期行动表",
    parentGoal: "职业路径决策",
    type: "planning",
    tags: ["职业路径", "行动表"],
    deliverables: ["长期职业方向地图", "2-4 周行动表"],
    nextStep: "新建职业路径文档，写下 3 个长期方向候选。",
    focusSteps: ["新建职业路径文档", "写 3 个长期方向候选", "补一列 2-4 周验证动作"],
    reason: "它是 P0，可以帮后面的岗位和作品集选择收敛。",
  },
  interview_skill: {
    title: "面试准备 skill 模板化",
    parentGoal: "面试准备系统",
    type: "system",
    tags: ["面试准备", "skill"],
    deliverables: ["JD 分析模板", "项目映射模板", "高频问答模板", "速练材料模板"],
    nextStep: "打开 skill 模板文档，列出 JD 分析、项目映射、问答、速练 4 个模块。",
    focusSteps: ["打开 skill 模板文档", "列 4 个模块名", "给每个模块写一行输入输出"],
    reason: "它能把后续面试准备流程复用起来。",
  },
  job_search: {
    title: "外企岗位检索和投递系统",
    parentGoal: "求职管道搭建",
    type: "job_search",
    tags: ["外企岗位", "岗位检索"],
    deliverables: ["岗位清单", "JD 关键词", "匹配度字段", "投递优先级", "检索提醒机制"],
    nextStep: "新建岗位表，先填平台、岗位名、JD 关键词、匹配度 4 列。",
    focusSteps: ["新建岗位表", "填 4 个基础字段", "先放入 3 个候选岗位"],
    reason: "它把找岗位和提醒机制合并成一个系统，避免散成很多小待办。",
  },
  mindflow_mvp: {
    title: "MindFlow MVP",
    parentGoal: "AI PM 作品集展示",
    type: "build",
    tags: ["MindFlow", "MVP"],
    deliverables: ["可实际应用的 MindFlow MVP"],
    nextStep: "打开 MindFlow MVP 文档，写下今天要保住的一条核心流程。",
    focusSteps: ["打开 MVP 文档", "写一条核心流程", "标出当前缺口"],
    reason: "它是可展示作品，但可以先保住一个核心闭环。",
  },
  dify_case: {
    title: "Dify 展示案例",
    parentGoal: "AI 工具学习展示",
    type: "learning",
    tags: ["Dify", "展示案例"],
    deliverables: ["Dify 小案例", "步骤记录"],
    nextStep: "选一个 Dify 展示案例主题，并写下输入、流程、输出三栏。",
    focusSteps: ["选案例主题", "写输入/流程/输出三栏", "记录第一步操作"],
    reason: "它是 P1 展示资产，可以先保存为一个小案例。",
  },
  other: {
    title: "其他待整理事项",
    parentGoal: "待澄清想法",
    type: "task",
    tags: ["待整理"],
    deliverables: [],
    nextStep: "把这件事改写成一句更清楚的任务名。",
    focusSteps: ["改写任务名", "圈出一个动词", "写下第一步"],
    reason: "它还需要再澄清一下。",
  },
};

function createLocalSemanticFastResult(rawText) {
  const units = splitPlanningUnits(rawText);
  const semanticUnits = units.map((text, index) => ({
    id: `u${index + 1}`,
    text,
    role: "task",
    topicHint: PLANNING_GROUPS[getPlanningGroupKey(text)].title,
  }));
  const groupMap = new Map();

  semanticUnits.forEach((unit) => {
    const key = getPlanningGroupKey(unit.text);
    const group = groupMap.get(key) ?? [];
    group.push(unit);
    groupMap.set(key, group);
  });

  const groupOrder = ["interview_assets", "career_path", "interview_skill", "job_search", "mindflow_mvp", "dify_case", "other"];
  const items = groupOrder
    .filter((key) => groupMap.has(key))
    .map((key, index) => {
      const config = PLANNING_GROUPS[key];
      const groupUnits = groupMap.get(key);
      const isHigh = groupUnits.some((unit) => /\bP0\b/u.test(unit.text));

      return {
        id: `item_${index + 1}`,
        title: config.title,
        parentGoal: config.parentGoal,
        sourceUnitIds: groupUnits.map((unit) => unit.id),
        mentions: groupUnits.map((unit) => unit.text),
        type: config.type,
        priority: isHigh ? "high" : "medium",
        assignTo: isHigh ? "active" : "parking",
        reason: config.reason,
        nextStep: config.nextStep,
        focusSteps: config.focusSteps,
        deliverables: config.deliverables,
        dependsOn: [],
        category: "task",
        energy: isHigh ? "medium" : "low",
        timeHint: null,
        dueAt: null,
        tags: config.tags,
        isBigEvent: true,
        remindDaysBefore: null,
        confidence: 0.8,
        ambiguities: [],
      };
    });

  const normalized = normalizeAiResult({
    status: "organized",
    message: DEFAULT_MESSAGE,
    inputMode: "structured_list",
    semanticUnits,
    items,
    recommendedNow: {
      itemId: items[0]?.id,
      title: items[0]?.title,
      reason: items[0]?.reason,
      nextStep: items[0]?.nextStep,
    },
    coverageCheck: {
      coveredUnitIds: semanticUnits.map((unit) => unit.id),
      unmappedUnitIds: [],
      possibleDuplicates: [],
      needsClarification: [],
    },
    meta: {},
  });

  return {
    ...normalized,
    meta: {
      modelBehavior: "local_semantic_fast",
    },
  };
}

function shouldUseLocalSemanticFast(rawText) {
  const units = splitPlanningUnits(rawText);
  const priorityCount = (toInputText(rawText).match(/\bP[0-2]\b/gu) ?? []).length;

  return units.length >= 3 && priorityCount >= 2;
}

function hasSemanticEvidence(result) {
  const semanticUnits = Array.isArray(result.semanticUnits) ? result.semanticUnits : [];
  const items = Array.isArray(result.items) ? result.items : [];
  const coverageCheck = result.coverageCheck;

  return (
    semanticUnits.length > 0 &&
    items.length > 0 &&
    items.every((item) => Array.isArray(item.sourceUnitIds) && item.sourceUnitIds.length > 0) &&
    isObject(coverageCheck) &&
    Array.isArray(coverageCheck.coveredUnitIds)
  );
}

export function getOrganizedResultSaveBlocker(result, rawText) {
  if (!isObject(result) || result.status !== "organized") {
    return "not_organized";
  }

  if (result.meta?.modelBehavior === "fallback") {
    return "fallback_result";
  }

  const displayItems = Array.isArray(result.suggestions) ? result.suggestions : [];
  const activeItems = displayItems.filter((item) => item.assignTo !== "parking");

  if (displayItems.length > 7 || activeItems.length > 3) {
    return "over_split";
  }

  if (hasGenericNextStep(result)) {
    return "generic_next_step";
  }

  if (isComplexInput(rawText) && !hasSemanticEvidence(result)) {
    return "missing_semantic_evidence";
  }

  return null;
}

function validateSemanticResult(result) {
  if (!Array.isArray(result.items) || result.items.length === 0) {
    return { valid: false, reason: "missing_core_fields" };
  }

  for (const item of result.items) {
    if (!isObject(item)) {
      return { valid: false, reason: "missing_core_fields" };
    }

    if (!Array.isArray(item.sourceUnitIds) || item.sourceUnitIds.length === 0) {
      return { valid: false, reason: "missing_source_evidence" };
    }

    if (
      !hasText(item.title) ||
      !hasText(item.nextStep) ||
      !Array.isArray(item.focusSteps) ||
      item.focusSteps.length === 0
    ) {
      return { valid: false, reason: "missing_core_fields" };
    }
  }

  if (!isObject(result.coverageCheck) || !Array.isArray(result.coverageCheck.coveredUnitIds)) {
    return { valid: false, reason: "missing_coverage_check" };
  }

  if (isObject(result.recommendedNow)) {
    const recommendedItemId = result.recommendedNow.itemId;
    if (hasText(recommendedItemId) && !result.items.some((item) => item.id === recommendedItemId)) {
      return { valid: false, reason: "missing_core_fields" };
    }
  }

  return { valid: true };
}

export function validateAiResult(result, rawText) {
  const trimmed = toInputText(rawText).trim();

  if (!isObject(result)) {
    return { valid: false, reason: "missing_core_fields" };
  }

  const status = normalizeAiStatus(result.status);

  if (status !== "organized" && status !== "empty") {
    return { valid: false, reason: "missing_core_fields" };
  }

  if (!trimmed) {
    return { valid: true };
  }

  if (containsPressureLanguage(result)) {
    return { valid: false, reason: "pressure_language" };
  }

  if (Array.isArray(result.items)) {
    return validateSemanticResult(result);
  }

  if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
    return { valid: false, reason: "missing_core_fields" };
  }

  const firstSuggestion = result.suggestions[0];

  if (
    !isObject(firstSuggestion) ||
    !hasText(firstSuggestion.title) ||
    !hasText(firstSuggestion.reason) ||
    !hasText(firstSuggestion.nextStep) ||
    !Array.isArray(firstSuggestion.focusSteps) ||
    firstSuggestion.focusSteps.length === 0
  ) {
    return { valid: false, reason: "missing_core_fields" };
  }

  return { valid: true };
}

export function normalizeAiResult(result) {
  const semanticUnits = normalizeSemanticUnits(result.semanticUnits);
  const coverageCheck = normalizeCoverageCheck(result.coverageCheck);
  const semanticItems = Array.isArray(result.items)
    ? result.items.map((item, index) => normalizeSemanticItem(item, index, result.recommendedNow))
    : [];
  const recommendedItemId = result.recommendedNow?.itemId;
  const orderedSemanticItems = semanticItems.length > 0
    ? [
      ...semanticItems.filter((item) => item.id === recommendedItemId),
      ...semanticItems.filter((item) => item.id !== recommendedItemId),
    ]
    : [];
  const suggestions = orderedSemanticItems.length > 0
    ? orderedSemanticItems
    : Array.isArray(result.suggestions)
      ? result.suggestions.map(normalizeSuggestion)
      : [];
  const savedItems = Array.isArray(result.savedItems)
    ? result.savedItems.map(normalizeSavedItem)
    : suggestions
      .filter((suggestion, index) => index > 0 && suggestion.assignTo === "parking")
      .map(normalizeSavedItemFromSuggestion);

  return {
    status: normalizeAiStatus(result.status),
    message: hasText(result.message) ? result.message : DEFAULT_MESSAGE,
    inputMode: hasText(result.inputMode) ? result.inputMode : null,
    semanticUnits,
    items: orderedSemanticItems,
    coverageCheck,
    suggestion: suggestions[0] ?? null,
    suggestions,
    savedItems,
    actions: DEFAULT_ACTIONS,
    meta: {
      ...DEFAULT_META,
      ...(isObject(result.meta) ? result.meta : {}),
      modelBehavior: "ai",
    },
  };
}

export async function organizeThoughtsWithAi(rawText, options = {}) {
  const inputText = toInputText(rawText);
  const aiClient = options.aiClient ?? mockAiClient;
  const fallbackOrganizer = options.fallbackOrganizer ?? organizeThoughts;

  if (
    options.preferLocalFast === true &&
    shouldUseLocalFast(inputText) &&
    canUseLocalFastResult(inputText, fallbackOrganizer)
  ) {
    return localFast(inputText, fallbackOrganizer);
  }

  if (options.preferLocalFast === true && shouldUseLocalSemanticFast(inputText)) {
    return createLocalSemanticFastResult(inputText);
  }

  let aiOutput;
  let parsedResult;

  try {
    aiOutput = await aiClient({ rawText: inputText });
  } catch {
    return fallback(inputText, fallbackOrganizer, "ai_failure");
  }

  try {
    parsedResult = parseAiJson(aiOutput);
  } catch {
    return fallback(inputText, fallbackOrganizer, "invalid_json");
  }

  const validation = validateAiResult(parsedResult, inputText);

  if (!validation.valid) {
    return fallback(inputText, fallbackOrganizer, validation.reason);
  }

  return normalizeAiResult(parsedResult);
}

export async function mockAiClient({ rawText }) {
  const localResult = organizeThoughts(rawText);

  if (localResult.status === "empty") {
    return JSON.stringify({
      status: "empty",
      message: localResult.message,
      suggestions: [],
      savedItems: [],
      meta: DEFAULT_META,
    });
  }

  return JSON.stringify({
    status: "organized",
    message: localResult.message,
    suggestions: localResult.suggestions.map((suggestion) => ({
      ...suggestion,
      category: "task",
      energy: "low",
      timeHint: null,
    })),
    savedItems: localResult.savedItems.map(normalizeSavedItem),
    meta: DEFAULT_META,
  });
}
