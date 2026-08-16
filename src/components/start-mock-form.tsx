"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileUp,
  LineChart,
  Loader2,
  MessageSquareText,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  Timer
} from "lucide-react";
import {
  difficultyOptions,
  moduleOptions,
  roleOptions
} from "@/lib/domain/constants";
import type {
  Difficulty,
  InterviewModule,
  ResumeProfile
} from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { EASE_OUT_QUART } from "./ui/motion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";

const moduleMeta: Record<
  InterviewModule,
  {
    icon: typeof MessageSquareText;
    shortLabel: string;
    /* tailwind class fragments for the module theme */
    theme: {
      cardBg: string;
      cardBgActive: string;
      iconBox: string;
      iconBoxActive: string;
      borderActive: string;
      textActive: string;
    };
  }
> = {
  BEHAVIORAL: {
    icon: MessageSquareText,
    shortLabel: "行为",
    theme: {
      cardBg: "bg-moduleBehavioral-bg/60",
      cardBgActive: "bg-moduleBehavioral-bg",
      iconBox: "bg-moduleBehavioral/12 text-moduleBehavioral",
      iconBoxActive: "bg-moduleBehavioral text-white",
      borderActive: "border-moduleBehavioral/60 ring-1 ring-moduleBehavioral/25",
      textActive: "text-moduleBehavioral"
    }
  },
  CV_RELATED: {
    icon: BriefcaseBusiness,
    shortLabel: "简历",
    theme: {
      cardBg: "bg-moduleCv-bg/60",
      cardBgActive: "bg-moduleCv-bg",
      iconBox: "bg-moduleCv/12 text-moduleCv",
      iconBoxActive: "bg-moduleCv text-white",
      borderActive: "border-moduleCv/60 ring-1 ring-moduleCv/25",
      textActive: "text-moduleCv"
    }
  },
  TECHNICAL: {
    icon: ShieldCheck,
    shortLabel: "专业",
    theme: {
      cardBg: "bg-moduleTechnical-bg/60",
      cardBgActive: "bg-moduleTechnical-bg",
      iconBox: "bg-moduleTechnical/12 text-moduleTechnical",
      iconBoxActive: "bg-moduleTechnical text-white",
      borderActive: "border-moduleTechnical/60 ring-1 ring-moduleTechnical/25",
      textActive: "text-moduleTechnical"
    }
  },
  MARKET: {
    icon: LineChart,
    shortLabel: "市场",
    theme: {
      cardBg: "bg-moduleMarket-bg/60",
      cardBgActive: "bg-moduleMarket-bg",
      iconBox: "bg-moduleMarket/12 text-moduleMarket",
      iconBoxActive: "bg-moduleMarket text-white",
      borderActive: "border-moduleMarket/60 ring-1 ring-moduleMarket/25",
      textActive: "text-moduleMarket"
    }
  }
};

const rubricItems = [
  ["STAR 完整度", "背景、任务、行动、结果是否形成闭环"],
  ["逻辑结构", "结论是否前置，论证是否分层"],
  ["内容深度", "是否包含数据、权衡、反思和岗位映射"],
  ["表达清晰度", "是否简洁、准确、适合面试现场"]
] as const;

export function StartMockForm() {
  const router = useRouter();
  const [module, setModule] = useState<InterviewModule>("BEHAVIORAL");
  const [targetRole, setTargetRole] = useState<string>("Product Manager");
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [questionCount, setQuestionCount] = useState(3);
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [resumePrivacyAccepted, setResumePrivacyAccepted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/resumes")
      .then((response) => (response.ok ? response.json() : { resumes: [] }))
      .then((payload) => setResumes(payload.resumes ?? []))
      .catch(() => undefined);
  }, []);

  async function uploadResume(file?: File) {
    if (!file) return;
    if (!resumePrivacyAccepted) {
      setError("请先同意简历数据处理和保留说明。");
      return;
    }
    setIsUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("privacyAccepted", "true");
    const response = await fetch("/api/resumes", { method: "POST", body: form });
    const payload = await response.json();
    setIsUploading(false);
    if (!response.ok) {
      setError(payload.error ?? "简历解析失败。");
      return;
    }
    setResumes((current) => [payload.resume, ...current]);
    setResumeId(payload.resume.id);
    setModule("CV_RELATED");
  }

  async function deleteResume() {
    if (!resumeId) return;
    const selected = resumes.find((resume) => resume.id === resumeId);
    if (
      !window.confirm(
        `确定删除“${selected?.fileName ?? "这份简历"}”吗？关联的简历面试、回答和报告也会永久删除。`
      )
    ) {
      return;
    }
    const response = await fetch(`/api/resumes/${resumeId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "删除简历失败。");
      return;
    }
    setResumes((current) => current.filter((resume) => resume.id !== resumeId));
    setResumeId("");
    setModule("BEHAVIORAL");
  }

  async function startMock() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/mock-sessions", {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: resumeId ? "CV_RELATED" : module,
          targetRole,
          difficulty,
          questionCount,
          resumeId: resumeId || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login?next=/");
          return;
        }
        setError(
          payload.code === "QUOTA_EXCEEDED"
            ? "本月 Mock 额度已用完，请联系管理员调整额度。"
            : payload.error ?? "创建 Mock 失败。"
        );
        return;
      }
      router.push(`/mock/${payload.session.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "TimeoutError"
          ? "题目生成超时，请重试；系统将自动使用本地知识库。"
          : "网络请求失败，请检查服务后重试。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedModule = moduleOptions.find((option) => option.value === module);
  const selectedDifficulty = difficultyOptions.find(
    (option) => option.value === difficulty
  );

  return (
    <div className="grid w-full max-w-[calc(100vw-2rem)] min-w-0 gap-6 sm:max-w-none lg:grid-cols-[1.1fr_0.9fr]">
      {/* ── Left: Configuration ── */}
      <div className="glass-card rounded-card shadow-card">
        <div className="border-b border-black/[0.06] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-subheading text-foreground">
                练习配置
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                选择题型、岗位和节奏，开始一场模拟面试
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Timer className="size-3.5 text-primary" />
              {questionCount * 8}-{questionCount * 10} 分钟
            </div>
          </div>
        </div>

        <div className="space-y-7 px-6 py-6">
          {/* Module selection */}
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-foreground">
              题型模块
            </legend>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {moduleOptions.map((option, index) => {
                const active = module === option.value;
                const meta = moduleMeta[option.value];
                const Icon = meta.icon;

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => setModule(option.value)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_QUART, delay: 0.08 * index }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "group flex min-h-[100px] flex-col rounded-card border p-4 text-left transition-all duration-200",
                      active
                        ? cn(meta.theme.cardBgActive, meta.theme.borderActive, "shadow-soft")
                        : cn("border-transparent hover:shadow-whisper", meta.theme.cardBg)
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "flex size-9 items-center justify-center rounded-button transition-colors",
                        active ? meta.theme.iconBoxActive : meta.theme.iconBox
                      )}>
                        <Icon className="size-4" />
                      </div>
                      {active ? <Check className={cn("size-4", meta.theme.textActive)} /> : null}
                    </div>
                    <span className="mt-3 block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {option.description}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </fieldset>

          {/* Role / Difficulty / Count */}
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">岗位</span>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">难度</span>
              <Select
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as Difficulty)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">题量</span>
              <div className="flex h-10 items-center justify-between rounded-button border border-black/10 bg-white px-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQuestionCount((value) => Math.max(1, value - 1))}
                  disabled={questionCount <= 1}
                  aria-label="减少题量"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-10 text-center text-sm font-semibold text-foreground">
                  {questionCount}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setQuestionCount((value) => Math.min(4, value + 1))}
                  disabled={questionCount >= 4}
                  aria-label="增加题量"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Resume upload */}
          <div className="rounded-button border border-black/[0.08] bg-secondary/30 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileUp className="size-4 text-primary" />
              简历驱动面试（可选）
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              disabled={isUploading || !resumePrivacyAccepted}
              onChange={(event) => uploadResume(event.target.files?.[0])}
              className="mt-2.5 block w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-primary-hover"
            />

            <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <input
                type="checkbox"
                checked={resumePrivacyAccepted}
                onChange={(event) => setResumePrivacyAccepted(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                我同意处理简历提取文本用于出题和评分；原始文件不落盘，提取数据默认最多保留 365 天，可随时删除。
              </span>
            </label>

            {isUploading ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> 正在解析简历...
              </p>
            ) : null}

            {resumes.length > 0 ? (
              <label className="mt-3 block space-y-1.5">
                <span className="text-xs text-muted-foreground">已解析简历</span>
                <Select
                  value={resumeId || "none"}
                  onValueChange={(value) => {
                    const next = value === "none" ? "" : value;
                    setResumeId(next);
                    if (next) setModule("CV_RELATED");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不使用简历</SelectItem>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.fileName} · {resume.skills.slice(0, 3).join(" / ") || "已提取"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            ) : null}

            {resumeId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive hover:bg-destructive/8 hover:text-destructive"
                onClick={deleteResume}
              >
                <Trash2 className="size-4" />
                删除所选简历及关联训练
              </Button>
            ) : null}

            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              支持 PDF、Word、PNG、JPG、WebP，最大 10MB。仅保存提取文本和结构化信息。
            </p>
          </div>

          {error ? (
            <p className="rounded-button bg-destructive/8 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            onClick={startMock}
            disabled={isSubmitting}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            开始 Mock
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Right: Preview ── */}
      <div className="glass-card rounded-card shadow-card">
        <div className="border-b border-black/[0.06] px-6 py-5">
          <h2 className="text-xl font-semibold tracking-subheading text-foreground">
            本场预览
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedModule?.label} · {targetRole} · {selectedDifficulty?.label}
          </p>
        </div>

        <div className="px-6 py-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 border-b border-black/[0.08] pb-6">
            {[
              [questionCount, "题目"],
              [4, "维度"],
              [100, "总分"]
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Rubric dimensions */}
          <div className="mt-5 space-y-4">
            {rubricItems.map(([title, description], index) => (
              <div key={title} className="flex gap-3 border-b border-black/[0.06] pb-4 last:border-b-0 last:pb-0">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <Badge tone={index % 2 === 0 ? "amber" : "coral"}>1-5</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
