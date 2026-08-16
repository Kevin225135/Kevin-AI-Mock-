"use client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

type Row = {
  id: string;
  sessionId?: string;
  createdAt: string;
  payload: {
    type?: string;
    severity?: string;
    comment?: string;
    questionId?: string;
    status?: "OPEN" | "RESOLVED";
    resolution?: string;
  };
};
export function BadcasePanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [updating, setUpdating] = useState<string>();
  useEffect(() => { fetch("/api/admin/badcases").then((r) => r.json()).then((d) => setRows(d.badcases ?? [])); }, []);
  async function toggle(row: Row) {
    const resolved = row.payload.status === "RESOLVED";
    setUpdating(row.id);
    const response = await fetch(`/api/admin/badcases/${row.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: resolved ? "OPEN" : "RESOLVED" })
    });
    if (response.ok) {
      const data = await response.json();
      setRows((current) => current?.map((item) => item.id === row.id ? { ...item, payload: data.payload } : item) ?? []);
    }
    setUpdating(undefined);
  }
  if (!rows) return <p className="flex items-center gap-2 p-6 text-sm"><Loader2 className="size-4 animate-spin" />加载中...</p>;
  if (!rows.length) return <p className="rounded-card border border-dashed p-10 text-center text-sm text-muted-foreground">暂无 Badcase。</p>;
  return <div className="space-y-3">{rows.map((row) => <div key={row.id} className="rounded-card border border-black/10 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge tone={row.payload.severity === "P0" ? "coral" : "amber"}>{row.payload.severity ?? "P1"}</Badge><Badge>{row.payload.type ?? "OTHER"}</Badge><Badge tone={row.payload.status === "RESOLVED" ? "success" : "slate"}>{row.payload.status === "RESOLVED" ? "已处理" : "待处理"}</Badge><Button className="ml-auto" size="sm" variant="outline" disabled={updating === row.id} onClick={() => toggle(row)}>{updating === row.id ? "更新中..." : row.payload.status === "RESOLVED" ? "重新打开" : "标记已处理"}</Button></div><p className="mt-3 text-sm">{row.payload.comment}</p><p className="mt-2 break-all text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()} · Session {row.sessionId}</p></div>)}</div>;
}
