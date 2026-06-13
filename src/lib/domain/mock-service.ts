import { scoreAnswer } from "@/lib/ai/scorer";
import { analyticsEvents } from "@/lib/analytics/events";
import { getDataStore } from "@/lib/repositories";
import { buildReport } from "./report";
import type {
  CreateSessionInput,
  MockSession,
  Question,
  Report,
  SubmitAnswerInput
} from "./types";

export async function createMockSession(input: CreateSessionInput) {
  const store = await getDataStore();
  const candidates = await store.listQuestions({
    module: input.module,
    targetRole: input.targetRole,
    difficulty: input.difficulty
  });
  const questions = candidates.slice(0, input.questionCount);

  if (questions.length === 0) {
    throw new Error("No questions available for this selection.");
  }

  const session = await store.createSession(input, questions);

  await store.trackEvent({
    name: analyticsEvents.mockStart,
    sessionId: session.id,
    userId: input.userId,
    payload: {
      module: input.module,
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      questionCount: questions.length
    }
  });

  return {
    session,
    currentQuestion: getCurrentQuestion(session)
  };
}

export async function getMockSession(sessionId: string) {
  const store = await getDataStore();
  const session = await store.getSession(sessionId);

  if (!session) {
    return null;
  }

  return {
    session,
    currentQuestion: getCurrentQuestion(session)
  };
}

export async function submitMockAnswer(
  sessionId: string,
  input: SubmitAnswerInput
): Promise<{
  session: MockSession;
  currentQuestion: Question | null;
  completed: boolean;
  report?: Report;
}> {
  const store = await getDataStore();
  const existing = await store.getSession(sessionId);

  if (!existing) {
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

  const score = await scoreAnswer({
    question: expectedQuestion,
    answer: input.content
  });
  await store.saveScore(sessionId, answer.id, score);

  await store.trackEvent({
    name: analyticsEvents.scoreGenerated,
    sessionId,
    userId: answeredSession.userId,
    payload: {
      questionId: input.questionId,
      totalScore: score.totalScore
    }
  });

  const nextIndex = existing.currentQuestionIndex + 1;
  const isComplete = nextIndex >= existing.questions.length;
  const progressed = await store.updateSession(sessionId, {
    status: isComplete ? "COMPLETED" : "IN_PROGRESS",
    currentQuestionIndex: isComplete ? existing.currentQuestionIndex : nextIndex
  });
  const latest = await store.getSession(sessionId);

  if (!latest) {
    throw new Error("Session disappeared after scoring.");
  }

  if (isComplete) {
    const report = await store.saveReport(buildReport(latest));
    await store.trackEvent({
      name: analyticsEvents.mockComplete,
      sessionId,
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

export async function getReport(sessionId: string) {
  const store = await getDataStore();
  const report = await store.getReport(sessionId);
  const session = await store.getSession(sessionId);

  if (report) {
    await store.trackEvent({
      name: analyticsEvents.reportView,
      sessionId,
      userId: session?.userId,
      payload: {
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
