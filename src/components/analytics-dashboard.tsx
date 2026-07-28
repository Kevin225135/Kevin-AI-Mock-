"use client";

import { useEffect, useState } from "react";
import { Activity, Eye, Loader2, MessageSquareHeart, RotateCcw, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Metrics = {
  starts: number;
  completes: number;
  reportViews: number;
  sevenDayReturns: number;
  completionRate: number;
  reportViewRate: number;
  averageFeedback: number | null;
  averageScore: number | null;
  feedbackCount: number;
};

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((response) => response.json())
      .then((payload) => setMetrics(payload.metrics ?? null));
  }, []);
  if (!metrics) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />加载看板...</div>;

  const cards = [
    ["开始场次", metrics.starts, Activity],
    ["完成率", `${metrics.completionRate}%`, Trophy],
    ["报告查看率", `${metrics.reportViewRate}%`, Eye],
    ["7日回访", metrics.sevenDayReturns, RotateCcw],
    ["平均评分", metrics.averageScore ?? "-", Activity],
    ["报告有用性", metrics.averageFeedback ? `${metrics.averageFeedback}/5` : "-", MessageSquareHeart]
  ] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(([label, value, Icon]) => (
        <Card key={label}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">{label}</CardTitle><Icon className="size-4 text-primary" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">最近 30 天</p></CardContent>
        </Card>
      ))}
    </div>
  );
}
