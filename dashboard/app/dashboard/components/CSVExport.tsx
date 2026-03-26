"use client";

import type { DailyUsage, Profile } from "@usage-dashboard/shared";

interface CSVExportProps {
  usage: DailyUsage[];
  profiles: Profile[];
}

export function CSVExport({ usage, profiles }: CSVExportProps) {
  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

  const handleExport = () => {
    const headers = [
      "Date",
      "User",
      "Total Tokens",
      "Input Tokens",
      "Output Tokens",
      "Cache Read Tokens",
      "Cache Creation Tokens",
      "Sessions",
      "Source",
      "Synced At",
    ];

    const rows = usage.map((row) => [
      row.date,
      profileMap.get(row.user_id) ?? row.user_id,
      row.total_tokens,
      row.input_tokens,
      row.output_tokens,
      row.cache_read_tokens,
      row.cache_creation_tokens,
      row.sessions,
      row.source,
      row.synced_at,
    ]);

    const escapeCSV = (v: unknown): string => {
      const str = String(v ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((r) => r.map(escapeCSV).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    link.download = `claude-usage-${kstNow.toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const disabled = usage.length === 0;

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Export CSV
    </button>
  );
}
