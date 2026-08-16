import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/repositories/prisma-client";
import type {
  CurrentUser,
  Difficulty,
  Question,
  ResumeProfile
} from "@/lib/domain/types";
import { parseResumeFile } from "./parser";
import {
  analyzeAnswerGaps,
  retrieveResumeQuestions
} from "@/lib/rag/retriever";
import type { RagQuestionContext } from "@/lib/domain/types";
import { searchKnowledge, type KnowledgeDomain } from "@/lib/knowledge/knowledge-service";
import { createLlmFollowUp, refineQuestionsWithLlm } from "@/lib/rag/dual-source";

export async function uploadResume(file: File, actor: CurrentUser) {
  const parsed = await parseResumeFile(file);
  const retentionExpiresAt = new Date();
  retentionExpiresAt.setUTCFullYear(retentionExpiresAt.getUTCFullYear() + 1);
  const resume = await prisma.resume.create({
    data: {
      userId: actor.id,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      rawText: parsed.rawText,
      summary: parsed.summary,
      companies: parsed.companies,
      roles: parsed.roles,
      skills: parsed.skills,
      projects: parsed.projects as any,
      education: parsed.education as any,
      privacyAcceptedAt: new Date(),
      retentionExpiresAt
    }
  });
  return mapResume(resume);
}

export async function deleteOwnedResume(resumeId: string, actor: CurrentUser) {
  return prisma.$transaction(async (tx) => {
    const resume = await tx.resume.findFirst({
      where: { id: resumeId, userId: actor.id }
    });
    if (!resume) {
      throw new Error("Resume not found.");
    }

    return deleteResumeData(tx, resume.id);
  });
}

export async function purgeExpiredResumes(now = new Date()) {
  const expired = await prisma.resume.findMany({
    where: { retentionExpiresAt: { lte: now } },
    select: { id: true }
  });
  for (const resume of expired) {
    await prisma.$transaction((tx) => deleteResumeData(tx, resume.id));
  }
  return expired.length;
}

async function deleteResumeData(
  tx: Prisma.TransactionClient,
  resumeId: string
) {
  const sessions = await tx.mockSession.findMany({
    where: { resumeId },
    select: { selectedQuestionIds: true }
  });
  const generatedQuestionIds = [
    ...new Set(sessions.flatMap((session) => session.selectedQuestionIds))
  ];

  await tx.mockSession.deleteMany({ where: { resumeId } });
  await tx.questionBank.deleteMany({
    where: {
      id: { in: generatedQuestionIds },
      OR: [
        { externalId: { startsWith: `resume-${resumeId}-` } },
        { externalId: { startsWith: `followup-${resumeId}-` } }
      ]
    }
  });
  await tx.resume.delete({ where: { id: resumeId } });
  return { deletedSessionCount: sessions.length };
}

export async function listResumes(actor: CurrentUser) {
  const rows = await prisma.resume.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  return rows.map(mapResume);
}

export async function getOwnedResume(resumeId: string, actor: CurrentUser) {
  return prisma.resume.findFirst({ where: { id: resumeId, userId: actor.id } });
}

export async function createResumeQuestions(input: {
  resumeId: string;
  targetRole: string;
  difficulty: Difficulty;
  questionCount: number;
  actor: CurrentUser;
}): Promise<Question[]> {
  const resume = await getOwnedResume(input.resumeId, input.actor);
  if (!resume) {
    throw new Error("Resume not found.");
  }

  const projects = normalizeProjects(resume.projects).map((project: any) => ({
    name: project.name,
    description: String(project.description ?? ""),
    technologies: Array.isArray(project.technologies)
      ? project.technologies.map(String)
      : []
  }));
  const retrieval = retrieveResumeQuestions({
    resume: {
      rawText: resume.rawText,
      companies: resume.companies,
      roles: resume.roles,
      skills: resume.skills,
      projects
    },
    targetRole: input.targetRole,
    difficulty: input.difficulty,
    limit: input.questionCount
  });
  const researchQuery = [
    input.targetRole,
    ...resume.skills,
    ...projects.flatMap((project) => [project.name, project.description, ...project.technologies])
  ].join(" ");
  const knowledge = await searchKnowledge({
    query: researchQuery,
    domain: inferKnowledgeDomain(input.targetRole),
    limit: Math.max(input.questionCount, 5)
  });
  retrieval.selected.forEach((candidate, index) => {
    const matches = knowledge.slice(index, index + 2);
    candidate.context.knowledgeEvidence = matches.map((entry) => ({
      id: entry.id,
      titleZh: entry.titleZh,
      titleEn: entry.titleEn,
      sourceUrl: entry.sourceUrl,
      score: entry.score
    }));
    candidate.context.researchSources = [
      ...new Set([...candidate.context.researchSources, ...matches.map((entry) => entry.sourceUrl)])
    ];
    if (matches[0]) {
      candidate.expectation += ` 知识库校准主题：${matches[0].titleZh} / ${matches[0].titleEn}。`;
    }
  });
  const dualSource = await refineQuestionsWithLlm({
    query: researchQuery,
    targetRole: input.targetRole,
    candidates: retrieval.selected
  });
  dualSource.candidates.forEach((candidate) => {
    candidate.context.webEvidence = dualSource.webEvidence;
  });
  retrieval.selected = dualSource.candidates;

  await prisma.ragRetrievalTrace.create({
    data: {
      userId: input.actor.id,
      resumeId: resume.id,
      phase: "QUESTION_GENERATION",
      query: retrieval.query,
      keywords: retrieval.keywords,
      candidates: retrieval.candidates.map(summarizeCandidate) as any,
      selected: retrieval.selected.map(summarizeCandidate) as any,
      latencyMs: retrieval.latencyMs
    }
  });

  return Promise.all(
    retrieval.selected.map(async (candidate) => {
      const row = await prisma.questionBank.create({
        data: {
          externalId: `resume-${resume.id}-${randomUUID()}`,
          module: "CV_RELATED",
          targetRole: input.targetRole,
          difficulty: input.difficulty,
          prompt: candidate.prompt,
          expectation: candidate.expectation,
          keywords: candidate.keywords,
          retrievalContext: candidate.context as any
        }
      });
      return {
        id: row.id,
        module: "CV_RELATED",
        targetRole: row.targetRole,
        difficulty: row.difficulty,
        prompt: row.prompt,
        expectation: row.expectation ?? undefined,
        keywords: row.keywords,
        retrievalContext: row.retrievalContext as RagQuestionContext
      };
    })
  );
}

function inferKnowledgeDomain(targetRole: string): KnowledgeDomain | undefined {
  if (/投行|投资银行|investment bank|m&a|merger|capital market/i.test(targetRole)) {
    return "INVESTMENT_BANKING";
  }
  if (/ai|人工智能|产品经理|product manager|llm|machine learning/i.test(targetRole)) {
    return "AI_PRODUCT_MANAGER";
  }
  return undefined;
}

export async function createResumeFollowUp(input: {
  sessionId: string;
  resumeId: string;
  targetRole: string;
  difficulty: Difficulty;
  previousQuestionId: string;
  answer: string;
  round: number;
}) {
  const startedAt = performance.now();
  const [resume, question] = await Promise.all([
    prisma.resume.findUnique({ where: { id: input.resumeId } }),
    prisma.questionBank.findUnique({ where: { id: input.previousQuestionId } })
  ]);
  if (!resume || !question) {
    return null;
  }

  const context = isRagContext(question.retrievalContext)
    ? question.retrievalContext
    : undefined;
  const analysis = analyzeAnswerGaps({
    answer: input.answer,
    question: question.prompt,
    context,
    round: input.round
  });

  await prisma.ragRetrievalTrace.create({
    data: {
      userId: resume.userId,
      resumeId: resume.id,
      sessionId: input.sessionId,
      phase: "FOLLOW_UP",
      query: `${question.prompt}\n${input.answer}`,
      keywords: analysis.matchedKeywords,
      candidates: {
        coveredSignals: analysis.coveredSignals,
        missingSignals: analysis.missingSignals
      },
      selected: {
        decision: analysis.decision,
        followUpQuestion: analysis.followUpQuestion ?? null,
        webEvidence: context?.webEvidence ?? []
      },
      latencyMs: Math.max(0, Math.round(performance.now() - startedAt))
    }
  });

  if (analysis.decision === "CLOSE" || !analysis.followUpQuestion) {
    return null;
  }
  const llmFollowUp = await createLlmFollowUp({
    question: question.prompt,
    answer: input.answer,
    fallback: analysis.followUpQuestion,
    context
  });

  const row = await prisma.questionBank.create({
    data: {
      externalId: `followup-${input.resumeId}-${randomUUID()}`,
      module: "CV_RELATED",
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      prompt: llmFollowUp.followUpQuestion,
      expectation: `RAG 动态追问第 ${input.round + 1} 轮；缺失信号：${analysis.missingSignals.join("、")}。不得补写简历中不存在的事实。`,
      keywords: analysis.matchedKeywords,
      retrievalContext: {
        ...(context ?? {
          competencyId: "resume-evidence",
          competencyLabel: "简历证据",
          evidence: [],
          expectedSignals: analysis.missingSignals,
          researchSources: []
        }),
        parentQuestionId: question.id,
        coveredSignals: analysis.coveredSignals,
        missingSignals: analysis.missingSignals,
        webEvidence: [
          ...(context?.webEvidence ?? []),
          ...llmFollowUp.webEvidence
        ]
      } as any
    }
  });
  return row.id;
}

function summarizeCandidate(candidate: {
  score: number;
  keywords: string[];
  context: RagQuestionContext;
}) {
  return {
    competencyId: candidate.context.competencyId,
    score: candidate.score,
    keywords: candidate.keywords,
    evidence: candidate.context.evidence.map((item) => ({
      source: item.source,
      matchedKeywords: item.matchedKeywords
    })),
    knowledgeEvidence: candidate.context.knowledgeEvidence ?? [],
    webEvidence: candidate.context.webEvidence ?? []
  };
}

function isRagContext(value: unknown): value is RagQuestionContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<RagQuestionContext>;
  return typeof candidate.competencyId === "string" &&
    typeof candidate.competencyLabel === "string" &&
    Array.isArray(candidate.evidence) &&
    Array.isArray(candidate.expectedSignals);
}

function normalizeProjects(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is { name: string } =>
        Boolean(item && typeof item === "object" && "name" in item)
      )
    : [];
}

function mapResume(row: any): ResumeProfile {
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    summary: row.summary ?? undefined,
    companies: row.companies,
    roles: row.roles,
    skills: row.skills,
    projects: normalizeProjects(row.projects).map((project: any) => ({
      name: project.name,
      description: String(project.description ?? ""),
      technologies: Array.isArray(project.technologies) ? project.technologies : []
    })),
    education: Array.isArray(row.education) ? row.education.map(String) : [],
    createdAt: row.createdAt.toISOString(),
    retentionExpiresAt: row.retentionExpiresAt?.toISOString()
  };
}
