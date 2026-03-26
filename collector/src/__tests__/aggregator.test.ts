import { describe, it, expect } from "vitest";
import { aggregateByDay } from "../aggregator.js";
import type { ParsedRecord } from "../parser.js";

describe("aggregateByDay", () => {
  it("groups records by KST date", () => {
    const records: ParsedRecord[] = [
      {
        // UTC 10:30 = KST 19:30 → 2025-03-20 KST
        timestamp: "2025-03-20T10:30:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 100,
        cacheReadTokens: 2000,
      },
      {
        // UTC 23:59 = KST 08:59 다음날 → 2025-03-21 KST
        timestamp: "2025-03-20T23:59:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 800,
        outputTokens: 400,
        cacheCreationTokens: 50,
        cacheReadTokens: 1500,
      },
      {
        // UTC 08:00 = KST 17:00 → 2025-03-21 KST
        timestamp: "2025-03-21T08:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1200,
        outputTokens: 600,
        cacheCreationTokens: 200,
        cacheReadTokens: 3000,
      },
    ];

    const result = aggregateByDay(records, "test-project");

    // KST 기준: 첫 레코드만 3/20, 나머지 두 레코드는 3/21
    expect(result).toHaveLength(2);
    expect(result[0]!.date).toBe("2025-03-20");
    expect(result[1]!.date).toBe("2025-03-21");
  });

  it("sums tokens correctly across multiple records", () => {
    const records: ParsedRecord[] = [
      {
        timestamp: "2025-03-20T10:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 100,
        cacheReadTokens: 2000,
      },
      {
        timestamp: "2025-03-20T14:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 2000,
        outputTokens: 1000,
        cacheCreationTokens: 200,
        cacheReadTokens: 4000,
      },
    ];

    const result = aggregateByDay(records, "test-project");

    expect(result).toHaveLength(1);
    const day = result[0]!;
    expect(day.inputTokens).toBe(3000);
    expect(day.outputTokens).toBe(1500);
    expect(day.cacheCreationTokens).toBe(300);
    expect(day.cacheReadTokens).toBe(6000);
    expect(day.totalTokens).toBe(10800);
  });

  it("handles multiple models in breakdown", () => {
    const records: ParsedRecord[] = [
      {
        timestamp: "2025-03-20T10:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
      {
        timestamp: "2025-03-20T14:00:00.000Z",
        model: "claude-opus-4-20250514",
        inputTokens: 2000,
        outputTokens: 1000,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    ];

    const result = aggregateByDay(records, "test-project");

    expect(result).toHaveLength(1);
    const day = result[0]!;
    expect(day.modelBreakdown["claude-sonnet-4-20250514"]).toBe(1500);
    expect(day.modelBreakdown["claude-opus-4-20250514"]).toBe(3000);
  });

  it("handles empty input", () => {
    const result = aggregateByDay([], "test-project");
    expect(result).toHaveLength(0);
  });

  it("returns results sorted by date", () => {
    const records: ParsedRecord[] = [
      {
        timestamp: "2025-03-22T10:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
      {
        timestamp: "2025-03-20T10:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
      {
        timestamp: "2025-03-21T10:00:00.000Z",
        model: "claude-sonnet-4-20250514",
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    ];

    const result = aggregateByDay(records, "test-project");

    expect(result[0]!.date).toBe("2025-03-20");
    expect(result[1]!.date).toBe("2025-03-21");
    expect(result[2]!.date).toBe("2025-03-22");
  });
});
