"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, Search, Sparkles } from "lucide-react";

type Domain = "" | "INVESTMENT_BANKING" | "AI_PRODUCT_MANAGER";
type Entry = {
  id: string; domain: Exclude<Domain, "">; category: string;
  titleZh: string; titleEn: string; summaryZh: string; summaryEn: string;
  keywords: string[]; sourceTitle: string; sourceUrl: string;
  researchRound: number; score: number; vectorScore: number; updatedAt: string;
};

const tabs: Array<[Domain, string, string]> = [
  ["", "全部", "All"],
  ["INVESTMENT_BANKING", "投资银行", "Investment Banking"],
  ["AI_PRODUCT_MANAGER", "AI 产品经理", "AI Product Manager"]
];

export function KnowledgeLibrary() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<Domain>("");
  const [collection, setCollection] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (domain) params.set("domain", domain);
      if (collection) params.set("collection", collection);
      try {
        const response = await fetch(`/api/knowledge?${params}`, { signal: controller.signal });
        const data = await response.json();
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, domain, collection]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#17152b,#3e368a)] px-6 py-10 text-white shadow-xl sm:px-10">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Sparkles className="size-4" /> 5 轮 Deep Research · Bilingual
        </div>
        <h2 className="mt-3 text-3xl font-bold">RAG 知识库 <span className="text-white/55">Knowledge Base</span></h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
          实时浏览问题生成与追问所使用的专业知识。每条内容均保留研究来源，并支持中英文混合检索。
        </p>
        <label className="mt-7 flex max-w-2xl items-center gap-3 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-lg">
          <Search className="size-5 text-violet-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="搜索 DCF、现金流、幻觉、AI evals…"
          />
          {loading ? <span className="text-xs text-slate-400">检索中</span> : null}
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([value, zh, en]) => (
            <button key={value || "all"} onClick={() => setDomain(value)}
              className={`rounded-full px-4 py-2 text-sm transition ${domain === value ? "bg-primary text-primary-foreground shadow" : "border bg-white hover:border-primary/40"}`}>
              {zh} <span className="ml-1 opacity-60">{en}</span>
            </button>
          ))}
        </div>
        <select value={collection} onChange={(event) => setCollection(event.target.value)}
          className="rounded-full border bg-white px-4 py-2 text-sm outline-none focus:border-primary">
          <option value="">全部专题 / All collections</option>
          <option value="投行400问">投行400问 / IB 400</option>
          <option value="A/H股">A股和港股 / A & H shares</option>
          <option value="AI产品">AI产品全流程 / AI Product</option>
          <option value="AI基础知识">AI基础知识 / AI Fundamentals</option>
          <option value="Vibe Coding">Vibe Coding实操</option>
          <option value="本地资料">暑期实习与秋招资料 / Local Materials</option>
        </select>
        <span className="text-sm text-muted-foreground">显示 {entries.length} / 共 {total} 条</span>
      </div>

      {!loading && entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">未找到匹配内容 / No matching knowledge found.</div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {entries.map((entry) => (
          <article key={entry.id} className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-violet-50 px-2.5 py-1 font-medium text-violet-700">{entry.category}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Research R{entry.researchRound}</span>
              </div>
              {query.trim() ? <span className="text-xs font-semibold text-emerald-600">{Math.round(entry.score * 100)}% match</span> : null}
            </div>
            <div className="mt-5 flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="size-5" /></div>
              <div>
                <h3 className="font-semibold text-foreground">{entry.titleZh}</h3>
                <p className="text-sm font-medium text-muted-foreground">{entry.titleEn}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 border-l-2 border-primary/15 pl-4 text-sm leading-6 text-slate-600">
              <p>{entry.summaryZh}</p>
              <p className="text-slate-500">{entry.summaryEn}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {entry.keywords.slice(0, 5).map((keyword) => <span key={keyword} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-500">#{keyword}</span>)}
            </div>
            {entry.sourceUrl.startsWith("http") ? (
              <a href={entry.sourceUrl} target="_blank" rel="noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                来源 / Source: {entry.sourceTitle}<ExternalLink className="size-3" />
              </a>
            ) : (
              <p className="mt-5 text-xs font-medium text-muted-foreground">
                本地来源 / Local source: {entry.sourceTitle}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
