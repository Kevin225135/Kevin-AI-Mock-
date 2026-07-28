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
  Star,
  Download,
  Share2,
  TrendingUp
} from "lucide-react";
import { dimensionLabels, scoreDimensions } from "@/lib/domain/constants";
import type { Report } from "@/lib/domain/types";
import { AnimatedNumber, FadeIn } from "./ui/motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

type ReportPayload = {
  report: Report;
};

function getScoreTone(score: number) {
  if (score >= 80) return "teal" as const;
  if (score >= 65) return "amber" as const;
  return "coral" as const;
}

function getScoreLabel(score: number) {
  if (score >= 85) return "表现稳定";
  if (score >= 70) return "接近可用";
  return "需要打磨";
}

export function ReportView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "saving" | "saved">("idle");
  const [issueComment, setIssueComment] = useState("");
  const [issueSent, setIssueSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  async function submitFeedback() {
    if (!rating) return;
    setFeedbackState("saving");
    const response = await fetch(`/api/reports/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: comment.trim() || undefined })
    });
    setFeedbackState(response.ok ? "saved" : "idle");
  }

  async function reportIssue() {
    if (issueComment.trim().length < 3) return;
    const response = await fetch(`/api/reports/${sessionId}/badcases`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "OTHER", comment: issueComment.trim() })
    });
    if (response.ok) setIssueSent(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/reports/${sessionId}`);
      const payload = (await response.json()) as ReportPayload & { error?: string };

      if (cancelled) return;
      if (response.status === 401) {
        router.push(`/login?next=/report/${sessionId}`);
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
  }, [router, sessionId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 rounded-card border border-black/10 bg-white p-6 text-sm text-muted-foreground shadow-card">
        <Loader2 className="size-4 animate-spin text-primary" />
        加载报告中...
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-card border border-destructive/20 bg-destructive/5 p-6 shadow-card">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push(`/mock/${sessionId}`)}
        >
          <ArrowLeft className="size-4" />
          返回 Mock
        </Button>
      </div>
    );
  }

  const scoreTone = getScoreTone(report.averageScore);

  return (
    <div className="w-full max-w-[calc(100vw-2rem)] min-w-0 space-y-6 sm:max-w-none">
      {/* ── Summary Card ── */}
      <FadeIn>
      <div className="rounded-card border border-black/10 bg-white shadow-card">
        <div className="border-b border-black/[0.08] px-6 py-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_14rem] lg:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-subheading text-foreground">
                复盘报告
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {report.summary}
              </p>
            </div>

            <div className="flex items-center gap-4 lg:justify-end">
              <div
                className="grid size-28 shrink-0 place-items-center rounded-full p-[7px]"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${
                    report.averageScore * 3.6
                  }deg, hsl(var(--secondary)) 0deg)`
                }}
              >
                <div className="grid size-full place-items-center rounded-full border border-black/[0.08] bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="text-center">
                    <p className="text-[1.75rem] font-bold leading-none tabular-nums tracking-tight text-foreground">
                      <AnimatedNumber value={report.averageScore} />
                    </p>
                    <p className="mt-1.5 text-[11px] leading-none text-muted-foreground">平均分</p>
                  </div>
                </div>
              </div>
              <div>
                <Badge tone={scoreTone}>{getScoreLabel(report.averageScore)}</Badge>
                <p className="mt-2 text-xs text-muted-foreground">满分 100</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid gap-3 md:grid-cols-4">
            {scoreDimensions.map((dimension) => {
              const value = report.dimensionAverages[dimension];
              return (
                <div
                  key={dimension}
                  className="rounded-button border border-black/[0.08] bg-secondary/20 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {dimensionLabels[dimension]}
                    </p>
                    <Badge tone={value >= 4 ? "teal" : value >= 3 ? "amber" : "coral"}>
                      {value}/5
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(100, (value / 5) * 100)}
                    className="mt-3"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </FadeIn>

      {/* ── Question Feedback (warm white section, Notion-style alternation) ── */}
      <section className="space-y-4 rounded-card bg-surface-warm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-card-title text-foreground">逐题反馈</h2>
          </div>
          <Badge tone="slate">{report.questionFeedback.length} 题</Badge>
        </div>

        {report.questionFeedback.map((item, index) => (
          <FadeIn key={item.questionId} delay={index * 0.08}>
          <div className="rounded-card border border-black/10 bg-white shadow-soft">
            <div className="border-b border-black/[0.08] px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge tone="amber">第 {index + 1} 题</Badge>
                  <h3 className="mt-2.5 text-base font-semibold leading-relaxed text-foreground">
                    {item.prompt}
                  </h3>
                </div>
                <Badge tone={getScoreTone(item.totalScore)}>
                  {item.totalScore}/100
                </Badge>
              </div>
            </div>

            <div className="px-5 py-5">
              {/* Dimension scores */}
              <div className="grid gap-2.5 md:grid-cols-4">
                {scoreDimensions.map((dimension) => (
                  <div
                    key={dimension}
                    className="rounded-button border border-black/[0.06] bg-secondary/20 p-3"
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {dimensionLabels[dimension]}
                    </p>
                    <p className="mt-1.5 text-lg font-bold tabular-nums text-foreground">
                      {item.dimensions[dimension]}<span className="text-sm font-normal text-muted-foreground">/5</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Feedback columns */}
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div className="border-l-2 border-coral/25 pl-4">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-4 text-coral" />
                    <h4 className="text-sm font-semibold text-foreground">扣分依据</h4>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.deductions.map((deduction, deductionIndex) => (
                      <li key={`${deduction}-${deductionIndex}`}>· {deduction}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-l-2 border-brass/25 pl-4">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="size-4 text-brass" />
                    <h4 className="text-sm font-semibold text-foreground">改进建议</h4>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.improvements.map((improvement, improvementIndex) => (
                      <li key={`${improvement}-${improvementIndex}`}>· {improvement}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-l-2 border-primary/25 pl-4">
                  <div className="flex items-center gap-1.5">
                    <BookOpenText className="size-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">范例答案</h4>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {item.sampleAnswer}
                  </p>
                </div>
              </div>
            </div>
          </div>
          </FadeIn>
        ))}
      </section>

      {/* ── Next Practice ── */}
      <FadeIn delay={0.2}>
      <div className="rounded-card border border-black/10 bg-white shadow-card">
        <div className="border-b border-black/[0.08] px-6 py-5">
          <h2 className="text-xl font-semibold tracking-subheading text-foreground">下一次练习</h2>
          <p className="mt-1 text-sm text-muted-foreground">根据本场表现生成的训练重点</p>
        </div>
        <div className="px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            {report.nextPracticePlan.map((plan, index) => (
              <div
                key={`${plan}-${index}`}
                className="rounded-button border border-black/[0.08] bg-secondary/20 p-4"
              >
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  重点 0{index + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{plan}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push("/")} size="lg">
              <RotateCcw className="size-4" />
              再练一场
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/mock/${sessionId}`)} size="lg">
              <ArrowLeft className="size-4" />
              回看本场
            </Button>
            <Button variant="secondary" onClick={() => window.print()} size="lg">
              <Download className="size-4" />导出 PDF
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const response = await fetch(`/api/reports/${sessionId}/share`, { method: "POST" });
                const payload = await response.json();
                if (response.ok) {
                  await navigator.clipboard.writeText(`${window.location.origin}${payload.path}`);
                  setLinkCopied(true);
                }
              }}
              size="lg"
            >
              <Share2 className="size-4" />{linkCopied ? "链接已复制" : "复制报告链接"}
            </Button>
          </div>
        </div>
      </div>
      </FadeIn>

      <FadeIn delay={0.25}>
        <div className="rounded-card border border-black/10 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">这份复盘对你有帮助吗？</h2>
          <p className="mt-1 text-sm text-muted-foreground">你的反馈会用于改进评分和建议质量。</p>
          <div className="mt-4 flex gap-1" aria-label="报告有用性评分">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${value} 星`}
                onClick={() => setRating(value)}
                className="rounded-button p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <Star
                  className={rating >= value ? "size-6 fill-amber text-amber" : "size-6 text-border"}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="可选：哪部分最有用，哪里还可以改进？"
            className="mt-3 min-h-24 w-full rounded-button border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring/15"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button onClick={submitFeedback} disabled={!rating || feedbackState !== "idle"}>
              {feedbackState === "saving" ? <Loader2 className="size-4 animate-spin" /> : null}
              {feedbackState === "saved" ? "感谢反馈" : "提交反馈"}
            </Button>
            {feedbackState === "saved" ? (
              <span className="text-sm text-primary">已记录你的评价。</span>
            ) : null}
          </div>
          <details className="mt-5 border-t border-black/[0.08] pt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">评分或建议有问题？提交 Badcase</summary>
            <textarea value={issueComment} onChange={(event) => setIssueComment(event.target.value)} maxLength={1000} placeholder="请说明不准确、编造或无法执行的地方。" className="mt-3 min-h-20 w-full rounded-button border border-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/15" />
            <Button className="mt-2" variant="secondary" onClick={reportIssue} disabled={issueSent || issueComment.trim().length < 3}>{issueSent ? "已提交" : "提交问题"}</Button>
          </details>
        </div>
      </FadeIn>
    </div>
  );
}
