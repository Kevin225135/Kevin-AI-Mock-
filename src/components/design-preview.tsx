"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Command,
  MessageSquareText,
  Mic,
  Play,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";

type Variant = "1" | "2" | "3";

const variantMeta = {
  "1": {
    name: "方案一 · Precision",
    tagline: "专业克制 / Linear 式产品工具",
    description: "高信息清晰度、低视觉噪音，适合求职和专业面试场景。"
  },
  "2": {
    name: "方案二 · Mentor",
    tagline: "温暖沉浸 / 人格化面试教练",
    description: "弱化后台感，强调陪伴、成长与心理安全感。"
  },
  "3": {
    name: "方案三 · Intelligence",
    tagline: "数据智能 / AI 原生工作台",
    description: "强调 RAG、实时分析和能力数据，技术感最强。"
  }
} satisfies Record<Variant, { name: string; tagline: string; description: string }>;

const questions = [
  "你如何从用户证据形成产品判断，并用指标验证最终方案？",
  "如果 A/B 测试结果与用户访谈结论冲突，你会如何处理？",
  "请举例说明你如何定位一个 AI 产品 BadCase 的根因。"
];

export function DesignPreview({ variant }: { variant: Variant }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [view, setView] = useState<"practice" | "report">("practice");
  const meta = variantMeta[variant];
  const theme = themes[variant];

  return (
    <main className={`min-h-screen transition-colors duration-500 ${theme.page}`}>
      <header className={`sticky top-0 z-20 border-b backdrop-blur-xl ${theme.header}`}>
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="返回正式首页"
              className={`grid h-9 w-9 place-items-center rounded-full transition hover:-translate-x-0.5 ${theme.ghost}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className={`grid h-9 w-9 place-items-center ${theme.logo}`}>
              {variant === "1" ? <Command className="h-4 w-4" /> :
                variant === "2" ? <Sparkles className="h-4 w-4" /> :
                <BrainCircuit className="h-4 w-4" />}
            </div>
            <div>
              <p className={`text-sm font-bold tracking-tight ${theme.strong}`}>AI Mock</p>
              <p className={`text-[10px] uppercase tracking-[0.18em] ${theme.muted}`}>Design preview</p>
            </div>
          </div>

          <nav className={`flex items-center gap-1 rounded-full p-1 ${theme.switcher}`}>
            {(["1", "2", "3"] as Variant[]).map((item) => (
              <Link
                key={item}
                href={`/design-preview/${item}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  variant === item ? theme.switcherActive : theme.switcherIdle
                }`}
              >
                方案 {item}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1480px] px-5 py-7 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className={`mb-3 inline-flex items-center gap-2 text-xs font-semibold ${theme.eyebrow}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              INTERACTIVE CONCEPT
            </div>
            <h1 className={`max-w-3xl text-3xl font-bold tracking-[-0.045em] sm:text-4xl lg:text-5xl ${theme.strong}`}>
              {meta.name}
            </h1>
            <p className={`mt-3 text-base font-medium ${theme.accentText}`}>{meta.tagline}</p>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${theme.muted}`}>{meta.description}</p>
          </div>

          <div className={`flex w-fit gap-1 rounded-xl p-1 ${theme.tabShell}`}>
            <button
              onClick={() => setView("practice")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "practice" ? theme.tabActive : theme.tabIdle
              }`}
            >
              面试练习
            </button>
            <button
              onClick={() => setView("report")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                view === "report" ? theme.tabActive : theme.tabIdle
              }`}
            >
              复盘报告
            </button>
          </div>
        </div>

        {view === "practice" ? (
          <PracticePreview
            theme={theme}
            questionIndex={questionIndex}
            onNext={() => setQuestionIndex((value) => (value + 1) % questions.length)}
          />
        ) : (
          <ReportPreview theme={theme} />
        )}

        <footer className={`mt-7 flex flex-col gap-4 border-t pt-5 text-xs sm:flex-row sm:items-center sm:justify-between ${theme.footer}`}>
          <p>这是独立预览，不会修改正式页面或数据。</p>
          <div className="flex items-center gap-3">
            {variant !== "1" && (
              <Link href={`/design-preview/${Number(variant) - 1}`} className={`inline-flex items-center gap-1 font-semibold ${theme.link}`}>
                <ArrowLeft className="h-3.5 w-3.5" /> 上一个方案
              </Link>
            )}
            {variant !== "3" && (
              <Link href={`/design-preview/${Number(variant) + 1}`} className={`inline-flex items-center gap-1 font-semibold ${theme.link}`}>
                下一个方案 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}

function PracticePreview({
  theme,
  questionIndex,
  onNext
}: {
  theme: Theme;
  questionIndex: number;
  onNext: () => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_330px]">
      <aside className={`hidden min-h-[610px] flex-col p-4 lg:flex ${theme.panel}`}>
        <p className={`px-2 text-[10px] font-bold uppercase tracking-[0.18em] ${theme.muted}`}>Workspace</p>
        <div className="mt-4 space-y-1.5">
          {[
            [Play, "当前练习"],
            [Target, "能力计划"],
            [BookOpen, "知识库"],
            [BarChart3, "成长报告"]
          ].map(([Icon, label], index) => (
            <button
              key={label as string}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                index === 0 ? theme.sideActive : theme.sideIdle
              }`}
            >
              <Icon className="h-4 w-4" />
              {label as string}
            </button>
          ))}
        </div>
        <div className={`mt-auto rounded-xl p-3.5 ${theme.miniCard}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${theme.strong}`}>本周目标</span>
            <span className={`text-xs font-bold ${theme.accentText}`}>3 / 5</span>
          </div>
          <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${theme.progressTrack}`}>
            <div className={`h-full w-3/5 rounded-full ${theme.progressFill}`} />
          </div>
          <p className={`mt-2 text-[11px] leading-5 ${theme.muted}`}>再完成两场，解锁能力趋势分析。</p>
        </div>
      </aside>

      <section className={`min-h-[610px] p-5 sm:p-7 lg:p-9 ${theme.mainPanel}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.eyebrow}`}>
              AI 产品经理 · 简历深挖
            </p>
            <h2 className={`mt-2 text-xl font-bold tracking-tight ${theme.strong}`}>
              第 {questionIndex + 1} / 3 题
            </h2>
          </div>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${theme.timer}`}>
            <Clock3 className="h-3.5 w-3.5" />
            02:18
          </div>
        </div>

        <div className={`my-7 h-px ${theme.divider}`} />

        <div className="max-w-3xl">
          <div className={`mb-4 flex items-center gap-2 text-xs font-semibold ${theme.accentText}`}>
            <BrainCircuit className="h-4 w-4" />
            基于简历项目「AI 选品策略重构」
          </div>
          <p className={`text-[22px] font-semibold leading-[1.55] tracking-[-0.025em] sm:text-[28px] ${theme.question}`}>
            {questions[questionIndex]}
          </p>
          <div className={`mt-5 flex flex-wrap gap-2 text-xs ${theme.muted}`}>
            {["用户证据", "决策依据", "指标验证"].map((tag) => (
              <span key={tag} className={`rounded-full px-3 py-1.5 ${theme.chip}`}>{tag}</span>
            ))}
          </div>
        </div>

        <div className={`mt-8 rounded-2xl p-4 sm:p-5 ${theme.answerBox}`}>
          <textarea
            aria-label="回答内容"
            defaultValue="我先将访谈中的高频问题进行归类，并结合漏斗数据定位转化损失最大的环节……"
            className={`min-h-32 w-full resize-none bg-transparent text-sm leading-7 outline-none ${theme.answerText}`}
          />
          <div className={`mt-3 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between ${theme.footer}`}>
            <button className={`inline-flex items-center gap-2 text-xs font-semibold ${theme.link}`}>
              <Mic className="h-4 w-4" /> 语音作答
            </button>
            <button
              onClick={onNext}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 ${theme.primaryButton}`}
            >
              提交并分析
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <aside className={`p-5 sm:p-6 ${theme.panel}`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-bold ${theme.strong}`}>实时教练</h3>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${theme.live}`}>
            Live
          </span>
        </div>
        <div className={`mt-5 rounded-xl p-4 ${theme.coachCard}`}>
          <MessageSquareText className={`h-5 w-5 ${theme.accentText}`} />
          <p className={`mt-3 text-sm font-semibold ${theme.strong}`}>回答结构清晰</p>
          <p className={`mt-2 text-xs leading-5 ${theme.muted}`}>
            已覆盖行动和数据，下一步补充你如何排除其他方案，以及结果归因方法。
          </p>
        </div>
        <div className="mt-6 space-y-4">
          {[
            ["STAR 完整度", 82],
            ["逻辑结构", 76],
            ["内容深度", 68]
          ].map(([label, value]) => (
            <div key={label as string}>
              <div className="flex items-center justify-between text-xs">
                <span className={theme.muted}>{label as string}</span>
                <span className={`font-bold ${theme.strong}`}>{value as number}%</span>
              </div>
              <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${theme.progressTrack}`}>
                <div className={`h-full rounded-full ${theme.progressFill}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-7 border-t pt-5 ${theme.footer}`}>
          <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${theme.muted}`}>RAG Evidence</p>
          <div className="mt-3 space-y-2">
            {["简历项目证据 · 92%", "AI 产品评测方法 · 86%"].map((item) => (
              <div key={item} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${theme.evidence}`}>
                <Check className="h-3.5 w-3.5" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function ReportPreview({ theme }: { theme: Theme }) {
  const scores = [
    ["STAR 完整度", 86, "+8"],
    ["逻辑结构", 78, "+3"],
    ["内容深度", 72, "+11"],
    ["表达清晰度", 89, "+6"]
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className={`p-6 sm:p-8 ${theme.mainPanel}`}>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${theme.eyebrow}`}>SESSION REPORT · JUL 29</p>
            <h2 className={`mt-3 text-3xl font-bold tracking-[-0.04em] ${theme.strong}`}>这次回答更有说服力了。</h2>
            <p className={`mt-2 text-sm ${theme.muted}`}>相比上次，内容深度提升最明显。</p>
          </div>
          <div className={`flex items-baseline gap-1 rounded-2xl px-6 py-4 ${theme.scoreCard}`}>
            <span className={`text-5xl font-bold tracking-[-0.06em] ${theme.strong}`}>82</span>
            <span className={`text-sm ${theme.muted}`}>/100</span>
          </div>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2">
          {scores.map(([label, score, delta]) => (
            <div key={label} className={`rounded-xl p-4 ${theme.metricCard}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${theme.strong}`}>{label}</span>
                <span className={`text-xs font-bold ${theme.positive}`}>{delta}</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className={`text-2xl font-bold ${theme.strong}`}>{score}</span>
                <div className={`h-1.5 w-2/3 overflow-hidden rounded-full ${theme.progressTrack}`}>
                  <div className={`h-full rounded-full ${theme.progressFill}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-5 rounded-xl p-5 ${theme.insightCard}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${theme.accentText}`} />
            <h3 className={`text-sm font-bold ${theme.strong}`}>AI 复盘结论</h3>
          </div>
          <p className={`mt-3 text-sm leading-7 ${theme.muted}`}>
            你能够从用户反馈推导产品行动，但“为什么选择这个方案”的比较过程仍不够完整。下一轮建议使用“候选方案—判断标准—取舍结果”三步表达。
          </p>
        </div>
      </section>

      <aside className={`p-6 ${theme.panel}`}>
        <div className="flex items-center gap-2">
          <TrendingUp className={`h-4 w-4 ${theme.accentText}`} />
          <h3 className={`text-sm font-bold ${theme.strong}`}>下一步训练</h3>
        </div>
        <div className={`mt-5 rounded-2xl p-5 ${theme.coachCard}`}>
          <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${theme.eyebrow}`}>Recommended</span>
          <h4 className={`mt-3 text-lg font-bold ${theme.strong}`}>产品决策与方案取舍</h4>
          <p className={`mt-2 text-xs leading-5 ${theme.muted}`}>3 道针对性问题 · 约 18 分钟</p>
          <button className={`mt-5 flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-bold ${theme.primaryButton}`}>
            开始下一场
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className={`mt-5 rounded-xl p-4 ${theme.miniCard}`}>
          <p className={`text-xs font-semibold ${theme.strong}`}>本场知识来源</p>
          <p className={`mt-2 text-[11px] leading-5 ${theme.muted}`}>
            简历证据 3 条 · AI 产品知识库 5 条 · Qwen3 Rerank
          </p>
        </div>
      </aside>
    </div>
  );
}

type Theme = Record<keyof typeof themes["1"], string>;

const themes = {
  "1": {
    page: "bg-[#f6f7f9] text-[#18191b]",
    header: "border-[#e6e7ea] bg-[#f6f7f9]/90",
    strong: "text-[#18191b]",
    muted: "text-[#70737a]",
    eyebrow: "text-[#665bd8]",
    accentText: "text-[#665bd8]",
    dot: "bg-[#665bd8]",
    logo: "rounded-[10px] bg-[#202124] text-white shadow-sm",
    ghost: "bg-white text-[#34363a] ring-1 ring-[#e4e5e8]",
    switcher: "bg-[#e9eaed]",
    switcherActive: "bg-white text-[#222327] shadow-sm",
    switcherIdle: "text-[#777a82] hover:text-[#222327]",
    tabShell: "bg-[#e9eaed]",
    tabActive: "bg-white text-[#222327] shadow-sm",
    tabIdle: "text-[#777a82]",
    panel: "rounded-2xl border border-[#e3e4e7] bg-white shadow-[0_1px_2px_rgba(0,0,0,.03)]",
    mainPanel: "rounded-2xl border border-[#e3e4e7] bg-white shadow-[0_10px_35px_rgba(24,25,27,.04)]",
    sideActive: "bg-[#f0efff] text-[#5549c7]",
    sideIdle: "text-[#767980] hover:bg-[#f5f5f6] hover:text-[#222327]",
    miniCard: "bg-[#f6f6f7]",
    progressTrack: "bg-[#ececef]",
    progressFill: "bg-[#665bd8]",
    timer: "bg-[#f4f4f5] text-[#575a61]",
    divider: "bg-[#ececef]",
    question: "text-[#202125]",
    chip: "bg-[#f3f2ff] text-[#5d52c8]",
    answerBox: "border border-[#dedfe3] bg-[#fafafa] focus-within:border-[#9088e8]",
    answerText: "text-[#303238] placeholder:text-[#999ca3]",
    primaryButton: "bg-[#202124] text-white shadow-md hover:bg-[#343538]",
    live: "bg-[#e9f8f1] text-[#20805e]",
    coachCard: "bg-[#f4f3ff]",
    evidence: "bg-[#f7f7f8] text-[#64676e]",
    footer: "border-[#e5e6e9] text-[#858890]",
    link: "text-[#5d52c8] hover:text-[#4035a8]",
    scoreCard: "bg-[#f2f1ff]",
    metricCard: "border border-[#e7e7ea] bg-[#fafafa]",
    positive: "text-[#23805f]",
    insightCard: "border border-[#dedbf9] bg-[#f7f6ff]"
  },
  "2": {
    page: "bg-[#f4efe5] text-[#25342e]",
    header: "border-[#dcd2c2] bg-[#f4efe5]/90",
    strong: "text-[#25342e]",
    muted: "text-[#716f66]",
    eyebrow: "text-[#c96244]",
    accentText: "text-[#b95138]",
    dot: "bg-[#d56a4b]",
    logo: "rounded-full bg-[#284f42] text-[#fff8e8] shadow-sm",
    ghost: "bg-[#fffaf0] text-[#365347] ring-1 ring-[#d8cdbb]",
    switcher: "bg-[#e6ddce]",
    switcherActive: "bg-[#fffaf0] text-[#2e473e] shadow-sm",
    switcherIdle: "text-[#7c7569] hover:text-[#2e473e]",
    tabShell: "bg-[#e5dccd]",
    tabActive: "bg-[#fffaf0] text-[#284f42] shadow-sm",
    tabIdle: "text-[#7d7568]",
    panel: "rounded-[24px] border border-[#dcd1bf] bg-[#fffaf0] shadow-[0_8px_30px_rgba(82,61,35,.05)]",
    mainPanel: "rounded-[28px] border border-[#d9cbb7] bg-[#fffaf0] shadow-[0_18px_50px_rgba(82,61,35,.07)]",
    sideActive: "bg-[#dfe8df] text-[#284f42]",
    sideIdle: "text-[#787266] hover:bg-[#f2ebdf] hover:text-[#284f42]",
    miniCard: "bg-[#efe6d6]",
    progressTrack: "bg-[#e0d5c4]",
    progressFill: "bg-[#d56a4b]",
    timer: "bg-[#e7eee6] text-[#355d4f]",
    divider: "bg-[#e6dccd]",
    question: "font-serif text-[#263b33]",
    chip: "bg-[#f2dfd5] text-[#9f452f]",
    answerBox: "border border-[#d9cbb8] bg-[#fbf5e9] focus-within:border-[#c77b62]",
    answerText: "text-[#35473f] placeholder:text-[#958d80]",
    primaryButton: "bg-[#284f42] text-[#fffaf0] shadow-md hover:bg-[#356555]",
    live: "bg-[#f0dfd6] text-[#a34731]",
    coachCard: "bg-[#e8eee5]",
    evidence: "bg-[#f1eadf] text-[#6f695f]",
    footer: "border-[#ded3c2] text-[#8b8377]",
    link: "text-[#a74c35] hover:text-[#783321]",
    scoreCard: "bg-[#e6eee5]",
    metricCard: "border border-[#dfd3c1] bg-[#fbf5e9]",
    positive: "text-[#3c755f]",
    insightCard: "border border-[#e0c3b5] bg-[#f8e9df]"
  },
  "3": {
    page: "bg-[#090d14] text-[#e9eef6]",
    header: "border-[#202b39] bg-[#090d14]/90",
    strong: "text-[#f0f5fb]",
    muted: "text-[#8390a2]",
    eyebrow: "text-[#70e1c2]",
    accentText: "text-[#70e1c2]",
    dot: "bg-[#70e1c2] shadow-[0_0_12px_#70e1c2]",
    logo: "rounded-[10px] border border-[#2d4251] bg-[#111a25] text-[#70e1c2] shadow-[inset_0_0_18px_rgba(112,225,194,.08)]",
    ghost: "bg-[#111822] text-[#b8c6d8] ring-1 ring-[#263343]",
    switcher: "border border-[#243142] bg-[#101721]",
    switcherActive: "bg-[#1d2a38] text-[#70e1c2] shadow-sm",
    switcherIdle: "text-[#7d899a] hover:text-[#c3cfdd]",
    tabShell: "border border-[#243142] bg-[#101721]",
    tabActive: "bg-[#21303e] text-[#70e1c2]",
    tabIdle: "text-[#7f8b9b]",
    panel: "rounded-xl border border-[#233041] bg-[#0e151f] shadow-[0_20px_60px_rgba(0,0,0,.18)]",
    mainPanel: "rounded-xl border border-[#2a394a] bg-[#101923] shadow-[0_24px_80px_rgba(0,0,0,.28)]",
    sideActive: "bg-[#152b2a] text-[#70e1c2]",
    sideIdle: "text-[#7f8c9e] hover:bg-[#151e29] hover:text-[#d4dce7]",
    miniCard: "border border-[#253242] bg-[#121c27]",
    progressTrack: "bg-[#22303e]",
    progressFill: "bg-gradient-to-r from-[#4fd5b1] to-[#8de78c]",
    timer: "border border-[#2a3b49] bg-[#14202a] text-[#8bdcc6]",
    divider: "bg-[#243141]",
    question: "text-[#edf4fb]",
    chip: "border border-[#28504a] bg-[#132824] text-[#79d9c0]",
    answerBox: "border border-[#2b3a4b] bg-[#0c131c] focus-within:border-[#52bfa3]",
    answerText: "text-[#cbd5e1] placeholder:text-[#5e6b7d]",
    primaryButton: "bg-[#70e1c2] text-[#07100e] shadow-[0_0_22px_rgba(112,225,194,.18)] hover:bg-[#8ce9d0]",
    live: "border border-[#285047] bg-[#132620] text-[#70e1c2]",
    coachCard: "border border-[#263d43] bg-[#132027]",
    evidence: "border border-[#243747] bg-[#111b25] text-[#91a1b4]",
    footer: "border-[#243142] text-[#657386]",
    link: "text-[#70e1c2] hover:text-[#a1f0da]",
    scoreCard: "border border-[#285047] bg-[#122721]",
    metricCard: "border border-[#263443] bg-[#0d151f]",
    positive: "text-[#83e59a]",
    insightCard: "border border-[#2d4c47] bg-[#11231f]"
  }
} as const;
