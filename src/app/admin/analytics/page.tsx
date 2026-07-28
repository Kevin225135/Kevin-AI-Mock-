import { AppShell } from "@/components/app-shell";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export default function AnalyticsPage() {
  return <AppShell><div className="mx-auto w-full max-w-6xl px-5 py-8"><h2 className="mb-6 text-2xl font-semibold">核心数据看板</h2><AnalyticsDashboard /></div></AppShell>;
}
