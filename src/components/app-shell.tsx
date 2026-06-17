import type { ReactNode } from "react";
import { ClipboardCheck, FileText, Gauge, MessageSquareText } from "lucide-react";

const steps = [
  { label: "配置", icon: Gauge },
  { label: "作答", icon: ClipboardCheck },
  { label: "复盘", icon: FileText }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/82 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-ink/10 bg-ink text-primary-foreground shadow-subtle">
              <MessageSquareText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                AI Mock 面试教练
              </p>
              <h1 className="mt-0.5 truncate text-xl font-semibold tracking-normal text-ink sm:text-2xl">
                面试训练室
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/70 p-1 shadow-subtle sm:flex">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <span
                  key={step.label}
                  className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold text-muted-foreground"
                >
                  <Icon className="size-3.5" />
                  <span className="text-[10px] text-muted-foreground/70">
                    0{index + 1}
                  </span>
                  {step.label}
                </span>
              );
            })}
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
