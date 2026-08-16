"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Circle,
  FileText,
  Loader2,
  Send
} from "lucide-react";
import { difficultyOptions, moduleOptions } from "@/lib/domain/constants";
import type { MockSession, Question, Report } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { EASE_OUT_QUART } from "./ui/motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { VoiceAnswer } from "./voice-answer";

type SessionPayload = {
  session: MockSession;
  currentQuestion: Question | null;
};

type SubmitPayload = SessionPayload & {
  completed: boolean;
  report?: Report;
  queued?: boolean;
};

export function MockRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<SessionPayload | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sttStatus, setSttStatus] = useState<"COMPLETED" | "FAILED" | "NOT_USED">("NOT_USED");
  const [scoringMessage, setScoringMessage] = useState("正在保存回答...");

  useEffect(() => {
    if (!isSubmitting) {
      setScoringMessage("正在保存回答...");
      return;
    }
    const messages = ["正在保存回答...", "正在按四个维度评分...", "正在生成改进建议...", "正在准备下一题..."];
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(index + 1, messages.length - 1);
      setScoringMessage(messages[index]);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [isSubmitting]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch(`/api/mock-sessions/${sessionId}`);
      const data = await response.json();

      if (cancelled) return;
      if (response.status === 401) {
        router.push(`/login?next=/mock/${sessionId}`);
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
  }, [router, sessionId]);

  const progress = useMemo(() => {
    if (!payload) return 0;
    const answered = payload.session.answers.length;
    return Math.round((answered / payload.session.questions.length) * 100);
  }, [payload]);

  async function submitAnswer() {
    if (!payload?.currentQuestion) return;

    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/mock-sessions/${sessionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: payload.currentQuestion.id,
        content: answer,
        transcript: sttStatus === "COMPLETED" ? answer : undefined,
        sttStatus
      })
    });
    const data = (await response.json()) as SubmitPayload & { error?: string };

    if (!response.ok) {
      if (response.status === 401) {
        router.push(`/login?next=/mock/${sessionId}`);
        return;
      }
      setError(data.error ?? "提交失败。");
      setIsSubmitting(false);
      return;
    }

    if (data.queued) {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const statusResponse = await fetch(`/api/mock-sessions/${sessionId}`);
        const statusData = (await statusResponse.json()) as SessionPayload;
        if (statusData.session.status !== "SCORING") {
          if (statusData.session.status === "COMPLETED") {
            router.push(`/report/${sessionId}`);
            return;
          }
          setPayload(statusData);
          setAnswer("");
          setSttStatus("NOT_USED");
          setIsSubmitting(false);
          return;
        }
      }
      setError("评分仍在处理中，请稍后刷新页面。");
      setIsSubmitting(false);
      return;
    }

    if (data.completed) {
      router.push(`/report/${sessionId}`);
      return;
    }

    setPayload(data);
    setAnswer("");
    setSttStatus("NOT_USED");
    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 rounded-card border border-black/10 bg-white p-6 text-sm text-muted-foreground shadow-card">
        <Loader2 className="size-4 animate-spin text-primary" />
        加载面试中...
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="rounded-card border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive shadow-card">
        {error}
      </div>
    );
  }

  if (!payload) return null;

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
    <div className="grid w-full max-w-[calc(100vw-2rem)] min-w-0 gap-6 sm:max-w-none lg:grid-cols-[0.7fr_1.3fr]">
      {/* ── Left: Session sidebar ── */}
      <div className="rounded-card border border-black/10 bg-white shadow-card">
        <div className="border-b border-black/[0.08] px-5 py-4">
          <Button
            variant="ghost"
            className="h-auto px-0 text-muted-foreground hover:bg-transparent"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="size-4" />
            返回配置
          </Button>

          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">会话编号</p>
            <p className="break-all text-sm font-medium text-foreground">
              {session.id}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="blue">{moduleLabel}</Badge>
              <Badge tone="amber">{session.targetRole}</Badge>
              <Badge tone="slate">{difficultyLabel}</Badge>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">进度</span>
              <span className="tabular-nums text-muted-foreground">
                {session.answers.length}/{session.questions.length}
              </span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="space-y-2">
            {session.questions.map((question, index) => {
              const answered = answeredIds.has(question.id);
              const active = currentQuestion?.id === question.id;
              const Icon = answered ? Check : active ? Loader2 : Circle;

              return (
                <div
                  key={question.id}
                  className={cn(
                    "flex gap-2.5 rounded-button border p-3 transition-all duration-200 ease-out-quart",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/15"
                      : answered
                        ? "border-black/[0.06] bg-secondary/30"
                        : "border-black/[0.08] bg-white hover:border-black/[0.12]"
                  )}
                >
                  <div className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary text-primary-foreground" : answered ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className={cn("size-3.5", active && "animate-spin")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Q{index + 1}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {question.prompt}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Question & Answer ── */}
      <div className="rounded-card border border-black/10 bg-white shadow-card">
        <AnimatePresence mode="wait">
        {currentQuestion ? (
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
          >
          <>
            <div className="border-b border-black/[0.08] px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Badge tone="slate">
                    第 {displayIndex} / {session.questions.length} 题
                  </Badge>
                  <h2 className="mt-3 max-w-4xl text-xl font-semibold leading-relaxed tracking-subheading text-foreground">
                    {currentQuestion.prompt}
                  </h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {currentQuestion.expectation ? (
                <div className="mb-5 rounded-button border-l-2 border-primary/30 bg-primary/[0.03] px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    考察重点
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                    {currentQuestion.expectation}
                  </p>
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-medium text-foreground">文字回答</span>
                <Textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={13}
                  className="mt-2 min-h-[320px] resize-y text-base leading-relaxed"
                  placeholder="用 STAR 或结论先行的结构作答..."
                />
                <VoiceAnswer
                  onTranscript={setAnswer}
                  onStatus={setSttStatus}
                />
              </label>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm tabular-nums text-muted-foreground">
                  {answer.trim().length} 字符，至少 20 字符可提交
                </p>
                <Button onClick={submitAnswer} disabled={!canSubmit} size="lg">
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  提交评分
                  <Send className="size-4" />
                </Button>
              </div>

              {isSubmitting ? (
                <div className="mt-4 rounded-button border border-primary/10 bg-primary/[0.04] p-3">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="size-4 animate-spin" />
                    {scoringMessage}
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-primary/10">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-button bg-destructive/8 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          </>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT_QUART }}
            className="flex min-h-[400px] flex-col items-start justify-center gap-4 px-6 py-6"
          >
            <Badge tone="teal">已完成</Badge>
            <h2 className="text-2xl font-semibold tracking-subheading text-foreground">
              本场 Mock 已完成
            </h2>
            <Button onClick={() => router.push(`/report/${sessionId}`)} size="lg">
              查看复盘报告
              <FileText className="size-4" />
            </Button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
