import {
  getOrganizedResultSaveBlocker,
  organizeThoughtsWithAi,
} from "./ai-organizer.mjs";
import { createMindFlowCloudStore } from "./cloud-store.mjs";
import { priorityLabels } from "./store.mjs";
import { createVoiceInputController } from "./voice-input.mjs";

const store = createMindFlowCloudStore();
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
let voiceController = null;
let authMode = "login";
const ITEM_PAGE_SIZE = 100;
const itemVisibleLimits = {
  active: ITEM_PAGE_SIZE,
  parking: ITEM_PAGE_SIZE,
  done: ITEM_PAGE_SIZE,
};

async function serverAiClient({ rawText }) {
  const response = await fetch("/api/organize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText }),
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

function showView(name) {
  Object.values(views).forEach((view) => view.classList.add("is-hidden"));
  show(views[name]);
  appShell.classList.toggle("is-login-shell", name === "login");
  topActions.classList.toggle("is-hidden", name === "login");
  const displayName = currentUser ? currentUser.name : "今天";
  todayLabel.textContent = displayName;
  sidebarUserName.textContent = displayName;
  navButtons.forEach((button) => {
    const isActive = button.dataset.nav === name || (name === "detail" && button.dataset.nav === "items");
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
  manualAddButton.disabled = isBusy("manualAdd");
  detailSaveButton.disabled = isBusy("detailSave");
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

function createHomeThoughtRow(item, { completed = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `home-thought-row ${completed ? "is-completed" : ""}`;
  button.addEventListener("click", () => navigate(`#detail/${item.id}`));

  const dot = document.createElement("span");
  dot.className = `row-dot ${statusTone(item.status)}`;
  dot.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "row-text";
  const title = document.createElement("strong");
  title.textContent = item.title;
  const meta = document.createElement("span");
  meta.textContent = completed ? relativeTime(item.completedAt) : `${relativeTime(item.updatedAt || item.createdAt)} · 来自记一笔`;
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
    homeThoughtsList.replaceChildren();
    homeCompletedList.replaceChildren();
    homeThoughtsCount.textContent = "共 0 条想法";
    recentCompletedCount.textContent = "0";
    sidebarCompletedCount.textContent = "0";
    return;
  }

  const items = itemsOverride ?? getUserState().items;
  const visible = [...items].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const openItems = visible.filter((item) => item.status !== "done").slice(0, 5);
  const completedItems = visible
    .filter((item) => item.status === "done")
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0));

  homeThoughtsList.replaceChildren(
    ...(openItems.length ? openItems.map((item) => createHomeThoughtRow(item)) : [createEmptyState("还没有保存的想法。")]),
  );
  homeCompletedList.replaceChildren(
    ...(completedItems.length
      ? completedItems.slice(0, 2).map((item) => createHomeThoughtRow(item, { completed: true }))
      : [createEmptyState("完成后会轻轻放在这里。")]),
  );
  homeThoughtsCount.textContent = `共 ${items.length} 条想法`;
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

  const recommendation = store.getRecommendation(currentUser.id);
  if (recommendation) {
    setStatus("其他想法都还在，随时可以回来查看。");
    renderRecommendation(recommendation);
    return;
  }

  const candidate = store.getParkingCandidate(currentUser.id);
  if (candidate) {
    setStatus("Active 暂时空着，Parking 也还在");
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
  eyebrow.textContent = item.status === "parking" ? "Parking" : item.status === "done" ? "Done" : "Active";
  const chip = document.createElement("span");
  chip.textContent = priorityLabels[item.priority];
  meta.append(eyebrow, chip);

  const title = document.createElement("h3");
  title.textContent = item.title;

  const reason = document.createElement("p");
  reason.className = "reason";
  reason.textContent = item.status === "parking" ? item.parkingReason : item.reason;

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

  const detailButton = createButton("详情", "secondary-button card-action-button", () => navigate(`#detail/${item.id}`));
  const deleteButton = createButton("删除", "secondary-button card-action-button card-action-muted", () => deleteItem(item.id));
  controls.append(detailButton);

  if (item.status === "active") {
    controls.append(
      createButton("Park", "secondary-button card-action-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "parking" }))),
      deleteButton,
      createButton("完成", "primary-action-button card-action-button card-action-primary", () => completeItem(item.id)),
    );
  } else if (item.status === "parking") {
    controls.append(
      deleteButton,
      createButton("移到 Active", "primary-action-button card-action-button card-action-primary", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
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
  active: "Active 里暂时没有想法。",
  parking: "Parking 里暂时是空的。",
  done: "Done 里暂时没有归档。",
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

function renderDetail(itemId) {
  const item = findVisibleItem(itemId);
  if (!item) {
    navigate("#items");
    return;
  }

  showView("detail");
  detailTitleInput.value = item.title;
  detailPriorityInput.value = item.priority;
  detailStatusInput.value = item.status;
  detailDueAtInput.value = item.dueAt || "";
  detailTagsInput.value = Array.isArray(item.tags) ? item.tags.join(", ") : "";
  detailReasonInput.value = item.reason || "";
  detailParkingReasonInput.value = item.parkingReason || "";
  detailError.textContent = "";
  detailSuccess.textContent = "";
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
    renderDetail(hash.replace("#detail/", ""));
  } else if (hash === "#items") {
    renderItems();
  } else {
    renderHome();
  }
}

async function organizeCurrentInput() {
  if (isBusy("organize")) {
    return;
  }

  const rawText = input.value.trim();
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
    setStatus("正在帮你分开这些想法");
    const result = await organizeThoughtsWithAi(rawText, {
      aiClient: serverAiClient,
      preferLocalFast: true,
    });

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

    store.saveOrganizedResult(currentUser.id, rawText, result);
    input.value = "";
    updateInputCount();
    focusedItemId = null;
    completionVisible = false;
    renderHome();
    showToast("已经保存在这台设备上", "去看看", () => navigate("#items"));
    reportCloudSync(store.flush(), {
      successMessage: "云端同步好了",
    });
  } catch (error) {
    if (error.message === "nothing_to_save") {
      captureError.textContent = "这些想法已经保存过了，没有重复新增。";
      setStatus("已经在全部想法里");
      input.focus();
      return;
    }

    captureError.textContent = "刚才没有保存成功，可以再试一次。";
    setStatus("输入还在，可以重试");
  } finally {
    setBusy("organize", false);
  }
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
  const recommendation = store.getRecommendation(currentUser.id);
  if (!recommendation) {
    renderHome();
    return;
  }

  focusedItemId = recommendation.id;
  completionVisible = false;
  renderHome();
});

skipButton.addEventListener("click", () => {
  const recommendation = store.getRecommendation(currentUser.id);
  if (!recommendation) {
    renderHome();
    return;
  }

  runItemAction(() => store.skipItem(currentUser.id, recommendation.id), { scope: "skip" });
});

focusDetailButton.addEventListener("click", () => {
  if (focusedItemId) {
    navigate(`#detail/${focusedItemId}`);
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

addStepButton.addEventListener("click", () => addStepInput(""));
detailBackButton.addEventListener("click", () => navigate("#items"));

detailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  detailError.textContent = "";
  detailSuccess.textContent = "";

  const itemId = window.location.hash.replace("#detail/", "");
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
    renderDetail(itemId);
    detailSuccess.textContent = "已保存在这台设备上，正在同步云端…";
    store.flush()
      .then(() => {
        if (window.location.hash === `#detail/${itemId}`) {
          detailSuccess.textContent = "已保存到云端";
        }
      })
      .catch(() => {
        if (window.location.hash === `#detail/${itemId}`) {
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
