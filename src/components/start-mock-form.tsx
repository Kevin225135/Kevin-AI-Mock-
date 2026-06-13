"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Layers,
  Loader2,
  Target
} from "lucide-react";
import {
  difficultyOptions,
  moduleOptions,
  roleOptions
} from "@/lib/domain/constants";
import type { Difficulty, InterviewModule } from "@/lib/domain/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

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
      setError(payload.error ?? "创建 mock 失败。");
      setIsSubmitting(false);
      return;
    }

    router.push(`/mock/${payload.session.id}`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge tone="teal">V1 Mock</Badge>
            <h2 className="mt-3 text-xl font-semibold text-ink">练习配置</h2>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
            <Target className="size-4 text-pine" />
            桌面优先，自适应
          </div>
        </div>

        <div className="mt-5 space-y-6">
          <fieldset>
            <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Layers className="size-4 text-pine" />
              模块
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {moduleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setModule(option.value)}
                  className={cn(
                    "min-h-[106px] rounded-md border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
                    module === option.value
                      ? "border-pine bg-teal-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <span className="text-sm font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-slate-600">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <BriefcaseBusiness className="size-4 text-pine" />
                岗位
              </span>
              <select
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-teal-100"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">难度</span>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-teal-100"
              >
                {difficultyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-800">题量</span>
              <input
                type="number"
                min={1}
                max={4}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-teal-100"
              />
            </label>
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
            开始 mock
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">评分维度</h2>
        <div className="mt-4 space-y-3">
          {[
            ["STAR 完整度", "背景、任务、行动、结果是否形成闭环"],
            ["逻辑结构", "结论是否前置，论证是否分层"],
            ["内容深度", "是否包含数据、权衡、反思和岗位映射"],
            ["表达清晰度", "是否简洁、准确、适合面试现场"]
          ].map(([title, description], index) => (
            <div
              key={title}
              className="rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <Badge tone={index % 2 === 0 ? "amber" : "coral"}>1-5</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
