import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createNvidiaClient, resolveNvidiaModel } from "../src/prototype/nvidia-client.mjs";

const DEFAULT_RAW_TEXT = "牙医还没约，明天要交材料，小王消息也还没回";

export function parseEnvFile(source) {
  const env = {};

  for (const line of String(source ?? "").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

export function maskSecret(value) {
  const secret = String(value ?? "");
  if (secret.length <= 10) {
    return secret ? "***" : "";
  }

  return `${secret.slice(0, 10)}...`;
}

async function loadLocalEnv(envFilePath) {
  try {
    return parseEnvFile(await readFile(envFilePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export async function runNvidiaQualityCheck(options = {}) {
  const envFilePath = options.envFilePath ?? resolve(process.cwd(), ".env.local");
  const localEnv = await loadLocalEnv(envFilePath);
  const apiKey = process.env.NVIDIA_API_KEY || localEnv.NVIDIA_API_KEY;
  const model = resolveNvidiaModel(process.env.NVIDIA_MODEL || localEnv.NVIDIA_MODEL);
  const baseUrl = process.env.NVIDIA_BASE_URL || localEnv.NVIDIA_BASE_URL;
  const cliRawText = process.argv.slice(2).join(" ").trim();
  const rawText = options.rawText ?? (cliRawText || DEFAULT_RAW_TEXT);
  const output = options.output ?? console.log;

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is missing. Add it to .env.local or export it in this shell.");
  }

  output(`NVIDIA model: ${model}`);
  output(`NVIDIA key: ${maskSecret(apiKey)}`);
  output(`Input: ${rawText}`);

  const client = createNvidiaClient({
    apiKey,
    model,
    ...(baseUrl ? { baseUrl } : {}),
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
  });
  const aiJson = await client({ rawText });

  output("NVIDIA response:");
  output(aiJson);

  return aiJson;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runNvidiaQualityCheck().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
