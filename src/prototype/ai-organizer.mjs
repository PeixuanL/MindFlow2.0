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
const DISPLAY_FILLER_PATTERN = /(?:我感觉|我觉得|我想|我需要|我得|我要|想要|就是|那个|这个|其实|感觉|有点|啊+|嗯+|呃+|额+)/gu;
const TITLE_TIME_PATTERN = /(今天|今晚|明天|后天|大后天|几小时后|几个小时后|[一二两三四五六七八九十0-9]+个?小时后|[一二两三四五六七八九十0-9]+天后|下周[一二三四五六日天]?|下个月|上午|中午|下午|晚上|早上|凌晨|今晚|明晚)/gu;
const LOCAL_SEMANTIC_MAX_ITEMS = 5;
const LOCAL_PROMPT_STRATEGY = "mindflow_system_prompt_local_rules_v1";
const LOCAL_SPEECH_FILLER_PATTERN = /(?:我感觉|感觉|其实|就是|那个|这个|有点|一些|现在|今天|昨天|刚才|以及|然后|同时|顺便)/gu;
const LOCAL_CONTEXT_ONLY_PATTERN = /(部署到Vercel之后|部署.*之后$|解决方案.*昨天.*拆解|昨天.*拆解|跑得挺好|跑得挺好的|连着.*模型)/u;
const LOCAL_TASK_SIGNAL_PATTERN = /(问题|歧义|歧词|过滤|没.*过滤|没有.*过滤|并没有|不生效|不能|不会|失败|异常|出错|bug|修|改|优化|要|需要|得|勾选|划线|同步|完成|整理|准备|学习|投递|检索|设置|约|回复|自测|测试|拆成步骤|模型.*慢|牙医|保险|消息没回|没回|房间|作品集|论文材料|找工作|求职|体检报告|账单|厨房|方案|快递|护照|过期|水电费|没交|桌面|面试|简历|自我介绍|练|冰箱|垃圾|衣服|本地登录|整理速度|提交|客厅|杯子|水果|验证码|医院预约|论文摘要|申请材料|推荐信|作品集链接|洗衣液|物业|通知|发出去|发给|提醒|检查|记得|顺路|买|洗|晾|扔|拿|取)/iu;

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
    .replace(DISPLAY_FILLER_PATTERN, "")
    .replace(dueAt && hasText(timeHint) ? String(timeHint).trim() : "", "")
    .replace(dueAt ? TITLE_TIME_PATTERN : /$^/u, "")
    .replace(/^[，,。.\s、]+|[，,。.\s、]+$/gu, "")
    .trim();

  return cleaned || String(title ?? "").trim();
}

function cleanDisplayText(text) {
  const cleaned = String(text ?? "")
    .replace(DISPLAY_FILLER_PATTERN, "")
    .replace(/\s{2,}/gu, " ")
    .replace(/^[，,\s、；;]+|[，,\s、；;]+$/gu, "")
    .trim();

  return cleaned || String(text ?? "").trim();
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
    const trimmed = aiOutput.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
    const jsonText = fenced?.[1]?.trim() ?? trimmed;
    return JSON.parse(jsonText);
  }

  return aiOutput;
}

function firstObject(...values) {
  return values.find(isObject);
}

function firstArray(...values) {
  return values.find(Array.isArray);
}

function coerceTextArray(value) {
  return Array.isArray(value) ? value : normalizeTextArray(value);
}

function toComparableText(value) {
  return cleanDisplayText(value)
    .replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, "")
    .toLocaleLowerCase();
}

function getBigrams(value) {
  const text = toComparableText(value);
  const bigrams = new Set();

  for (let index = 0; index < text.length - 1; index += 1) {
    bigrams.add(text.slice(index, index + 2));
  }

  return bigrams;
}

function hasMeaningfulTextOverlap(left, right) {
  const leftText = toComparableText(left);
  const rightText = toComparableText(right);

  if (leftText.length < 2 || rightText.length < 2) {
    return false;
  }

  if (leftText.includes(rightText) || rightText.includes(leftText)) {
    return true;
  }

  const leftBigrams = getBigrams(leftText);
  const rightBigrams = getBigrams(rightText);
  let shared = 0;

  for (const bigram of leftBigrams) {
    if (rightBigrams.has(bigram)) {
      shared += 1;
    }
  }

  return shared >= (Math.min(leftText.length, rightText.length) <= 4 ? 1 : 2);
}

function coerceSemanticUnit(unit, index) {
  if (!isObject(unit)) {
    return unit;
  }

  return {
    ...unit,
    id: unit.id ?? unit.unitId ?? unit.unit_id ?? `u${index + 1}`,
    text: unit.text ?? unit.content ?? unit.sourceText ?? unit.source_text,
    topicHint: unit.topicHint ?? unit.topic_hint ?? unit.topic,
  };
}

function coerceSemanticItem(item, index, semanticUnits, itemCount) {
  if (!isObject(item)) {
    return item;
  }

  const sourceUnitIds = firstArray(
    item.sourceUnitIds,
    item.source_unit_ids,
    item.semanticUnitIds,
    item.semantic_unit_ids,
    item.unitIds,
    item.unit_ids,
  );
  const mentions = coerceTextArray(item.mentions ?? item.sources ?? item.sourceTexts ?? item.source_texts ?? item.source);
  const coerced = {
    ...item,
    id: item.id ?? item.itemId ?? item.item_id ?? `item_${index + 1}`,
    parentGoal: item.parentGoal ?? item.parent_goal,
    sourceUnitIds,
    mentions,
    nextStep: item.nextStep ?? item.next_step,
    focusSteps: item.focusSteps ?? item.focus_steps ?? item.steps,
    assignTo: item.assignTo ?? item.assign_to,
    timeHint: item.timeHint ?? item.time_hint,
    dueAt: item.dueAt ?? item.due_at,
    isBigEvent: item.isBigEvent ?? item.is_big_event,
    remindDaysBefore: item.remindDaysBefore ?? item.remind_days_before,
    dependsOn: item.dependsOn ?? item.depends_on,
  };

  if (Array.isArray(coerced.sourceUnitIds) && coerced.sourceUnitIds.length > 0) {
    return coerced;
  }

  const evidenceTexts = [
    coerced.title,
    coerced.source,
    coerced.nextStep,
    ...mentions,
  ].filter(hasText);
  const nonFillerUnits = semanticUnits.filter((unit) => unit.role !== "filler");
  const matchedUnitIds = nonFillerUnits
    .filter((unit) => evidenceTexts.some((text) => hasMeaningfulTextOverlap(text, unit.text)))
    .map((unit) => unit.id);

  if (matchedUnitIds.length > 0) {
    return {
      ...coerced,
      sourceUnitIds: matchedUnitIds,
    };
  }

  if (itemCount === 1 && nonFillerUnits.length > 0) {
    return {
      ...coerced,
      sourceUnitIds: nonFillerUnits.map((unit) => unit.id),
    };
  }

  if (nonFillerUnits[index]) {
    return {
      ...coerced,
      sourceUnitIds: [nonFillerUnits[index].id],
    };
  }

  return coerced;
}

function coerceCoverageCheck(coverageCheck, items, semanticUnits) {
  const existing = firstObject(coverageCheck);
  const coveredUnitIds = normalizeTextArray(
    existing?.coveredUnitIds ?? existing?.covered_unit_ids ?? existing?.covered,
  );
  const inferredCoveredUnitIds = items.flatMap((item) => normalizeTextArray(item.sourceUnitIds));
  const covered = coveredUnitIds.length > 0
    ? coveredUnitIds
    : [...new Set(inferredCoveredUnitIds)];
  const nonFillerIds = semanticUnits.filter((unit) => unit.role !== "filler").map((unit) => unit.id);

  return {
    ...existing,
    coveredUnitIds: covered,
    unmappedUnitIds: normalizeTextArray(
      existing?.unmappedUnitIds ??
        existing?.unmapped_unit_ids ??
        nonFillerIds.filter((id) => !covered.includes(id)),
    ),
    possibleDuplicates: normalizeTextArray(existing?.possibleDuplicates ?? existing?.possible_duplicates),
    needsClarification: normalizeTextArray(existing?.needsClarification ?? existing?.needs_clarification),
  };
}

function coerceRecommendedNow(recommendedNow) {
  if (!isObject(recommendedNow)) {
    return recommendedNow;
  }

  return {
    ...recommendedNow,
    itemId: recommendedNow.itemId ?? recommendedNow.item_id ?? recommendedNow.id,
    nextStep: recommendedNow.nextStep ?? recommendedNow.next_step,
  };
}

function coerceAiResultShape(result) {
  const root = firstObject(result?.result, result?.output, result?.data, result) ?? result;
  if (!isObject(root)) {
    return root;
  }

  const semanticUnits = firstArray(root.semanticUnits, root.semantic_units, root.units)
    ?.map(coerceSemanticUnit) ?? [];
  const itemValues = firstArray(root.items, root.tasks, root.taskItems, root.task_items, root.actionItems, root.action_items);
  const items = Array.isArray(itemValues)
    ? itemValues.map((item, index) => coerceSemanticItem(item, index, semanticUnits, itemValues.length))
    : itemValues;

  return {
    ...root,
    inputMode: root.inputMode ?? root.input_mode,
    semanticUnits,
    items,
    recommendedNow: coerceRecommendedNow(root.recommendedNow ?? root.recommended_now ?? root.recommendation),
    coverageCheck: coerceCoverageCheck(root.coverageCheck ?? root.coverage_check ?? root.coverage, items ?? [], semanticUnits),
  };
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
    reason: hasText(suggestion.reason) ? cleanDisplayText(suggestion.reason) : suggestion.reason,
    nextStep: hasText(suggestion.nextStep) ? cleanDisplayText(suggestion.nextStep) : suggestion.nextStep,
    focusSteps: normalizeTextArray(suggestion.focusSteps).map(cleanDisplayText),
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
  const nextStep = hasText(item.nextStep) ? cleanDisplayText(item.nextStep) : cleanDisplayText(recommendedNow?.nextStep);
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
    reason: hasText(item.reason) ? cleanDisplayText(item.reason) : cleanDisplayText(recommendedNow?.reason),
    nextStep,
    focusSteps: (focusSteps.length > 0 ? normalizeTextArray(focusSteps) : normalizeTextArray([nextStep])).map(cleanDisplayText),
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

function cleanLocalUnit(text) {
  return String(text ?? "")
    .replace(/^\s*(?:[-*•]|\d+[.、)]|P[0-2]\s*)\s*/u, "")
    .replace(TITLE_FILLER_PATTERN, "")
    .replace(/^我感觉/u, "")
    .replace(/歧词/gu, "歧义词")
    .replace(/^[，,。.\s、；;]+|[，,。.\s、；;]+$/gu, "")
    .trim();
}

function stripLocalSpeechFillers(text) {
  return cleanLocalUnit(text)
    .replace(LOCAL_SPEECH_FILLER_PATTERN, "")
    .replace(/[，,。.\s、；;]+/gu, " ")
    .trim();
}

function getLocalSemanticUnitRole(text) {
  const cleaned = cleanLocalUnit(text);
  const signalText = stripLocalSpeechFillers(cleaned);

  if (!signalText) {
    return "filler";
  }

  if (LOCAL_CONTEXT_ONLY_PATTERN.test(cleaned) && !/(问题|歧义|歧词|过滤|没有|并没有|不生效|不能|失败|异常|出错|bug)/iu.test(cleaned)) {
    return "context";
  }

  if (/朋友.*要来/u.test(cleaned)) {
    return "context";
  }

  return LOCAL_TASK_SIGNAL_PATTERN.test(cleaned) ? "task" : "context";
}

function splitLocalSemanticUnits(rawText) {
  const inputText = toInputText(rawText)
    .replace(/\r\n?/gu, "\n")
    .replace(/\s+(?=(?:P[0-2]\b|[-*•]|\d+[.、)]))/gu, "\n")
    .trim();

  if (!inputText) {
    return [];
  }

  return inputText
    .replace(/(?:然后|同时|顺便|以及)(?=\S)/gu, "\n")
    .split(/[\n。；;]+|[，,](?=\S)/u)
    .map(cleanLocalUnit)
    .filter(Boolean)
    .slice(0, 12);
}

function shouldGroupLocalUnits(units) {
  const combined = units.join("，");

  if (units.length <= 1) {
    return true;
  }

  if (/找工作|求职|投简历|投递/u.test(combined) && /简历|作品集|面试/u.test(combined)) {
    return true;
  }

  if (/面试/u.test(combined) && /简历|作品集|自我介绍/u.test(combined)) {
    return true;
  }

  if (units.length <= 3 && units.every((unit) => /语义|拆解|理解|过滤|歧义|歧词/u.test(unit))) {
    return true;
  }

  if (units.length === 2) {
    return /^(然后|再|并且|以及|同时|完成后|保存后|改完|勾完|选完|这一条|这个|这个按钮|它|这版)/u.test(units[1]);
  }

  return units.length <= 3 && units.some((unit) => /同一|这一条|按钮|卡片|代办|状态|标题/u.test(unit));
}

function extractKeywordTitle(text) {
  const cleaned = cleanLocalUnit(text)
    .replace(/(好像|确实|现在|需要|能够|可以|应该|不能|没有|并没有|真正的|进行|生效|保存|线上|完成|改动|修改|帮我|请你|解决|问题|这件事情|这条|那个事)/gu, "")
    .replace(/[的了着吧吗呢啊]/gu, "")
    .replace(/\s+/gu, " ")
    .replace(/^[，,。.\s、；;]+|[，,。.\s、；;]+$/gu, "")
    .trim();

  return cleaned || cleanLocalUnit(text);
}

function createLocalSemanticTitle(units) {
  const combined = units.join("，");

  if (/登录/u.test(combined) && /问题|解决|修|不生效|失败|异常|出错|bug/u.test(combined)) {
    return "解决登录问题";
  }

  if (/MindFlow/u.test(combined) && /本地登录/u.test(combined) && /测|测试|自测/u.test(combined)) {
    return "自测 MindFlow 本地登录";
  }

  if (/登录/u.test(combined) && /自测|测试|验证/u.test(combined)) {
    return "自测登录流程";
  }

  if (/语音识别/u.test(combined) && /优化|技术方案|方案/u.test(combined)) {
    return "优化语音识别技术方案";
  }

  if (/找工作|求职|投简历|投递/u.test(combined) && /简历|作品集|面试/u.test(combined)) {
    return "求职准备";
  }

  if (/面试/u.test(combined) && /简历|作品集|自我介绍/u.test(combined)) {
    return "面试准备";
  }

  if (/体检报告/u.test(combined) && /发|发送|给/u.test(combined)) {
    return "发送体检报告";
  }

  if (/信用卡|账单/u.test(combined) && /看|查看|确认/u.test(combined)) {
    return "查看信用卡账单";
  }

  if (/厨房/u.test(combined) && /收拾|整理|收/u.test(combined)) {
    return "收拾厨房";
  }

  if (/方案/u.test(combined) && /改|修改|再改/u.test(combined)) {
    return "修改方案";
  }

  if (/小陈/u.test(combined) && /消息|回复|没回|回/u.test(combined)) {
    return "回复小陈消息";
  }

  if (/快递/u.test(combined) && /取|拿|没去/u.test(combined)) {
    return "取快递";
  }

  if (/护照/u.test(combined) && /过期|更新|快/u.test(combined)) {
    return "更新护照";
  }

  if (/水电费/u.test(combined) && /交|没交|缴/u.test(combined)) {
    return "缴水电费";
  }

  if (/电脑桌面|桌面/u.test(combined) && /乱|整理|收拾/u.test(combined)) {
    return "整理电脑桌面";
  }

  if (/冰箱|菜|食材/u.test(combined) && /处理/u.test(combined)) {
    return "处理冰箱食材";
  }

  if (/垃圾/u.test(combined) && /扔|倒|该/u.test(combined)) {
    return "扔垃圾";
  }

  if (/衣服/u.test(combined) && /晾|没晾/u.test(combined)) {
    return "晾衣服";
  }

  if (/整理速度/u.test(combined) && /看|检查/u.test(combined)) {
    return "检查整理速度";
  }

  if (/改动/u.test(combined) && /提交/u.test(combined)) {
    return "提交改动";
  }

  if (/客厅/u.test(combined) && /收|收拾|整理/u.test(combined)) {
    return "收拾客厅";
  }

  if (/杯子/u.test(combined) && /洗/u.test(combined)) {
    return "洗杯子";
  }

  if (/水果/u.test(combined) && /买/u.test(combined)) {
    return "买水果";
  }

  if (/银行卡/u.test(combined) && /验证码/u.test(combined)) {
    return "处理银行卡验证码";
  }

  if (/医院预约/u.test(combined) && /确认|还没/u.test(combined)) {
    return "确认医院预约";
  }

  if (/论文摘要/u.test(combined) && /差|改|修改/u.test(combined)) {
    return "修改论文摘要";
  }

  if (/申请材料/u.test(combined) && /发|发送|发出去/u.test(combined)) {
    return "发送申请材料";
  }

  if (/推荐信/u.test(combined) && /提醒|老师/u.test(combined)) {
    return "提醒老师推荐信";
  }

  if (/作品集链接/u.test(combined) && /检查|确认/u.test(combined)) {
    return "检查作品集链接";
  }

  if (/洗衣液/u.test(combined) && /买/u.test(combined)) {
    return "买洗衣液";
  }

  if (/物业|通知/u.test(combined) && /看|查看/u.test(combined)) {
    return "查看物业通知";
  }

  if (/牙医/u.test(combined) && /约|预约|没约/u.test(combined)) {
    return "预约牙医";
  }

  if (/房间/u.test(combined) && /整理|收拾/u.test(combined)) {
    return "整理房间";
  }

  if (/保险/u.test(combined) && /(看|查看|确认|事|事项)/u.test(combined)) {
    return "查看保险事项";
  }

  if (/小王/u.test(combined) && /消息|回复|没回|回/u.test(combined)) {
    return "回复小王消息";
  }

  if (/论文/u.test(combined) && /材料/u.test(combined)) {
    return "整理论文材料";
  }

  if (/作品集/u.test(combined) && /整理|计划|拆/u.test(combined)) {
    return "整理作品集";
  }

  if (/本地模型|模型/u.test(combined) && /慢|耗时|速度/u.test(combined)) {
    return "排查本地模型整理耗时";
  }

  if (/语义|拆解|理解/u.test(combined) && /歧义|歧词|过滤/u.test(combined)) {
    return "过滤语义歧义词";
  }

  if (/积分|勾选|完成|划线|删除线/u.test(combined) && /代办|todo|步骤|小步骤/u.test(combined)) {
    return "积分代办完成勾选";
  }

  if (/active|Active/u.test(combined) && /标题|拆分|代办|步骤|同步|生效/u.test(combined)) {
    return "同步 Active 卡片标题和拆分待办";
  }

  if (/parking|Parking/u.test(combined) && /active|Active/u.test(combined) && /按钮|恢复|文案|名字/u.test(combined)) {
    return "修改 Parking 移到 Active 按钮文案";
  }

  const title = extractKeywordTitle(combined)
    .replace(/^(以及|然后|再|同时|顺便)/u, "")
    .trim();

  return title.length > 24 ? `${title.slice(0, 24)}...` : title;
}

function createLocalSemanticFocusSteps(title, units) {
  const combined = units.join("，");

  if (title === "解决登录问题" || (/登录/u.test(combined) && /问题|解决|修|不生效|失败|异常|出错|bug/u.test(combined))) {
    return ["复现登录问题", "定位失败环节", "验证登录流程"];
  }

  if (title === "自测登录流程") {
    return ["打开登录页", "注册一个本机账号", "退出后重新登录"];
  }

  if (title === "优化语音识别技术方案" || (/语音识别/u.test(combined) && /优化|技术方案|方案/u.test(combined))) {
    return ["梳理识别方案", "对比可选技术", "确定验证指标"];
  }

  if (title === "求职准备" || (/找工作|求职|投简历|投递/u.test(combined) && /简历|作品集|面试/u.test(combined))) {
    return ["更新简历", "整理作品集", "准备面试素材"];
  }

  if (title === "面试准备") {
    return ["修改简历", "整理作品集", "练一遍自我介绍"];
  }

  if (title === "自测 MindFlow 本地登录") {
    return ["打开本地登录页", "注册一个本机账号", "退出后重新登录"];
  }

  if (title === "预约牙医") {
    return ["打开通讯录", "找到诊所电话", "问一个可预约时间"];
  }

  if (title === "整理房间") {
    return ["先清空桌面", "把地面杂物归类", "丢掉一袋不用的东西"];
  }

  if (title === "查看保险事项") {
    return ["找到保险相关消息", "确认需要处理的问题", "记下下一步联系人"];
  }

  if (title === "回复小王消息") {
    return ["打开和小王的聊天", "看最后一条消息", "先回一句确认收到"];
  }

  if (title === "整理论文材料") {
    return ["打开论文材料文件夹", "列出缺的材料", "先整理一个文件"];
  }

  if (title === "整理作品集") {
    return ["打开作品集文件夹", "列出需要整理的项目", "先补一个项目说明"];
  }

  if (title === "排查本地模型整理耗时") {
    return ["复现一次整理耗时", "记录接口等待时间", "换成本地快路径验证"];
  }

  if (/语义|拆解|理解/u.test(combined) && /歧义|歧词|过滤/u.test(combined)) {
    return ["复现语义拆解输出", "标记口语和上下文词", "只保留可行动语义单元"];
  }

  if (/积分|勾选|完成|划线|删除线/u.test(combined) && /代办|todo|步骤|小步骤/u.test(combined)) {
    return ["找到积分代办卡片", "给待办行加勾选框", "勾选后显示删除线"];
  }

  if (/active|Active/u.test(combined) && /标题|拆分|代办|步骤|同步|生效/u.test(combined)) {
    return ["保存卡片标题编辑", "保存拆分待办编辑", "换设备刷新验证"];
  }

  if (/parking|Parking/u.test(combined) && /active|Active/u.test(combined) && /按钮|恢复|文案|名字/u.test(combined)) {
    return ["找到 Parking 操作按钮", "把文案改成移到 Active", "确认点击后进入 Active"];
  }

  const concreteUnits = units
    .map((unit) => cleanLocalUnit(unit).replace(/^以及/u, ""))
    .filter(Boolean)
    .slice(0, 3);

  if (concreteUnits.length >= 2) {
    return concreteUnits.map((unit) => unit.length > 18 ? unit.slice(0, 18) : unit);
  }

  return [`定位「${title}」`, "改一处最小可验证内容", "保存后刷新验证"];
}

function createLocalSemanticNextStep(title, focusSteps) {
  if (title === "求职准备") {
    return "打开简历文件，先补最近一个项目。";
  }

  const titleSteps = {
    预约牙医: "打开通讯录，找到诊所电话。",
    整理房间: "先清空桌面上最明显的一小块。",
    查看保险事项: "先找到保险相关的那条消息。",
    回复小王消息: "打开和小王的聊天，先看最后一句。",
    整理论文材料: "打开论文材料文件夹，先列出缺的材料。",
    整理作品集: "打开作品集文件夹，先看有哪些项目。",
    排查本地模型整理耗时: "复现一次整理，先记录等待秒数。",
    自测登录流程: "打开登录页，先注册一个本机账号。",
    "自测 MindFlow 本地登录": "打开本地页面，先注册一个测试账号。",
    发送体检报告: "找到体检报告文件，先确认能打开。",
    查看信用卡账单: "打开信用卡账单，先看本期金额。",
    收拾厨房: "先清空厨房台面的一小块。",
    修改方案: "打开方案文件，先标出要改的一处。",
    回复小陈消息: "打开和小陈的聊天，先看最后一句。",
    取快递: "打开快递信息，先确认取件码。",
    更新护照: "找到护照有效期，先确认过期日期。",
    缴水电费: "打开缴费入口，先看待缴金额。",
    整理电脑桌面: "先把桌面文件按项目归一类。",
    面试准备: "打开简历，先改最近一个项目描述。",
    处理冰箱食材: "打开冰箱，先挑出今天要处理的菜。",
    扔垃圾: "先把垃圾袋扎好放到门口。",
    晾衣服: "先把洗好的衣服拿出来。",
    检查整理速度: "打开本地页面，先记录一次整理耗时。",
    提交改动: "先看一眼当前改动文件。",
    收拾客厅: "先把客厅桌面清出一小块。",
    洗杯子: "先把杯子收到水槽旁。",
    买水果: "先写下要买的水果种类。",
    处理银行卡验证码: "打开银行消息，先确认验证码用途。",
    确认医院预约: "打开医院预约记录，先看时间。",
    修改论文摘要: "打开论文摘要，先改第一段。",
    发送申请材料: "打开申请材料文件夹，先确认文件齐不齐。",
    提醒老师推荐信: "打开和老师的聊天，先写一句提醒草稿。",
    检查作品集链接: "打开作品集链接，先确认页面能访问。",
    买洗衣液: "先记下常用洗衣液品牌或规格。",
    查看物业通知: "打开物业群，先看最新通知。",
  };

  if (titleSteps[title]) {
    return titleSteps[title];
  }

  const firstStep = focusSteps[0] ?? `定位「${title}」`;
  return `${firstStep}，先完成一处可验证改动。`;
}

function isLocalBigProject(title, units) {
  const combined = units.join("，");
  return title === "求职准备" || /大项目|MVP|作品集|找工作|求职|项目/u.test(combined) && /拆|准备|整理|完成|没弄|好乱/u.test(combined);
}

function createLocalSemanticResultFromUnits(rawText, units, modelBehavior) {
  const semanticUnits = units.map((text, index) => ({
    id: `u${index + 1}`,
    text,
    role: getLocalSemanticUnitRole(text),
    topicHint: createLocalSemanticTitle([text]),
  }));
  const taskUnits = semanticUnits.filter((unit) => unit.role === "task");
  const unitsForItems = taskUnits.length > 0 ? taskUnits : semanticUnits.filter((unit) => unit.role !== "filler");

  if (unitsForItems.length === 0) {
    return {
      status: "empty",
      message: "想到什么都可以先放在这里。",
      inputMode: "context_only",
      semanticUnits,
      items: [],
      coverageCheck: {
        coveredUnitIds: [],
        unmappedUnitIds: semanticUnits.map((unit) => unit.id),
        possibleDuplicates: [],
        needsClarification: [],
      },
      suggestion: null,
      suggestions: [],
      savedItems: [],
      actions: DEFAULT_ACTIONS,
      meta: {
        modelBehavior,
      },
    };
  }

  const itemUnits = shouldGroupLocalUnits(unitsForItems.map((unit) => unit.text))
    ? [unitsForItems]
    : unitsForItems.slice(0, LOCAL_SEMANTIC_MAX_ITEMS).map((unit) => [unit]);

  const items = itemUnits.map((groupUnits, index) => {
    const mentions = groupUnits.map((unit) => unit.text);
    const title = createLocalSemanticTitle(mentions);
    const focusSteps = createLocalSemanticFocusSteps(title, mentions);
    const isBigEvent = isLocalBigProject(title, mentions);

    return {
      id: `item_${index + 1}`,
      title,
      sourceUnitIds: groupUnits.map((unit) => unit.id),
      mentions,
      type: "task",
      priority: index === 0 ? "medium" : "low",
      assignTo: index === 0 ? "active" : "parking",
      reason: `这条来自你输入里的「${mentions[0]}」。`,
      nextStep: createLocalSemanticNextStep(title, focusSteps),
      focusSteps,
      deliverables: [],
      dependsOn: [],
      category: "task",
      energy: "low",
      timeHint: null,
      dueAt: null,
      tags: [],
      isBigEvent,
      remindDaysBefore: null,
      confidence: 0.65,
      ambiguities: [],
    };
  });

  const normalized = normalizeAiResult({
    status: "organized",
    message: DEFAULT_MESSAGE,
    inputMode: units.length > 1 ? "mixed_thoughts" : "single_task",
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
      modelBehavior,
      promptStrategy: LOCAL_PROMPT_STRATEGY,
    },
  };
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
      promptStrategy: LOCAL_PROMPT_STRATEGY,
    },
  };
}

export function createLocalSemanticResult(rawText) {
  const units = splitLocalSemanticUnits(rawText);

  if (units.length === 0) {
    return {
      status: "empty",
      message: "想到什么都可以先放在这里。",
      suggestions: [],
      savedItems: [],
      meta: {
        modelBehavior: "local_semantic",
        promptStrategy: LOCAL_PROMPT_STRATEGY,
      },
    };
  }

  if (shouldUseLocalSemanticFast(rawText)) {
    return createLocalSemanticFastResult(rawText);
  }

  return createLocalSemanticResultFromUnits(rawText, units, "local_semantic");
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
    parsedResult = coerceAiResultShape(parseAiJson(aiOutput));
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
