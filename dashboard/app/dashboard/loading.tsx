export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 rounded bg-gray-200" />
          <div className="h-8 w-48 rounded bg-gray-200" />
        </div>
        {/* Status bar skeleton */}
        <div className="h-10 w-full rounded bg-gray-100" />
        {/* KPI strip skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-gray-100" />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="h-72 rounded bg-gray-100" />
        {/* Table skeleton */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
