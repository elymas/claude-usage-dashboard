import { readdir, readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { UsageUploadPayload } from "@usage-dashboard/shared";

export interface CollectorConfig {
  userId: string;
  apiKey: string;
  supabaseUrl: string;
  functionUrl: string;
  projectFilter?: string;
}

const CONFIG_DIR = join(homedir(), ".claude-collector");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const PENDING_DIR = join(CONFIG_DIR, "pending");

export async function loadConfig(): Promise<CollectorConfig> {
  const content = await readFile(CONFIG_FILE, "utf-8");
  return JSON.parse(content) as CollectorConfig;
}

export async function upload(
  data: UsageUploadPayload[],
  config: CollectorConfig,
): Promise<void> {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(config.functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`[sync] Successfully uploaded ${data.length} record(s)`);
      return;
    } catch (error) {
      const delay = baseDelay * Math.pow(4, attempt);
      console.warn(
        `[sync] Attempt ${attempt + 1}/${maxRetries} failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (attempt < maxRetries - 1) {
        console.log(`[sync] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted -- save to pending
  console.error("[sync] All retries failed. Saving to pending queue.");
  await savePending(data);
}

export async function processPending(config: CollectorConfig): Promise<void> {
  let entries;
  try {
    entries = await readdir(PENDING_DIR);
  } catch {
    return; // No pending directory = nothing to process
  }

  const jsonFiles = entries.filter((f) => f.endsWith(".json"));
  if (jsonFiles.length === 0) return;

  console.log(`[sync] Found ${jsonFiles.length} pending upload(s)`);

  for (const file of jsonFiles) {
    const filePath = join(PENDING_DIR, file);
    try {
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content) as UsageUploadPayload[];

      const response = await fetch(config.functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await unlink(filePath);
      console.log(`[sync] Successfully resent pending: ${file}`);
    } catch (error) {
      console.warn(
        `[sync] Failed to resend ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function savePending(data: UsageUploadPayload[]): Promise<void> {
  await mkdir(PENDING_DIR, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = join(PENDING_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`[sync] Saved pending upload to ${filePath}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
