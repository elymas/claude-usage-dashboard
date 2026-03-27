'use client';

import { BarChart } from '@tremor/react';
import type { DailyUsage, Profile } from '@usage-dashboard/shared';

const COLORS = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 'fuchsia', 'lime'];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  usage: DailyUsage[];
  profiles: Profile[];
}

export default function UsageChart({ usage, profiles }: Props) {
  if (usage.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm text-gray-500">No usage data to display. Data appears after the first collector sync.</p>
      </div>
    );
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));
  const categories = profiles.map((p) => p.name);

  const dateMap = new Map<string, Record<string, number>>();
  usage.forEach((u) => {
    const name = profileMap.get(u.user_id) || 'Unknown';
    const existing = dateMap.get(u.date) || {};
    existing[name] = (existing[name] || 0) + u.total_tokens;
    dateMap.set(u.date, existing);
  });

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => ({
      date: date.slice(5),
      ...users,
    }));

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-gray-700">Daily token load</h2>
      <BarChart
        data={chartData}
        index="date"
        categories={categories}
        colors={COLORS.slice(0, categories.length)}
        stack
        className="h-72"
        yAxisWidth={80}
        valueFormatter={formatTokens}
      />
    </div>
  );
}
