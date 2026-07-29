import { AppShell } from "@/components/app-shell";
import { ProgressDashboard } from "@/components/progress-dashboard";
export default function ProgressPage(){return <AppShell><div className="mx-auto max-w-5xl px-5 py-8"><h2 className="mentor-display text-3xl font-semibold">进步追踪</h2><p className="mb-6 mt-2 text-sm text-muted-foreground">跨场次观察分数和能力变化。</p><ProgressDashboard/></div></AppShell>}
