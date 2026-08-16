"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { dimensionLabels } from "@/lib/domain/constants";
import { Progress } from "./ui/progress";
type Data = { trend: Array<{id:string;date:string;score:number;module:string}>; dimensions: Record<string,number>; recommendation:string };
export function ProgressDashboard() {
  const [data,setData]=useState<Data|null>(null);
  useEffect(()=>{fetch("/api/progress").then(r=>r.json()).then(setData)},[]);
  if(!data)return <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin"/>加载进步数据...</p>;
  const radarValues = ["starCompleteness","logicStructure","contentDepth","communication"].map((key)=>data.dimensions[key]??0);
  const radarPoints = radarValues.map((value,index)=>{const angle=-Math.PI/2+index*Math.PI/2;const radius=70*(value/5);return `${100+Math.cos(angle)*radius},${100+Math.sin(angle)*radius}`}).join(" ");
  return <div className="space-y-6">
    <div className="rounded-card border border-black/10 bg-white p-6 shadow-card"><h3 className="font-semibold">分数趋势</h3><div className="mt-5 flex h-48 items-end gap-2 overflow-x-auto">{data.trend.map((p)=><div key={p.id} className="flex min-w-12 flex-1 flex-col items-center gap-2"><span className="text-xs font-semibold">{p.score}</span><div className="w-full rounded-t bg-primary/80" style={{height:`${Math.max(8,p.score*1.4)}px`}}/><span className="text-[10px] text-muted-foreground">{new Date(p.date).toLocaleDateString()}</span></div>)}</div></div>
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-card border border-black/10 bg-white p-6 shadow-card"><h3 className="font-semibold">四维能力雷达</h3><svg viewBox="0 0 200 200" className="mx-auto mt-2 size-52" role="img" aria-label="四维能力雷达图"><polygon points="100,25 175,100 100,175 25,100" fill="none" stroke="currentColor" className="text-border"/><polygon points="100,50 150,100 100,150 50,100" fill="none" stroke="currentColor" className="text-border"/><line x1="100" y1="25" x2="100" y2="175" stroke="currentColor" className="text-border"/><line x1="25" y1="100" x2="175" y2="100" stroke="currentColor" className="text-border"/><polygon points={radarPoints} className="fill-primary/20 stroke-primary" strokeWidth="2"/></svg><div className="mt-4 space-y-3">{Object.entries(data.dimensions).map(([k,v])=><div key={k}><div className="mb-1 flex justify-between text-sm"><span>{dimensionLabels[k as keyof typeof dimensionLabels] ?? k}</span><b>{v}/5</b></div><Progress value={v/5*100}/></div>)}</div></div><div className="rounded-card border border-primary/15 bg-primary/[0.04] p-6"><h3 className="font-semibold">下一场推荐</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{data.recommendation}</p></div></div>
  </div>;
}
