'use client';

import type { DailyUsage, Profile } from '@usage-dashboard/shared';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  usage: DailyUsage[];
  profiles: Profile[];
}

export default function SummaryCards({ usage, profiles }: Props) {
  if (usage.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-4 text-center text-sm text-gray-500">
        Waiting for first sync... Make sure collectors are running on team machines.
      </div>
    );
  }

  const totalTokens = usage.reduce((sum, u) => sum + u.total_tokens, 0);

  const activeUserIds = new Set(usage.map((u) => u.user_id));
  const activeUsers = activeUserIds.size;

  const modelTotals: Record<string, number> = {};
  usage.forEach((u) => {
    Object.entries(u.model_breakdown).forEach(([model, tokens]) => {
      modelTotals[model] = (modelTotals[model] || 0) + (tokens as number);
    });
  });
  const topModel = Object.entries(modelTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const topModelShort = topModel.replace(/^claude-/, '').replace(/-\d{8}$/, '');

  const uniqueDays = new Set(usage.map((u) => u.date)).size;
  const avgPerPersonPerDay =
    activeUsers > 0 && uniqueDays > 0
      ? Math.round(totalTokens / activeUsers / uniqueDays)
      : 0;

  const metrics = [
    { label: 'Total tokens', value: formatTokens(totalTokens) },
    { label: 'Active users', value: `${activeUsers}/${profiles.length}` },
    { label: 'Top model', value: topModelShort },
    { label: 'Avg/person/day', value: formatTokens(avgPerPersonPerDay) },
  ];

  return (
    <div className="flex items-center divide-x divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {metrics.map((m) => (
        <div key={m.label} className="flex-1 px-4 py-3">
          <p className="text-xs text-gray-500">{m.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-900 tabular-nums">{m.value}</p>
        </div>
      ))}
    </div>
  );
}
