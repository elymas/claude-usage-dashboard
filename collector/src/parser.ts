import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export interface ParsedRecord {
  timestamp: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export async function parseJSONLFile(filePath: string): Promise<ParsedRecord[]> {
  const records: ParsedRecord[] = [];
  let skippedLines = 0;

  const fileStream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      skippedLines++;
      continue;
    }

    if (!isRecord(parsed)) {
      skippedLines++;
      continue;
    }

    if (parsed.type !== "assistant") {
      continue;
    }

    const message = parsed.message;
    if (!isRecord(message) || !isRecord(message.usage)) {
      continue;
    }

    const usage = message.usage;
    const model = typeof message.model === "string" ? message.model : "unknown";
    const timestamp = typeof parsed.timestamp === "string" ? parsed.timestamp : "";

    records.push({
      timestamp,
      model,
      inputTokens: toNumber(usage.input_tokens),
      outputTokens: toNumber(usage.output_tokens),
      cacheCreationTokens: toNumber(usage.cache_creation_input_tokens),
      cacheReadTokens: toNumber(usage.cache_read_input_tokens),
    });
  }

  if (skippedLines > 0) {
    console.log(`[parser] Skipped ${skippedLines} invalid line(s) in ${filePath}`);
  }

  return records;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
