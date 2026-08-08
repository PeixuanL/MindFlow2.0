import {
  createLocalSemanticResult,
  getOrganizedResultSaveBlocker,
  organizeThoughtsWithAi,
} from "./ai-organizer.mjs";
import { createMindFlowCloudStore } from "./cloud-store.mjs";
import { priorityLabels } from "./store.mjs";
import { createVoiceInputController } from "./voice-input.mjs";

const isLocalPrototypeHost =
  window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const store = createMindFlowCloudStore({
  allowLocalAuthFallback: isLocalPrototypeHost,
});
const appShell = document.querySelector(".app-shell");
const views = {
  login: document.querySelector("#login-view"),
  home: document.querySelector("#home-view"),
  items: document.querySelector("#items-view"),
  detail: document.querySelector("#detail-view"),
};

const topActions = document.querySelector("#top-actions");
const todayLabel = document.querySelector("#today-label");
const logoutButton = document.querySelector("#logout-button");
const navButtons = [...document.querySelectorAll("[data-nav]")];
const sidebarToggle = document.querySelector("#sidebar-toggle");
const sidebarUserName = document.querySelector("#sidebar-user-name");
const sidebarCompletedCount = document.querySelector("#sidebar-completed-count");

const loginForm = document.querySelector("#login-form");
const loginModeButton = document.querySelector("#login-mode-button");
const registerModeButton = document.querySelector("#register-mode-button");
const accountInput = document.querySelector("#account-input");
const passwordInput = document.querySelector("#password-input");
const confirmPasswordInput = document.querySelector("#confirm-password-input");
const displayNameInput = document.querySelector("#display-name-input");
const registerOnlyFields = document.querySelector("#register-only-fields");
const loginButton = document.querySelector("#login-button");
const loginError = document.querySelector("#login-error");
const loginSupportingCopy = document.querySelector(".login-hero .supporting-copy");
const demoButton = document.querySelector("#demo-button");

const input = document.querySelector("#thought-input");
const inputCount = document.querySelector("#thought-input-count");
const organizeButton = document.querySelector("#organize-button");
const voiceButton = document.querySelector("#voice-button");
const voiceStatus = document.querySelector("#voice-status");
const captureError = document.querySelector("#capture-error");
const statusMessage = document.querySelector("#status-message");
const suggestionSection = document.querySelector("#suggestion-section");
const candidateSection = document.querySelector("#candidate-section");
const focusSection = document.querySelector("#focus-section");
const doneSection = document.querySelector("#done-section");
const captureTitleLabel = document.querySelector("#capture-title-label");
const suggestionLabel = document.querySelector("#suggestion-label");
const suggestionTitle = document.querySelector("#suggestion-title");
const suggestionReason = document.querySelector("#suggestion-reason");
const suggestionNextStep = document.querySelector("#suggestion-next-step");
const priorityChip = document.querySelector("#priority-chip");
const focusTitle = document.querySelector("#focus-title");
const focusPriority = document.querySelector("#focus-priority");
const focusSteps = document.querySelector("#focus-steps");
const lookButton = document.querySelector("#look-button");
const skipButton = document.querySelector("#skip-button");
const focusDetailButton = document.querySelector("#focus-detail-button");
const focusDoneButton = document.querySelector("#focus-done-button");
const restButton = document.querySelector("#rest-button");
const seeAnotherButton = document.querySelector("#see-another-button");
const candidateTitle = document.querySelector("#candidate-title");
const candidateReason = document.querySelector("#candidate-reason");
const restoreCandidateButton = document.querySelector("#restore-candidate-button");
const keepParkedButton = document.querySelector("#keep-parked-button");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
const toastAction = document.querySelector("#toast-action");
const homeThoughtsTitle = document.querySelector("#home-thoughts-title");
const viewAllThoughtsButton = document.querySelector("#view-all-thoughts-button");
const resplitPanel = document.querySelector("#resplit-panel");
const resplitStrategyButtons = [...document.querySelectorAll("[data-resplit-strategy]")];
const cancelResplitButton = document.querySelector("#cancel-resplit-button");
const undoRecentOrganizeButton = document.querySelector("#undo-recent-organize-button");
const homeThoughtsList = document.querySelector("#home-thoughts-list");
const homeCompletedList = document.querySelector("#home-completed-list");
const homeThoughtsCount = document.querySelector("#home-thoughts-count");
const recentCompletedCount = document.querySelector("#recent-completed-count");

const manualAddForm = document.querySelector("#manual-add-form");
const manualTitleInput = document.querySelector("#manual-title-input");
const manualAddButton = document.querySelector("#manual-add-button");
const manualAddError = document.querySelector("#manual-add-error");
const activeList = document.querySelector("#active-list");
const parkingList = document.querySelector("#parking-list");
const doneList = document.querySelector("#done-list");
const itemTabs = [...document.querySelectorAll("[data-tab]")];
const itemPanels = {
  active: document.querySelector("#active-panel"),
  parking: document.querySelector("#parking-panel"),
  done: document.querySelector("#done-panel"),
};
const undoToast = document.querySelector("#undo-toast");
const undoMessage = document.querySelector("#undo-message");
const undoButton = document.querySelector("#undo-button");

const detailForm = document.querySelector("#detail-form");
const detailTitleInput = document.querySelector("#detail-title-input");
const detailPriorityInput = document.querySelector("#detail-priority-input");
const detailStatusInput = document.querySelector("#detail-status-input");
const detailDueAtInput = document.querySelector("#detail-due-at-input");
const detailTagsInput = document.querySelector("#detail-tags-input");
const detailReasonInput = document.querySelector("#detail-reason-input");
const detailParkingReasonInput = document.querySelector("#detail-parking-reason-input");
const detailSteps = document.querySelector("#detail-steps");
const detailError = document.querySelector("#detail-error");
const detailSuccess = document.querySelector("#detail-success");
const detailRegenerateStatus = document.querySelector("#detail-regenerate-status");
const detailRegenerateMessage = document.querySelector("#detail-regenerate-message");
const regenerateStepsButton = document.querySelector("#regenerate-steps-button");
const undoRegenerateStepsButton = document.querySelector("#undo-regenerate-steps-button");
const addStepButton = document.querySelector("#add-step-button");
const detailBackButton = document.querySelector("#detail-back-button");
const detailSaveButton = document.querySelector("#detail-save-button");

let currentUser = store.getSession();
const busyScopes = new Set();
let focusedItemId = null;
let completionVisible = false;
let toastTimer = null;
let undoTimer = null;
let deletedItemId = null;
let activeItemTab = "active";
let recentOrganizedBatchId = null;
let recentOrganizedRawText = "";
let previousDetailStepsSnapshot = null;
let voiceController = null;
let authMode = "login";
const ITEM_PAGE_SIZE = 100;
const itemVisibleLimits = {
  active: ITEM_PAGE_SIZE,
  parking: ITEM_PAGE_SIZE,
  done: ITEM_PAGE_SIZE,
};

const resplitStrategyLabels = {
  sequence: "按顺序拆",
  finer: "拆得更细",
  missing: "查漏补缺",
};
const detailRegenerateStrategies = ["finer", "sequence", "missing"];
let detailRegenerateIndex = 0;
const LOCAL_AI_WAIT_MS = 8000;

if (isLocalPrototypeHost && loginSupportingCopy) {
  loginSupportingCopy.textContent = "注册一个本机账号，数据只保存在这台电脑当前浏览器里。";
}

async function serverAiClient({ rawText, strategy = null }) {
  const response = await fetch("/api/organize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText, strategy }),
  });

  if (!response.ok) {
    throw new Error("local_ai_unavailable");
  }

  const payload = await response.json();
  if (typeof payload.aiJson !== "string") {
    throw new Error("invalid_local_ai_response");
  }

  return payload.aiJson;
}

function createTimeoutPromise(milliseconds) {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error("local_ai_timeout")), milliseconds);
  });
}

function createFastOrganizeFallback(rawText, { strategy = null, reason = "local_ai_unavailable" } = {}) {
  const result = createLocalSemanticResult(rawText, { strategy });

  return {
    ...result,
    meta: {
      ...result.meta,
      fallbackReason: reason,
    },
  };
}

async function organizeWithLocalAi(rawText, { strategy = null } = {}) {
  const aiResultPromise = organizeThoughtsWithAi(rawText, {
    aiClient: serverAiClient,
    strategy,
  });

  try {
    const result = await Promise.race([
      aiResultPromise,
      createTimeoutPromise(LOCAL_AI_WAIT_MS),
    ]);
    const saveBlocker = getOrganizedResultSaveBlocker(result, rawText);

    if (!saveBlocker) {
      return { result, source: "ai" };
    }

    return {
      result: createFastOrganizeFallback(rawText, { strategy, reason: saveBlocker }),
      source: "fallback",
      fallbackReason: saveBlocker,
    };
  } catch (error) {
    return {
      result: createFastOrganizeFallback(rawText, { strategy, reason: error.message }),
      source: "fallback",
      fallbackReason: error.message,
    };
  }
}

function getSaveBlockerMessage(reason) {
  if (reason === "fallback_result") {
    return "这次没有连上语义整理，我没有保存这版。输入还在，可以重试。";
  }

  if (reason === "over_split") {
    return "这次拆得太细，我没有自动保存。输入还在，可以重试。";
  }

  if (reason === "missing_semantic_evidence") {
    return "这次没有拿到可追溯的语义拆解，我没有保存这版。输入还在，可以重试。";
  }

  if (reason === "generic_next_step") {
    return "这次下一步太泛了，我没有保存这版。输入还在，可以重试。";
  }

  return "这次没有整理好，我没有保存这版。输入还在，可以重试。";
}

function setStatus(message) {
  const dot = document.createElement("span");
  statusMessage.replaceChildren(dot, document.createTextNode(message));
}

function hide(...sections) {
  sections.forEach((section) => section.classList.add("is-hidden"));
}

function show(section) {
  section.classList.remove("is-hidden");
}

function showView(name, { activeNav = name } = {}) {
  Object.values(views).forEach((view) => view.classList.add("is-hidden"));
  show(views[name]);
  appShell.classList.toggle("is-login-shell", name === "login");
  topActions.classList.toggle("is-hidden", name === "login");
  const displayName = currentUser ? currentUser.name : "今天";
  todayLabel.textContent = displayName;
  sidebarUserName.textContent = displayName;
  navButtons.forEach((button) => {
    const isActive = button.dataset.nav === activeNav || (activeNav === "detail" && button.dataset.nav === "items");
    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function navigate(hash) {
  if (window.location.hash === hash) {
    renderRoute();
    return;
  }

  window.location.hash = hash;
}

function createDetailHash(itemId, from = "items") {
  const params = new URLSearchParams({ from });
  return `#detail/${encodeURIComponent(itemId)}?${params.toString()}`;
}

function parseDetailHash(hash = window.location.hash) {
  if (!hash.startsWith("#detail/")) {
    return null;
  }

  const detailPath = hash.slice("#detail/".length);
  const [rawItemId, rawQuery = ""] = detailPath.split("?");
  const params = new URLSearchParams(rawQuery);
  const from = params.get("from") === "home" ? "home" : "items";
  return {
    itemId: decodeURIComponent(rawItemId),
    from,
  };
}

function getDetailReturnHash(from) {
  return from === "home" ? "#home" : "#items";
}

function getUserState() {
  return store.getStateForUser(currentUser.id);
}

function findVisibleItem(itemId) {
  return getUserState().items.find((item) => item.id === itemId) ?? null;
}

function isBusy(scope) {
  return busyScopes.has(scope);
}

function setBusy(scope, nextBusy) {
  if (nextBusy) {
    busyScopes.add(scope);
  } else {
    busyScopes.delete(scope);
  }

  organizeButton.disabled = isBusy("organize");
  organizeButton.classList.toggle("is-busy", isBusy("organize"));
  lookButton.disabled = isBusy("look");
  skipButton.disabled = isBusy("skip");
  focusDoneButton.disabled = isBusy("focusDone");
  restoreCandidateButton.disabled = isBusy("restoreCandidate");
  keepParkedButton.disabled = isBusy("keepParked");
  loginButton.disabled = isBusy("auth");
  demoButton.disabled = isBusy("auth");
  manualAddButton.disabled = isBusy("manualAdd");
  detailSaveButton.disabled = isBusy("detailSave");
  regenerateStepsButton.disabled = isBusy("regenerateSteps");
  resplitStrategyButtons.forEach((button) => {
    button.disabled = isBusy("organize");
  });
  organizeButton.textContent = isBusy("organize") ? "整理中…" : "帮我捋一捋";
}

function showToast(message, actionText, action) {
  window.clearTimeout(toastTimer);
  toastMessage.textContent = message;
  toastAction.textContent = actionText;
  toastAction.onclick = action;
  show(toast);
  toastTimer = window.setTimeout(() => {
    hide(toast);
  }, 5000);
}

function retryCloudSync() {
  setStatus("正在重新同步云端");
  store.syncNow()
    .then(() => showToast("云端同步好了", "去看看", () => navigate("#items")))
    .catch(() => {
      setStatus("已保存在这台设备上，云端暂时没连上");
      showToast("云端还是没有连上", "再试一次", retryCloudSync);
    });
}

function reportCloudSync(syncPromise, { successMessage = "", failureMessage = "已保存在这台设备上，云端暂时没连上" } = {}) {
  syncPromise
    .then(() => {
      if (successMessage) {
        showToast(successMessage, "去看看", () => navigate("#items"));
      }
    })
    .catch(() => {
      setStatus(failureMessage);
      showToast(failureMessage, "重试同步", retryCloudSync);
    });
}

function updateInputCount() {
  inputCount.textContent = `${input.value.length}/500`;
}

function renderAuthMode() {
  const isRegistering = authMode === "register";
  loginModeButton.classList.toggle("is-active", !isRegistering);
  registerModeButton.classList.toggle("is-active", isRegistering);
  loginModeButton.setAttribute("aria-pressed", String(!isRegistering));
  registerModeButton.setAttribute("aria-pressed", String(isRegistering));
  registerOnlyFields.classList.toggle("is-hidden", !isRegistering);
  loginButton.textContent = isRegistering ? "注册并进入" : "登录 MindFlow";
  loginError.textContent = "";
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceController = createVoiceInputController({
    SpeechRecognition,
    input,
    voiceButton,
    voiceStatus,
    onInputChange: updateInputCount,
    requireLocalProcessing: false,
  });
}

function isStepCompleted(item, stepIndex) {
  return Array.isArray(item.completedStepIndexes) && item.completedStepIndexes.includes(stepIndex);
}

function createStepCheckRow(item, stepIndex, step) {
  const row = document.createElement("label");
  row.className = `step-check-row ${isStepCompleted(item, stepIndex) ? "is-completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = isStepCompleted(item, stepIndex);
  checkbox.addEventListener("change", () => {
    runItemAction(() => store.toggleItemStep(currentUser.id, item.id, stepIndex, checkbox.checked));
  });

  const text = document.createElement("span");
  text.className = "step-text";
  text.textContent = step;

  row.append(checkbox, text);
  return row;
}

function renderStepChecklist(listElement, item, steps = item.steps) {
  listElement.replaceChildren(
    ...steps.map((step, index) => {
      const listItem = document.createElement("li");
      listItem.append(createStepCheckRow(item, index, step));
      return listItem;
    }),
  );
}

function renderRecommendation(item) {
  suggestionLabel.textContent = "也许可以先看这个";
  priorityChip.textContent = priorityLabels[item.priority];
  suggestionTitle.textContent = item.title;
  suggestionReason.textContent = item.reason || "它比较清楚，不需要一次处理太多。";
  suggestionNextStep.textContent = item.nextStep || item.steps[0] || "先写下一个小步骤。";
  show(suggestionSection);
}

function renderFocus(item) {
  focusTitle.textContent = item.title;
  focusPriority.textContent = priorityLabels[item.priority];
  renderStepChecklist(focusSteps, item);
  show(focusSection);
}

function renderCandidate(item) {
  candidateTitle.textContent = item.title;
  candidateReason.textContent = item.parkingReason || "先安全放着。";
  show(candidateSection);
}

function relativeTime(timestamp) {
  if (!timestamp) {
    return "刚刚";
  }

  const delta = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) {
    return "刚刚";
  }

  if (delta < hour) {
    return `${Math.floor(delta / minute)} 分钟前`;
  }

  if (delta < day) {
    return `${Math.floor(delta / hour)} 小时前`;
  }

  return "昨天";
}

function statusTone(status) {
  if (status === "done") {
    return "done";
  }

  if (status === "parking") {
    return "parking";
  }

  return "active";
}

function formatTaskMeta(item) {
  const parts = [];

  if (item.dueAt) {
    parts.push(`截止 ${item.dueAt}`);
  }

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    parts.push(item.tags.map((tag) => `#${tag}`).join(" "));
  }

  if (item.isBigEvent) {
    parts.push("大事件");
  }

  return parts.join(" · ");
}

function getPriorityRank(item) {
  return { high: 0, medium: 1, low: 2 }[item.priority] ?? 3;
}

function sortPriorityPreviewItems(items) {
  return [...items].sort((a, b) => {
    const priorityDelta = getPriorityRank(a) - getPriorityRank(b);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
  });
}

function getRecentOrganizedItems(items) {
  if (!recentOrganizedBatchId) {
    return [];
  }

  return items
    .filter((item) => item.batchId === recentOrganizedBatchId && item.status !== "done")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function getRecentOrganizedRecommendation() {
  if (!currentUser || !recentOrganizedBatchId) {
    return null;
  }

  return getRecentOrganizedItems(getUserState().items).find((item) => item.status === "active") ?? null;
}

function getHomeRecommendation() {
  if (!currentUser) {
    return null;
  }

  return getRecentOrganizedRecommendation() ?? store.getRecommendation(currentUser.id);
}

function hasRecentOrganizedPreview() {
  if (!currentUser || !recentOrganizedBatchId) {
    return false;
  }

  return getRecentOrganizedItems(getUserState().items).length > 0;
}

function getNextOpenStep(item) {
  const steps = Array.isArray(item.steps) ? item.steps : [];
  const nextStep = steps.find((_, index) => !isStepCompleted(item, index));
  return nextStep || item.nextStep || "打开详情，把下一步补清楚。";
}

function createHomeThoughtRow(item, { completed = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `home-thought-row ${completed ? "is-completed" : ""}`;
  button.addEventListener("click", () => navigate(createDetailHash(item.id, "home")));

  const dot = document.createElement("span");
  dot.className = `row-dot ${statusTone(item.status)}`;
  dot.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "row-text";
  const title = document.createElement("strong");
  title.textContent = item.title;
  const meta = document.createElement("span");
  meta.textContent = completed ? relativeTime(item.completedAt) : getNextOpenStep(item);
  text.append(title, meta);

  const chevron = document.createElement("span");
  chevron.className = "row-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "›";

  button.append(dot, text, chevron);
  return button;
}

function renderHomeSidebar(itemsOverride = null) {
  if (!currentUser) {
    homeThoughtsTitle.textContent = "优先处理";
    viewAllThoughtsButton.textContent = "查看全部 ›";
    hide(resplitPanel);
    hide(undoRecentOrganizeButton);
    homeThoughtsList.replaceChildren();
    homeCompletedList.replaceChildren();
    homeThoughtsCount.textContent = "已显示 0 条优先处理";
    recentCompletedCount.textContent = "0";
    sidebarCompletedCount.textContent = "0";
    return;
  }

  const items = itemsOverride ?? getUserState().items;
  const recentOrganizedItems = getRecentOrganizedItems(items);
  if (recentOrganizedBatchId && recentOrganizedItems.length === 0) {
    recentOrganizedBatchId = null;
  }

  const hasRecentOrganizedItems = recentOrganizedItems.length > 0;
  const priorityItems = sortPriorityPreviewItems(items.filter((item) => item.status === "active")).slice(0, 3);
  const previewItems = hasRecentOrganizedItems ? recentOrganizedItems.slice(0, 5) : priorityItems;
  const completedItems = [...items]
    .filter((item) => item.status === "done")
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0));

  homeThoughtsTitle.textContent = hasRecentOrganizedItems ? "刚刚整理" : "优先处理";
  viewAllThoughtsButton.textContent = hasRecentOrganizedItems ? "重新拆分" : "查看全部 ›";
  if (!hasRecentOrganizedItems) {
    hide(resplitPanel);
  }
  undoRecentOrganizeButton.classList.toggle("is-hidden", !hasRecentOrganizedItems);
  homeThoughtsList.replaceChildren(
    ...(previewItems.length ? previewItems.map((item) => createHomeThoughtRow(item)) : [createEmptyState("暂时没有需要优先处理的想法。")]),
  );
  homeCompletedList.replaceChildren(
    ...(completedItems.length
      ? completedItems.slice(0, 2).map((item) => createHomeThoughtRow(item, { completed: true }))
      : [createEmptyState("完成后会轻轻放在这里。")]),
  );
  homeThoughtsCount.textContent = hasRecentOrganizedItems
    ? `这次保存 ${recentOrganizedItems.length} 条，可撤销`
    : `已显示 ${previewItems.length} 条优先处理`;
  recentCompletedCount.textContent = String(completedItems.length);
  sidebarCompletedCount.textContent = String(completedItems.length);
}

function renderHome() {
  showView("home");
  hide(suggestionSection, candidateSection, focusSection, doneSection);
  renderHomeSidebar();
  captureTitleLabel.textContent = "记一笔";
  input.placeholder = "例：牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦...";
  captureError.textContent = "";

  if (completionVisible) {
    setStatus("这件完成了");
    show(doneSection);
    return;
  }

  if (focusedItemId) {
    const focused = findVisibleItem(focusedItemId);
    if (focused?.status === "active") {
      captureTitleLabel.textContent = "先放一下";
      input.placeholder = "不用打断现在这件事。";
      setStatus("其他想法都还在");
      renderFocus(focused);
      return;
    }

    focusedItemId = null;
  }

  const recommendation = getHomeRecommendation();
  if (recommendation) {
    setStatus("其他想法都还在，随时可以回来查看。");
    renderRecommendation(recommendation);
    return;
  }

  const candidate = store.getParkingCandidate(currentUser.id);
  if (candidate) {
    setStatus("现在看暂时空着，先放着也还在");
    renderCandidate(candidate);
    return;
  }

  setStatus("想到什么都可以先放在这里。");
}

function createEmptyState(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";

  const meta = document.createElement("div");
  meta.className = "recommendation-meta";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = item.status === "parking" ? "先放着" : item.status === "done" ? "已完成" : "现在看";
  const chip = document.createElement("span");
  chip.textContent = priorityLabels[item.priority];
  meta.append(eyebrow, chip);

  const title = document.createElement("h3");
  title.textContent = item.title;

  const reason = document.createElement("p");
  reason.className = "reason";
  reason.textContent = `下一步：${getNextOpenStep(item)}`;

  const taskMeta = document.createElement("p");
  taskMeta.className = "item-task-meta";
  taskMeta.textContent = formatTaskMeta(item);

  const steps = document.createElement("ol");
  steps.className = "preview-steps";
  item.steps.slice(0, 3).forEach((step, index) => {
    const li = document.createElement("li");
    li.append(createStepCheckRow(item, index, step));
    steps.append(li);
  });

  const controls = document.createElement("div");
  controls.className = "card-controls";

  const detailButton = createButton("详情", "secondary-button card-action-button", () => navigate(createDetailHash(item.id, "items")));
  const deleteButton = createButton("删除", "secondary-button card-action-button card-action-muted", () => deleteItem(item.id));
  controls.append(detailButton);

  if (item.status === "active") {
    controls.append(
      createButton("先放着", "secondary-button card-action-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "parking" }))),
      deleteButton,
      createButton("完成", "primary-action-button card-action-button card-action-primary", () => completeItem(item.id)),
    );
  } else if (item.status === "parking") {
    controls.append(
      deleteButton,
      createButton("移到现在看", "primary-action-button card-action-button card-action-primary", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
    );
  } else {
    controls.append(
      deleteButton,
      createButton("恢复", "secondary-button card-action-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
    );
  }

  card.append(meta, title, reason);
  if (taskMeta.textContent) {
    card.append(taskMeta);
  }
  card.append(steps, controls);
  return card;
}

function createButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderList(container, items, emptyText) {
  container.replaceChildren(...(items.length ? items.map(createItemCard) : [createEmptyState(emptyText)]));
}

function appendLoadMoreControl(container, status, remainingCount) {
  const nextCount = Math.min(ITEM_PAGE_SIZE, remainingCount);
  const loadMoreButton = createButton(`再显示 ${nextCount} 条`, "secondary-button list-load-more", () => {
    itemVisibleLimits[status] += ITEM_PAGE_SIZE;
    renderItems();
  });

  container.append(loadMoreButton);
}

const listContainersByStatus = {
  active: activeList,
  parking: parkingList,
  done: doneList,
};

const emptyTextByStatus = {
  active: "现在看里暂时没有想法。",
  parking: "先放着里暂时是空的。",
  done: "已完成里暂时没有归档。",
};

function renderTabs() {
  itemTabs.forEach((tab) => {
    const selected = tab.dataset.tab === activeItemTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  Object.entries(itemPanels).forEach(([status, panel]) => {
    panel.classList.toggle("is-hidden", status !== activeItemTab);
  });
}

function renderItems() {
  showView("items");
  manualAddError.textContent = "";
  const items = getUserState().items;
  renderHomeSidebar(items);
  renderTabs();
  Object.entries(listContainersByStatus).forEach(([status, container]) => {
    if (status !== activeItemTab) {
      container.replaceChildren();
      return;
    }

    const statusItems = items.filter((item) => item.status === status);
    const visibleItems = statusItems.slice(0, itemVisibleLimits[status]);

    renderList(container, visibleItems, emptyTextByStatus[status]);
    if (visibleItems.length < statusItems.length) {
      appendLoadMoreControl(container, status, statusItems.length - visibleItems.length);
    }
  });
}

function addStepInput(value = "", completed = false) {
  const row = document.createElement("div");
  row.className = "step-input-row";
  const completedInput = document.createElement("input");
  completedInput.className = "step-complete-input";
  completedInput.type = "checkbox";
  completedInput.checked = completed;
  completedInput.setAttribute("aria-label", "完成这个小步骤");
  const inputElement = document.createElement("input");
  inputElement.className = "text-input";
  inputElement.type = "text";
  inputElement.maxLength = 120;
  inputElement.value = value;
  inputElement.setAttribute("aria-label", "小步骤");
  const removeButton = createButton("删除", "secondary-button small-button", () => {
    if (detailSteps.children.length > 1) {
      row.remove();
    }
  });
  row.append(completedInput, inputElement, removeButton);
  detailSteps.append(row);
}

function getDetailStepSnapshot() {
  return [...detailSteps.querySelectorAll(".step-input-row")].map((row) => ({
    value: row.querySelector(".text-input")?.value ?? "",
    completed: row.querySelector(".step-complete-input")?.checked === true,
  }));
}

function renderDetailStepSnapshot(snapshot) {
  detailSteps.replaceChildren();
  const values = Array.isArray(snapshot) && snapshot.length > 0 ? snapshot : [{ value: "", completed: false }];
  values.forEach((step) => addStepInput(step.value, step.completed));
}

function hideDetailRegenerateStatus() {
  previousDetailStepsSnapshot = null;
  hide(detailRegenerateStatus);
}

function renderDetail(itemId, { from = "items" } = {}) {
  const item = findVisibleItem(itemId);
  if (!item) {
    navigate(getDetailReturnHash(from));
    return;
  }

  showView("detail", { activeNav: from });
  detailBackButton.textContent = from === "home" ? "返回首页" : "返回全部想法";
  detailTitleInput.value = item.title;
  detailPriorityInput.value = item.priority;
  detailStatusInput.value = item.status;
  detailDueAtInput.value = item.dueAt || "";
  detailTagsInput.value = Array.isArray(item.tags) ? item.tags.join(", ") : "";
  detailReasonInput.value = item.reason || "";
  detailParkingReasonInput.value = item.parkingReason || "";
  detailError.textContent = "";
  detailSuccess.textContent = "";
  hideDetailRegenerateStatus();
  detailSteps.replaceChildren();
  item.steps.forEach((step, index) => addStepInput(step, isStepCompleted(item, index)));
}

function renderRoute() {
  currentUser = store.getSession();

  if (!currentUser) {
    showView("login");
    accountInput.focus();
    return;
  }

  const hash = window.location.hash || "#home";
  if (hash.startsWith("#detail/")) {
    const detailRoute = parseDetailHash(hash);
    renderDetail(detailRoute.itemId, { from: detailRoute.from });
  } else if (hash === "#items") {
    renderItems();
  } else {
    renderHome();
  }
}

async function organizeCurrentInput(options = {}) {
  if (isBusy("organize")) {
    return;
  }

  const rawText = String(options.rawText ?? input.value).trim();
  const resplitStrategy = options.resplitStrategy ?? null;
  captureError.textContent = "";

  if (!rawText) {
    captureError.textContent = "想到什么都可以先放在这里。";
    input.focus();
    return;
  }

  if (rawText.length > 500) {
    captureError.textContent = "这次先放 500 个字以内，比较好整理。";
    input.focus();
    return;
  }

  try {
    setBusy("organize", true);
    setStatus(resplitStrategy ? `正在${resplitStrategyLabels[resplitStrategy] ?? "重新拆分"}` : "正在帮你分开这些想法");
    const organized = await organizeWithLocalAi(rawText, { strategy: resplitStrategy });
    const { result } = organized;

    if (result.status === "empty") {
      captureError.textContent = result.message;
      input.focus();
      return;
    }

    const saveBlocker = getOrganizedResultSaveBlocker(result, rawText);
    if (saveBlocker) {
      captureError.textContent = getSaveBlockerMessage(saveBlocker);
      setStatus("这版没有保存");
      input.focus();
      return;
    }

    const savedBatch = store.saveOrganizedResult(currentUser.id, rawText, result);
    input.value = "";
    updateInputCount();
    recentOrganizedBatchId = savedBatch.batch.id;
    recentOrganizedRawText = savedBatch.batch.rawText;
    hide(resplitPanel);
    focusedItemId = null;
    completionVisible = false;
    renderHome();
    showToast(
      organized.source === "fallback" ? "本地 AI 没赶上，已先用快速拆分保存" : "已经保存在这台设备上",
      "去看看",
      () => navigate("#items"),
    );
    reportCloudSync(store.flush(), {
      successMessage: isLocalPrototypeHost ? "" : "云端同步好了",
    });
    return savedBatch;
  } catch (error) {
    if (error.message === "nothing_to_save") {
      captureError.textContent = "这些想法已经保存过了，没有重复新增。";
      setStatus("已经在全部想法里");
      input.focus();
      return;
    }

    captureError.textContent = "刚才没有保存成功，可以再试一次。";
    setStatus("输入还在，可以重试");
    return null;
  } finally {
    setBusy("organize", false);
  }
}

function undoRecentOrganization({ restoreInput = false, rerender = true } = {}) {
  if (!currentUser || !recentOrganizedBatchId) {
    renderHome();
    return;
  }

  const rawText = recentOrganizedRawText;
  const batchId = recentOrganizedBatchId;
  const batchItems = getUserState().items.filter((item) => item.batchId === batchId);

  try {
    batchItems.forEach((item) => store.softDeleteItem(currentUser.id, item.id));
    recentOrganizedBatchId = null;
    recentOrganizedRawText = "";
    focusedItemId = null;
    completionVisible = false;

    if (restoreInput && rawText) {
      input.value = rawText;
      updateInputCount();
    }

    if (rerender) {
      navigate("#home");
      renderHome();
    }
    reportCloudSync(store.flush());
  } catch {
    setStatus("刚才没有撤销成功，可以再试一次");
  }
}

function restartRecentOrganization() {
  if (!hasRecentOrganizedPreview()) {
    navigate("#items");
    return;
  }

  resplitPanel.classList.toggle("is-hidden");
}

async function resplitRecentOrganization(strategy) {
  if (isBusy("organize")) {
    return;
  }

  if (!hasRecentOrganizedPreview()) {
    navigate("#items");
    return;
  }

  const rawText = recentOrganizedRawText;
  const previousBatchId = recentOrganizedBatchId;
  const strategyLabel = resplitStrategyLabels[strategy] ?? "重新拆分";
  let deletedItemIds = [];

  if (!rawText.trim()) {
    captureError.textContent = "没有找到上次输入的原文，可以直接在输入框里重新写一遍。";
    hide(resplitPanel);
    return;
  }

  try {
    setBusy("organize", true);
    setStatus(`正在用「${strategyLabel}」重新整理`);
    captureError.textContent = "";

    const organized = await organizeWithLocalAi(rawText, { strategy });
    const { result } = organized;

    const saveBlocker = getOrganizedResultSaveBlocker(result, rawText);
    if (saveBlocker) {
      captureError.textContent = getSaveBlockerMessage(saveBlocker);
      setStatus("这版没有保存，上一次整理还在");
      hide(resplitPanel);
      return;
    }

    const previousItems = getUserState().items.filter((item) => item.batchId === previousBatchId);
    previousItems.forEach((item) => store.softDeleteItem(currentUser.id, item.id));
    deletedItemIds = previousItems.map((item) => item.id);

    const savedBatch = store.saveOrganizedResult(currentUser.id, rawText, result);
    input.value = "";
    updateInputCount();
    recentOrganizedBatchId = savedBatch.batch.id;
    recentOrganizedRawText = savedBatch.batch.rawText;
    focusedItemId = null;
    completionVisible = false;
    hide(resplitPanel);
    renderHome();
    showToast(
      organized.source === "fallback" ? `本地 AI 没赶上，已先用「${strategyLabel}」快速拆分` : `已用「${strategyLabel}」重新拆分`,
      "去看看",
      () => navigate("#items"),
    );
    reportCloudSync(store.flush());
  } catch (error) {
    deletedItemIds.forEach((itemId) => {
      try {
        store.undoDelete(currentUser.id, itemId);
      } catch {
        // Keep going so one restore failure does not block the rest.
      }
    });
    recentOrganizedBatchId = previousBatchId;
    recentOrganizedRawText = rawText;
    captureError.textContent = error.message === "nothing_to_save"
      ? "这次没有生成新的拆分结果，上一次整理还在。"
      : "刚才重新拆分没有成功，上一次整理还在。";
    setStatus("可以换个拆法再试一次");
    renderHome();
  } finally {
    setBusy("organize", false);
  }
}

async function regenerateDetailSteps() {
  if (isBusy("regenerateSteps")) {
    return;
  }

  const detailRoute = parseDetailHash();
  const item = detailRoute ? findVisibleItem(detailRoute.itemId) : null;
  const strategy = detailRegenerateStrategies[detailRegenerateIndex % detailRegenerateStrategies.length];
  detailRegenerateIndex += 1;
  const rawText = [
    detailTitleInput.value,
    item?.source,
    detailReasonInput.value,
  ]
    .filter(Boolean)
    .join("，");

  if (!rawText.trim()) {
    detailError.textContent = "先留一个标题，再重新生成小步骤。";
    return;
  }

  try {
    setBusy("regenerateSteps", true);
    regenerateStepsButton.textContent = "生成中…";
    previousDetailStepsSnapshot = getDetailStepSnapshot();
    const organized = await organizeWithLocalAi(rawText, { strategy });
    const { result } = organized;
    const saveBlocker = getOrganizedResultSaveBlocker(result, rawText);
    if (saveBlocker) {
      detailError.textContent = getSaveBlockerMessage(saveBlocker);
      return;
    }

    const candidate = result.items?.[0] ?? result.suggestions?.[0] ?? result.suggestion;
    const steps = candidate?.focusSteps?.length ? candidate.focusSteps : candidate?.steps;

    if (!Array.isArray(steps) || steps.length === 0) {
      detailError.textContent = "这次没有生成合适的小步骤，可以手动新增。";
      return;
    }

    detailSteps.replaceChildren();
    steps.slice(0, 5).forEach((step) => addStepInput(step));
    detailError.textContent = "";
    detailSuccess.textContent = "";
    detailRegenerateMessage.textContent = organized.source === "fallback"
      ? `本地 AI 没赶上，已按「${resplitStrategyLabels[strategy]}」快速生成，保存后生效。`
      : `已按「${resplitStrategyLabels[strategy]}」重新生成，保存后生效。`;
    show(detailRegenerateStatus);
  } finally {
    setBusy("regenerateSteps", false);
    regenerateStepsButton.textContent = "重新生成";
  }
}

function undoRegeneratedDetailSteps() {
  if (!previousDetailStepsSnapshot) {
    return;
  }

  renderDetailStepSnapshot(previousDetailStepsSnapshot);
  hideDetailRegenerateStatus();
  detailError.textContent = "";
  detailSuccess.textContent = "已撤销本次生成。";
}

function runItemAction(action, { afterSuccess, scope = "itemAction" } = {}) {
  if (isBusy(scope)) {
    return;
  }

  try {
    setBusy(scope, true);
    action();
    completionVisible = false;
    afterSuccess?.();
    renderRoute();
    reportCloudSync(store.flush());
  } catch {
    setStatus("刚才没有保存成功，可以重试");
    manualAddError.textContent = "刚才没有保存成功，可以重试。";
  } finally {
    setBusy(scope, false);
  }
}

function completeItem(itemId) {
  const shouldShowCompletion = focusedItemId === itemId || window.location.hash === "#home";
  runItemAction(
    () => store.updateItem(currentUser.id, itemId, { status: "done" }),
    {
      scope: "focusDone",
      afterSuccess: () => {
        if (shouldShowCompletion) {
          focusedItemId = null;
          completionVisible = true;
          navigate("#home");
        }
      },
    },
  );
}

function deleteItem(itemId) {
  const scope = `delete:${itemId}`;
  if (isBusy(scope)) {
    return;
  }

  try {
    setBusy(scope, true);
    store.softDeleteItem(currentUser.id, itemId);
    deletedItemId = itemId;
    undoMessage.textContent = "已删除";
    show(undoToast);
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => {
      hide(undoToast);
      deletedItemId = null;
    }, 5000);
    renderRoute();
    reportCloudSync(store.flush());
  } catch {
    manualAddError.textContent = "刚才没有删除成功，可以重试。";
  } finally {
    setBusy(scope, false);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  try {
    setBusy("auth", true);
    const credentials = {
      accountName: accountInput.value,
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      displayName: displayNameInput.value,
    };
    currentUser = authMode === "register" ? await store.register(credentials) : await store.login(credentials);
    accountInput.value = "";
    passwordInput.value = "";
    confirmPasswordInput.value = "";
    displayNameInput.value = "";
    navigate("#home");
  } catch (error) {
    if (error.message === "empty_password") {
      loginError.textContent = "先输入密码。";
      passwordInput.focus();
      return;
    }

    if (error.message === "password_mismatch") {
      loginError.textContent = "两次输入的密码不一致。";
      confirmPasswordInput.focus();
      return;
    }

    if (error.message === "account_exists") {
      loginError.textContent = "这个用户名已经注册过了，可以直接登录。";
      authMode = "login";
      renderAuthMode();
      passwordInput.focus();
      return;
    }

    if (error.message === "invalid_credentials") {
      loginError.textContent = "用户名或密码不对。";
      passwordInput.focus();
      return;
    }

    if (error.message === "User already registered") {
      loginError.textContent = "这个用户名已经注册过了，可以直接登录。";
      authMode = "login";
      renderAuthMode();
      passwordInput.focus();
      return;
    }

    if (error.message === "Email not confirmed" || error.message === "email_not_confirmed") {
      loginError.textContent = "这个账号已创建，但 Supabase 还要求邮箱确认。需要先关闭 Confirm Email。";
      accountInput.focus();
      return;
    }

    if (error.message === "email_confirmation_required") {
      loginError.textContent = "账号已到云端，但 Supabase 还开着邮箱确认。关闭 Confirm Email 后再试。";
      accountInput.focus();
      return;
    }

    if (error.message === "invalid_username") {
      loginError.textContent = "用户名用 3-40 位字母、数字、点、下划线或短横线。";
      accountInput.focus();
      return;
    }

    if (error.message === "email_address_invalid") {
      loginError.textContent = "这个用户名暂时不能注册，换一个字母或数字开头的用户名试试。";
      accountInput.focus();
      return;
    }

    if (error.message === "over_email_send_rate_limit") {
      loginError.textContent = "注册请求太频繁了，先等一分钟再试。";
      passwordInput.focus();
      return;
    }

    loginError.textContent = "刚才没有注册成功，可以换个用户名或稍后再试。";
    passwordInput.focus();
  } finally {
    setBusy("auth", false);
  }
});

loginModeButton.addEventListener("click", () => {
  authMode = "login";
  renderAuthMode();
});

registerModeButton.addEventListener("click", () => {
  authMode = "register";
  renderAuthMode();
});

demoButton.addEventListener("click", async () => {
  loginError.textContent = "";

  try {
    setBusy("auth", true);
    currentUser = await store.enterDemo();
    accountInput.value = "";
    passwordInput.value = "";
    confirmPasswordInput.value = "";
    displayNameInput.value = "";
    navigate("#home");
  } catch {
    loginError.textContent = "Demo 暂时没有进入成功，可以稍后再试。";
  } finally {
    setBusy("auth", false);
  }
});

logoutButton.addEventListener("click", async () => {
  await store.logout();
  currentUser = null;
  focusedItemId = null;
  completionVisible = false;
  navigate("#home");
  renderRoute();
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.tabTarget) {
      activeItemTab = button.dataset.tabTarget;
    }

    if (button.dataset.nav === "home") {
      focusedItemId = null;
      completionVisible = false;
      navigate("#home");
      return;
    }

    if (button.dataset.nav === "items") {
      navigate("#items");
    }
  });
});

viewAllThoughtsButton.addEventListener("click", () => {
  if (hasRecentOrganizedPreview()) {
    restartRecentOrganization();
    return;
  }

  navigate("#items");
});

resplitStrategyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    resplitRecentOrganization(button.dataset.resplitStrategy);
  });
});

cancelResplitButton.addEventListener("click", () => {
  hide(resplitPanel);
});

undoRecentOrganizeButton.addEventListener("click", () => {
  undoRecentOrganization({ restoreInput: true });
});

sidebarToggle.addEventListener("click", () => {
  appShell.classList.toggle("is-sidebar-collapsed");
});

input.addEventListener("input", updateInputCount);
organizeButton.addEventListener("click", organizeCurrentInput);
voiceButton.addEventListener("click", () => {
  if (!voiceController || voiceButton.disabled) {
    return;
  }

  voiceController.toggle();
});

itemTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeItemTab = tab.dataset.tab;
    renderItems();
  });
});

lookButton.addEventListener("click", () => {
  const recommendation = getHomeRecommendation();
  if (!recommendation) {
    renderHome();
    return;
  }

  focusedItemId = recommendation.id;
  completionVisible = false;
  renderHome();
});

skipButton.addEventListener("click", () => {
  const recommendation = getHomeRecommendation();
  if (!recommendation) {
    renderHome();
    return;
  }

  const wasRecentRecommendation = recommendation.batchId === recentOrganizedBatchId;
  runItemAction(() => store.skipItem(currentUser.id, recommendation.id), {
    scope: "skip",
    afterSuccess: () => {
      if (wasRecentRecommendation) {
        recentOrganizedBatchId = null;
      }
    },
  });
});

focusDetailButton.addEventListener("click", () => {
  if (focusedItemId) {
    navigate(createDetailHash(focusedItemId, "home"));
  }
});

focusDoneButton.addEventListener("click", () => {
  if (focusedItemId) {
    completeItem(focusedItemId);
  }
});

restButton.addEventListener("click", () => {
  completionVisible = false;
  renderHome();
});

seeAnotherButton.addEventListener("click", () => {
  completionVisible = false;
  renderHome();
});

restoreCandidateButton.addEventListener("click", () => {
  const candidate = store.getParkingCandidate(currentUser.id);
  if (!candidate) {
    renderHome();
    return;
  }

  runItemAction(() => store.updateItem(currentUser.id, candidate.id, { status: "active" }), { scope: "restoreCandidate" });
});

keepParkedButton.addEventListener("click", () => {
  const candidate = store.getParkingCandidate(currentUser.id);
  if (!candidate) {
    renderHome();
    return;
  }

  runItemAction(() => store.snoozeParkingCandidate(currentUser.id, candidate.id), { scope: "keepParked" });
});

manualAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  manualAddError.textContent = "";

  try {
    setBusy("manualAdd", true);
    store.addItem(currentUser.id, { title: manualTitleInput.value, priority: "medium" });
    manualTitleInput.value = "";
    renderItems();
    reportCloudSync(store.flush());
  } catch {
    manualAddError.textContent = "先写一个想法标题。";
    manualTitleInput.focus();
  } finally {
    setBusy("manualAdd", false);
  }
});

undoButton.addEventListener("click", () => {
  if (!deletedItemId) {
    return;
  }

  try {
    setBusy("undoDelete", true);
    store.undoDelete(currentUser.id, deletedItemId);
    undoMessage.textContent = "已撤销";
    deletedItemId = null;
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => hide(undoToast), 1200);
    renderRoute();
    reportCloudSync(store.flush());
  } catch {
    undoMessage.textContent = "撤销没有成功，可以刷新后再看。";
  } finally {
    setBusy("undoDelete", false);
  }
});

regenerateStepsButton.addEventListener("click", regenerateDetailSteps);
undoRegenerateStepsButton.addEventListener("click", undoRegeneratedDetailSteps);
addStepButton.addEventListener("click", () => addStepInput(""));
detailBackButton.addEventListener("click", () => {
  const detailRoute = parseDetailHash();
  navigate(getDetailReturnHash(detailRoute?.from));
});

detailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  detailError.textContent = "";
  detailSuccess.textContent = "";

  const detailRoute = parseDetailHash();
  const itemId = detailRoute?.itemId ?? "";
  const from = detailRoute?.from ?? "items";
  const stepRows = [...detailSteps.querySelectorAll(".step-input-row")];
  const steps = [];
  const completedStepIndexes = [];

  stepRows.forEach((row) => {
    const stepInput = row.querySelector(".text-input");
    const completedInput = row.querySelector(".step-complete-input");
    const value = stepInput.value.trim();
    if (!value) {
      return;
    }

    if (completedInput.checked) {
      completedStepIndexes.push(steps.length);
    }
    steps.push(value);
  });

  if (!detailTitleInput.value.trim()) {
    detailError.textContent = "标题先留一句话。";
    detailTitleInput.focus();
    return;
  }

  if (steps.length === 0) {
    detailError.textContent = "至少留一个小步骤。";
    return;
  }

  try {
    setBusy("detailSave", true);
    store.updateItem(currentUser.id, itemId, {
      title: detailTitleInput.value,
      priority: detailPriorityInput.value,
      status: detailStatusInput.value,
      dueAt: detailDueAtInput.value,
      tags: detailTagsInput.value,
      reason: detailReasonInput.value,
      parkingReason: detailParkingReasonInput.value,
      steps,
      completedStepIndexes,
    });
    renderDetail(itemId, { from });
    detailSuccess.textContent = "已保存在这台设备上，正在同步云端…";
    store.flush()
      .then(() => {
        if (parseDetailHash()?.itemId === itemId) {
          detailSuccess.textContent = "已保存到云端";
        }
      })
      .catch(() => {
        if (parseDetailHash()?.itemId === itemId) {
          detailError.textContent = "内容已保存在这台设备上，云端暂时没连上。";
          detailSuccess.textContent = "";
        }
      });
  } catch {
    detailError.textContent = "刚才没有保存成功，可以再试一次。";
  } finally {
    setBusy("detailSave", false);
  }
});

window.addEventListener("hashchange", renderRoute);
setupVoiceInput();
updateInputCount();
renderAuthMode();
renderRoute();
