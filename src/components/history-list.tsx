"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import type { MockSession } from "@/lib/domain/types";
import { Badge } from "./ui/badge";

export function HistoryList() {
  const [sessions, setSessions] = useState<MockSession[] | null>(null);
  useEffect(() => {
    fetch("/api/mock-sessions").then((response) => response.json()).then((data) => setSessions(data.sessions ?? []));
  }, []);
  if (!sessions) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />加载训练记录...</div>;
  if (!sessions.length) return <div className="rounded-card border border-dashed border-black/10 bg-white p-12 text-center"><p className="font-medium">还没有训练记录</p><Link href="/" className="mt-3 inline-block text-sm text-primary hover:underline">开始第一场 Mock</Link></div>;
  return <div className="space-y-3">{sessions.map((session) => (
    <Link key={session.id} href={session.status === "COMPLETED" ? `/report/${session.id}` : `/mock/${session.id}`} className="grid gap-3 rounded-card border border-black/10 bg-white p-4 shadow-whisper transition-shadow hover:shadow-card sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{session.targetRole}</span><Badge>{session.module}</Badge><Badge tone={session.status === "COMPLETED" ? "teal" : "amber"}>{session.status}</Badge></div><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{new Date(session.createdAt).toLocaleString()}</p></div>
      <div className="flex items-center gap-3"><span className="text-sm font-semibold tabular-nums">{session.report ? `${session.report.averageScore} 分` : `${session.answers.length}/${session.questions.length} 题`}</span><ChevronRight className="size-4 text-muted-foreground" /></div>
    </Link>
  ))}</div>;
}
