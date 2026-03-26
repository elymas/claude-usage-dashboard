"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import SummaryCards from "./components/SummaryCards";
import UsageChart from "./components/UsageChart";
import { TeamTable } from "./components/TeamTable";
import { PeriodFilter } from "./components/PeriodFilter";
import { CSVExport } from "./components/CSVExport";
import StatusBar from "./components/StatusBar";
import SignOut from "./components/SignOut";
import DashboardLoading from "./loading";
import type { DailyUsage, Profile } from "@usage-dashboard/shared";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") || "7d";

  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function fetchData() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const now = new Date();
      const toKSTDateStr = (d: Date): string => {
        const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return kst.toISOString().split("T")[0];
      };
      let since: string | null = null;

      if (period === "today") {
        since = toKSTDateStr(now);
      } else if (period === "7d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        since = toKSTDateStr(d);
      } else if (period === "30d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        since = toKSTDateStr(d);
      }

      let query = supabase.from("daily_usage").select("*");
      if (since) {
        query = query.gte("date", since);
      }

      const [usageResult, profilesResult] = await Promise.all([
        query.order("date", { ascending: true }),
        supabase.from("profiles").select("*"),
      ]);

      if (usageResult.error || profilesResult.error) {
        setError(
          usageResult.error?.message ||
            profilesResult.error?.message ||
            "Failed to load data"
        );
        setLoading(false);
        return;
      }

      setUsage((usageResult.data ?? []) as DailyUsage[]);
      setProfiles((profilesResult.data ?? []) as Profile[]);
      setLoading(false);
    }

    fetchData();
  }, [period, router]);

  if (loading) return <DashboardLoading />;

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            Failed to load dashboard
          </h2>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Claude Usage Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Estimated from Claude Code logs
          </p>
        </div>
        <SignOut email={user?.email || ""} />
      </div>

      <div className="mt-4">
        <StatusBar usage={usage} profiles={profiles} />
      </div>

      <div className="mt-4">
        <PeriodFilter currentPeriod={period} />
      </div>

      <div className="mt-4">
        <SummaryCards usage={usage} profiles={profiles} />
      </div>

      <div className="mt-6">
        <UsageChart usage={usage} profiles={profiles} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            Team sync status
          </h2>
          <CSVExport usage={usage} profiles={profiles} />
        </div>
        <TeamTable usage={usage} profiles={profiles} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
