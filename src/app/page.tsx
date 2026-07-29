import { AppShell } from "@/components/app-shell";
import { StartMockForm } from "@/components/start-mock-form";

export default function HomePage() {
  return (
    <AppShell>
      {/* Mentor hero: warm, reassuring and focused. */}
      <section className="hero-glass relative overflow-hidden">
        {/* decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-coral opacity-20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/4 size-64 rounded-full bg-brass opacity-15 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-pill border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-badge text-white/90 backdrop-blur">
              AI 驱动 · 透明评分
            </span>
            <h1 className="mentor-display mt-5 text-4xl font-semibold leading-[1.08] tracking-heading text-white sm:text-[3rem]">
              用结构化反馈
              <br />
              打磨每一场面试
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
              选择题型和岗位，提交文字回答，获得逐题打分、扣分依据和范例答案的完整复盘。
            </p>

            {/* quick stats strip */}
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {[
                ["4", "题型模块"],
                ["4", "评分维度"],
                ["100", "满分制"]
              ].map(([value, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums text-white">{value}</span>
                  <span className="text-xs text-white/55">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* bottom fade into page background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
          style={{
            background: "linear-gradient(to bottom, transparent, hsl(var(--background)))"
          }}
        />
      </section>

      {/* ── Configuration ── */}
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <StartMockForm />
      </div>
    </AppShell>
  );
}
