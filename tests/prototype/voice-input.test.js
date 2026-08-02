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

  assert.equal(view.input.value, "明天交材料");
  assert.equal(view.changeCount, 1);
  assert.equal(view.input.focusCalled, true);
});

test("voice controller gives a clear microphone permission error", () => {
  const { controller, recognition, status, button } = setupController();

  controller.start();
  recognition.emit("error", { error: "not-allowed" });

  assert.equal(status.textContent, "需要允许浏览器使用麦克风。");
  assert.equal(button.textContent, "语音输入");
});
