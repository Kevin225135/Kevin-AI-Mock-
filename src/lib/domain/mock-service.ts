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
import {
  createTraceRunId,
  runWithTrace
} from "@/lib/observability/trace";
import { compareAnswerAttempts } from "./attempt-comparison";
import { DomainError } from "./errors";
import type {
  AttemptComparison,
  CreateSessionInput,
  CurrentUser,
  MockSession,
  Question,
  Report,
  RetryAnswerInput,
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

  if (questions.length < input.questionCount) {
    throw new Error(
      `Only ${questions.length} strictly matched questions are available; ${input.questionCount} requested.`
    );
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
  await store.saveScore(existing.id, answerId, score, expectedQuestion.rubricVersionId);

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
  const followUpId = existing.resumeId
    ? await createResumeFollowUp({
        sessionId: existing.id,
        resumeId: existing.resumeId,
        targetRole: existing.targetRole,
        difficulty: existing.difficulty,
        previousQuestionId: expectedQuestion.id,
        answer: input.content,
        round: existing.followUpRound
      })
    : followUpDecision !== "CLOSE"
      ? await createFollowUpQuestion({
          module: existing.module, targetRole: existing.targetRole,
          difficulty: existing.difficulty, originalPrompt: expectedQuestion.prompt,
          answer: input.content, round: existing.followUpRound, decision: followUpDecision
        })
      : null;
  if (followUpId) {
    await store.appendQuestion(existing.id, followUpId);
    await store.updateSession(existing.id, {
      followUpRound: existing.followUpRound + 1
    });
  }

  const refreshed = await store.getSession(existing.id);
  if (!refreshed) {
    throw new Error("Session disappeared after follow-up generation.");
  }
  const nextIndex = existing.currentQuestionIndex + 1;
  const isComplete = nextIndex >= refreshed.questions.length;
  const progressed = await store.updateSession(existing.id, {
    status: isComplete ? "COMPLETED" : "IN_PROGRESS",
    currentQuestionIndex: isComplete ? existing.currentQuestionIndex : nextIndex,
    // A follow-up chain owns its own two-round budget. Reset before the next
    // base question instead of leaking the previous question's round count.
    followUpRound: followUpId ? existing.followUpRound + 1 : 0
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
  let report = await store.getReport(sessionId);
  const session = await store.getSession(sessionId);

  if (!session || !canAccessOwnedResource(actor, session.userId)) {
    return null;
  }

  if (report) {
    if (
      session.status === "COMPLETED" &&
      report.questionFeedback.some((item) => !item.latestAttemptId)
    ) {
      report = await store.saveReport(buildReport(session));
    }
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

export async function retryAnswerAttempt(
  sourceAttemptId: string,
  input: RetryAnswerInput,
  actor: CurrentUser
): Promise<{
  attempt: MockSession["answers"][number];
  comparison: AttemptComparison;
  report: Report;
  runId: string;
}> {
  const store = await getDataStore();
  const source = await store.getAnswerContext(sourceAttemptId);

  if (!source || !canAccessOwnedResource(actor, source.session.userId)) {
    throw new DomainError("Answer attempt not found.", "ATTEMPT_NOT_FOUND", 404);
  }
  if (!source.score) {
    throw new DomainError(
      "原回答尚未完成评分，暂时不能重答。",
      "SOURCE_SCORE_PENDING",
      409
    );
  }
  const rubricVersionId =
    source.score.rubricVersionId ?? source.question.rubricVersionId;
  if (!rubricVersionId) {
    throw new DomainError(
      "原评分缺少 Rubric 版本，无法创建可比较的重答。",
      "RUBRIC_VERSION_MISSING",
      409
    );
  }

  assertSafeInterviewAnswer(input.content);
  const runId = createTraceRunId();
  const attempt = await store.createRetryAttempt(sourceAttemptId, input);
  let retry = await store.getAnswerContext(attempt.id);
  if (!retry) {
    throw new Error("Retry attempt disappeared after save.");
  }

  if (!retry.score) {
    await store.trackEvent({
      name: analyticsEvents.answerRetrySubmitted,
      sessionId: source.session.id,
      userId: actor.id,
      payload: {
        sourceAttemptId,
        retryAttemptId: attempt.id,
        runId,
        attemptNo: attempt.attemptNo,
        answerLength: input.content.length
      }
    });
    const score = await runWithTrace(
      {
        runId,
        name: "answer-retry-score",
        sessionId: source.session.id,
        userId: actor.id,
        version: rubricVersionId,
        tags: ["v2", "retry", source.session.module.toLowerCase()],
        metadata: {
          sourceAttemptId,
          retryAttemptId: attempt.id,
          attemptNo: attempt.attemptNo,
          rubricVersionId,
          provider: process.env.AI_PROVIDER ?? "local"
        }
      },
      () =>
        scoreAnswer({
          question: source.question,
          answer: input.content
        })
    );
    await store.saveScore(source.session.id, attempt.id, score, rubricVersionId);
    retry = await store.getAnswerContext(attempt.id);
    if (!retry?.score) {
      throw new Error("Retry score disappeared after save.");
    }
    await store.trackEvent({
      name: analyticsEvents.answerRetryCompleted,
      sessionId: source.session.id,
      userId: actor.id,
      payload: {
        sourceAttemptId,
        retryAttemptId: attempt.id,
        runId,
        attemptNo: attempt.attemptNo,
        totalScore: retry.score.totalScore,
        rubricVersionId
      }
    });
  }

  const comparison = compareAnswerAttempts({
    sourceAttempt: source.answer,
    sourceScore: source.score,
    retryAttempt: retry.answer,
    retryScore: retry.score
  });
  const refreshedSession = await store.getSession(source.session.id);
  if (!refreshedSession) {
    throw new Error("Session disappeared after retry scoring.");
  }
  const report = await store.saveReport(buildReport(refreshedSession));

  return { attempt: retry.answer, comparison, report, runId };
}

export async function getAnswerAttemptComparison(
  attemptId: string,
  actor: CurrentUser
): Promise<AttemptComparison> {
  const store = await getDataStore();
  const target = await store.getAnswerContext(attemptId);
  if (!target || !canAccessOwnedResource(actor, target.session.userId)) {
    throw new DomainError("Answer attempt not found.", "ATTEMPT_NOT_FOUND", 404);
  }

  const sourceAttemptId = target.answer.parentAnswerId;
  if (sourceAttemptId) {
    const source = await store.getAnswerContext(sourceAttemptId);
    if (!source?.score || !target.score) {
      throw new DomainError("Comparison score is not ready.", "SCORE_PENDING", 409);
    }
    return compareAnswerAttempts({
      sourceAttempt: source.answer,
      sourceScore: source.score,
      retryAttempt: target.answer,
      retryScore: target.score
    });
  }

  const latestRetry = target.session.answers
    .filter(
      (candidate) =>
        candidate.questionId === target.answer.questionId &&
        candidate.followUpRound === target.answer.followUpRound &&
        candidate.attemptNo > target.answer.attemptNo
    )
    .sort((a, b) => b.attemptNo - a.attemptNo)[0];
  if (!latestRetry) {
    throw new DomainError("No retry attempt exists yet.", "RETRY_NOT_FOUND", 404);
  }
  const retry = await store.getAnswerContext(latestRetry.id);
  if (!target.score || !retry?.score) {
    throw new DomainError("Comparison score is not ready.", "SCORE_PENDING", 409);
  }
  return compareAnswerAttempts({
    sourceAttempt: target.answer,
    sourceScore: target.score,
    retryAttempt: retry.answer,
    retryScore: retry.score
  });
}

export function getCurrentQuestion(session: MockSession) {
  if (session.status === "COMPLETED") {
    return null;
  }
  return session.questions[session.currentQuestionIndex] ?? null;
}
