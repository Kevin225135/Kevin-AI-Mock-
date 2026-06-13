import { ClipboardCheck, LineChart, MessageSquareText } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/86 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold text-pine">AI Mock 面试教练</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">
              高频练习、透明评分、可复盘进步
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 sm:flex">
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
              <MessageSquareText className="size-4 text-pine" />
              文本 Mock
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
              <ClipboardCheck className="size-4 text-brass" />
              Rubric 评分
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
              <LineChart className="size-4 text-coral" />
              复盘报告
            </span>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
