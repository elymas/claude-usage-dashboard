import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SummaryCards from "./components/SummaryCards";
import UsageChart from "./components/UsageChart";
import { TeamTable } from "./components/TeamTable";
import { PeriodFilter } from "./components/PeriodFilter";
import { CSVExport } from "./components/CSVExport";
import StatusBar from "./components/StatusBar";
import SignOut from "./components/SignOut";
import type { DailyUsage, Profile } from "@usage-dashboard/shared";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const period = searchParams.period || "7d";
  const now = new Date();
  // KST (UTC+9) 기준으로 날짜 계산
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
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

  if (usageResult.error)
    throw new Error(`Failed to load usage data: ${usageResult.error.message}`);
  if (profilesResult.error)
    throw new Error(`Failed to load profiles: ${profilesResult.error.message}`);

  const usage = (usageResult.data ?? []) as DailyUsage[];
  const profiles = (profilesResult.data ?? []) as Profile[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Claude Usage Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Estimated from Claude Code logs
          </p>
        </div>
        <SignOut email={user.email || ""} />
      </div>

      {/* Status bar -- data freshness */}
      <div className="mt-4">
        <StatusBar usage={usage} profiles={profiles} />
      </div>

      {/* Period filter */}
      <div className="mt-4">
        <PeriodFilter currentPeriod={period} />
      </div>

      {/* KPI strip */}
      <div className="mt-4">
        <SummaryCards usage={usage} profiles={profiles} />
      </div>

      {/* Chart -- main visual */}
      <div className="mt-6">
        <UsageChart usage={usage} profiles={profiles} />
      </div>

      {/* Team table + CSV export */}
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
