import test from "node:test";
import assert from "node:assert/strict";

import { createVoiceInputController } from "../../src/prototype/voice-input.mjs";

function createClassList() {
  const names = new Set();
  return {
    add(name) {
      names.add(name);
    },
    remove(name) {
      names.delete(name);
    },
    toggle(name, force) {
      if (force) {
        names.add(name);
      } else {
        names.delete(name);
      }
    },
    contains(name) {
      return names.has(name);
    },
  };
}

class FakeRecognition {
  constructor() {
    this.processLocally = false;
    this.listeners = new Map();
    FakeRecognition.instances.push(this);
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  start() {
    this.started = true;
  }

  stop() {
    this.stopped = true;
  }

  emit(name, event = {}) {
    this.listeners.get(name)?.(event);
  }
}

FakeRecognition.instances = [];

class FakeMediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.listeners = new Map();
    FakeMediaRecorder.instances.push(this);
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  start() {
    this.started = true;
  }

  stop() {
    this.stopped = true;
    const data = new Blob(["audio"], { type: "audio/webm" });
    this.listeners.get("dataavailable")?.({ data });
    this.listeners.get("stop")?.();
  }
}

FakeMediaRecorder.instances = [];

function speechResult(transcript, isFinal) {
  return {
    0: { transcript },
    isFinal,
  };
}

function setupController() {
  FakeRecognition.instances = [];
  const input = { value: "", focusCalled: false, focus() { this.focusCalled = true; } };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };
  let changeCount = 0;

  const controller = createVoiceInputController({
    SpeechRecognition: FakeRecognition,
    input,
    voiceButton: button,
    voiceStatus: status,
    onInputChange() {
      changeCount += 1;
    },
  });

  return { controller, recognition: FakeRecognition.instances[0], input, button, status, get changeCount() { return changeCount; } };
}

test("voice controller uses continuous interim recognition for editable dictation", () => {
  const { recognition } = setupController();

  assert.equal(recognition.lang, "zh-CN");
  assert.equal(recognition.processLocally, true);
  assert.equal(recognition.interimResults, true);
  assert.equal(recognition.continuous, true);
});

test("voice controller disables browser speech when local processing is unavailable", () => {
  class RemoteOnlyRecognition extends FakeRecognition {
    constructor() {
      super();
      delete this.processLocally;
    }
  }

  const input = { value: "" };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };

  const controller = createVoiceInputController({
    SpeechRecognition: RemoteOnlyRecognition,
    input,
    voiceButton: button,
    voiceStatus: status,
  });

  assert.equal(controller.isSupported, false);
  assert.equal(button.disabled, true);
  assert.equal(status.textContent, "为了不上传语音，这个浏览器暂时关闭内置语音。可以用系统键盘麦克风输入。");
});

test("voice controller can allow browser speech service for immediate dictation", () => {
  FakeRecognition.instances = [];
  const input = { value: "" };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };

  const controller = createVoiceInputController({
    SpeechRecognition: FakeRecognition,
    input,
    voiceButton: button,
    voiceStatus: status,
    requireLocalProcessing: false,
  });

  assert.equal(controller.isSupported, true);
  assert.equal(button.disabled, false);
  assert.equal(FakeRecognition.instances[0].processLocally, false);
});

test("voice controller previews interim text and appends only final text", () => {
  const view = setupController();

  view.controller.start();
  view.recognition.emit("result", {
    resultIndex: 0,
    results: [speechResult("明天交材料", false)],
  });

  assert.equal(view.input.value, "");
  assert.equal(view.status.textContent, "识别中：明天交材料");

  view.recognition.emit("result", {
    resultIndex: 0,
    results: [speechResult("明天交材料", true)],
  });

  assert.equal(view.input.value, "明天交材料。");
  assert.equal(view.changeCount, 1);
  assert.equal(view.input.focusCalled, true);
});

test("voice controller restores punctuation for browser speech final text", () => {
  const view = setupController();

  view.controller.start();
  view.recognition.emit("result", {
    resultIndex: 0,
    results: [speechResult("明天准备材料然后约牙医还有回复小王消息", true)],
  });

  assert.equal(view.input.value, "明天准备材料，然后约牙医，还有回复小王消息。");
});

test("voice controller shows waveform while using browser speech recognition", () => {
  const view = setupController();
  const waveform = {
    classList: createClassList(),
    ariaHidden: "true",
    setAttribute(name, value) {
      if (name === "aria-hidden") {
        this.ariaHidden = value;
      }
    },
  };

  const controller = createVoiceInputController({
    SpeechRecognition: FakeRecognition,
    input: view.input,
    voiceButton: view.button,
    voiceStatus: view.status,
    voiceWaveform: waveform,
    onInputChange() {},
    requireLocalProcessing: false,
  });
  const recognition = FakeRecognition.instances.at(-1);

  controller.start();

  assert.equal(recognition.started, true);
  assert.equal(view.status.textContent, "");
  assert.equal(waveform.classList.contains("is-active"), true);
  assert.equal(waveform.ariaHidden, "false");

  controller.stop();

  assert.equal(waveform.classList.contains("is-active"), false);
  assert.equal(waveform.ariaHidden, "true");
});

test("voice controller gives a clear microphone permission error", () => {
  const { controller, recognition, status, button } = setupController();

  controller.start();
  recognition.emit("error", { error: "not-allowed" });

  assert.equal(status.textContent, "需要允许浏览器使用麦克风。");
  assert.equal(button.textContent, "语音输入");
});

test("voice controller records and appends final transcriber text without browser speech support", async () => {
  FakeMediaRecorder.instances = [];
  const input = { value: "", focusCalled: false, focus() { this.focusCalled = true; } };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };
  const stoppedTracks = [];
  const mediaDevices = {
    async getUserMedia(constraints) {
      assert.equal(constraints.video, false);
      assert.equal(constraints.audio.echoCancellation, true);
      return {
        getTracks() {
          return [{ stop() { stoppedTracks.push("audio"); } }];
        },
      };
    },
  };
  const objectUrls = [];
  const transcribedUrls = [];

  const controller = createVoiceInputController({
    SpeechRecognition: null,
    input,
    voiceButton: button,
    voiceStatus: status,
    MediaRecorder: FakeMediaRecorder,
    mediaDevices,
    createObjectURL(blob) {
      assert.equal(blob.type, "audio/webm");
      objectUrls.push("blob:voice");
      return "blob:voice";
    },
    revokeObjectURL(url) {
      objectUrls.push(`revoked:${url}`);
    },
    async createTranscriber() {
      return async (audioUrl, options) => {
        transcribedUrls.push([audioUrl, options.language]);
        return { text: "明天准备材料" };
      };
    },
  });

  assert.equal(controller.isSupported, true);

  await controller.start();
  controller.stop();
  await controller.whenIdle();

  assert.equal(input.value, "明天准备材料。");
  assert.equal(input.focusCalled, true);
  assert.deepEqual(transcribedUrls, [["blob:voice", "zh-CN"]]);
  assert.deepEqual(objectUrls, ["blob:voice", "revoked:blob:voice"]);
  assert.deepEqual(stoppedTracks, ["audio"]);
  assert.equal(status.textContent, "语音文字已放进输入框，可以直接修改。");
});

test("voice controller restores readable punctuation for unpunctuated Chinese transcriber text", async () => {
  FakeMediaRecorder.instances = [];
  const input = { value: "", focus() {} };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };

  const controller = createVoiceInputController({
    SpeechRecognition: null,
    input,
    voiceButton: button,
    voiceStatus: status,
    MediaRecorder: FakeMediaRecorder,
    mediaDevices: {
      async getUserMedia() {
        return {
          getTracks() {
            return [{ stop() {} }];
          },
        };
      },
    },
    createObjectURL() {
      return "blob:voice";
    },
    revokeObjectURL() {},
    async createTranscriber() {
      return async () => ({ text: "明天准备材料然后约牙医还有回复小王消息" });
    },
  });

  await controller.start();
  controller.stop();
  await controller.whenIdle();

  assert.equal(input.value, "明天准备材料，然后约牙医，还有回复小王消息。");
});

test("voice controller converts traditional Chinese transcriber text before appending", async () => {
  FakeMediaRecorder.instances = [];
  const input = { value: "", focus() {} };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };

  const controller = createVoiceInputController({
    SpeechRecognition: null,
    input,
    voiceButton: button,
    voiceStatus: status,
    MediaRecorder: FakeMediaRecorder,
    mediaDevices: {
      async getUserMedia() {
        return {
          getTracks() {
            return [{ stop() {} }];
          },
        };
      },
    },
    createObjectURL() {
      return "blob:voice";
    },
    revokeObjectURL() {},
    async createTranscriber() {
      return async () => ({ text: "周末還要整理房間,然後保險那個事今天也得看了" });
    },
  });

  await controller.start();
  controller.stop();
  await controller.whenIdle();

  assert.equal(input.value, "周末还要整理房间，然后保险那个事，今天也得看了。");
});

test("voice controller applies an injected Chinese normalizer before appending", async () => {
  FakeMediaRecorder.instances = [];
  const input = { value: "", focus() {} };
  const button = { textContent: "", disabled: false, classList: createClassList() };
  const status = { textContent: "" };
  const normalizedValues = [];

  const controller = createVoiceInputController({
    SpeechRecognition: null,
    input,
    voiceButton: button,
    voiceStatus: status,
    MediaRecorder: FakeMediaRecorder,
    mediaDevices: {
      async getUserMedia() {
        return {
          getTracks() {
            return [{ stop() {} }];
          },
        };
      },
    },
    createObjectURL() {
      return "blob:voice";
    },
    revokeObjectURL() {},
    async createTranscriber() {
      return async () => ({ text: "今天也看了保險那個事，還要更新個人頁面" });
    },
    async normalizeTranscript(text, options) {
      normalizedValues.push([text, options.language]);
      return "今天也看了保险那个事，还要更新个人页面";
    },
  });

  await controller.start();
  controller.stop();
  await controller.whenIdle();

  assert.deepEqual(normalizedValues, [["今天也看了保險那個事，還要更新個人頁面", "zh-CN"]]);
  assert.equal(input.value, "今天也看了保险那个事，还要更新个人页面。");
});

test("voice controller records silently instead of showing browser speech mistakes before final transcription", async () => {
  FakeMediaRecorder.instances = [];
  const view = setupController();
  const waveform = {
    classList: createClassList(),
    ariaHidden: "true",
    setAttribute(name, value) {
      if (name === "aria-hidden") {
        this.ariaHidden = value;
      }
    },
  };
  const controller = createVoiceInputController({
    SpeechRecognition: FakeRecognition,
    input: view.input,
    voiceButton: view.button,
    voiceStatus: view.status,
    voiceWaveform: waveform,
    onInputChange() {},
    MediaRecorder: FakeMediaRecorder,
    mediaDevices: {
      async getUserMedia() {
        return {
          getTracks() {
            return [{ stop() {} }];
          },
        };
      },
    },
    createObjectURL() {
      return "blob:voice";
    },
    revokeObjectURL() {},
    async createTranscriber() {
      return async () => ({ text: "Whisper 最终文本" });
    },
  });
  const recognition = FakeRecognition.instances.at(-1);

  await controller.start();
  assert.equal(recognition.started, undefined);
  assert.equal(view.status.textContent, "正在录音，停止后统一转成文字。");
  assert.equal(waveform.classList.contains("is-active"), true);
  assert.equal(waveform.ariaHidden, "false");

  recognition.emit("result", {
    resultIndex: 0,
    results: [speechResult("浏览器临时文本", true)],
  });

  assert.equal(view.input.value, "");
  assert.equal(view.status.textContent, "正在录音，停止后统一转成文字。");

  controller.stop();
  await controller.whenIdle();

  assert.equal(view.input.value, "Whisper 最终文本。");
  assert.equal(waveform.classList.contains("is-active"), false);
  assert.equal(waveform.ariaHidden, "true");
});
