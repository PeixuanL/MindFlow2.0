const DEFAULT_REASON = "它比较清楚，不需要一次处理太多。";

const SUGGESTION_LIBRARY = [
  {
    match: (item) => item.includes("明天") && item.includes("材料"),
    title: "先确认明天要交的材料",
    reason: "它有明确时间线索，可以先只确认缺什么。",
    nextStep: "打开材料清单，找出还差的一项。",
    focusSteps: ["打开材料清单", "找出还差的一项", "把缺的那项单独写下来"],
    category: "task",
    energy: "medium",
    timeHint: "明天",
    score: 0,
  },
  {
    match: (item) => item.includes("简历"),
    title: "先打开简历文件",
    reason: "它是一个很小的入口，不需要现在改完整份。",
    nextStep: "打开最近那版简历，只看标题和第一段。",
    focusSteps: ["打开最近那版简历", "只看标题和第一段", "标出一个想改的小地方"],
    category: "task",
    energy: "low",
    timeHint: null,
    score: 5,
  },
  {
    match: (item) => item.includes("作品集"),
    title: "整理作品集",
    reason: "它可以先从确认现有材料开始。",
    nextStep: "打开作品集文件夹，只看有哪些项目。",
    focusSteps: ["打开作品集文件夹", "数一下已有项目", "挑出一个最完整的项目"],
    category: "task",
    energy: "medium",
    timeHint: null,
    score: 26,
  },
  {
    match: (item) => item.includes("面试"),
    title: "准备面试",
    reason: "它可以先只收集一个常见问题。",
    nextStep: "写下一个最可能被问到的问题。",
    focusSteps: ["打开面试准备文档", "写下一个常见问题", "只补一句回答要点"],
    category: "task",
    energy: "medium",
    timeHint: null,
    score: 28,
  },
  {
    match: (item) => item.includes("牙医"),
    title: "给牙医打电话预约",
    nextStep: "打开通讯录，找到诊所电话。",
    focusSteps: ["找到诊所电话", "问最近可约时间", "记下确认时间"],
    category: "task",
    energy: "low",
    timeHint: null,
    score: 10,
  },
  {
    match: (item) => item.includes("房间") || item.includes("整理"),
    title: "周末整理房间",
    nextStep: "先把桌面上的杯子拿走。",
    focusSteps: ["拿走桌面杯子", "把衣服放进洗衣篮", "只清出一小块桌面"],
    category: "task",
    energy: "medium",
    timeHint: null,
    score: 11,
  },
  {
    match: (item) => item.includes("保险"),
    title: "看一下保险那件事",
    nextStep: "先找到保险相关的那条消息。",
    focusSteps: ["找到保险消息", "看清楚要补什么", "只记下一个待确认点"],
    category: "worry",
    energy: "low",
    timeHint: null,
    score: 20,
  },
  {
    match: (item) => item.includes("消息") || item.includes("回复"),
    title: "回复一条消息",
    nextStep: "先打开聊天，看看对方最后一句。",
    focusSteps: ["打开聊天", "看最后一句", "回一句最短可以发送的话"],
    category: "reminder",
    energy: "low",
    timeHint: null,
    score: 12,
  },
];

function normalizeSource(source) {
  return source
    .replace(/^但是/, "")
    .replace(/也?很乱$/u, "")
    .replace(/[也都没弄好乱我真的太没用了]+$/u, "")
    .trim();
}

function splitThoughts(rawText) {
  return rawText
    .split(/[，,。.\n、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandProjectItems(rawText, items) {
  const expanded = [];
  const hasJobContainer = rawText.includes("找工作");
  const hasJobParts = ["简历", "作品集", "面试"].some((part) => rawText.includes(part));

  if (hasJobContainer && hasJobParts) {
    const projectItems = [];
    if (rawText.includes("简历")) {
      projectItems.push("简历");
    }

    if (rawText.includes("作品集")) {
      projectItems.push("整理作品集");
    }

    if (rawText.includes("面试")) {
      projectItems.push("准备面试");
    }

    const nonProjectItems = items
      .map(normalizeSource)
      .filter((item) => {
        if (!item || ["好乱", "感觉好乱"].includes(item)) {
          return false;
        }

        if (item.includes("找工作") || item.includes("简历") || item.includes("作品集") || item.includes("面试")) {
          return false;
        }

        return true;
      });

    expanded.push(...projectItems, ...nonProjectItems);
    return expanded;
  }

  return items
    .map(normalizeSource)
    .filter((item) => item && !["好乱", "感觉好乱"].includes(item));
}

function createSuggestion(item, index) {
  const matched = SUGGESTION_LIBRARY.find((suggestion) => suggestion.match(item));
  const fallback = {
    title: item || "先看一件最明确的事",
    reason: DEFAULT_REASON,
    nextStep: "先把这件事写成一句更小的话。",
    focusSteps: ["写成一句话", "圈出最容易开始的部分", "只做第一小步"],
    category: "unknown",
    energy: "unknown",
    timeHint: null,
    score: 50 + index,
  };
  const suggestion = matched || fallback;

  return {
    label: "也许可以先看这个",
    priority: index + 1,
    title: suggestion.title,
    reason: suggestion.reason || DEFAULT_REASON,
    nextStep: suggestion.nextStep,
    focusSteps: suggestion.focusSteps,
    source: item,
    category: suggestion.category,
    energy: suggestion.energy,
    timeHint: suggestion.timeHint,
    score: suggestion.score,
  };
}

function buildSuggestions(items) {
  const seenTitles = new Set();

  return items
    .map(createSuggestion)
    .filter((suggestion) => {
      if (seenTitles.has(suggestion.title)) {
        return false;
      }

      seenTitles.add(suggestion.title);
      return true;
    })
    .sort((a, b) => a.score - b.score)
    .map((suggestion, index) => ({
      ...suggestion,
      priority: index + 1,
      score: undefined,
    }));
}

function createSavedItem(suggestion) {
  return {
    source: suggestion.source,
    category: suggestion.category ?? "unknown",
    reasonParked: suggestion.energy === "medium"
      ? "它可能需要多一点时间拆开，先安全放着。"
      : "先安全放着。",
  };
}

export function organizeThoughts(rawText) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      status: "empty",
      message: "想到什么都可以先放在这里。",
      suggestion: null,
      suggestions: [],
      savedItems: [],
      actions: ["看一下", "先不管"],
    };
  }

  const items = expandProjectItems(trimmed, splitThoughts(trimmed));
  const suggestions = buildSuggestions(items);
  const suggestion = suggestions[0] || createSuggestion("", 0);
  const savedItems = suggestions
    .filter((item) => item.source !== suggestion.source)
    .map(createSavedItem);

  return {
    status: "organized",
    message: "其他想法都还在",
    suggestion,
    suggestions,
    savedItems,
    actions: ["看一下", "先不管"],
  };
}
