"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  LineChart,
  Loader2,
  MessageSquareText,
  Minus,
  Plus,
  ShieldCheck,
  Timer
} from "lucide-react";
import {
  difficultyOptions,
  moduleOptions,
  roleOptions
} from "@/lib/domain/constants";
import type { Difficulty, InterviewModule } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";

const moduleMeta: Record<
  InterviewModule,
  {
    icon: typeof MessageSquareText;
    shortLabel: string;
  }
> = {
  BEHAVIORAL: {
    icon: MessageSquareText,
    shortLabel: "行为"
  },
  CV_RELATED: {
    icon: BriefcaseBusiness,
    shortLabel: "简历"
  },
  TECHNICAL: {
    icon: ShieldCheck,
    shortLabel: "专业"
  },
  MARKET: {
    icon: LineChart,
    shortLabel: "市场"
  }
};

const rubricItems = [
  ["STAR 完整度", "背景、任务、行动、结果是否形成闭环"],
  ["逻辑结构", "结论是否前置，论证是否分层"],
  ["内容深度", "是否包含数据、权衡、反思和岗位映射"],
  ["表达清晰度", "是否简洁、准确、适合面试现场"]
] as const;

export function StartMockForm() {
  const router = useRouter();
  const [module, setModule] = useState<InterviewModule>("BEHAVIORAL");
  const [targetRole, setTargetRole] = useState<string>("Product Manager");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [questionCount, setQuestionCount] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function startMock() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/mock-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, targetRole, difficulty, questionCount })
    });
    const payload = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login?next=/");
        return;
      }
      setError(
        payload.code === "QUOTA_EXCEEDED"
          ? "本月 Mock 额度已用完，请联系管理员调整额度。"
          : payload.error ?? "创建 Mock 失败。"
      );
      setIsSubmitting(false);
      return;
    }

    router.push(`/mock/${payload.session.id}`);
  }

  const selectedModule = moduleOptions.find((option) => option.value === module);
  const selectedDifficulty = difficultyOptions.find(
    (option) => option.value === difficulty
  );

  return (
    <div className="grid w-full max-w-[calc(100vw-2rem)] min-w-0 gap-5 sm:max-w-none lg:grid-cols-[1.08fr_0.92fr]">
      <Card className="overflow-hidden shadow-panel">
        <CardHeader className="border-b border-border/70 bg-card/60">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone="slate">Atelier 01</Badge>
              <CardTitle className="mt-4 text-2xl">练习配置</CardTitle>
              <CardDescription className="mt-3 max-w-xl leading-6">
                选择题型、岗位和节奏，开始一场干净的模拟面试。
              </CardDescription>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground shadow-subtle">
              <Timer className="size-4 text-primary" />
              {questionCount * 8}-{questionCount * 10} 分钟
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-7">
            <fieldset>
              <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <ClipboardCheck className="size-4 text-primary" />
                模块
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {moduleOptions.map((option, index) => {
                  const active = module === option.value;
                  const Icon = moduleMeta[option.value].icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setModule(option.value)}
                      className={cn(
                        "group min-h-[132px] rounded-md border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                        active
                          ? "border-ink bg-ink text-primary-foreground shadow-lift"
                          : "border-border/80 bg-background/50 hover:-translate-y-0.5 hover:border-ink/30 hover:bg-card hover:shadow-lift"
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex size-9 items-center justify-center rounded-md border",
                              active
                                ? "border-primary-foreground/20 bg-primary-foreground/10"
                                : "border-border bg-card"
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span>
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">
                              0{index + 1} · {moduleMeta[option.value].shortLabel}
                            </span>
                            <span className="mt-1 block text-sm font-semibold">
                              {option.label}
                            </span>
                          </span>
                        </span>
                        {active ? <Check className="size-4" /> : null}
                      </span>
                      <span
                        className={cn(
                          "mt-4 block text-sm leading-6",
                          active ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BriefcaseBusiness className="size-4 text-primary" />
                  岗位
                </span>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-foreground">难度</span>
                <Select
                  value={difficulty}
                  onValueChange={(value) => setDifficulty(value as Difficulty)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-foreground">题量</span>
                <div className="flex h-11 items-center justify-between rounded-md border border-input bg-card/70 px-2 shadow-subtle">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setQuestionCount((value) => Math.max(1, value - 1))}
                    disabled={questionCount <= 1}
                    aria-label="减少题量"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="min-w-10 text-center text-sm font-semibold text-ink">
                    {questionCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setQuestionCount((value) => Math.min(4, value + 1))}
                    disabled={questionCount >= 4}
                    aria-label="增加题量"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}

            <Button
              onClick={startMock}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              开始 Mock
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-panel">
        <CardHeader className="border-b border-border/70 bg-card/60">
          <Badge tone="slate" className="w-fit">
            Rubric
          </Badge>
          <CardTitle className="mt-2">本场预览</CardTitle>
          <CardDescription>
            {selectedModule?.label} / {targetRole} / {selectedDifficulty?.label}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-3 border-b border-border/70 pb-6 text-center">
            {[
              [questionCount, "题目"],
              [4, "维度"],
              [100, "总分"]
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-3xl font-semibold text-ink">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-5">
            {rubricItems.map(([title, description], index) => (
              <div key={title} className="grid grid-cols-[2rem_1fr] gap-3">
                <div className="flex size-8 items-center justify-center rounded-full border border-border/80 bg-background/70 text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">{title}</h3>
                    <Badge tone={index % 2 === 0 ? "amber" : "coral"}>1-5</Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
