"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  Gauge,
  Home,
  MessageSquareText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";
import { useLocale } from "./locale-provider";

const steps = [
  { label: "配置", enLabel: "Setup", icon: Gauge, match: (path: string) => path === "/" },
  {
    label: "作答", enLabel: "Practice",
    icon: ClipboardCheck,
    match: (path: string) => path.startsWith("/mock/")
  },
  {
    label: "复盘", enLabel: "Review",
    icon: FileText,
    match: (path: string) => path.startsWith("/report/")
  }
];

export function GlobalNavigation() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {!isHome ? (
            <Link
              href="/"
              aria-label="返回主页面"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-button text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </Link>
          ) : null}

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-button bg-primary text-primary-foreground">
              <MessageSquareText className="size-4" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="text-[11px] font-medium text-muted-foreground">
                {t("AI Mock 面试教练", "AI Mock Coach")}
              </p>
              <h1 className="truncate text-base font-semibold text-foreground">
                {t("面试训练室", "Interview Studio")}
              </h1>
            </div>
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <nav
            aria-label="面试流程"
            className="hidden items-center gap-0.5 rounded-button border border-black/[0.08] bg-secondary/50 p-1 lg:flex"
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = step.match(pathname);
              return (
                <Link
                  key={step.label}
                  href={index === 0 ? "/" : pathname}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-white text-foreground shadow-whisper"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("size-3.5", active && "text-primary")} />
                  <span className="text-muted-foreground/60">0{index + 1}</span>
                  {t(step.label, step.enLabel)}
                </Link>
              );
            })}
          </nav>

          {!isHome ? (
            <Link
              href="/"
              className="hidden h-8 items-center gap-1.5 rounded-button border border-black/[0.08] px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary md:inline-flex lg:hidden"
            >
              <Home className="size-3.5" />
              {t("主页面", "Home")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
            className="h-8 rounded-button border border-black/[0.08] px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="切换语言"
          >
            {locale === "zh" ? "EN" : "中文"}
          </button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
