import {
  createLocalSemanticResult,
  getOrganizedResultSaveBlocker,
  organizeThoughtsWithAi,
} from "./ai-organizer.mjs";
import { createMindFlowCloudStore } from "./cloud-store.mjs";
import { getLocalDayDelta, parseDeadlineValue } from "./deadline-utils.mjs";
import { getItemPriorityScore, priorityLabels } from "./store.mjs";
import { createVoiceInputController } from "./voice-input.mjs?v=20260812-voice-simplified";

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
const languageToggle = document.querySelector("#language-toggle");
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
const voiceWaveform = document.querySelector("#voice-waveform");
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
const detailDueDateInput = document.querySelector("#detail-due-date-input");
const detailDueTimeInput = document.querySelector("#detail-due-time-input");
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

const LANGUAGE_STORAGE_KEY = "mindflow:language";
const DEFAULT_LANGUAGE = "zh-CN";
const LANGUAGE_OPTIONS = ["zh-CN", "en-US"];
const TRANSFORMERS_JS_CDN_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";
const OPENCC_JS_CDN_URL = "https://cdn.jsdelivr.net/npm/opencc-js@1.4.1/dist/esm/full.js";
const WHISPER_MODEL = "onnx-community/whisper-base";
const copy = {
  "zh-CN": {
    "document.title": "MindFlow2.0 Prototype",
    "brand.name": "MindFlow",
    "language.toggle": "EN",
    "language.toggleAria": "切换到英文",
    "language.toggleTitle": "切换到英文",
    "sidebar.aria": "主导航",
    "sidebar.collapseAria": "收起侧栏",
    "sidebar.collapseTitle": "收起",
    "sidebar.collapseTooltip": "收起",
    "nav.main": "主要页面",
    "nav.home": "首页",
    "nav.items": "全部想法",
    "nav.completed": "最近完成",
    "user.localSpace": "本地空间",
    "today": "今天",
    "logout.aria": "退出登录",
    "logout": "退出",
    "login.title": "登录 MindFlow",
    "auth.entry": "账号入口",
    "auth.login": "登录",
    "auth.register": "注册账号",
    "auth.username": "用户名",
    "auth.password": "密码",
    "auth.confirmPassword": "确认密码",
    "auth.displayName": "显示名",
    "auth.displayNamePlaceholder": "可选",
    "auth.loginSubmit": "登录 MindFlow",
    "auth.registerSubmit": "注册并进入",
    "auth.demo": "Demo 体验",
    "auth.localSupporting": "注册一个本机账号，数据只保存在这台电脑当前浏览器里。",
    "home.title": "先不用想清楚",
    "home.supporting": "想到什么都可以先放在这里。",
    "capture.aria": "记一笔",
    "capture.title": "记一笔",
    "capture.label": "写下想到的事",
    "capture.placeholder": "例：牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦...",
    "capture.focusTitle": "先放一下",
    "capture.focusPlaceholder": "不用打断现在这件事。",
    "capture.submit": "帮我捋一捋",
    "capture.busy": "整理中…",
    "suggestion.label": "也许可以先看这个",
    "suggestion.nextStepAria": "下一步",
    "suggestion.nextStepLabel": "可以小到这一步",
    "suggestion.defaultTitle": "给牙医打电话预约",
    "suggestion.defaultNextStep": "打开通讯录，找到诊所电话。",
    "suggestion.defaultReason": "它比较清楚，不需要一次处理太多。",
    "suggestion.defaultStep": "先写下一个小步骤。",
    "suggestion.skip": "先不管",
    "suggestion.look": "看一下",
    "status.default": "其他想法都还在，随时可以回来查看。",
    "candidate.label": "先放着里有一件",
    "candidate.optional": "可选",
    "candidate.defaultTitle": "看一下保险那件事",
    "candidate.defaultReason": "先安全放着。",
    "candidate.keep": "继续放着",
    "candidate.restore": "移到现在看",
    "focus.label": "只看这一件",
    "focus.current": "当前",
    "focus.stepsAria": "小步骤",
    "focus.detail": "去详情",
    "focus.done": "完成这件",
    "done.label": "这件完成了",
    "done.status": "已完成",
    "done.title": "先放轻一点",
    "done.rest": "先休息一下",
    "done.next": "再看一件",
    "toast.saved": "已经帮你保存好了",
    "toast.go": "去看看",
    "home.priority": "优先处理",
    "home.viewAll": "查看全部 ›",
    "home.recentOrganized": "刚刚整理",
    "home.resplit": "重新拆分",
    "home.priorityEmpty": "暂时没有需要优先处理的想法。",
    "home.completedEmpty": "完成后会轻轻放在这里。",
    "home.savedCount": ({ count }) => `这次保存 ${count} 条，可撤销`,
    "home.priorityCount": ({ count }) => `已显示 ${count} 条优先处理`,
    "home.zeroPriorityCount": "已显示 0 条优先处理",
    "home.completedTitle": "最近完成",
    "home.viewCompleted": "查看全部完成 ›",
    "resplit.aria": "重新拆分方式",
    "resplit.title": "换一种拆法",
    "resplit.sequence": "按顺序拆",
    "resplit.finer": "拆得更细",
    "resplit.missing": "查漏补缺",
    "resplit.cancel": "取消",
    "resplit.undo": "撤销本次整理",
    "items.title": "这些都在",
    "items.supporting": "想法还在，你可以慢慢处理。",
    "manual.label": "新增想法",
    "manual.placeholder": "临时补一件事",
    "manual.add": "新增",
    "tabs.aria": "想法状态",
    "status.active": "现在看",
    "status.parking": "先放着",
    "status.done": "已完成",
    "empty.active": "现在看里暂时没有想法。",
    "empty.parking": "先放着里暂时是空的。",
    "empty.done": "已完成里暂时没有归档。",
    "detail.eyebrow": "想法详情",
    "detail.title": "编辑这一件",
    "detail.titleLabel": "标题",
    "detail.priority": "优先级",
    "detail.status": "状态",
    "detail.dueAt": "截止时间",
    "detail.dueAtPlaceholder": "例：2026-08-04T18:00:00+08:00",
    "detail.tags": "标签",
    "detail.tagsPlaceholder": "用逗号分隔，例如：申请, 材料",
    "detail.reason": "推荐理由",
    "detail.parkingReason": "先放着的原因",
    "detail.steps": "小步骤",
    "detail.regenerate": "重新生成",
    "detail.generating": "生成中…",
    "detail.addStep": "新增一步",
    "detail.regenerated": "已重新生成，保存后生效。",
    "detail.undoRegenerate": "撤销本次生成",
    "detail.backHome": "返回首页",
    "detail.backItems": "返回全部想法",
    "detail.save": "保存",
    "detail.stepCompleteAria": "完成这个小步骤",
    "detail.stepAria": "小步骤",
    "detail.deleteStep": "删除",
    "detail.defaultNextOpenStep": "打开详情，把下一步补清楚。",
    "meta.due": ({ dueAt }) => `截止 ${dueAt}`,
    "meta.dueOverdue": ({ date }) => `已过期 · ${date}`,
    "meta.dueToday": ({ time }) => `今天截止 · ${time}`,
    "meta.dueTomorrow": ({ time }) => `明天截止 · ${time}`,
    "meta.dueInDays": ({ count, date }) => `${count} 天后截止 · ${date}`,
    "meta.dueDate": ({ date }) => `截止 ${date}`,
    "meta.bigEvent": "大事件",
    "card.nextStep": ({ step }) => `下一步：${step}`,
    "card.detail": "详情",
    "card.delete": "删除",
    "card.complete": "完成",
    "card.restore": "恢复",
    "list.loadMore": ({ count }) => `再显示 ${count} 条`,
    "time.justNow": "刚刚",
    "time.minutesAgo": ({ count }) => `${count} 分钟前`,
    "time.hoursAgo": ({ count }) => `${count} 小时前`,
    "time.yesterday": "昨天",
    "sync.retrying": "正在重新同步云端",
    "sync.ready": "云端同步好了",
    "sync.localOnly": "已保存在这台设备上，云端暂时没连上",
    "sync.stillOffline": "云端还是没有连上",
    "sync.retry": "重试同步",
    "errors.fallbackResult": "这次没有连上语义整理，我没有保存这版。输入还在，可以重试。",
    "errors.overSplit": "这次拆得太细，我没有自动保存。输入还在，可以重试。",
    "errors.missingEvidence": "这次没有拿到可追溯的语义拆解，我没有保存这版。输入还在，可以重试。",
    "errors.genericNextStep": "这次下一步太泛了，我没有保存这版。输入还在，可以重试。",
    "errors.organizeFailed": "这次没有整理好，我没有保存这版。输入还在，可以重试。",
    "status.doneVisible": "这件完成了",
    "status.otherIdeas": "其他想法都还在",
    "status.parkingAvailable": "现在看暂时空着，先放着也还在",
    "status.start": "想到什么都可以先放在这里。",
    "status.organizing": "正在帮你分开这些想法",
    "status.resplitting": ({ strategy }) => `正在${strategy}`,
    "status.versionNotSaved": "这版没有保存",
    "status.alreadySaved": "已经在全部想法里",
    "status.inputStillHere": "输入还在，可以重试",
    "toast.fallbackSaved": "本地 AI 没赶上，已先用快速拆分保存",
    "toast.localSaved": "AI 已整理并保存",
    "errors.emptyInput": "想到什么都可以先放在这里。",
    "errors.tooLong": "这次先放 500 个字以内，比较好整理。",
    "errors.duplicates": "这些想法已经保存过了，没有重复新增。",
    "errors.saveFailed": "刚才没有保存成功，可以再试一次。",
    "errors.undoFailed": "刚才没有撤销成功，可以再试一次",
    "errors.noRawText": "没有找到上次输入的原文，可以直接在输入框里重新写一遍。",
    "status.resplittingWith": ({ strategy }) => `正在用「${strategy}」重新整理`,
    "status.previousKept": "这版没有保存，上一次整理还在",
    "toast.resplitFallback": ({ strategy }) => `本地 AI 没赶上，已先用「${strategy}」快速拆分`,
    "toast.resplitDone": ({ strategy }) => `已用「${strategy}」重新拆分`,
    "errors.noNewResplit": "这次没有生成新的拆分结果，上一次整理还在。",
    "errors.resplitFailed": "刚才重新拆分没有成功，上一次整理还在。",
    "status.tryAnotherSplit": "可以换个拆法再试一次",
    "errors.needTitleForSteps": "先留一个标题，再重新生成小步骤。",
    "errors.noGeneratedSteps": "这次没有生成合适的小步骤，可以手动新增。",
    "detail.regenerateFallbackDone": ({ strategy }) => `本地 AI 没赶上，已按「${strategy}」快速生成，保存后生效。`,
    "detail.regenerateDone": ({ strategy }) => `已按「${strategy}」重新生成，保存后生效。`,
    "detail.regenerateUndone": "已撤销本次生成。",
    "errors.actionSaveFailedStatus": "刚才没有保存成功，可以重试",
    "errors.actionSaveFailed": "刚才没有保存成功，可以重试。",
    "toast.deleted": "已删除",
    "errors.deleteFailed": "刚才没有删除成功，可以重试。",
    "auth.emptyPassword": "先输入密码。",
    "auth.passwordMismatch": "两次输入的密码不一致。",
    "auth.accountExists": "这个用户名已经注册过了，可以直接登录。",
    "auth.invalidCredentials": "用户名或密码不对。",
    "auth.emailNotConfirmed": "这个账号已创建，但 Supabase 还要求邮箱确认。需要先关闭 Confirm Email。",
    "auth.emailConfirmationRequired": "账号已到云端，但 Supabase 还开着邮箱确认。关闭 Confirm Email 后再试。",
    "auth.invalidUsername": "用户名用 3-40 位字母、数字、点、下划线或短横线。",
    "auth.emailAddressInvalid": "这个用户名暂时不能注册，换一个字母或数字开头的用户名试试。",
    "auth.rateLimited": "注册请求太频繁了，先等一分钟再试。",
    "auth.registerFailed": "刚才没有注册成功，可以换个用户名或稍后再试。",
    "auth.demoFailed": "Demo 暂时没有进入成功，可以稍后再试。",
    "errors.manualTitle": "先写一个想法标题。",
    "toast.undone": "已撤销",
    "errors.undoRefresh": "撤销没有成功，可以刷新后再看。",
    "errors.detailTitle": "标题先留一句话。",
    "errors.detailSteps": "至少留一个小步骤。",
    "detail.syncing": "已保存在这台设备上，正在同步云端…",
    "detail.cloudSaved": "已保存到云端",
    "detail.cloudFailed": "内容已保存在这台设备上，云端暂时没连上。",
    "voice.unsupported": "这个浏览器暂时不支持语音输入。",
    "voice.localOnlyUnavailable": "为了不上传语音，这个浏览器暂时关闭内置语音。可以用系统键盘麦克风输入。",
    "voice.idle": "语音输入",
    "voice.stop": "停止输入",
    "voice.listening": "",
    "voice.stopped": "",
    "voice.appended": "",
    "voice.startFailed": "刚才没有启动成功，可以再试一次。",
    "voice.unclear": "刚才没有听清，可以再试一次。",
    "voice.notAllowed": "需要允许浏览器使用麦克风。",
    "voice.noMicrophone": "没有找到可用的麦克风。",
    "voice.localLanguageUnavailable": "这个浏览器还没有可用的中文本机语音包。可以用系统键盘麦克风输入。",
    "voice.interimPrefix": "识别中：",
    "voice.paused": "",
    "voice.recording": "正在录音，停止后统一转成文字。",
    "voice.loadingModel": "首次加载语音模型，可能要等一下。",
    "voice.finalizing": "正在转成文字…",
    "voice.finalAdded": "语音文字已放进输入框，可以直接修改。",
    "voice.finalFailed": "高质量转写失败，可以再试一次。",
    "voice.previewFallbackAdded": "高质量转写失败，已保留临时识别。",
    "voice.recordingUnavailable": "这个浏览器暂时不能录音转写。可以用系统键盘麦克风输入。",
  },
  "en-US": {
    "document.title": "MindFlow 2.0 Prototype",
    "brand.name": "MindFlow",
    "language.toggle": "中",
    "language.toggleAria": "Switch to Chinese",
    "language.toggleTitle": "Switch to Chinese",
    "sidebar.aria": "Primary navigation",
    "sidebar.collapseAria": "Collapse sidebar",
    "sidebar.collapseTitle": "Collapse",
    "sidebar.collapseTooltip": "Collapse",
    "nav.main": "Main pages",
    "nav.home": "Home",
    "nav.items": "All thoughts",
    "nav.completed": "Recently completed",
    "user.localSpace": "Local space",
    "today": "Today",
    "logout.aria": "Log out",
    "logout": "Log out",
    "login.title": "Log in to MindFlow",
    "auth.entry": "Account access",
    "auth.login": "Log in",
    "auth.register": "Create account",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm password",
    "auth.displayName": "Display name",
    "auth.displayNamePlaceholder": "Optional",
    "auth.loginSubmit": "Log in to MindFlow",
    "auth.registerSubmit": "Create account",
    "auth.demo": "Try demo",
    "auth.localSupporting": "Create a local account. Data stays in this browser on this computer.",
    "home.title": "No need to sort it out yet",
    "home.supporting": "Drop any thought here first.",
    "capture.aria": "Quick capture",
    "capture.title": "Quick capture",
    "capture.label": "Write down what came to mind",
    "capture.placeholder": "Example: book dentist, clean the room this weekend, check insurance, reply to Alex, paper materials feel messy...",
    "capture.focusTitle": "Park this for later",
    "capture.focusPlaceholder": "No need to interrupt the thing in front of you.",
    "capture.submit": "Help me sort this out",
    "capture.busy": "Sorting…",
    "suggestion.label": "Maybe start here",
    "suggestion.nextStepAria": "Next step",
    "suggestion.nextStepLabel": "Small enough to start",
    "suggestion.defaultTitle": "Call the dentist to book",
    "suggestion.defaultNextStep": "Open contacts and find the clinic number.",
    "suggestion.defaultReason": "It is clear enough and does not require handling everything at once.",
    "suggestion.defaultStep": "Write one smaller next step.",
    "suggestion.skip": "Not now",
    "suggestion.look": "Open",
    "status.default": "The other thoughts are still here. You can come back anytime.",
    "candidate.label": "One parked thought is available",
    "candidate.optional": "Optional",
    "candidate.defaultTitle": "Look at the insurance thing",
    "candidate.defaultReason": "Safely parked for later.",
    "candidate.keep": "Keep parked",
    "candidate.restore": "Move to now",
    "focus.label": "Focus on this one",
    "focus.current": "Current",
    "focus.stepsAria": "Small steps",
    "focus.detail": "Details",
    "focus.done": "Mark done",
    "done.label": "This one is done",
    "done.status": "Done",
    "done.title": "Let it feel lighter",
    "done.rest": "Take a break",
    "done.next": "See another",
    "toast.saved": "Saved for you",
    "toast.go": "View",
    "home.priority": "Priority",
    "home.viewAll": "View all ›",
    "home.recentOrganized": "Just organized",
    "home.resplit": "Split again",
    "home.priorityEmpty": "No priority thoughts for now.",
    "home.completedEmpty": "Completed thoughts will rest here.",
    "home.savedCount": ({ count }) => `Saved ${count} this time. You can undo.`,
    "home.priorityCount": ({ count }) => `Showing ${count} priority thoughts`,
    "home.zeroPriorityCount": "Showing 0 priority thoughts",
    "home.completedTitle": "Recently completed",
    "home.viewCompleted": "View completed ›",
    "resplit.aria": "Split again options",
    "resplit.title": "Try another split",
    "resplit.sequence": "By sequence",
    "resplit.finer": "Make it finer",
    "resplit.missing": "Find gaps",
    "resplit.cancel": "Cancel",
    "resplit.undo": "Undo this organize",
    "items.title": "Everything is still here",
    "items.supporting": "Your thoughts are saved. You can handle them slowly.",
    "manual.label": "Add thought",
    "manual.placeholder": "Add one quick thought",
    "manual.add": "Add",
    "tabs.aria": "Thought status",
    "status.active": "Now",
    "status.parking": "Parked",
    "status.done": "Done",
    "empty.active": "No thoughts to look at right now.",
    "empty.parking": "Nothing is parked for now.",
    "empty.done": "No completed thoughts yet.",
    "detail.eyebrow": "Thought details",
    "detail.title": "Edit this thought",
    "detail.titleLabel": "Title",
    "detail.priority": "Priority",
    "detail.status": "Status",
    "detail.dueAt": "Deadline",
    "detail.dueAtPlaceholder": "Example: 2026-08-04T18:00:00+08:00",
    "detail.tags": "Tags",
    "detail.tagsPlaceholder": "Separate with commas, e.g. application, materials",
    "detail.reason": "Why this is suggested",
    "detail.parkingReason": "Why it is parked",
    "detail.steps": "Small steps",
    "detail.regenerate": "Regenerate",
    "detail.generating": "Generating…",
    "detail.addStep": "Add step",
    "detail.regenerated": "Regenerated. Save to apply.",
    "detail.undoRegenerate": "Undo this generation",
    "detail.backHome": "Back home",
    "detail.backItems": "Back to all thoughts",
    "detail.save": "Save",
    "detail.stepCompleteAria": "Complete this small step",
    "detail.stepAria": "Small step",
    "detail.deleteStep": "Delete",
    "detail.defaultNextOpenStep": "Open details and clarify the next step.",
    "meta.due": ({ dueAt }) => `Due ${dueAt}`,
    "meta.dueOverdue": ({ date }) => `Overdue · ${date}`,
    "meta.dueToday": ({ time }) => `Due today · ${time}`,
    "meta.dueTomorrow": ({ time }) => `Due tomorrow · ${time}`,
    "meta.dueInDays": ({ count, date }) => `Due in ${count} days · ${date}`,
    "meta.dueDate": ({ date }) => `Due ${date}`,
    "meta.bigEvent": "Big event",
    "card.nextStep": ({ step }) => `Next step: ${step}`,
    "card.detail": "Details",
    "card.delete": "Delete",
    "card.complete": "Done",
    "card.restore": "Restore",
    "list.loadMore": ({ count }) => `Show ${count} more`,
    "time.justNow": "Just now",
    "time.minutesAgo": ({ count }) => `${count} min ago`,
    "time.hoursAgo": ({ count }) => `${count} hr ago`,
    "time.yesterday": "Yesterday",
    "sync.retrying": "Retrying cloud sync",
    "sync.ready": "Cloud sync is ready",
    "sync.localOnly": "Saved on this device. Cloud is offline for now.",
    "sync.stillOffline": "Cloud is still offline",
    "sync.retry": "Retry sync",
    "errors.fallbackResult": "Semantic organizing did not connect, so I did not save this version. Your input is still here.",
    "errors.overSplit": "This split was too fine, so I did not auto-save it. Your input is still here.",
    "errors.missingEvidence": "I did not get a traceable semantic split, so I did not save this version. Your input is still here.",
    "errors.genericNextStep": "The next step was too vague, so I did not save this version. Your input is still here.",
    "errors.organizeFailed": "This did not organize cleanly, so I did not save it. Your input is still here.",
    "status.doneVisible": "This one is done",
    "status.otherIdeas": "The other thoughts are still here",
    "status.parkingAvailable": "Nothing is active right now, but parked thoughts are still here",
    "status.start": "Drop any thought here first.",
    "status.organizing": "Separating these thoughts",
    "status.resplitting": ({ strategy }) => `Running ${strategy}`,
    "status.versionNotSaved": "This version was not saved",
    "status.alreadySaved": "Already in all thoughts",
    "status.inputStillHere": "Your input is still here. You can retry.",
    "toast.fallbackSaved": "AI took too long, so a quick split was saved",
    "toast.localSaved": "AI organized and saved",
    "errors.emptyInput": "Drop any thought here first.",
    "errors.tooLong": "Keep this under 500 characters so it is easier to organize.",
    "errors.duplicates": "These thoughts were already saved, so nothing was added twice.",
    "errors.saveFailed": "That did not save. You can try again.",
    "errors.undoFailed": "Undo did not work. Try again.",
    "errors.noRawText": "I could not find the original text. You can write it again in the input.",
    "status.resplittingWith": ({ strategy }) => `Reorganizing with “${strategy}”`,
    "status.previousKept": "This version was not saved. The previous organize is still here.",
    "toast.resplitFallback": ({ strategy }) => `Local AI took too long, so a quick “${strategy}” split was saved`,
    "toast.resplitDone": ({ strategy }) => `Split again with “${strategy}”`,
    "errors.noNewResplit": "No new split was created. The previous organize is still here.",
    "errors.resplitFailed": "Split again did not work. The previous organize is still here.",
    "status.tryAnotherSplit": "You can try another split",
    "errors.needTitleForSteps": "Leave a title first, then regenerate small steps.",
    "errors.noGeneratedSteps": "No useful small steps were generated. You can add one manually.",
    "detail.regenerateFallbackDone": ({ strategy }) => `Local AI took too long, so a quick “${strategy}” version was generated. Save to apply.`,
    "detail.regenerateDone": ({ strategy }) => `Regenerated with “${strategy}”. Save to apply.`,
    "detail.regenerateUndone": "Undid this generation.",
    "errors.actionSaveFailedStatus": "That did not save. You can retry.",
    "errors.actionSaveFailed": "That did not save. You can retry.",
    "toast.deleted": "Deleted",
    "errors.deleteFailed": "That did not delete. You can retry.",
    "auth.emptyPassword": "Enter a password first.",
    "auth.passwordMismatch": "The passwords do not match.",
    "auth.accountExists": "That username already exists. You can log in instead.",
    "auth.invalidCredentials": "The username or password is incorrect.",
    "auth.emailNotConfirmed": "This account was created, but Supabase still requires email confirmation. Turn off Confirm Email first.",
    "auth.emailConfirmationRequired": "The account reached the cloud, but Supabase still has email confirmation on. Turn off Confirm Email and try again.",
    "auth.invalidUsername": "Use 3-40 letters, numbers, dots, underscores, or hyphens.",
    "auth.emailAddressInvalid": "That username cannot be registered right now. Try one that starts with a letter or number.",
    "auth.rateLimited": "Too many registration requests. Wait a minute and try again.",
    "auth.registerFailed": "Registration did not work. Try another username or come back later.",
    "auth.demoFailed": "Demo could not start right now. Try again later.",
    "errors.manualTitle": "Write a thought title first.",
    "toast.undone": "Undone",
    "errors.undoRefresh": "Undo did not work. Refresh and check again.",
    "errors.detailTitle": "Leave one sentence as the title.",
    "errors.detailSteps": "Keep at least one small step.",
    "detail.syncing": "Saved on this device. Syncing cloud…",
    "detail.cloudSaved": "Saved to cloud",
    "detail.cloudFailed": "Content is saved on this device. Cloud is offline for now.",
    "voice.unsupported": "This browser does not support voice input yet.",
    "voice.localOnlyUnavailable": "To avoid uploading voice, built-in voice is off here. You can use the system keyboard microphone.",
    "voice.idle": "Voice input",
    "voice.stop": "Stop input",
    "voice.listening": "",
    "voice.stopped": "",
    "voice.appended": "",
    "voice.startFailed": "Voice input did not start. Try again.",
    "voice.unclear": "I did not catch that. Try again.",
    "voice.notAllowed": "Allow microphone access in the browser.",
    "voice.noMicrophone": "No available microphone was found.",
    "voice.localLanguageUnavailable": "This browser does not have the selected local voice language. You can use the system keyboard microphone.",
    "voice.interimPrefix": "Hearing: ",
    "voice.paused": "",
    "voice.recording": "Recording. I will transcribe everything after you stop.",
    "voice.loadingModel": "Loading the voice model for the first time. This can take a moment.",
    "voice.finalizing": "Turning speech into text...",
    "voice.finalAdded": "Voice text was added. You can edit it before organizing.",
    "voice.finalFailed": "High-quality transcription failed. Try again.",
    "voice.previewFallbackAdded": "High-quality transcription failed, so I kept the live preview text.",
    "voice.recordingUnavailable": "This browser cannot record for transcription yet. You can use the system keyboard microphone.",
  },
};

const staticTranslations = [
  ["#app-sidebar", "aria-label", "sidebar.aria"],
  [".sidebar-brand .brand", "text", "brand.name"],
  ["#sidebar-toggle", "aria-label", "sidebar.collapseAria"],
  ["#sidebar-toggle", "title", "sidebar.collapseTitle"],
  ["#sidebar-toggle .tooltip", "text", "sidebar.collapseTooltip"],
  [".sidebar-nav", "aria-label", "nav.main"],
  ["#home-nav-button span:last-child", "text", "nav.home"],
  ["#items-nav-button span:last-child", "text", "nav.items"],
  ["#sidebar-completed-link span:nth-child(2)", "text", "nav.completed"],
  [".sidebar-user span", "text", "user.localSpace"],
  [".mobile-brand", "text", "brand.name"],
  ["#top-actions [data-nav='home']", "text", "nav.home"],
  ["#top-actions [data-nav='items']", "text", "nav.items"],
  ["#logout-button", "aria-label", "logout.aria"],
  ["#logout-button", "text", "logout"],
  ["#login-title", "text", "login.title"],
  [".auth-mode-tabs", "aria-label", "auth.entry"],
  ["#login-mode-button", "text", "auth.login"],
  ["#register-mode-button", "text", "auth.register"],
  ["label[for='account-input']", "text", "auth.username"],
  ["label[for='password-input']", "text", "auth.password"],
  ["label[for='confirm-password-input']", "text", "auth.confirmPassword"],
  ["label[for='display-name-input']", "text", "auth.displayName"],
  ["#display-name-input", "placeholder", "auth.displayNamePlaceholder"],
  ["#demo-button", "text", "auth.demo"],
  ["#capture-title", "text", "home.title"],
  [".home-primary .hero-section .supporting-copy", "text", "home.supporting"],
  ["#home-view .capture-section", "aria-label", "capture.aria"],
  ["label[for='thought-input']", "text", "capture.label"],
  ["#organize-button", "text", "capture.submit"],
  ["#suggestion-label", "text", "suggestion.label"],
  [".next-step-panel", "aria-label", "suggestion.nextStepAria"],
  ["#suggestion-section .next-step-panel p", "text", "suggestion.nextStepLabel"],
  ["#skip-button", "text", "suggestion.skip"],
  ["#look-button", "text", "suggestion.look"],
  ["#candidate-section .eyebrow", "text", "candidate.label"],
  ["#candidate-section .recommendation-meta span", "text", "candidate.optional"],
  ["#keep-parked-button", "text", "candidate.keep"],
  ["#restore-candidate-button", "text", "candidate.restore"],
  ["#focus-section .eyebrow", "text", "focus.label"],
  ["#focus-section .next-step-panel", "aria-label", "focus.stepsAria"],
  ["#focus-section .next-step-panel p", "text", "suggestion.nextStepLabel"],
  ["#focus-detail-button", "text", "focus.detail"],
  ["#focus-done-button", "text", "focus.done"],
  ["#done-section .eyebrow", "text", "done.label"],
  ["#done-section .recommendation-meta span", "text", "done.status"],
  ["#done-section h2", "text", "done.title"],
  ["#rest-button", "text", "done.rest"],
  ["#see-another-button", "text", "done.next"],
  ["#toast-message", "text", "toast.saved"],
  ["#toast-action", "text", "toast.go"],
  ["#home-thoughts-title", "text", "home.priority"],
  ["#view-all-thoughts-button", "text", "home.viewAll"],
  ["#home-thoughts-count", "text", "home.zeroPriorityCount"],
  ["#resplit-panel", "aria-label", "resplit.aria"],
  ["#resplit-panel > p", "text", "resplit.title"],
  ["[data-resplit-strategy='sequence']", "text", "resplit.sequence"],
  ["[data-resplit-strategy='finer']", "text", "resplit.finer"],
  ["[data-resplit-strategy='missing']", "text", "resplit.missing"],
  ["#cancel-resplit-button", "text", "resplit.cancel"],
  ["#undo-recent-organize-button", "text", "resplit.undo"],
  ["#home-completed-title", "text", "home.completedTitle"],
  ["#view-all-completed-button", "text", "home.viewCompleted"],
  ["#items-title", "text", "items.title"],
  ["#items-view .supporting-copy", "text", "items.supporting"],
  ["label[for='manual-title-input']", "text", "manual.label"],
  ["#manual-title-input", "placeholder", "manual.placeholder"],
  ["#manual-add-button", "text", "manual.add"],
  ["#item-tabs", "aria-label", "tabs.aria"],
  ["#active-tab", "text", "status.active"],
  ["#parking-tab", "text", "status.parking"],
  ["#done-tab", "text", "status.done"],
  ["#active-title", "text", "status.active"],
  ["#parking-title", "text", "status.parking"],
  ["#done-title", "text", "status.done"],
  ["#undo-message", "text", "toast.deleted"],
  ["#undo-button", "text", "toast.undone"],
  ["#detail-view .compact-hero .eyebrow", "text", "detail.eyebrow"],
  ["#detail-title", "text", "detail.title"],
  ["label[for='detail-title-input']", "text", "detail.titleLabel"],
  ["label[for='detail-priority-input']", "text", "detail.priority"],
  ["label[for='detail-status-input']", "text", "detail.status"],
  ["label[for='detail-due-date-input']", "text", "detail.dueAt"],
  ["#detail-due-time-input", "aria-label", "detail.dueAt"],
  ["label[for='detail-tags-input']", "text", "detail.tags"],
  ["#detail-tags-input", "placeholder", "detail.tagsPlaceholder"],
  ["label[for='detail-reason-input']", "text", "detail.reason"],
  ["label[for='detail-parking-reason-input']", "text", "detail.parkingReason"],
  [".steps-editor .capture-title", "text", "detail.steps"],
  ["#regenerate-steps-button", "text", "detail.regenerate"],
  ["#add-step-button", "text", "detail.addStep"],
  ["#detail-regenerate-message", "text", "detail.regenerated"],
  ["#undo-regenerate-steps-button", "text", "detail.undoRegenerate"],
  ["#detail-back-button", "text", "detail.backItems"],
  ["#detail-save-button", "text", "detail.save"],
];

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
  sequence: "resplit.sequence",
  finer: "resplit.finer",
  missing: "resplit.missing",
};
const detailRegenerateStrategies = ["finer", "sequence", "missing"];
let detailRegenerateIndex = 0;
const LOCAL_AI_WAIT_MS = 35000;
const DEFAULT_DEADLINE_TIME = "23:59";

function getResplitStrategyLabel(strategy) {
  return t(resplitStrategyLabels[strategy] ?? "home.resplit");
}

function readSavedLanguage() {
  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGE_OPTIONS.includes(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

let currentLanguage = readSavedLanguage();

function t(key, values = {}) {
  const value = copy[currentLanguage]?.[key] ?? copy[DEFAULT_LANGUAGE]?.[key] ?? key;
  if (typeof value === "function") {
    return value(values);
  }

  return String(value).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

function setTextOrAttribute(element, target, value) {
  if (target === "text") {
    element.textContent = value;
    return;
  }

  element.setAttribute(target, value);
}

function applyStaticLanguage() {
  document.documentElement.lang = currentLanguage;
  document.title = t("document.title");
  languageToggle.textContent = t("language.toggle");
  languageToggle.setAttribute("aria-label", t("language.toggleAria"));
  languageToggle.title = t("language.toggleTitle");

  staticTranslations.forEach(([selector, target, key]) => {
    document.querySelectorAll(selector).forEach((element) => {
      setTextOrAttribute(element, target, t(key));
    });
  });

  detailStatusInput.querySelector("option[value='active']").textContent = t("status.active");
  detailStatusInput.querySelector("option[value='parking']").textContent = t("status.parking");
  detailStatusInput.querySelector("option[value='done']").textContent = t("status.done");

  if (isLocalPrototypeHost && loginSupportingCopy) {
    loginSupportingCopy.textContent = t("auth.localSupporting");
  }
}

function getVoiceMessages() {
  return {
    unsupported: t("voice.unsupported"),
    localOnlyUnavailable: t("voice.localOnlyUnavailable"),
    idle: t("voice.idle"),
    stop: t("voice.stop"),
    listening: t("voice.listening"),
    stopped: t("voice.stopped"),
    appended: t("voice.appended"),
    startFailed: t("voice.startFailed"),
    unclear: t("voice.unclear"),
    notAllowed: t("voice.notAllowed"),
    noMicrophone: t("voice.noMicrophone"),
    localLanguageUnavailable: t("voice.localLanguageUnavailable"),
    interimPrefix: t("voice.interimPrefix"),
    paused: t("voice.paused"),
    recording: t("voice.recording"),
    loadingModel: t("voice.loadingModel"),
    finalizing: t("voice.finalizing"),
    finalAdded: t("voice.finalAdded"),
    finalFailed: t("voice.finalFailed"),
    previewFallbackAdded: t("voice.previewFallbackAdded"),
    recordingUnavailable: t("voice.recordingUnavailable"),
  };
}

function getVoiceLanguage() {
  return currentLanguage === "en-US" ? "en-US" : "zh-CN";
}

function getTranscriptSeparator() {
  return currentLanguage === "en-US" ? ", " : "，";
}

function persistLanguage() {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } catch {
    // Language switching still works for this session if storage is unavailable.
  }
}

function switchLanguage() {
  currentLanguage = currentLanguage === "zh-CN" ? "en-US" : "zh-CN";
  persistLanguage();
  applyStaticLanguage();
  voiceController?.updateLanguage?.(getVoiceLanguage(), getVoiceMessages(), getTranscriptSeparator());
  renderAuthMode();
  renderRoute();
  updateInputCount();
}

if (isLocalPrototypeHost && loginSupportingCopy) {
  loginSupportingCopy.textContent = t("auth.localSupporting");
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
    return t("errors.fallbackResult");
  }

  if (reason === "over_split") {
    return t("errors.overSplit");
  }

  if (reason === "missing_semantic_evidence") {
    return t("errors.missingEvidence");
  }

  if (reason === "generic_next_step") {
    return t("errors.genericNextStep");
  }

  return t("errors.organizeFailed");
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
  appShell.classList.remove("is-auth-checking");
  Object.values(views).forEach((view) => view.classList.add("is-hidden"));
  show(views[name]);
  appShell.classList.toggle("is-login-shell", name === "login");
  topActions.classList.toggle("is-hidden", name === "login");
  const displayName = currentUser ? currentUser.name : t("today");
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
  organizeButton.textContent = isBusy("organize") ? t("capture.busy") : t("capture.submit");
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
  setStatus(t("sync.retrying"));
  store.syncNow()
    .then(() => showToast(t("sync.ready"), t("toast.go"), () => navigate("#items")))
    .catch(() => {
      setStatus(t("sync.localOnly"));
      showToast(t("sync.stillOffline"), t("sync.retry"), retryCloudSync);
    });
}

function reportCloudSync(syncPromise, { successMessage = "", failureMessage = t("sync.localOnly") } = {}) {
  syncPromise
    .then(() => {
      if (successMessage) {
        showToast(successMessage, t("toast.go"), () => navigate("#items"));
      }
    })
    .catch(() => {
      setStatus(failureMessage);
      showToast(failureMessage, t("sync.retry"), retryCloudSync);
    });
}

function updateInputCount() {
  inputCount.textContent = `${input.value.length}/500`;
}

let transformersImportPromise = null;
let whisperTranscriberPromise = null;
let openccImportPromise = null;
let simplifiedChineseConverterPromise = null;

function getWhisperLanguage(language = currentLanguage) {
  return language === "en-US" ? "english" : "chinese";
}

async function importTransformers() {
  if (!transformersImportPromise) {
    transformersImportPromise = import(TRANSFORMERS_JS_CDN_URL);
  }

  return transformersImportPromise;
}

async function importOpenCc() {
  if (!openccImportPromise) {
    openccImportPromise = import(OPENCC_JS_CDN_URL);
  }

  return openccImportPromise;
}

async function getSimplifiedChineseConverter() {
  if (!simplifiedChineseConverterPromise) {
    simplifiedChineseConverterPromise = importOpenCc()
      .then((module) => {
        const OpenCC = module.default ?? module;
        return OpenCC.Converter({ from: "t", to: "cn" });
      })
      .catch((error) => {
        simplifiedChineseConverterPromise = null;
        throw error;
      });
  }

  return simplifiedChineseConverterPromise;
}

async function normalizeVoiceTranscript(text, { language = currentLanguage } = {}) {
  if (language !== "zh-CN") {
    return text;
  }

  try {
    const converter = await getSimplifiedChineseConverter();
    return converter(text);
  } catch {
    return text;
  }
}

async function createWhisperPipeline(device) {
  const { pipeline } = await importTransformers();
  return pipeline("automatic-speech-recognition", WHISPER_MODEL, { device });
}

async function createBrowserWhisperTranscriber() {
  if (!whisperTranscriberPromise) {
    whisperTranscriberPromise = (async () => {
      const canUseWebGpu = Boolean(navigator.gpu);
      let transcriber = null;

      if (canUseWebGpu) {
        try {
          transcriber = await createWhisperPipeline("webgpu");
        } catch {
          transcriber = null;
        }
      }

      if (!transcriber) {
        transcriber = await createWhisperPipeline("wasm");
      }

      return (audioUrl, options = {}) => transcriber(audioUrl, {
        task: "transcribe",
        language: getWhisperLanguage(options.language),
      });
    })().catch((error) => {
      whisperTranscriberPromise = null;
      throw error;
    });
  }

  return whisperTranscriberPromise;
}

function renderAuthMode() {
  const isRegistering = authMode === "register";
  loginModeButton.classList.toggle("is-active", !isRegistering);
  registerModeButton.classList.toggle("is-active", isRegistering);
  loginModeButton.setAttribute("aria-pressed", String(!isRegistering));
  registerModeButton.setAttribute("aria-pressed", String(isRegistering));
  registerOnlyFields.classList.toggle("is-hidden", !isRegistering);
  loginButton.textContent = isRegistering ? t("auth.registerSubmit") : t("auth.loginSubmit");
  loginError.textContent = "";
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceController = createVoiceInputController({
    SpeechRecognition,
    input,
    voiceButton,
    voiceStatus,
    voiceWaveform,
    onInputChange: updateInputCount,
    requireLocalProcessing: false,
    language: getVoiceLanguage(),
    messages: getVoiceMessages(),
    transcriptSeparator: getTranscriptSeparator(),
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
  suggestionLabel.textContent = t("suggestion.label");
  priorityChip.textContent = priorityLabels[item.priority];
  suggestionTitle.textContent = item.title;
  suggestionReason.textContent = item.reason || t("suggestion.defaultReason");
  suggestionNextStep.textContent = item.nextStep || item.steps[0] || t("suggestion.defaultStep");
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
  candidateReason.textContent = item.parkingReason || t("candidate.defaultReason");
  show(candidateSection);
}

function relativeTime(timestamp) {
  if (!timestamp) {
    return t("time.justNow");
  }

  const delta = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (delta < minute) {
    return t("time.justNow");
  }

  if (delta < hour) {
    return t("time.minutesAgo", { count: Math.floor(delta / minute) });
  }

  if (delta < day) {
    return t("time.hoursAgo", { count: Math.floor(delta / hour) });
  }

  return t("time.yesterday");
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

function formatDateShort(date) {
  return new Intl.DateTimeFormat(currentLanguage === "en-US" ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeShort(date) {
  return new Intl.DateTimeFormat(currentLanguage === "en-US" ? "en-US" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatTimeOption(hour, minute) {
  return `${padDatePart(hour)}:${padDatePart(minute)}`;
}

function buildDeadlineTimeOptions() {
  const values = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = formatTimeOption(hour, minute);
      if (!values.includes(value)) {
        values.push(value);
      }
    }
  }

  values.push(DEFAULT_DEADLINE_TIME);

  return values;
}

function addDeadlineTimeOption(value) {
  if (!value || detailDueTimeInput.querySelector(`option[value="${value}"]`)) {
    return;
  }

  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;
  detailDueTimeInput.append(option);
}

function populateDeadlineTimeOptions() {
  detailDueTimeInput.replaceChildren();
  buildDeadlineTimeOptions().forEach(addDeadlineTimeOption);
}

function getDeadlineInputParts(value) {
  const rawValue = String(value ?? "").trim();
  const rawMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?/u);
  if (rawMatch) {
    return {
      date: rawMatch[1],
      time: rawMatch[2] && rawMatch[3] ? `${rawMatch[2]}:${rawMatch[3]}` : DEFAULT_DEADLINE_TIME,
    };
  }

  const deadline = parseDeadlineValue(value);
  if (!deadline) {
    return {
      date: "",
      time: DEFAULT_DEADLINE_TIME,
    };
  }

  const date = deadline.date;
  return {
    date: `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`,
    time: formatTimeOption(date.getHours(), date.getMinutes()),
  };
}

function composeDeadlineInputValue() {
  const date = detailDueDateInput.value;
  if (!date) {
    return "";
  }

  const time = detailDueTimeInput.value || DEFAULT_DEADLINE_TIME;
  return `${date}T${time}:00+08:00`;
}

function syncDeadlineInputValue() {
  detailDueAtInput.value = composeDeadlineInputValue();
}

function setDeadlineInputs(value) {
  const parts = getDeadlineInputParts(value);
  addDeadlineTimeOption(parts.time);
  detailDueDateInput.value = parts.date;
  detailDueTimeInput.value = parts.time || DEFAULT_DEADLINE_TIME;
  syncDeadlineInputValue();
}

function setupDeadlineEditor() {
  detailDueDateInput.addEventListener("change", syncDeadlineInputValue);
  detailDueTimeInput.addEventListener("change", syncDeadlineInputValue);
}

function getDeadlineLabel(item) {
  const deadline = parseDeadlineValue(item?.dueAt);
  if (!deadline) {
    return "";
  }

  const now = new Date();
  const dueAt = deadline.date;
  const dayDelta = getLocalDayDelta(dueAt, now);
  const time = formatTimeShort(dueAt);

  if (deadline.isDateOnly ? dayDelta < 0 : dueAt.getTime() < now.getTime()) {
    return t("meta.dueOverdue", { date: formatDateShort(dueAt) });
  }

  if (dayDelta === 0) {
    return t("meta.dueToday", { time });
  }

  if (dayDelta === 1) {
    return t("meta.dueTomorrow", { time });
  }

  if (dayDelta > 1 && dayDelta <= 7) {
    return t("meta.dueInDays", { count: dayDelta, date: formatDateShort(dueAt) });
  }

  return t("meta.dueDate", { date: formatDateShort(dueAt) });
}

function formatTaskMeta(item) {
  const parts = [];
  const deadlineLabel = getDeadlineLabel(item);

  if (deadlineLabel) {
    parts.push(deadlineLabel);
  }

  if (Array.isArray(item.tags) && item.tags.length > 0) {
    parts.push(item.tags.map((tag) => `#${tag}`).join(" "));
  }

  if (item.isBigEvent) {
    parts.push(t("meta.bigEvent"));
  }

  return parts.join(" · ");
}

function getPriorityRank(item) {
  return getItemPriorityScore(item);
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
  return nextStep || item.nextStep || t("detail.defaultNextOpenStep");
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
  const deadlineLabel = !completed ? getDeadlineLabel(item) : "";
  if (deadlineLabel) {
    const deadline = document.createElement("span");
    deadline.className = "row-deadline";
    deadline.textContent = deadlineLabel;
    text.append(deadline);
  }

  const chevron = document.createElement("span");
  chevron.className = "row-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "›";

  button.append(dot, text, chevron);
  return button;
}

function renderHomeSidebar(itemsOverride = null) {
  if (!currentUser) {
    homeThoughtsTitle.textContent = t("home.priority");
    viewAllThoughtsButton.textContent = t("home.viewAll");
    hide(resplitPanel);
    hide(undoRecentOrganizeButton);
    homeThoughtsList.replaceChildren();
    homeCompletedList.replaceChildren();
    homeThoughtsCount.textContent = t("home.zeroPriorityCount");
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

  homeThoughtsTitle.textContent = hasRecentOrganizedItems ? t("home.recentOrganized") : t("home.priority");
  viewAllThoughtsButton.textContent = hasRecentOrganizedItems ? t("home.resplit") : t("home.viewAll");
  if (!hasRecentOrganizedItems) {
    hide(resplitPanel);
  }
  undoRecentOrganizeButton.classList.toggle("is-hidden", !hasRecentOrganizedItems);
  homeThoughtsList.replaceChildren(
    ...(previewItems.length ? previewItems.map((item) => createHomeThoughtRow(item)) : [createEmptyState(t("home.priorityEmpty"))]),
  );
  homeCompletedList.replaceChildren(
    ...(completedItems.length
      ? completedItems.slice(0, 2).map((item) => createHomeThoughtRow(item, { completed: true }))
      : [createEmptyState(t("home.completedEmpty"))]),
  );
  homeThoughtsCount.textContent = hasRecentOrganizedItems
    ? t("home.savedCount", { count: recentOrganizedItems.length })
    : t("home.priorityCount", { count: previewItems.length });
  recentCompletedCount.textContent = String(completedItems.length);
  sidebarCompletedCount.textContent = String(completedItems.length);
}

function renderHome() {
  showView("home");
  hide(suggestionSection, candidateSection, focusSection, doneSection);
  renderHomeSidebar();
  captureTitleLabel.textContent = t("capture.title");
  input.placeholder = t("capture.placeholder");
  captureError.textContent = "";

  if (completionVisible) {
    setStatus(t("status.doneVisible"));
    show(doneSection);
    return;
  }

  if (focusedItemId) {
    const focused = findVisibleItem(focusedItemId);
    if (focused?.status === "active") {
      captureTitleLabel.textContent = t("capture.focusTitle");
      input.placeholder = t("capture.focusPlaceholder");
      setStatus(t("status.otherIdeas"));
      renderFocus(focused);
      return;
    }

    focusedItemId = null;
  }

  const recommendation = getHomeRecommendation();
  if (recommendation) {
    setStatus(t("status.default"));
    renderRecommendation(recommendation);
    return;
  }

  const candidate = store.getParkingCandidate(currentUser.id);
  if (candidate) {
    setStatus(t("status.parkingAvailable"));
    renderCandidate(candidate);
    return;
  }

  setStatus(t("status.start"));
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
  eyebrow.textContent = t(`status.${item.status === "parking" ? "parking" : item.status === "done" ? "done" : "active"}`);
  const chip = document.createElement("span");
  chip.textContent = priorityLabels[item.priority];
  meta.append(eyebrow, chip);

  const title = document.createElement("h3");
  title.textContent = item.title;

  const reason = document.createElement("p");
  reason.className = "reason";
  reason.textContent = t("card.nextStep", { step: getNextOpenStep(item) });

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

  const detailButton = createButton(t("card.detail"), "secondary-button card-action-button", () => navigate(createDetailHash(item.id, "items")));
  const deleteButton = createButton(t("card.delete"), "secondary-button card-action-button card-action-muted", () => deleteItem(item.id));
  controls.append(detailButton);

  if (item.status === "active") {
    controls.append(
      createButton(t("status.parking"), "secondary-button card-action-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "parking" }))),
      deleteButton,
      createButton(t("card.complete"), "primary-action-button card-action-button card-action-primary", () => completeItem(item.id)),
    );
  } else if (item.status === "parking") {
    controls.append(
      deleteButton,
      createButton(t("candidate.restore"), "primary-action-button card-action-button card-action-primary", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
    );
  } else {
    controls.append(
      deleteButton,
      createButton(t("card.restore"), "secondary-button card-action-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
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
  const loadMoreButton = createButton(t("list.loadMore", { count: nextCount }), "secondary-button list-load-more", () => {
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
  active: () => t("empty.active"),
  parking: () => t("empty.parking"),
  done: () => t("empty.done"),
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

    renderList(container, visibleItems, emptyTextByStatus[status]());
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
  completedInput.setAttribute("aria-label", t("detail.stepCompleteAria"));
  const inputElement = document.createElement("input");
  inputElement.className = "text-input";
  inputElement.type = "text";
  inputElement.maxLength = 120;
  inputElement.value = value;
  inputElement.setAttribute("aria-label", t("detail.stepAria"));
  const removeButton = createButton(t("detail.deleteStep"), "secondary-button small-button", () => {
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
  detailBackButton.textContent = from === "home" ? t("detail.backHome") : t("detail.backItems");
  detailTitleInput.value = item.title;
  detailPriorityInput.value = item.priority;
  detailStatusInput.value = item.status;
  setDeadlineInputs(item.dueAt);
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
    captureError.textContent = t("errors.emptyInput");
    input.focus();
    return;
  }

  if (rawText.length > 500) {
    captureError.textContent = t("errors.tooLong");
    input.focus();
    return;
  }

  try {
    setBusy("organize", true);
    setStatus(resplitStrategy ? t("status.resplitting", { strategy: getResplitStrategyLabel(resplitStrategy) }) : t("status.organizing"));
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
      setStatus(t("status.versionNotSaved"));
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
      organized.source === "fallback"
        ? t("toast.fallbackSaved")
        : t("toast.localSaved"),
      t("toast.go"),
      () => navigate("#items"),
    );
    reportCloudSync(store.flush(), {
      successMessage: isLocalPrototypeHost ? "" : t("sync.ready"),
    });
    return savedBatch;
  } catch (error) {
    if (error.message === "nothing_to_save") {
      captureError.textContent = t("errors.duplicates");
      setStatus(t("status.alreadySaved"));
      input.focus();
      return;
    }

    captureError.textContent = t("errors.saveFailed");
    setStatus(t("status.inputStillHere"));
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
    setStatus(t("errors.undoFailed"));
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
  const strategyLabel = getResplitStrategyLabel(strategy);
  let deletedItemIds = [];

  if (!rawText.trim()) {
    captureError.textContent = t("errors.noRawText");
    hide(resplitPanel);
    return;
  }

  try {
    setBusy("organize", true);
    setStatus(t("status.resplittingWith", { strategy: strategyLabel }));
    captureError.textContent = "";

    const organized = await organizeWithLocalAi(rawText, { strategy });
    const { result } = organized;

    const saveBlocker = getOrganizedResultSaveBlocker(result, rawText);
    if (saveBlocker) {
      captureError.textContent = getSaveBlockerMessage(saveBlocker);
      setStatus(t("status.previousKept"));
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
      organized.source === "fallback" ? t("toast.resplitFallback", { strategy: strategyLabel }) : t("toast.resplitDone", { strategy: strategyLabel }),
      t("toast.go"),
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
      ? t("errors.noNewResplit")
      : t("errors.resplitFailed");
    setStatus(t("status.tryAnotherSplit"));
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
    detailError.textContent = t("errors.needTitleForSteps");
    return;
  }

  try {
    setBusy("regenerateSteps", true);
    regenerateStepsButton.textContent = t("detail.generating");
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
      detailError.textContent = t("errors.noGeneratedSteps");
      return;
    }

    detailSteps.replaceChildren();
    steps.slice(0, 5).forEach((step) => addStepInput(step));
    detailError.textContent = "";
    detailSuccess.textContent = "";
    const strategyLabel = getResplitStrategyLabel(strategy);
    detailRegenerateMessage.textContent = organized.source === "fallback"
      ? t("detail.regenerateFallbackDone", { strategy: strategyLabel })
      : t("detail.regenerateDone", { strategy: strategyLabel });
    show(detailRegenerateStatus);
  } finally {
    setBusy("regenerateSteps", false);
    regenerateStepsButton.textContent = t("detail.regenerate");
  }
}

function undoRegeneratedDetailSteps() {
  if (!previousDetailStepsSnapshot) {
    return;
  }

  renderDetailStepSnapshot(previousDetailStepsSnapshot);
  hideDetailRegenerateStatus();
  detailError.textContent = "";
  detailSuccess.textContent = t("detail.regenerateUndone");
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
    setStatus(t("errors.actionSaveFailedStatus"));
    manualAddError.textContent = t("errors.actionSaveFailed");
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
    undoMessage.textContent = t("toast.deleted");
    show(undoToast);
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => {
      hide(undoToast);
      deletedItemId = null;
    }, 5000);
    renderRoute();
    reportCloudSync(store.flush());
  } catch {
    manualAddError.textContent = t("errors.deleteFailed");
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
      loginError.textContent = t("auth.emptyPassword");
      passwordInput.focus();
      return;
    }

    if (error.message === "password_mismatch") {
      loginError.textContent = t("auth.passwordMismatch");
      confirmPasswordInput.focus();
      return;
    }

    if (error.message === "account_exists") {
      loginError.textContent = t("auth.accountExists");
      authMode = "login";
      renderAuthMode();
      passwordInput.focus();
      return;
    }

    if (error.message === "invalid_credentials") {
      loginError.textContent = t("auth.invalidCredentials");
      passwordInput.focus();
      return;
    }

    if (error.message === "User already registered") {
      loginError.textContent = t("auth.accountExists");
      authMode = "login";
      renderAuthMode();
      passwordInput.focus();
      return;
    }

    if (error.message === "Email not confirmed" || error.message === "email_not_confirmed") {
      loginError.textContent = t("auth.emailNotConfirmed");
      accountInput.focus();
      return;
    }

    if (error.message === "email_confirmation_required") {
      loginError.textContent = t("auth.emailConfirmationRequired");
      accountInput.focus();
      return;
    }

    if (error.message === "invalid_username") {
      loginError.textContent = t("auth.invalidUsername");
      accountInput.focus();
      return;
    }

    if (error.message === "email_address_invalid") {
      loginError.textContent = t("auth.emailAddressInvalid");
      accountInput.focus();
      return;
    }

    if (error.message === "over_email_send_rate_limit") {
      loginError.textContent = t("auth.rateLimited");
      passwordInput.focus();
      return;
    }

    loginError.textContent = t("auth.registerFailed");
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
    loginError.textContent = t("auth.demoFailed");
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

languageToggle.addEventListener("click", switchLanguage);

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
    manualAddError.textContent = t("errors.manualTitle");
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
    undoMessage.textContent = t("toast.undone");
    deletedItemId = null;
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => hide(undoToast), 1200);
    renderRoute();
    reportCloudSync(store.flush());
  } catch {
    undoMessage.textContent = t("errors.undoRefresh");
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
    detailError.textContent = t("errors.detailTitle");
    detailTitleInput.focus();
    return;
  }

  if (steps.length === 0) {
    detailError.textContent = t("errors.detailSteps");
    return;
  }

  try {
    setBusy("detailSave", true);
    store.updateItem(currentUser.id, itemId, {
      title: detailTitleInput.value,
      priority: detailPriorityInput.value,
      status: detailStatusInput.value,
      dueAt: composeDeadlineInputValue(),
      tags: detailTagsInput.value,
      reason: detailReasonInput.value,
      parkingReason: detailParkingReasonInput.value,
      steps,
      completedStepIndexes,
    });
    renderDetail(itemId, { from });
    detailSuccess.textContent = t("detail.syncing");
    store.flush()
      .then(() => {
        if (parseDetailHash()?.itemId === itemId) {
          detailSuccess.textContent = t("detail.cloudSaved");
        }
      })
      .catch(() => {
        if (parseDetailHash()?.itemId === itemId) {
          detailError.textContent = t("detail.cloudFailed");
          detailSuccess.textContent = "";
        }
      });
  } catch {
    detailError.textContent = t("errors.saveFailed");
  } finally {
    setBusy("detailSave", false);
  }
});

window.addEventListener("hashchange", renderRoute);
populateDeadlineTimeOptions();
setupDeadlineEditor();
applyStaticLanguage();
setupVoiceInput();
updateInputCount();
renderAuthMode();
renderRoute();
