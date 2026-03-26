"use client";

import type { DailyUsage, Profile } from "@usage-dashboard/shared";

interface TeamTableProps {
  usage: DailyUsage[];
  profiles: Profile[];
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function TeamTable({ usage, profiles }: TeamTableProps) {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Aggregate per user
  const userStats = new Map<
    string,
    {
      name: string;
      totalTokens: number;
      sessions: number;
      lastSync: string;
    }
  >();

  for (const row of usage) {
    const profile = profileMap.get(row.user_id);
    const name = profile?.name ?? row.user_id;

    if (!userStats.has(row.user_id)) {
      userStats.set(row.user_id, {
        name,
        totalTokens: 0,
        sessions: 0,
        lastSync: row.synced_at,
      });
    }

    const stats = userStats.get(row.user_id)!;
    stats.totalTokens += row.total_tokens;
    stats.sessions += row.sessions;

    if (new Date(row.synced_at) > new Date(stats.lastSync)) {
      stats.lastSync = row.synced_at;
    }
  }

  const rows = Array.from(userStats.values()).sort(
    (a, b) => b.totalTokens - a.totalTokens
  );

  const maxTokens = Math.max(...rows.map((r) => r.totalTokens), 1);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="pb-2 pr-4 font-medium">User</th>
              <th className="pb-2 pr-4 font-medium">Period Tokens</th>
              <th className="pb-2 pr-4 font-medium min-w-[160px]">Usage</th>
              <th className="pb-2 pr-4 font-medium">Sessions</th>
              <th className="pb-2 font-medium">Last Sync</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pct = (row.totalTokens / maxTokens) * 100;
              const syncTime = new Date(row.lastSync).getTime();
              const hoursSinceSync =
                (Date.now() - syncTime) / (1000 * 60 * 60);
              const syncColor =
                hoursSinceSync < 24 ? "bg-green-500" : "bg-yellow-500";

              return (
                <tr
                  key={row.name}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-gray-700">
                    {formatNumber(row.totalTokens)}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-gray-700">
                    {formatNumber(row.sessions)}
                  </td>
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${syncColor}`}
                      />
                      <span className="text-gray-600">
                        {timeAgo(row.lastSync)}
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-gray-400"
                >
                  No usage data for this period. Data will appear once collectors start syncing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
