import { join } from "node:path";
import { homedir } from "node:os";
import { basename, dirname } from "node:path";
import type { UsageUploadPayload } from "@usage-dashboard/shared";
import { parseJSONLFile } from "./parser.js";
import type { ParsedRecord } from "./parser.js";
import { aggregateByDay } from "./aggregator.js";
import type { DailyAggregate } from "./aggregator.js";
import { getNewFiles, saveState, loadState } from "./incremental.js";
import { upload, processPending, loadConfig } from "./sync.js";

async function main(): Promise<void> {
  console.log("[collector] Starting Claude Usage Collector...");

  // 1. Load config
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error(
      "[collector] Failed to load config from ~/.claude-collector/config.json",
    );
    console.error(
      "[collector] Please create the config file with: userId, apiKey, supabaseUrl, functionUrl",
    );
    process.exit(1);
  }

  // 2. Process pending uploads first
  await processPending(config);

  // 3. Load state (incremental)
  const state = await loadState();
  console.log(
    state
      ? `[collector] Last sync: ${state.lastSyncTimestamp}`
      : "[collector] First run - processing all files",
  );

  // 4. Get new JSONL files
  const projectsDir = join(homedir(), ".claude", "projects");
  const files = await getNewFiles(projectsDir);

  if (files.length === 0) {
    console.log("[collector] No new files to process.");
    return;
  }

  console.log(`[collector] Found ${files.length} file(s) to process`);

  // 5. Parse each file
  let totalRecords = 0;
  const allAggregates: DailyAggregate[] = [];

  for (const filePath of files) {
    const projectName = extractProjectName(filePath, projectsDir);
    const records = await parseJSONLFile(filePath);
    totalRecords += records.length;

    if (records.length > 0) {
      // 6. Aggregate by day per file
      const aggregates = aggregateByDay(records, projectName);
      allAggregates.push(...aggregates);
    }
  }

  // Merge aggregates across files for the same date
  const merged = mergeAggregates(allAggregates);

  if (merged.length === 0) {
    console.log("[collector] No usage records found in new files.");
    await saveState(new Date().toISOString());
    return;
  }

  // 7. Upload aggregated data
  const payload: UsageUploadPayload[] = merged.map((agg) => ({
    date: agg.date,
    total_tokens: agg.totalTokens,
    input_tokens: agg.inputTokens,
    output_tokens: agg.outputTokens,
    cache_read_tokens: agg.cacheReadTokens,
    cache_creation_tokens: agg.cacheCreationTokens,
    model_breakdown: agg.modelBreakdown,
    project_count: agg.projectCount,
    sessions: agg.sessions,
  }));

  await upload(payload, config);

  // 8. Save new state
  await saveState(new Date().toISOString());

  // 9. Log summary
  const totalTokens = merged.reduce((sum, agg) => sum + agg.totalTokens, 0);
  console.log("[collector] Sync complete:");
  console.log(`  Files processed: ${files.length}`);
  console.log(`  Records parsed:  ${totalRecords}`);
  console.log(`  Total tokens:    ${totalTokens.toLocaleString()}`);
  console.log(`  Days covered:    ${merged.length}`);
}

function extractProjectName(filePath: string, projectsDir: string): string {
  // Path structure: projectsDir/<project-name>/.../<file>.jsonl
  const relative = filePath.slice(projectsDir.length + 1);
  const parts = relative.split("/");
  return parts[0] ?? basename(dirname(filePath));
}

function mergeAggregates(aggregates: DailyAggregate[]): DailyAggregate[] {
  const byDate = new Map<string, DailyAggregate>();

  for (const agg of aggregates) {
    const existing = byDate.get(agg.date);
    if (!existing) {
      byDate.set(agg.date, { ...agg, modelBreakdown: { ...agg.modelBreakdown } });
      continue;
    }

    existing.totalTokens += agg.totalTokens;
    existing.inputTokens += agg.inputTokens;
    existing.outputTokens += agg.outputTokens;
    existing.cacheReadTokens += agg.cacheReadTokens;
    existing.cacheCreationTokens += agg.cacheCreationTokens;
    existing.projectCount += agg.projectCount;
    existing.sessions += agg.sessions;

    for (const [model, tokens] of Object.entries(agg.modelBreakdown)) {
      existing.modelBreakdown[model] =
        (existing.modelBreakdown[model] ?? 0) + tokens;
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

main().catch((error) => {
  console.error("[collector] Fatal error:", error);
  process.exit(1);
});
