"use client";

import { useRouter } from "next/navigation";

interface PeriodFilterProps {
  currentPeriod: string;
}

const PERIODS = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "All time", value: "all" },
];

export function PeriodFilter({ currentPeriod }: PeriodFilterProps) {
  const router = useRouter();

  return (
    <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
      {PERIODS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => router.push(`/dashboard?period=${value}`)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            currentPeriod === value
              ? "bg-indigo-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
