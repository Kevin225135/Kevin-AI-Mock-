"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Circle,
  FileText,
  Loader2,
  Send,
  Timer
} from "lucide-react";
import { difficultyOptions, moduleOptions } from "@/lib/domain/constants";
import type { MockSession, Question, Report } from "@/lib/domain/types";
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
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";

type SessionPayload = {
  session: MockSession;
  currentQuestion: Question | null;
};

type SubmitPayload = SessionPayload & {
  completed: boolean;
  report?: Report;
};

export function MockRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/mock-sessions/${sessionId}`);
      const data = await response.json();

      if (cancelled) {
        return;
      }
      if (!response.ok) {
        setError(data.error ?? "无法加载 Mock。");
      } else {
        setPayload(data);
      }
      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const progress = useMemo(() => {
    if (!payload) {
      return 0;
    }
    const answered = payload.session.answers.length;
    return Math.round((answered / payload.session.questions.length) * 100);
  }, [payload]);

  async function submitAnswer() {
    if (!payload?.currentQuestion) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/mock-sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: payload.currentQuestion.id,
        content: answer
      })
    });
    const data = (await response.json()) as SubmitPayload & { error?: string };

    if (!response.ok) {
      setError(data.error ?? "提交失败。");
      setIsSubmitting(false);
      return;
    }

    if (data.completed) {
      router.push(`/report/${sessionId}`);
      return;
    }

    setPayload(data);
    setAnswer("");
    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <Card className="shadow-panel">
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          加载 Mock
        </CardContent>
      </Card>
    );
  }

  if (error && !payload) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-subtle">
        {error}
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  const { session, currentQuestion } = payload;
  const moduleLabel =
    moduleOptions.find((option) => option.value === session.module)?.label ??
    session.module;
  const difficultyLabel =
    difficultyOptions.find((option) => option.value === session.difficulty)?.label ??
    session.difficulty;
  const displayIndex = Math.min(
    session.currentQuestionIndex + 1,
    session.questions.length
  );
  const canSubmit = answer.trim().length >= 20 && !isSubmitting;
  const answeredIds = new Set(session.answers.map((item) => item.questionId));

  return (
    <div className="grid w-full max-w-[calc(100vw-2rem)] min-w-0 gap-5 sm:max-w-none lg:grid-cols-[0.72fr_1.28fr]">
      <Card className="overflow-hidden shadow-panel">
        <CardHeader className="border-b border-border/70 bg-card/60">
          <Button
            variant="ghost"
            className="w-fit px-0 text-muted-foreground hover:bg-transparent"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" />
            返回配置
          </Button>

          <div className="space-y-4">
            <div>
              <CardDescription>Session</CardDescription>
              <CardTitle className="mt-1 break-all text-base leading-6">
                {session.id}
              </CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="teal">{moduleLabel}</Badge>
              <Badge tone="amber">{session.targetRole}</Badge>
              <Badge>{difficultyLabel}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">进度</span>
                <span className="text-muted-foreground">
                  {session.answers.length}/{session.questions.length}
                </span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="space-y-3">
              {session.questions.map((question, index) => {
                const answered = answeredIds.has(question.id);
                const active = currentQuestion?.id === question.id;
                const Icon = answered ? Check : active ? Timer : Circle;

                return (
                  <div
                    key={question.id}
                    className={cn(
                      "grid grid-cols-[2rem_1fr] gap-3 rounded-md border p-3 transition-all",
                      active
                        ? "border-ink bg-ink text-primary-foreground shadow-lift"
                        : answered
                          ? "border-primary/20 bg-primary/10"
                          : "border-border/80 bg-background/50 hover:border-ink/20 hover:bg-card"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full border",
                        active
                          ? "border-primary-foreground/20 bg-primary-foreground/10"
                          : "border-border bg-card"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Q{index + 1}</p>
                      <p
                        className={cn(
                          "mt-1 line-clamp-2 text-xs leading-5",
                          active
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        )}
                      >
                        {question.prompt}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-panel">
        {currentQuestion ? (
          <>
            <CardHeader className="border-b border-border/70 bg-card/60">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge tone="slate">
                    Question {displayIndex}/{session.questions.length}
                  </Badge>
                  <CardTitle className="mt-4 max-w-4xl text-2xl leading-9">
                    {currentQuestion.prompt}
                  </CardTitle>
                </div>
                <Badge tone="teal" className="w-fit shrink-0">
                  Structured
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {currentQuestion.expectation ? (
                <div className="mb-5 border-l border-ink/30 bg-background/50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    考察重点
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {currentQuestion.expectation}
                  </p>
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-semibold text-foreground">文字回答</span>
                <Textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={13}
                  className="mt-2 min-h-[340px] resize-y bg-background/70 text-base leading-8"
                  placeholder="用 STAR 或结论先行的结构作答..."
                />
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {answer.trim().length} 字符，至少 20 字符可提交
                </p>
                <Button onClick={submitAnswer} disabled={!canSubmit}>
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  提交评分
                  <Send className="size-4" />
                </Button>
              </div>

              {error ? (
                <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              ) : null}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex min-h-[420px] flex-col items-start justify-center gap-4 p-6">
            <Badge tone="teal">Completed</Badge>
            <CardTitle className="text-2xl">本场 Mock 已完成</CardTitle>
            <Button onClick={() => router.push(`/report/${sessionId}`)}>
              查看复盘报告
              <FileText className="size-4" />
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
