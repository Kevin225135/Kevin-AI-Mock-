"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Loader2, RotateCcw } from "lucide-react";
import { dimensionLabels, scoreDimensions } from "@/lib/domain/constants";
import type { Report } from "@/lib/domain/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type ReportPayload = {
  report: Report;
};

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
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="size-4 animate-spin text-pine" />
          加载报告
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-900">{error}</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push(`/mock/${sessionId}`)}
        >
          <ArrowLeft className="size-4" />
          返回 mock
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge tone="teal">Report</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-ink">复盘报告</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {report.summary}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-5 py-4 text-center">
            <p className="text-sm font-semibold text-slate-600">平均分</p>
            <p className="mt-1 text-4xl font-semibold text-pine">
              {report.averageScore}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {scoreDimensions.map((dimension) => {
            const value = report.dimensionAverages[dimension];
            return (
              <div
                key={dimension}
                className="rounded-md border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {dimensionLabels[dimension]}
                  </p>
                  <Badge tone={value >= 4 ? "teal" : value >= 3 ? "amber" : "coral"}>
                    {value}/5
                  </Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-pine"
                    style={{ width: `${Math.min(100, (value / 5) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-pine" />
          <h2 className="text-lg font-semibold text-ink">逐题反馈</h2>
        </div>
        <div className="mt-5 space-y-4">
          {report.questionFeedback.map((item, index) => (
            <article
              key={item.questionId}
              className="rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge tone="amber">Q{index + 1}</Badge>
                  <h3 className="mt-3 text-base font-semibold leading-7 text-ink">
                    {item.prompt}
                  </h3>
                </div>
                <Badge tone={item.totalScore >= 80 ? "teal" : "coral"}>
                  {item.totalScore}/100
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {scoreDimensions.map((dimension) => (
                  <div
                    key={dimension}
                    className="rounded-md border border-slate-200 bg-white p-3"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {dimensionLabels[dimension]}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-ink">
                      {item.dimensions[dimension]}/5
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink">扣分依据</h4>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                    {item.deductions.map((deduction) => (
                      <li key={deduction}>- {deduction}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">改进建议</h4>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                    {item.improvements.map((improvement) => (
                      <li key={improvement}>- {improvement}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">范例答案</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.sampleAnswer}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-lg font-semibold text-ink">下一次练习</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {report.nextPracticePlan.map((plan) => (
            <div
              key={plan}
              className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
            >
              {plan}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => router.push("/")}>
            <RotateCcw className="size-4" />
            再练一场
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/mock/${sessionId}`)}>
            <ArrowLeft className="size-4" />
            回看本场
          </Button>
        </div>
      </section>
    </div>
  );
}
