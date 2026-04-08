'use client';

import { useState } from 'react';
import { BarChart } from '@tremor/react';
import type { DailyUsage, Profile } from '@usage-dashboard/shared';

const USER_COLORS = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 'fuchsia', 'lime'];
const TOKEN_TYPE_COLORS = ['blue', 'orange'];

type ViewMode = 'by-user' | 'by-type';

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
  const [view, setView] = useState<ViewMode>('by-type');

  if (usage.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm text-gray-500">No usage data to display. Data appears after the first collector sync.</p>
      </div>
    );
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

  // By-user view: total tokens per user per day
  const userCategories = profiles.map((p) => p.name);
  const userDateMap = new Map<string, Record<string, number>>();
  usage.forEach((u) => {
    const name = profileMap.get(u.user_id) || 'Unknown';
    const existing = userDateMap.get(u.date) || {};
    existing[name] = (existing[name] || 0) + u.total_tokens;
    userDateMap.set(u.date, existing);
  });
  const userChartData = Array.from(userDateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, users]) => ({ date: date.slice(5), ...users }));

  // By-type view: input (incl. cache) vs output per day
  const typeCategories = ['Input', 'Output'];
  const typeDateMap = new Map<string, { Input: number; Output: number }>();
  usage.forEach((u) => {
    const existing = typeDateMap.get(u.date) || { Input: 0, Output: 0 };
    existing.Input += u.input_tokens + u.cache_read_tokens + u.cache_creation_tokens;
    existing.Output += u.output_tokens;
    typeDateMap.set(u.date, existing);
  });
  const typeChartData = Array.from(typeDateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, tokens]) => ({ date: date.slice(5), ...tokens }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Daily token load</h2>
        <div className="flex rounded-md border border-gray-200 text-xs">
          <button
            onClick={() => setView('by-type')}
            className={`px-2.5 py-1 ${view === 'by-type' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'} rounded-l-md`}
          >
            Input / Output
          </button>
          <button
            onClick={() => setView('by-user')}
            className={`px-2.5 py-1 ${view === 'by-user' ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'} rounded-r-md`}
          >
            By user
          </button>
        </div>
      </div>
      {view === 'by-user' ? (
        <BarChart
          data={userChartData}
          index="date"
          categories={userCategories}
          colors={USER_COLORS.slice(0, userCategories.length)}
          stack
          className="h-72"
          yAxisWidth={80}
          valueFormatter={formatTokens}
        />
      ) : (
        <BarChart
          data={typeChartData}
          index="date"
          categories={typeCategories}
          colors={TOKEN_TYPE_COLORS}
          stack
          className="h-72"
          yAxisWidth={80}
          valueFormatter={formatTokens}
        />
      )}
    </div>
  );
}
