"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { difficultyOptions, moduleOptions } from "@/lib/domain/constants";
import type { MockSession, Question, Report } from "@/lib/domain/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

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
        setError(data.error ?? "无法加载 mock。");
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
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="size-4 animate-spin text-pine" />
          加载 mock
        </div>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
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

  return (
    <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <Button variant="ghost" onClick={() => router.push("/")}>
          <ArrowLeft className="size-4" />
          返回配置
        </Button>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm text-slate-500">Session</p>
            <h2 className="mt-1 break-all text-lg font-semibold text-ink">
              {session.id}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="teal">{moduleLabel}</Badge>
            <Badge tone="amber">{session.targetRole}</Badge>
            <Badge>{difficultyLabel}</Badge>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-800">进度</span>
              <span className="text-slate-600">
                {session.answers.length}/{session.questions.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-pine transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {session.questions.map((question, index) => {
              const answered = session.answers.some(
                (item) => item.questionId === question.id
              );
              const active = currentQuestion?.id === question.id;
              return (
                <div
                  key={question.id}
                  className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <CheckCircle2
                    className={`mt-0.5 size-4 ${
                      answered ? "text-pine" : active ? "text-brass" : "text-slate-300"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">Q{index + 1}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                      {question.prompt}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        {currentQuestion ? (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge tone="coral">
                  Question {displayIndex}/{session.questions.length}
                </Badge>
                <h2 className="mt-3 text-xl font-semibold leading-8 text-ink">
                  {currentQuestion.prompt}
                </h2>
              </div>
            </div>

            {currentQuestion.expectation ? (
              <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                {currentQuestion.expectation}
              </p>
            ) : null}

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-800">文字回答</span>
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={13}
                className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white p-4 text-sm leading-7 outline-none focus:border-pine focus:ring-2 focus:ring-teal-100"
                placeholder="用 STAR 或结论先行的结构作答..."
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{answer.trim().length} 字符</p>
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
          </>
        ) : (
          <div className="flex flex-col items-start gap-4">
            <Badge tone="teal">Completed</Badge>
            <h2 className="text-xl font-semibold text-ink">本场 mock 已完成</h2>
            <Button onClick={() => router.push(`/report/${sessionId}`)}>
              查看复盘报告
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
