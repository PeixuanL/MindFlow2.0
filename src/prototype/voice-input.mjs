const defaultMessages = {
  unsupported: "这个浏览器暂时不支持语音输入。",
  localOnlyUnavailable: "为了不上传语音，这个浏览器暂时关闭内置语音。可以用系统键盘麦克风输入。",
  idle: "语音输入",
  stop: "停止输入",
  listening: "",
  stopped: "",
  appended: "",
  startFailed: "刚才没有启动成功，可以再试一次。",
  unclear: "刚才没有听清，可以再试一次。",
  notAllowed: "需要允许浏览器使用麦克风。",
  noMicrophone: "没有找到可用的麦克风。",
  localLanguageUnavailable: "这个浏览器还没有可用的中文本机语音包。可以用系统键盘麦克风输入。",
  interimPrefix: "识别中：",
  paused: "",
  recording: "正在录音，停止后统一转成文字。",
  loadingModel: "首次加载语音模型，可能要等一下。",
  finalizing: "正在转成文字…",
  finalAdded: "语音文字已放进输入框，可以直接修改。",
  finalFailed: "高质量转写失败，可以再试一次。",
  previewFallbackAdded: "高质量转写失败，已保留临时识别。",
  recordingUnavailable: "这个浏览器暂时不能录音转写。可以用系统键盘麦克风输入。",
};

function textFromResult(result) {
  return String(result?.[0]?.transcript ?? "").trim();
}

function errorMessage(errorName, messages = defaultMessages) {
  if (errorName === "not-allowed" || errorName === "service-not-allowed") {
    return messages.notAllowed;
  }

  if (errorName === "audio-capture") {
    return messages.noMicrophone;
  }

  if (errorName === "language-not-supported" || errorName === "language-unavailable") {
    return messages.localLanguageUnavailable;
  }

  return messages.unclear;
}

function canRecordForTranscription({ MediaRecorder, mediaDevices, createTranscriber }) {
  return Boolean(
    typeof createTranscriber === "function" &&
    typeof MediaRecorder === "function" &&
    typeof mediaDevices?.getUserMedia === "function",
  );
}

function stopStreamTracks(stream) {
  for (const track of stream?.getTracks?.() ?? []) {
    track.stop?.();
  }
}

function hasChineseText(text) {
  return /[\u3400-\u9fff]/u.test(text);
}

function hasSentencePunctuation(text) {
  return /[，。！？；、,.!?;]/u.test(text);
}

function hasTerminalPunctuation(text) {
  return /[。！？.!?]$/u.test(text);
}

const traditionalPhraseMap = new Map([
  ["準備", "准备"],
  ["資料", "资料"],
  ["還有", "还有"],
  ["保險", "保险"],
  ["優化", "优化"],
  ["語音", "语音"],
  ["輸入", "输入"],
  ["轉寫", "转写"],
  ["繁體", "繁体"],
  ["簡體", "简体"],
]);

const traditionalCharacterMap = new Map(Object.entries({
  乾: "干",
  亂: "乱",
  了: "了",
  事: "事",
  亞: "亚",
  產: "产",
  優: "优",
  兒: "儿",
  內: "内",
  兩: "两",
  關: "关",
  冊: "册",
  再: "再",
  准: "准",
  準: "准",
  別: "别",
  剛: "刚",
  創: "创",
  劃: "划",
  動: "动",
  務: "务",
  發: "发",
  變: "变",
  台: "台",
  後: "后",
  員: "员",
  問: "问",
  單: "单",
  回: "回",
  國: "国",
  報: "报",
  塊: "块",
  處: "处",
  備: "备",
  學: "学",
  實: "实",
  對: "对",
  導: "导",
  將: "将",
  專: "专",
  尋: "寻",
  層: "层",
  師: "师",
  幫: "帮",
  幾: "几",
  個: "个",
  廣: "广",
  開: "开",
  強: "强",
  當: "当",
  錄: "录",
  從: "从",
  復: "复",
  總: "总",
  應: "应",
  戲: "戏",
  戶: "户",
  據: "据",
  擊: "击",
  數: "数",
  新: "新",
  時: "时",
  書: "书",
  會: "会",
  條: "条",
  業: "业",
  標: "标",
  樣: "样",
  機: "机",
  檢: "检",
  權: "权",
  歸: "归",
  測: "测",
  溝: "沟",
  點: "点",
  為: "为",
  無: "无",
  然: "然",
  照: "照",
  爾: "尔",
  狀: "状",
  現: "现",
  理: "理",
  畫: "画",
  異: "异",
  登: "登",
  發: "发",
  的: "的",
  目: "目",
  看: "看",
  確: "确",
  碼: "码",
  禮: "礼",
  程: "程",
  種: "种",
  積: "积",
  窗: "窗",
  筆: "笔",
  簽: "签",
  簡: "简",
  類: "类",
  系: "系",
  級: "级",
  組: "组",
  結: "结",
  絡: "络",
  給: "给",
  經: "经",
  網: "网",
  線: "线",
  練: "练",
  編: "编",
  緩: "缓",
  縣: "县",
  縮: "缩",
  聯: "联",
  聽: "听",
  聲: "声",
  能: "能",
  腦: "脑",
  與: "与",
  號: "号",
  裡: "里",
  補: "补",
  見: "见",
  規: "规",
  視: "视",
  覺: "觉",
  計: "计",
  訊: "讯",
  記: "记",
  設: "设",
  訪: "访",
  試: "试",
  話: "话",
  語: "语",
  說: "说",
  調: "调",
  請: "请",
  論: "论",
  識: "识",
  議: "议",
  變: "变",
  資: "资",
  趕: "赶",
  跟: "跟",
  路: "路",
  軟: "软",
  輸: "输",
  這: "这",
  連: "连",
  週: "周",
  過: "过",
  運: "运",
  達: "达",
  遠: "远",
  還: "还",
  部: "部",
  郵: "邮",
  錯: "错",
  鍵: "键",
  鏈: "链",
  闆: "板",
  間: "间",
  階: "阶",
  離: "离",
  雜: "杂",
  電: "电",
  頁: "页",
  項: "项",
  預: "预",
  題: "题",
  顯: "显",
  體: "体",
}));

function convertTraditionalToSimplified(text) {
  let converted = text;
  for (const [traditional, simplified] of traditionalPhraseMap) {
    converted = converted.replaceAll(traditional, simplified);
  }

  return [...converted].map((character) => traditionalCharacterMap.get(character) ?? character).join("");
}

function restoreChinesePunctuation(text) {
  if (!hasChineseText(text)) {
    return text;
  }

  let normalizedText = text
    .replace(/,/gu, "，")
    .replace(/!/gu, "！")
    .replace(/\?/gu, "？");

  if (!hasSentencePunctuation(normalizedText)) {
    normalizedText = normalizedText
      .replace(/([^，。！？；、,.!?;])(然后|还有|另外|但是|不过|而且|顺便|再(?=去|把|给|做|看|查|约|回|发|写|整理|准备))/gu, "$1，$2")
      .replace(/([^，。！？；、,.!?;])(今天|明天|后天|周末|下周|晚上|下午|上午|中午)(?=也|要|得|记得|需要|去|把|给|做|看|查|约|回|发|写|整理|准备)/gu, "$1，$2");
  }

  const withPauses = normalizedText
    .replace(/([^，。！？；、,.!?;])(然后|还有|另外|但是|不过|而且|顺便|再(?=去|把|给|做|看|查|约|回|发|写|整理|准备))/gu, "$1，$2")
    .replace(/([^，。！？；、,.!?;])(今天|明天|后天|周末|下周|晚上|下午|上午|中午)(?=也|要|得|记得|需要|去|把|给|做|看|查|约|回|发|写|整理|准备)/gu, "$1，$2");

  if (hasTerminalPunctuation(withPauses)) {
    return withPauses;
  }

  return `${withPauses}。`;
}

function getTranscriptText(result) {
  return String(result?.text ?? result ?? "").trim();
}

async function normalizeTranscriptText(text, { language, normalizeTranscript } = {}) {
  const rawText = String(text ?? "").trim();
  const normalizedText = typeof normalizeTranscript === "function"
    ? String(await normalizeTranscript(rawText, { language })).trim()
    : rawText;

  return restoreChinesePunctuation(convertTraditionalToSimplified(normalizedText));
}

export function appendVoiceTranscript(input, transcript, { maxLength = 500, onInputChange, separator = "，" } = {}) {
  const text = String(transcript ?? "").trim();
  if (!text) {
    return false;
  }

  const current = input.value.trim();
  const nextValue = current ? `${current}${separator}${text}` : text;
  input.value = nextValue.slice(0, maxLength);
  onInputChange?.();
  input.focus?.();
  return true;
}

export function createVoiceInputController({
  SpeechRecognition,
  input,
  voiceButton,
  voiceStatus,
  voiceWaveform,
  onInputChange,
  MediaRecorder,
  mediaDevices,
  createObjectURL,
  revokeObjectURL,
  createTranscriber,
  normalizeTranscript,
  maxLength = 500,
  requireLocalProcessing = true,
  language = "zh-CN",
  messages = {},
  transcriptSeparator = "，",
}) {
  let activeMessages = { ...defaultMessages, ...messages };

  function setButtonLabel(label) {
    if (typeof voiceButton.replaceChildren !== "function" || !voiceButton.ownerDocument) {
      voiceButton.textContent = label;
      return;
    }

    const indicator = voiceButton.ownerDocument.createElement("span");
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = "◦";
    voiceButton.replaceChildren(indicator, voiceButton.ownerDocument.createTextNode(label));
  }

  const supportsFinalTranscription = canRecordForTranscription({ MediaRecorder, mediaDevices, createTranscriber });

  if (!SpeechRecognition && !supportsFinalTranscription) {
    voiceButton.disabled = true;
    setButtonLabel(activeMessages.idle);
    voiceStatus.textContent = activeMessages.unsupported;
    return {
      isSupported: false,
      isListening: () => false,
      start() {},
      stop() {},
      toggle() {},
      updateLanguage(_nextLanguage, nextMessages = {}) {
        activeMessages = { ...defaultMessages, ...nextMessages };
        setButtonLabel(activeMessages.idle);
        voiceStatus.textContent = activeMessages.unsupported;
      },
    };
  }

  let recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition && requireLocalProcessing && !("processLocally" in recognition)) {
    if (supportsFinalTranscription) {
      recognition = null;
    } else {
      voiceButton.disabled = true;
      setButtonLabel(activeMessages.idle);
      voiceStatus.textContent = activeMessages.localOnlyUnavailable;
      return {
        isSupported: false,
        isListening: () => false,
        start() {},
        stop() {},
        toggle() {},
        updateLanguage(_nextLanguage, nextMessages = {}) {
          activeMessages = { ...defaultMessages, ...nextMessages };
          setButtonLabel(activeMessages.idle);
          voiceStatus.textContent = activeMessages.localOnlyUnavailable;
        },
      };
    }
  }

  if (!recognition && !supportsFinalTranscription) {
    voiceButton.disabled = true;
    setButtonLabel(activeMessages.idle);
    voiceStatus.textContent = activeMessages.recordingUnavailable;
    return {
      isSupported: false,
      isListening: () => false,
      start() {},
      stop() {},
      toggle() {},
      updateLanguage(_nextLanguage, nextMessages = {}) {
        activeMessages = { ...defaultMessages, ...nextMessages };
        setButtonLabel(activeMessages.idle);
        voiceStatus.textContent = activeMessages.recordingUnavailable;
      },
    };
  }

  let listening = false;
  let currentLanguage = language;
  let currentRecorder = null;
  let currentStream = null;
  let audioChunks = [];
  let previewTranscript = "";
  let pendingTask = Promise.resolve();
  let transcriberPromise = null;

  function setState(message, nextListening = listening) {
    listening = nextListening;
    setButtonLabel(listening ? activeMessages.stop : activeMessages.idle);
    voiceButton.setAttribute?.("aria-pressed", String(listening));
    voiceButton.classList.toggle("is-listening", listening);
    setWaveformActive(listening);
    voiceStatus.textContent = message;
  }

  function setWaveformActive(isActive) {
    voiceWaveform?.classList?.toggle("is-active", isActive);
    voiceWaveform?.setAttribute?.("aria-hidden", String(!isActive));
  }

  if (recognition) {
    recognition.lang = currentLanguage;
  }
  if (recognition && "processLocally" in recognition) {
    recognition.processLocally = requireLocalProcessing;
  }
  if (recognition) {
    recognition.interimResults = true;
    recognition.continuous = true;
  }

  recognition?.addEventListener("result", (event) => {
    if (supportsFinalTranscription) {
      return;
    }

    const finalParts = [];
    const interimParts = [];
    const startIndex = Number.isInteger(event.resultIndex) ? event.resultIndex : 0;

    for (let index = startIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = textFromResult(result);
      if (!text) {
        continue;
      }

      if (result.isFinal) {
        finalParts.push(text);
      } else {
        interimParts.push(text);
      }
    }

    if (finalParts.length > 0) {
      const finalText = finalParts.join(transcriptSeparator);
      if (supportsFinalTranscription) {
        previewTranscript = finalText;
        setState(`${activeMessages.interimPrefix}${finalText}`, true);
        return;
      }

      const transcript = restoreChinesePunctuation(convertTraditionalToSimplified(finalText));
      appendVoiceTranscript(input, transcript, { maxLength, onInputChange, separator: transcriptSeparator });
      setState(activeMessages.appended, true);
      return;
    }

    if (interimParts.length > 0) {
      previewTranscript = interimParts.join(" ");
      setState(`${activeMessages.interimPrefix}${previewTranscript}`, true);
    }
  });

  recognition?.addEventListener("error", (event) => {
    setState(errorMessage(event?.error, activeMessages), false);
  });

  recognition?.addEventListener("end", () => {
    if (listening) {
      setState(activeMessages.paused, false);
    }
  });

  function getTranscriber() {
    if (!transcriberPromise) {
      setState(activeMessages.loadingModel, false);
      transcriberPromise = Promise.resolve(createTranscriber()).catch((error) => {
        transcriberPromise = null;
        throw error;
      });
    }

    return transcriberPromise;
  }

  async function startRecording() {
    if (!supportsFinalTranscription) {
      return false;
    }

    try {
      currentStream = await mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      audioChunks = [];
      currentRecorder = new MediaRecorder(currentStream);
      currentRecorder.addEventListener("dataavailable", (event) => {
        if (event?.data?.size > 0) {
          audioChunks.push(event.data);
        }
      });
      currentRecorder.addEventListener("stop", () => {
        const chunks = audioChunks;
        const stream = currentStream;
        currentRecorder = null;
        currentStream = null;
        audioChunks = [];
        setWaveformActive(false);
        pendingTask = finalizeRecording(chunks, stream);
      });
      currentRecorder.start();
      setWaveformActive(true);
      return true;
    } catch (error) {
      stopStreamTracks(currentStream);
      currentStream = null;
      currentRecorder = null;
      setState(errorMessage(error?.name, activeMessages), false);
      return false;
    }
  }

  function appendPreviewFallback() {
    if (!previewTranscript) {
      setState(activeMessages.finalFailed, false);
      return false;
    }

    const didAppend = appendVoiceTranscript(input, previewTranscript, { maxLength, onInputChange, separator: transcriptSeparator });
    setState(didAppend ? activeMessages.previewFallbackAdded : activeMessages.finalFailed, false);
    return didAppend;
  }

  async function finalizeRecording(chunks, stream) {
    stopStreamTracks(stream);

    if (!chunks.length) {
      appendPreviewFallback();
      return;
    }

    const audioBlob = new Blob(chunks, { type: chunks[0]?.type || "audio/webm" });
    const toObjectURL = createObjectURL ?? URL.createObjectURL?.bind(URL);
    const fromObjectURL = revokeObjectURL ?? URL.revokeObjectURL?.bind(URL);

    if (typeof toObjectURL !== "function") {
      appendPreviewFallback();
      return;
    }

    let audioUrl = "";
    try {
      setState(activeMessages.finalizing, false);
      const transcriber = await getTranscriber();
      audioUrl = toObjectURL(audioBlob);
      const result = await transcriber(audioUrl, {
        language: currentLanguage,
        task: "transcribe",
      });
      const transcript = await normalizeTranscriptText(getTranscriptText(result), {
        language: currentLanguage,
        normalizeTranscript,
      });

      if (!transcript) {
        appendPreviewFallback();
        return;
      }

      appendVoiceTranscript(input, transcript, { maxLength, onInputChange, separator: transcriptSeparator });
      previewTranscript = "";
      setState(activeMessages.finalAdded, false);
    } catch {
      appendPreviewFallback();
    } finally {
      if (audioUrl && typeof fromObjectURL === "function") {
        fromObjectURL(audioUrl);
      }
    }
  }

  function startRecognition() {
    if (!recognition || supportsFinalTranscription) {
      return false;
    }

    try {
      recognition.start();
      return true;
    } catch {
      setState(activeMessages.startFailed, false);
      return false;
    }
  }

  function start() {
    previewTranscript = "";
    setState(supportsFinalTranscription ? activeMessages.recording : activeMessages.listening, true);
    const recognitionStarted = startRecognition();
    const recordingTask = startRecording().then((recordingStarted) => {
      if (!recordingStarted && !recognitionStarted) {
        setState(activeMessages.recordingUnavailable, false);
      }
    });
    pendingTask = recordingTask;
    return recordingTask;
  }

  function stop() {
    recognition?.stop();
    if (currentRecorder) {
      setState(activeMessages.finalizing, false);
      currentRecorder.stop();
      return;
    }

    stopStreamTracks(currentStream);
    currentStream = null;
    setWaveformActive(false);
    setState(activeMessages.stopped, false);
  }

  function updateLanguage(nextLanguage, nextMessages = {}, nextSeparator = transcriptSeparator) {
    currentLanguage = nextLanguage;
    if (recognition) {
      recognition.lang = nextLanguage;
    }
    activeMessages = { ...defaultMessages, ...nextMessages };
    transcriptSeparator = nextSeparator;
    setButtonLabel(listening ? activeMessages.stop : activeMessages.idle);
  }

  function toggle() {
    if (listening) {
      stop();
      return;
    }

    start();
  }

  return {
    recognition,
    isSupported: true,
    isListening: () => listening,
    start,
    stop,
    toggle,
    updateLanguage,
    whenIdle: () => pendingTask,
  };
}
