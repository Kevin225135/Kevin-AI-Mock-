"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpenText,
  ClipboardList,
  Lightbulb,
  Loader2,
  RotateCcw,
  TrendingUp
} from "lucide-react";
import { dimensionLabels, scoreDimensions } from "@/lib/domain/constants";
import type { Report } from "@/lib/domain/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Progress } from "./ui/progress";

type ReportPayload = {
  report: Report;
};

function getScoreTone(score: number) {
  if (score >= 80) {
    return "teal";
  }
  if (score >= 65) {
    return "amber";
  }
  return "coral";
}

function getScoreLabel(score: number) {
  if (score >= 85) {
    return "表现稳定";
  }
  if (score >= 70) {
    return "接近可用";
  }
  return "需要打磨";
}

export function ReportView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/reports/${sessionId}`);
      const payload = (await response.json()) as ReportPayload & { error?: string };

      if (cancelled) {
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? "报告还没有生成。");
      } else {
        setReport(payload.report);
      }
      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <Card className="shadow-panel">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          加载报告
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Card className="border-red-200 bg-red-50 shadow-panel">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-red-900">{error}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => router.push(`/mock/${sessionId}`)}
          >
            <ArrowLeft className="size-4" />
            返回 Mock
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scoreTone = getScoreTone(report.averageScore);

  return (
    <div className="w-full max-w-[calc(100vw-2rem)] min-w-0 space-y-5 sm:max-w-none">
      <Card className="overflow-hidden shadow-panel">
        <CardHeader className="border-b border-border/70 bg-card/60">
          <div className="grid gap-6 lg:grid-cols-[1fr_15rem] lg:items-center">
            <div>
              <Badge tone="slate">Report</Badge>
              <CardTitle className="mt-4 text-3xl">复盘报告</CardTitle>
              <CardDescription className="mt-4 max-w-3xl text-sm leading-7">
                {report.summary}
              </CardDescription>
            </div>

            <div className="flex items-center gap-4 lg:justify-end">
              <div
                className="grid size-28 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--ink)) ${
                    report.averageScore * 3.6
                  }deg, hsl(var(--secondary)) 0deg)`
                }}
              >
                <div className="grid size-20 place-items-center rounded-full border border-border/80 bg-card">
                  <div className="text-center">
                    <p className="text-3xl font-semibold text-ink">
                      {report.averageScore}
                    </p>
                    <p className="text-xs text-muted-foreground">平均分</p>
                  </div>
                </div>
              </div>
              <div>
                <Badge tone={scoreTone}>{getScoreLabel(report.averageScore)}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">满分 100</p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-4">
            {scoreDimensions.map((dimension) => {
              const value = report.dimensionAverages[dimension];
              return (
                <div
                  key={dimension}
                  className="rounded-md border border-border/80 bg-background/50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">
                      {dimensionLabels[dimension]}
                    </p>
                    <Badge tone={value >= 4 ? "teal" : value >= 3 ? "amber" : "coral"}>
                      {value}/5
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(100, (value / 5) * 100)}
                    className="mt-4"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="text-lg font-semibold text-ink">逐题反馈</h2>
          </div>
          <Badge tone="slate">{report.questionFeedback.length} items</Badge>
        </div>

        {report.questionFeedback.map((item, index) => (
          <Card key={item.questionId} className="overflow-hidden shadow-subtle">
            <CardHeader className="border-b border-border/70 bg-card/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge tone="amber">Q{index + 1}</Badge>
                  <CardTitle className="mt-4 text-base leading-7">
                    {item.prompt}
                  </CardTitle>
                </div>
                <Badge tone={getScoreTone(item.totalScore)}>
                  {item.totalScore}/100
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid gap-3 md:grid-cols-4">
                {scoreDimensions.map((dimension) => (
                  <div
                    key={dimension}
                    className="rounded-md border border-border/80 bg-background/50 p-3"
                  >
                    <p className="text-xs font-semibold text-muted-foreground">
                      {dimensionLabels[dimension]}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-ink">
                      {item.dimensions[dimension]}/5
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <div className="border-l border-coral/30 pl-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-coral" />
                    <h4 className="text-sm font-semibold text-ink">扣分依据</h4>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {item.deductions.map((deduction, deductionIndex) => (
                      <li key={`${deduction}-${deductionIndex}`}>- {deduction}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-l border-brass/30 pl-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="size-4 text-brass" />
                    <h4 className="text-sm font-semibold text-ink">改进建议</h4>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    {item.improvements.map((improvement, improvementIndex) => (
                      <li key={`${improvement}-${improvementIndex}`}>
                        - {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-l border-primary/30 pl-4">
                  <div className="flex items-center gap-2">
                    <BookOpenText className="size-4 text-primary" />
                    <h4 className="text-sm font-semibold text-ink">范例答案</h4>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.sampleAnswer}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden shadow-panel">
        <CardHeader className="border-b border-border/70 bg-card/60">
          <CardTitle>下一次练习</CardTitle>
          <CardDescription>根据本场表现生成的训练重点。</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-3 md:grid-cols-3">
            {report.nextPracticePlan.map((plan, index) => (
              <div
                key={`${plan}-${index}`}
                className="rounded-md border border-border/80 bg-background/50 p-4 text-sm leading-6 text-foreground"
              >
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Focus 0{index + 1}
                </span>
                {plan}
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push("/")}>
              <RotateCcw className="size-4" />
              再练一场
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/mock/${sessionId}`)}>
              <ArrowLeft className="size-4" />
              回看本场
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
