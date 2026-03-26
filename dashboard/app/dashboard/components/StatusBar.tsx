'use client';

import type { DailyUsage, Profile } from '@usage-dashboard/shared';

interface Props {
  usage: DailyUsage[];
  profiles: Profile[];
}

export default function StatusBar({ usage, profiles }: Props) {
  if (usage.length === 0) return null;

  const now = new Date();
  let lastSync: Date | null = null;
  const staleUsers: string[] = [];
  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

  const userLastSync = new Map<string, Date>();
  usage.forEach((u) => {
    const syncDate = new Date(u.synced_at);
    const current = userLastSync.get(u.user_id);
    if (!current || syncDate > current) {
      userLastSync.set(u.user_id, syncDate);
    }
    if (!lastSync || syncDate > lastSync) {
      lastSync = syncDate;
    }
  });

  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  userLastSync.forEach((syncDate, userId) => {
    if (syncDate < twentyFourHoursAgo) {
      staleUsers.push(profileMap.get(userId) || 'Unknown');
    }
  });

  const formatRelative = (date: Date): string => {
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isStale = staleUsers.length > 0;

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-2 text-xs ${
        isStale
          ? 'border border-yellow-200 bg-yellow-50 text-yellow-800'
          : 'border border-gray-200 bg-gray-50 text-gray-600'
      }`}
    >
      <span>
        Last data received: {lastSync ? formatRelative(lastSync) : 'never'}
      </span>
      {isStale && (
        <span className="font-medium">
          {staleUsers.length} member{staleUsers.length > 1 ? 's' : ''} not synced in 24h+: {staleUsers.join(', ')}
        </span>
      )}
    </div>
  );
}
