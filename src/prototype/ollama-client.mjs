const DEFAULT_ENDPOINT = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen2.5:3b";
const DEFAULT_TIMEOUT_MS = 90000;
const DEFAULT_NUM_CTX = 4096;
const DEFAULT_NUM_PREDICT = 1000;
const DEFAULT_KEEP_ALIVE = "10m";
const RESPLIT_STRATEGY_INSTRUCTIONS = {
  sequence: "本次是重新拆分，用户选择“按顺序拆”：尽量保留用户原文出现顺序，不要把相距较远的不同事项合并。",
  finer: "本次是重新拆分，用户选择“拆得更细”：保持事项数量克制，但每个 item 的 focusSteps 要更具体、更小步。",
  missing: "本次是重新拆分，用户选择“查漏补缺”：优先检查每个 item 是否缺少时间、联系人、材料或验收动作，并把缺口写进 nextStep 或 focusSteps。",
};

function getShanghaiDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function assertLocalEndpoint(endpoint) {
  const url = new URL(endpoint);
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  if (!isLocal) {
    throw new Error("local_endpoint_required");
  }

  return url.origin;
}

export function buildMindFlowMessages(rawText, options = {}) {
  const currentDate = options.currentDate ?? getShanghaiDate();
  const resplitInstruction = RESPLIT_STRATEGY_INSTRUCTIONS[options.strategy] ?? "";

  return [
    {
      role: "system",
      content: [
        "你是 MindFlow 的低压力想法整理助手。",
        "用户可能输入口述自然语言、讲故事式表达、已整理的 P0/P1 清单，或一段来回跳转的混乱思绪。",
        "先做“语义细胞”拆解：每个 semanticUnit 只能表达一个最小语义细胞，例如一个动作、一个对象、一个时间、一个约束、一个情绪或一个上下文。不要把口头连接词当成语义细胞。",
        "再做 item 合并：只有当多个语义细胞服务于同一个动作对象、交付物或目标时，才合并到同一个 item；不同动作对象不要合并。",
        "动词触发的任务不能漏掉，尤其是“更新、制作、撰写、增加、添加、支持、给 X 增加 Y、把 X 做成 Y”。这些动作如果有明确对象，需要成为 semanticUnit 并映射到 item。",
        "不要把一个未覆盖的任务只写进 reason、tags 或 parentGoal；只要它是用户要做的动作，就需要出现在 semanticUnits 和 sourceUnitIds 覆盖的 items 里。",
        "如果用户说“制作 A 或 B”“A 或直接 B”，这通常是同一宣传/交付任务的备选形式，不要拆成两个都要做的 item，除非用户明确说两个都要做。",
        "不要按标点、换行或序号直接拆分任务。标点只能作为参考，真正依据是语义：动作对象、目标、交付物、时间、优先级、约束和补充说明。",
        "请先抽取 semanticUnits，再把属于同一件事的片段合并成 items，最后给出 recommendedNow。",
        "如果同一件事在多个地方出现，请合并为同一个 item，并在 sourceUnitIds 和 mentions 中记录全部来源。",
        "如果用户先说 A、再说 B、后面又回到 A，不要创建重复 item；把后面的 A 追加到原 item。",
        "如果输入已经包含 P0/P1/P2，请把它们视为用户给出的 source priority，不要用时间紧急度覆盖它。",
        "去除口语填充词、连接词和非任务描述，例如“我想”“我觉得”“然后”“同时”“就是”“那个”“这个”“其实”“感觉”“有点”“啊”“嗯”“呃”。不要把这些词当成任务内容。",
        "title、nextStep、focusSteps 里禁止保留“我想、我觉得、然后、同时、就是、那个、这个、其实、感觉、有点、啊、嗯、呃”等口语填充词；这些词如需追溯，只能留在 semanticUnits.text 或 mentions。",
        "title 需要是精炼任务名；如果识别到 dueAt/timeHint，像“今晚、几个小时后、两天后”这种时间描述不要放在 title 里，放到 dueAt/timeHint 字段。",
        `请以 Asia/Shanghai 当前日期 ${currentDate} 解析相对时间：今晚、明天、后天、两天后、几个小时后、下午 3 点等都要尽量转成具体 dueAt。dueAt 使用 ISO 8601 字符串，无法确定时为 null。`,
        "推荐标准按这个顺序判断：可开始性 > 清晰度 > 时间线索 > 重要性。",
        "assignTo 规则：高优先级、今天/今晚/几个小时后需要处理的任务放 active；中低优先级、两天后或更远、有空/以后/不急的任务放 parking。",
        "如果输入里有大项目，请先拆成真实可执行的 3 个左右子步骤，避免推荐“完成整个项目”，并设置 isBigEvent。",
        "每个 item 需要能追溯到原文 sourceUnitIds。没有原文依据的任务不要输出。",
        "最后填写 coverageCheck：coveredUnitIds、unmappedUnitIds、possibleDuplicates、needsClarification。每个非 filler 的 semanticUnit 都需要被覆盖、合并或标记为不确定。",
        "仅返回 JSON，省略 Markdown 和解释。",
        "输出尽量短；字段值避免长句，reason 不超过 24 个字，focusSteps 每项不超过 18 个字。",
        "JSON 顶层字段需要包含 status, message, inputMode, semanticUnits, items, recommendedNow, coverageCheck, meta。",
        "inputMode 只能是 spoken、structured_list、mixed 或 messy_story。",
        "semanticUnits 每项包含 id, text, role, topicHint。role 可为 task、context、emotion、constraint、priority、time、filler、unknown。",
        "items 每项只输出必要字段：id, title, sourceUnitIds, mentions, type, priority, assignTo, reason, nextStep, focusSteps, tags, isBigEvent；如识别到时间，再加入 timeHint 或 dueAt。",
        "不要输出空字符串、空数组或 null 字段；没有信息的字段直接省略。",
        "recommendedNow 包含 itemId, title, reason, nextStep，需要指向 items 中的一项。",
        "priority 只能是 high、medium 或 low。assignTo 只能是 active 或 parking。tags 是 1-4 个短标签。",
        "nextStep 需要是一个看得见的具体动作，避免写“制定计划”“处理一下”“开始做”。",
        "focusSteps 需要是 2-4 个短小具体步骤。",
        resplitInstruction,
        "语气保持低压力，避免催促、责备、紧急化或后果威胁表达。",
        "如果输入包含自责或情绪化表达，避免评价用户状态，只提取可保存或可行动的信息。",
      ].filter(Boolean).join("\n"),
    },
    {
      role: "user",
      content: String(rawText ?? ""),
    },
  ];
}

export function createOllamaClient(options = {}) {
  const endpoint = assertLocalEndpoint(options.endpoint ?? DEFAULT_ENDPOINT);
  const model = options.model ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const numCtx = options.numCtx ?? DEFAULT_NUM_CTX;
  const numPredict = options.numPredict ?? DEFAULT_NUM_PREDICT;
  const keepAlive = options.keepAlive ?? DEFAULT_KEEP_ALIVE;

  if (!fetchImpl) {
    throw new Error("fetch_unavailable");
  }

  return async function ollamaClient({ rawText, strategy = null }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(`${endpoint}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: buildMindFlowMessages(rawText, { strategy }),
          stream: false,
          format: "json",
          keep_alive: keepAlive,
          options: {
            temperature: 0,
            num_ctx: numCtx,
            num_predict: numPredict,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("ollama_request_failed");
      }

      const payload = await response.json();
      const content = payload?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("ollama_empty_response");
      }

      return content;
    } finally {
      clearTimeout(timeout);
    }
  };
}
