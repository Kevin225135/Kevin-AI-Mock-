import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/repositories/prisma-client";
import type {
  CurrentUser,
  Difficulty,
  Question,
  ResumeProfile
} from "@/lib/domain/types";
import { parseResumeFile } from "./parser";

export async function uploadResume(file: File, actor: CurrentUser) {
  const parsed = await parseResumeFile(file);
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
      education: parsed.education as any
    }
  });
  return mapResume(resume);
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

  const projects = normalizeProjects(resume.projects);
  const evidence = [
    ...projects.map((project) => project.name),
    ...resume.companies,
    ...resume.roles,
    ...resume.skills
  ].filter(Boolean);
  const prompts = buildPersonalizedPrompts(evidence, input.targetRole);

  return Promise.all(
    prompts.slice(0, input.questionCount).map(async (prompt) => {
      const row = await prisma.questionBank.create({
        data: {
          externalId: `resume-${resume.id}-${randomUUID()}`,
          module: "CV_RELATED",
          targetRole: input.targetRole,
          difficulty: input.difficulty,
          prompt,
          expectation:
            "只基于候选人简历中出现的事实深挖，关注个人贡献、决策依据、量化结果和岗位相关性。"
        }
      });
      return {
        id: row.id,
        module: "CV_RELATED",
        targetRole: row.targetRole,
        difficulty: row.difficulty,
        prompt: row.prompt,
        expectation: row.expectation ?? undefined
      };
    })
  );
}

export async function createResumeFollowUp(input: {
  resumeId: string;
  targetRole: string;
  difficulty: Difficulty;
  previousQuestion: string;
  answer: string;
  round: number;
}) {
  const resume = await prisma.resume.findUnique({ where: { id: input.resumeId } });
  if (!resume) {
    return null;
  }

  const missing = chooseMissingEvidence(input.answer);
  const anchor =
    resume.projects && Array.isArray(resume.projects) && resume.projects[0]
      ? String((resume.projects[0] as any).name ?? "这段经历")
      : resume.companies[0] ?? "这段经历";
  const prompt =
    input.round === 0
      ? `你提到了“${anchor}”。请进一步说明${missing}，并区分团队成果与个人贡献。`
      : `基于刚才的回答，如果让你重新做一次“${anchor}”，你会改变哪个关键决策？为什么？`;

  const row = await prisma.questionBank.create({
    data: {
      externalId: `followup-${input.resumeId}-${randomUUID()}`,
      module: "CV_RELATED",
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      prompt,
      expectation: `动态追问第 ${input.round + 1} 轮；不得补写简历中不存在的事实。`
    }
  });
  return row.id;
}

function chooseMissingEvidence(answer: string) {
  if (!/\d+[%x]?|\d+\s*(人|天|周|月|元|万)/i.test(answer)) {
    return "最终结果如何量化";
  }
  if (!/(我|I)\s*(负责|主导|设计|implemented|led|built)/i.test(answer)) {
    return "你本人具体采取了哪些行动";
  }
  return "当时最困难的取舍、决策依据和验证方法";
}

function buildPersonalizedPrompts(evidence: string[], targetRole: string) {
  const [first = "最相关的项目", second = first, third = second] = evidence;
  return [
    `你的简历提到“${first}”。请介绍当时的问题、你的个人责任、关键行动和可量化结果。`,
    `围绕“${second}”，你做过最困难的决策或取舍是什么？它如何证明你适合 ${targetRole}？`,
    `在“${third}”这段经历中，哪项成果最容易被面试官质疑？请给出证据并说明你的个人贡献。`,
    `从简历中选择一项与 ${targetRole} 最相关的技能，讲一个你实际使用它解决问题的例子。`
  ];
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
    createdAt: row.createdAt.toISOString()
  };
}
