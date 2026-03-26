import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { parseJSONLFile } from "../parser.js";

const FIXTURES_DIR = join(import.meta.dirname, "fixtures");

describe("parseJSONLFile", () => {
  it("parses valid assistant records correctly", async () => {
    const filePath = join(FIXTURES_DIR, "sample-assistant.jsonl");
    const records = await parseJSONLFile(filePath);

    expect(records).toHaveLength(3);

    expect(records[0]).toEqual({
      timestamp: "2025-03-20T10:30:00.000Z",
      model: "claude-sonnet-4-20250514",
      inputTokens: 1500,
      outputTokens: 800,
      cacheCreationTokens: 200,
      cacheReadTokens: 3000,
    });

    expect(records[1]).toEqual({
      timestamp: "2025-03-20T14:00:00.000Z",
      model: "claude-opus-4-20250514",
      inputTokens: 2500,
      outputTokens: 1200,
      cacheCreationTokens: 500,
      cacheReadTokens: 5000,
    });

    expect(records[2]).toEqual({
      timestamp: "2025-03-21T08:15:00.000Z",
      model: "claude-sonnet-4-20250514",
      inputTokens: 3000,
      outputTokens: 1500,
      cacheCreationTokens: 100,
      cacheReadTokens: 8000,
    });
  });

  it("skips non-assistant records", async () => {
    const filePath = join(FIXTURES_DIR, "sample-assistant.jsonl");
    const records = await parseJSONLFile(filePath);

    // Should only have 3 assistant records (user and system are skipped)
    expect(records).toHaveLength(3);
    // Verify none are user or system type
    for (const record of records) {
      expect(record.model).toBeDefined();
      expect(record.timestamp).toBeDefined();
    }
  });

  it("skips invalid JSON", async () => {
    const filePath = join(FIXTURES_DIR, "sample-assistant.jsonl");
    const records = await parseJSONLFile(filePath);

    // The fixture has 1 invalid JSON line + 1 user + 1 system = 3 skipped
    // Only 3 valid assistant records should remain
    expect(records).toHaveLength(3);
  });

  it("handles empty file", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "parser-test-"));
    const emptyFile = join(tempDir, "empty.jsonl");
    await writeFile(emptyFile, "", "utf-8");

    try {
      const records = await parseJSONLFile(emptyFile);
      expect(records).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true });
    }
  });

  it("correctly extracts cache tokens", async () => {
    const filePath = join(FIXTURES_DIR, "sample-assistant.jsonl");
    const records = await parseJSONLFile(filePath);

    // First record: cache_creation=200, cache_read=3000
    expect(records[0]!.cacheCreationTokens).toBe(200);
    expect(records[0]!.cacheReadTokens).toBe(3000);

    // Second record: cache_creation=500, cache_read=5000
    expect(records[1]!.cacheCreationTokens).toBe(500);
    expect(records[1]!.cacheReadTokens).toBe(5000);

    // Third record: cache_creation=100, cache_read=8000
    expect(records[2]!.cacheCreationTokens).toBe(100);
    expect(records[2]!.cacheReadTokens).toBe(8000);

    // Sum of all cache tokens
    const totalCacheCreation = records.reduce(
      (sum, r) => sum + r.cacheCreationTokens,
      0,
    );
    const totalCacheRead = records.reduce(
      (sum, r) => sum + r.cacheReadTokens,
      0,
    );
    expect(totalCacheCreation).toBe(800);
    expect(totalCacheRead).toBe(16000);
  });

  it("handles assistant records with no usage field", async () => {
    const filePath = join(FIXTURES_DIR, "sample-mixed.jsonl");
    const records = await parseJSONLFile(filePath);

    // Only the zero-tokens assistant record has usage, the other assistant has no usage
    expect(records).toHaveLength(1);
    expect(records[0]!.inputTokens).toBe(0);
    expect(records[0]!.outputTokens).toBe(0);
  });
});
