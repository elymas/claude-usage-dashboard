import type { ParsedRecord } from "./parser.js";

export interface DailyAggregate {
  date: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  modelBreakdown: Record<string, number>;
  projectCount: number;
  sessions: number;
}

export function aggregateByDay(
  records: ParsedRecord[],
  projectName: string,
): DailyAggregate[] {
  const dayMap = new Map<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
      modelBreakdown: Record<string, number>;
      projects: Set<string>;
      sessions: Set<string>;
    }
  >();

  for (const record of records) {
    const date = toKSTDate(record.timestamp);

    let day = dayMap.get(date);
    if (!day) {
      day = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
        modelBreakdown: {},
        projects: new Set<string>(),
        sessions: new Set<string>(),
      };
      dayMap.set(date, day);
    }

    day.inputTokens += record.inputTokens;
    day.outputTokens += record.outputTokens;
    day.cacheReadTokens += record.cacheReadTokens;
    day.cacheCreationTokens += record.cacheCreationTokens;

    const totalForRecord =
      record.inputTokens +
      record.outputTokens +
      record.cacheReadTokens +
      record.cacheCreationTokens;

    day.modelBreakdown[record.model] =
      (day.modelBreakdown[record.model] ?? 0) + totalForRecord;

    day.projects.add(projectName);
    // Use projectName + date as a simple session identifier
    day.sessions.add(projectName);
  }

  const results: DailyAggregate[] = [];
  for (const [date, day] of dayMap) {
    results.push({
      date,
      totalTokens:
        day.inputTokens +
        day.outputTokens +
        day.cacheReadTokens +
        day.cacheCreationTokens,
      inputTokens: day.inputTokens,
      outputTokens: day.outputTokens,
      cacheReadTokens: day.cacheReadTokens,
      cacheCreationTokens: day.cacheCreationTokens,
      modelBreakdown: day.modelBreakdown,
      projectCount: day.projects.size,
      sessions: day.sessions.size,
    });
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKSTDate(timestamp: string): string {
  const d = new Date(new Date(timestamp).getTime() + KST_OFFSET_MS);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
