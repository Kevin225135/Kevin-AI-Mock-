import { scoreAnswer } from "@/lib/ai/scorer";
import { analyticsEvents } from "@/lib/analytics/events";
import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { getDataStore } from "@/lib/repositories";
import { buildReport } from "./report";
import {
  createResumeFollowUp,
  createResumeQuestions
} from "@/lib/resume/resume-service";
import { createFollowUpQuestion, decideFollowUp } from "@/lib/ai/follow-up";
import { enqueueScoringJob, type ScoringJobData } from "@/lib/queue/scoring-queue";
import { assertSafeInterviewAnswer } from "@/lib/ai/safety";
import type {
  CreateSessionInput,
  CurrentUser,
  MockSession,
  Question,
  Report,
  SubmitAnswerInput
} from "./types";

export type CreateMockSessionInput = Omit<CreateSessionInput, "userId">;

export async function createMockSession(
  input: CreateMockSessionInput,
  actor: CurrentUser
) {
  const store = await getDataStore();
  const normalizedInput = input.resumeId
    ? { ...input, module: "CV_RELATED" as const }
    : input;
  const questions = input.resumeId
    ? await createResumeQuestions({
        resumeId: input.resumeId,
        targetRole: input.targetRole,
        difficulty: input.difficulty,
        questionCount: input.questionCount,
        actor
      })
    : (
        await store.listQuestions({
          module: normalizedInput.module,
          targetRole: input.targetRole,
          difficulty: input.difficulty,
          userId: actor.id
        })
      ).slice(0, input.questionCount);

  if (questions.length === 0) {
    throw new Error("No questions available for this selection.");
  }

  const session = await store.createSession(
    {
      ...input,
      ...normalizedInput,
      userId: actor.id
    },
    questions
  );

  await store.trackEvent({
    name: analyticsEvents.mockStart,
    sessionId: session.id,
    userId: actor.id,
    payload: {
      module: normalizedInput.module,
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      questionCount: questions.length
    }
  });

  const previousSessions = (await store.listSessions(actor.id))
    .filter((candidate) => candidate.id !== session.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const previous = previousSessions[0];
  if (previous) {
    const ageMs = Date.now() - new Date(previous.createdAt).getTime();
    if (ageMs >= 24 * 60 * 60 * 1000 && ageMs <= 7 * 24 * 60 * 60 * 1000) {
      await store.trackEvent({
        name: analyticsEvents.sevenDayReturn,
        sessionId: session.id,
        userId: actor.id,
        payload: { previousSessionId: previous.id, ageHours: Math.round(ageMs / 3_600_000) }
      });
    }
  }

  return {
    session,
    currentQuestion: getCurrentQuestion(session)
  };
}

export async function getMockSession(sessionId: string, actor: CurrentUser) {
  const store = await getDataStore();
  const session = await store.getSession(sessionId);

  if (!session || !canAccessOwnedResource(actor, session.userId)) {
    return null;
  }

  return {
    session,
    currentQuestion: getCurrentQuestion(session)
  };
}

export async function listMockSessions(actor: CurrentUser) {
  const store = await getDataStore();
  return store.listSessions(actor.id);
}

export async function submitMockAnswer(
  sessionId: string,
  input: SubmitAnswerInput,
  actor: CurrentUser
): Promise<{
  session: MockSession;
  currentQuestion: Question | null;
  completed: boolean;
  report?: Report;
  queued?: boolean;
}> {
  const store = await getDataStore();
  const existing = await store.getSession(sessionId);

  if (!existing) {
    throw new Error("Session not found.");
  }
  if (!canAccessOwnedResource(actor, existing.userId)) {
    throw new Error("Session not found.");
  }
  if (existing.status === "COMPLETED") {
    return {
      session: existing,
      currentQuestion: null,
      completed: true,
      report: existing.report
    };
  }

  const expectedQuestion = getCurrentQuestion(existing);
  if (!expectedQuestion || expectedQuestion.id !== input.questionId) {
    throw new Error("The answer does not match the current question.");
  }
  assertSafeInterviewAnswer(input.content);

  await store.updateSession(sessionId, { status: "SCORING" });
  const answeredSession = await store.saveAnswer(sessionId, input);
  const answer = answeredSession.answers.find(
    (candidate) =>
      candidate.questionId === input.questionId &&
      candidate.followUpRound === answeredSession.followUpRound
  );

  if (!answer) {
    throw new Error("Answer save failed.");
  }

  await store.trackEvent({
    name: analyticsEvents.questionAnswered,
    sessionId,
    userId: answeredSession.userId,
    payload: {
      questionId: input.questionId,
      answerLength: input.content.length
    }
  });

  if (process.env.ASYNC_SCORING === "true" && process.env.REDIS_URL) {
    await enqueueScoringJob({ sessionId, answerId: answer.id, questionId: input.questionId });
    return {
      session: answeredSession,
      currentQuestion: expectedQuestion,
      completed: false,
      queued: true
    };
  }

  return finalizeSavedAnswer({ store, existing, expectedQuestion, answerId: answer.id, input });
}

async function finalizeSavedAnswer({
  store, existing, expectedQuestion, answerId, input
}: {
  store: Awaited<ReturnType<typeof getDataStore>>;
  existing: MockSession;
  expectedQuestion: Question;
  answerId: string;
  input: SubmitAnswerInput;
}): Promise<{ session: MockSession; currentQuestion: Question | null; completed: boolean; report?: Report }> {
  const score = await scoreAnswer({
    question: expectedQuestion,
    answer: input.content
  });
  await store.saveScore(existing.id, answerId, score);

  await store.trackEvent({
    name: analyticsEvents.scoreGenerated,
    sessionId: existing.id,
    userId: existing.userId,
    payload: {
      questionId: input.questionId,
      totalScore: score.totalScore
    }
  });

  const followUpDecision = decideFollowUp(input.content, score.totalScore, existing.followUpRound);
  if (followUpDecision !== "CLOSE") {
    const followUpId = existing.resumeId
      ? await createResumeFollowUp({
          resumeId: existing.resumeId, targetRole: existing.targetRole,
          difficulty: existing.difficulty, previousQuestion: expectedQuestion.prompt,
          answer: input.content, round: existing.followUpRound
        })
      : await createFollowUpQuestion({
          module: existing.module, targetRole: existing.targetRole,
          difficulty: existing.difficulty, originalPrompt: expectedQuestion.prompt,
          answer: input.content, round: existing.followUpRound, decision: followUpDecision
        });
    if (followUpId) {
      await store.appendQuestion(existing.id, followUpId);
      await store.updateSession(existing.id, {
        followUpRound: existing.followUpRound + 1
      });
    }
  }

  const refreshed = await store.getSession(existing.id);
  if (!refreshed) {
    throw new Error("Session disappeared after follow-up generation.");
  }
  const nextIndex = existing.currentQuestionIndex + 1;
  const isComplete = nextIndex >= refreshed.questions.length;
  const progressed = await store.updateSession(existing.id, {
    status: isComplete ? "COMPLETED" : "IN_PROGRESS",
    currentQuestionIndex: isComplete ? existing.currentQuestionIndex : nextIndex
  });
  const latest = await store.getSession(existing.id);

  if (!latest) {
    throw new Error("Session disappeared after scoring.");
  }

  if (isComplete) {
    const report = await store.saveReport(buildReport(latest));
    await store.trackEvent({
      name: analyticsEvents.mockComplete,
      sessionId: existing.id,
      userId: latest.userId,
      payload: {
        averageScore: report.averageScore,
        questionCount: latest.questions.length
      }
    });

    return {
      session: { ...latest, report },
      currentQuestion: null,
      completed: true,
      report
    };
  }

  return {
    session: progressed,
    currentQuestion: getCurrentQuestion(progressed),
    completed: false
  };
}

export async function processQueuedScoring(data: ScoringJobData) {
  const store = await getDataStore();
  const existing = await store.getSession(data.sessionId);
  if (!existing) throw new Error("Session not found.");
  const expectedQuestion = getCurrentQuestion(existing);
  if (!expectedQuestion || expectedQuestion.id !== data.questionId) {
    throw new Error("Queued question is no longer current.");
  }
  const answer = existing.answers.find((candidate) => candidate.id === data.answerId);
  if (!answer) throw new Error("Queued answer not found.");
  return finalizeSavedAnswer({
    store,
    existing,
    expectedQuestion,
    answerId: answer.id,
    input: { questionId: answer.questionId, content: answer.content }
  });
}

export async function getReport(sessionId: string, actor: CurrentUser) {
  const store = await getDataStore();
  const report = await store.getReport(sessionId);
  const session = await store.getSession(sessionId);

  if (!session || !canAccessOwnedResource(actor, session.userId)) {
    return null;
  }

  if (report) {
    await store.trackEvent({
      name: analyticsEvents.reportView,
      sessionId,
      userId: actor.id,
      payload: {
        ownerUserId: session.userId,
        averageScore: report.averageScore
      }
    });
  }

  return report;
}

export function getCurrentQuestion(session: MockSession) {
  if (session.status === "COMPLETED") {
    return null;
  }
  return session.questions[session.currentQuestionIndex] ?? null;
}
