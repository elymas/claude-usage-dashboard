import { readdir, stat, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export interface SyncState {
  lastSyncTimestamp: string;
}

const STATE_DIR = join(homedir(), ".claude-collector");
const STATE_FILE = join(STATE_DIR, "state.json");

export async function loadState(): Promise<SyncState | null> {
  try {
    const content = await readFile(STATE_FILE, "utf-8");
    return JSON.parse(content) as SyncState;
  } catch {
    return null;
  }
}

export async function saveState(timestamp: string): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  const state: SyncState = { lastSyncTimestamp: timestamp };
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export async function getNewFiles(projectsDir: string): Promise<string[]> {
  const state = await loadState();
  const lastSync = state ? new Date(state.lastSyncTimestamp).getTime() : 0;

  const allFiles: string[] = [];
  await scanDirectory(projectsDir, allFiles);

  if (lastSync === 0) {
    return allFiles;
  }

  const newFiles: string[] = [];
  for (const filePath of allFiles) {
    const fileStat = await stat(filePath);
    if (fileStat.mtimeMs > lastSync) {
      newFiles.push(filePath);
    }
  }

  return newFiles;
}

async function scanDirectory(dir: string, results: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories (including subagents/)
      await scanDirectory(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      results.push(fullPath);
    }
  }
}
