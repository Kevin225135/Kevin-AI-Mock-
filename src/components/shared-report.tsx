"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Report } from "@/lib/domain/types";
import { dimensionLabels, scoreDimensions } from "@/lib/domain/constants";
import { Progress } from "./ui/progress";
export function SharedReport({ token }: { token: string }) {
  const [report,setReport]=useState<Report|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{fetch(`/api/shared/${token}`).then(async r=>{const d=await r.json();if(r.ok)setReport(d.report);else setError(d.error)});},[token]);
  if(error)return <p className="p-10 text-center text-destructive">{error}</p>;
  if(!report)return <p className="flex items-center justify-center gap-2 p-10"><Loader2 className="size-4 animate-spin"/>加载报告...</p>;
  return <div className="space-y-5"><div className="rounded-card border bg-white p-6 shadow-card"><p className="text-5xl font-bold">{report.averageScore}</p><p className="mt-2 text-sm text-muted-foreground">{report.summary}</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{scoreDimensions.map(k=><div key={k}><div className="mb-1 flex justify-between text-sm"><span>{dimensionLabels[k]}</span><b>{report.dimensionAverages[k]}/5</b></div><Progress value={report.dimensionAverages[k]/5*100}/></div>)}</div></div><div className="space-y-3">{report.questionFeedback.map((item,i)=><div key={item.questionId} className="rounded-card border bg-white p-5"><b>第 {i+1} 题 · {item.totalScore} 分</b><p className="mt-2 text-sm">{item.prompt}</p><ul className="mt-3 text-sm text-muted-foreground">{item.improvements.map(x=><li key={x}>· {x}</li>)}</ul></div>)}</div></div>;
}
