const defaultMessages = {
  unsupported: "这个浏览器暂时不支持语音输入。",
  localOnlyUnavailable: "为了不上传语音，这个浏览器暂时关闭内置语音。可以用系统键盘麦克风输入。",
  idle: "语音输入",
  listening: "正在听，可以连续说。识别不准也能直接改文字。",
  stopped: "语音输入已停止。",
  appended: "已经放进输入框，可以继续说。",
  startFailed: "刚才没有启动成功，可以再试一次。",
  unclear: "刚才没有听清，可以再试一次。",
  notAllowed: "需要允许浏览器使用麦克风。",
  noMicrophone: "没有找到可用的麦克风。",
  localLanguageUnavailable: "这个浏览器还没有可用的中文本机语音包。可以用系统键盘麦克风输入。",
};

function textFromResult(result) {
  return String(result?.[0]?.transcript ?? "").trim();
}

function errorMessage(errorName) {
  if (errorName === "not-allowed" || errorName === "service-not-allowed") {
    return defaultMessages.notAllowed;
  }

  if (errorName === "audio-capture") {
    return defaultMessages.noMicrophone;
  }

  if (errorName === "language-not-supported" || errorName === "language-unavailable") {
    return defaultMessages.localLanguageUnavailable;
  }

  return defaultMessages.unclear;
}

export function appendVoiceTranscript(input, transcript, { maxLength = 500, onInputChange } = {}) {
  const text = String(transcript ?? "").trim();
  if (!text) {
    return false;
  }

  const current = input.value.trim();
  const nextValue = current ? `${current}，${text}` : text;
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
  onInputChange,
  maxLength = 500,
  requireLocalProcessing = true,
}) {
  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceStatus.textContent = defaultMessages.unsupported;
    return {
      isSupported: false,
      isListening: () => false,
      start() {},
      stop() {},
      toggle() {},
    };
  }

  const recognition = new SpeechRecognition();

  if (requireLocalProcessing && !("processLocally" in recognition)) {
    voiceButton.disabled = true;
    voiceStatus.textContent = defaultMessages.localOnlyUnavailable;
    return {
      isSupported: false,
      isListening: () => false,
      start() {},
      stop() {},
      toggle() {},
    };
  }

  let listening = false;

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

  function setState(message, nextListening = listening) {
    listening = nextListening;
    setButtonLabel(listening ? "停止输入" : defaultMessages.idle);
    voiceButton.setAttribute?.("aria-pressed", String(listening));
    voiceButton.classList.toggle("is-listening", listening);
    voiceStatus.textContent = message;
  }

  recognition.lang = "zh-CN";
  if ("processLocally" in recognition) {
    recognition.processLocally = true;
  }
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.addEventListener("result", (event) => {
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
      appendVoiceTranscript(input, finalParts.join("，"), { maxLength, onInputChange });
      setState(defaultMessages.appended, true);
      return;
    }

    if (interimParts.length > 0) {
      setState(`识别中：${interimParts.join(" ")}`, true);
    }
  });

  recognition.addEventListener("error", (event) => {
    setState(errorMessage(event?.error), false);
  });

  recognition.addEventListener("end", () => {
    if (listening) {
      setState("已暂停，点语音输入可以继续。", false);
    }
  });

  function start() {
    try {
      setState(defaultMessages.listening, true);
      recognition.start();
    } catch {
      setState(defaultMessages.startFailed, false);
    }
  }

  function stop() {
    recognition.stop();
    setState(defaultMessages.stopped, false);
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
  };
}
