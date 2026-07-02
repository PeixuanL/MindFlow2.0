const DEFAULT_REASON = "它比较清楚，不需要一次处理太多。";

function splitThoughts(rawText) {
  return rawText
    .split(/[，,。.\n、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickSuggestion(items) {
  const dentalItem = items.find((item) => item.includes("牙医"));
  if (dentalItem) {
    return "给牙医打电话预约";
  }

  const messageItem = items.find((item) => item.includes("消息") || item.includes("回复"));
  if (messageItem) {
    return messageItem.includes("小王") ? "回复小王的消息" : "回复一条消息";
  }

  return items[0] || "先看一件最明确的事";
}

export function organizeThoughts(rawText) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      status: "empty",
      message: "想到什么都可以先放在这里。",
      suggestion: null,
      savedItems: [],
      actions: ["看一下", "先不管"],
    };
  }

  const items = splitThoughts(trimmed);
  const title = pickSuggestion(items);
  const savedItems = items.filter((item) => !title.includes(item) && !item.includes("牙医"));

  return {
    status: "organized",
    message: "其他想法都还在",
    suggestion: {
      label: "也许可以先看这个",
      title,
      reason: DEFAULT_REASON,
    },
    savedItems,
    actions: ["看一下", "先不管"],
  };
}
