import { AppShell } from "@/components/app-shell";
import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return <AppShell><div className="mx-auto w-full max-w-4xl px-5 py-8"><h2 className="text-2xl font-semibold">训练历史</h2><p className="mb-6 mt-2 text-sm text-muted-foreground">回看每一场练习、评分和复盘报告。</p><HistoryList /></div></AppShell>;
}
