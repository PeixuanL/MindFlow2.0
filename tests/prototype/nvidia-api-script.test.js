import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  maskSecret,
  parseEnvFile,
  runNvidiaQualityCheck,
} from "../../scripts/test-nvidia-api.mjs";

test("parseEnvFile reads quoted NVIDIA settings from a local env file", () => {
  const env = parseEnvFile(`
AI_PROVIDER=nvidia
NVIDIA_API_KEY="nvapi-test-secret"
NVIDIA_MODEL='qwen/qwen3-next-80b-a3b-instruct'
`);

  assert.equal(env.AI_PROVIDER, "nvidia");
  assert.equal(env.NVIDIA_API_KEY, "nvapi-test-secret");
  assert.equal(env.NVIDIA_MODEL, "qwen/qwen3-next-80b-a3b-instruct");
});

test("maskSecret hides the complete API key", () => {
  const masked = maskSecret("nvapi-test-secret");

  assert.equal(masked, "nvapi-test...");
  assert.equal(masked.includes("secret"), false);
});

test("runNvidiaQualityCheck loads .env.local and does not print the full key", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "mindflow-nvidia-test-"));
  const envFilePath = join(tempDir, ".env.local");
  const logs = [];
  const requests = [];

  await writeFile(envFilePath, [
    "AI_PROVIDER=nvidia",
    "NVIDIA_API_KEY=nvapi-test-secret",
    "NVIDIA_MODEL=qwen/qwen3-next-80b-a3b-instruct",
    "",
  ].join("\n"));

  await runNvidiaQualityCheck({
    envFilePath,
    rawText: "牙医还没约，明天要交材料",
    output: (message) => logs.push(message),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    status: "organized",
                    message: "其他想法都还在",
                    inputMode: "mixed",
                    semanticUnits: [
                      { id: "u1", text: "牙医还没约", role: "task", topicHint: "牙医" },
                    ],
                    items: [
                      {
                        id: "item_1",
                        title: "预约牙医",
                        sourceUnitIds: ["u1"],
                        mentions: ["牙医还没约"],
                        type: "task",
                        priority: "medium",
                        assignTo: "active",
                        reason: "它比较清楚，可以先看一眼。",
                        nextStep: "找到诊所电话。",
                        focusSteps: ["打开通讯录", "找到诊所电话"],
                        tags: ["预约"],
                        isBigEvent: false,
                      },
                    ],
                    recommendedNow: {
                      itemId: "item_1",
                      title: "预约牙医",
                      reason: "它比较清楚，可以先看一眼。",
                      nextStep: "找到诊所电话。",
                    },
                    coverageCheck: {
                      coveredUnitIds: ["u1"],
                      unmappedUnitIds: [],
                      possibleDuplicates: [],
                      needsClarification: [],
                    },
                    meta: { modelBehavior: "ai", safetyLevel: "normal" },
                  }),
                },
              },
            ],
          };
        },
      };
    },
  });

  assert.equal(requests[0].url, "https://integrate.api.nvidia.com/v1/chat/completions");
  assert.equal(JSON.stringify(logs).includes("nvapi-test-secret"), false);
  assert.equal(JSON.stringify(logs).includes("nvapi-test..."), true);
  assert.equal(JSON.stringify(logs).includes("预约牙医"), true);
});
