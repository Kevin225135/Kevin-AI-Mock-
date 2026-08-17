import { scoreAnswer } from "@/lib/ai/scorer";
import { buildScoringPrompt } from "@/lib/ai/prompt";
import {
  estimateModelUsage,
  evaluateRuntimeBudget,
  withTimeoutFallback
} from "@/lib/ai/runtime-guard";
import { analyticsEvents } from "@/lib/analytics/events";
import { canAccessOwnedResource } from "@/lib/auth/permissions";
import { getDataStore } from "@/lib/repositories";
import { buildReport } from "./report";
import { createResumeFollowUp, createResumeQuestions } from "@/lib/resume/resume-service";
import { createFollowUpQuestion, decideFollowUp } from "@/lib/ai/follow-up";
import type { FollowUpDecision } from "@/lib/ai/follow-up-decision";
import { getTrainingMemory, retrieveCandidateEvidence } from "@/lib/rag/dual-domain-retrieval";
import { retrieveInterviewPatterns } from "@/lib/rag/interview-pattern-service";
import { enqueueScoringJob, type ScoringJobData } from "@/lib/queue/scoring-queue";
import { assertSafeInterviewAnswer } from "@/lib/ai/safety";
import { createTraceRunId, runWithTrace } from "@/lib/observability/trace";
import { hashTraceIdentifier } from "@/lib/observability/redaction";
import {
  completePersistentTraceRun,
  createPersistentTraceRun,
  recordTraceStep
} from "@/lib/observability/trace-store";
import { compareAnswerAttempts } from "./attempt-comparison";
import { DomainError } from "./errors";
import {
  completeRetestTrainingTask,
  findDueRetest,
  refreshTrainingTaskMemory,
  syncSessionWeaknesses
} from "./training-service";
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

export async function createMockSession(input: CreateMockSessionInput, actor: CurrentUser) {
  const store = await getDataStore();
  const normalizedInput = input.resumeId ? { ...input, module: "CV_RELATED" as const } : input;
  const dueRetest = await findDueRetest({
    userId: actor.id,
    module: normalizedInput.module,
    targetRole: input.targetRole,
    difficulty: input.difficulty
  });
  const baseQuestionCount = input.questionCount - (dueRetest ? 1 : 0);
  const baseQuestions =
    baseQuestionCount === 0
      ? []
      : input.resumeId
        ? await createResumeQuestions({
            resumeId: input.resumeId,
            targetRole: input.targetRole,
            difficulty: input.difficulty,
            questionCount: baseQuestionCount,
            actor
          })
        : (
            await store.listQuestions({
              module: normalizedInput.module,
              targetRole: input.targetRole,
              difficulty: input.difficulty,
              userId: actor.id
            })
          ).slice(0, baseQuestionCount);
  const questions = [
    ...(dueRetest ? [dueRetest.question] : []),
    ...baseQuestions.filter((question) => question.id !== dueRetest?.question.id)
  ].slice(0, input.questionCount);

  if (questions.length < input.questionCount) {
    throw new Error(
      `Only ${questions.length} strictly matched questions are available; ${input.questionCount} requested.`
    );
  }

  const session = await store.createSession(
    {
      ...input,
      ...normalizedInput,
      userId: actor.id,
      trainingTaskId: dueRetest?.trainingTaskId
    },
    questions
  );
  if (dueRetest) {
    await refreshTrainingTaskMemory(dueRetest.trainingTaskId);
  }

  await store.trackEvent({
    name: analyticsEvents.mockStart,
    sessionId: session.id,
    userId: actor.id,
    payload: {
      module: normalizedInput.module,
      targetRole: input.targetRole,
      difficulty: input.difficulty,
      questionCount: questions.length,
      trainingTaskId: dueRetest?.trainingTaskId
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
        payload: {
          previousSessionId: previous.id,
          ageHours: Math.round(ageMs / 3_600_000)
        }
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
  runId?: string;
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
    await enqueueScoringJob({
      sessionId,
      answerId: answer.id,
      questionId: input.questionId
    });
    return {
      session: answeredSession,
      currentQuestion: expectedQuestion,
      completed: false,
      queued: true
    };
  }

  return finalizeSavedAnswer({
    store,
    existing,
    expectedQuestion,
    answerId: answer.id,
    input
  });
}

async function finalizeSavedAnswer({
  store,
  existing,
  expectedQuestion,
  answerId,
  input
}: {
  store: Awaited<ReturnType<typeof getDataStore>>;
  existing: MockSession;
  expectedQuestion: Question;
  answerId: string;
  input: SubmitAnswerInput;
}): Promise<{
  session: MockSession;
  currentQuestion: Question | null;
  completed: boolean;
  report?: Report;
  runId: string;
}> {
  const runId = createTraceRunId();
  const runStartedAt = performance.now();
  let traceSequence = 0;
  let degradedReason: string | undefined;
  await bestEffortTrace(() =>
    createPersistentTraceRun({
      runId,
      userId: existing.userId,
      sessionId: existing.id,
      attemptId: answerId,
      name: "answer-workflow",
      workflowVersion: "v2.012",
      promptVersion: "score-v1/follow-up-v2",
      model: selectedModelName(),
      inputRefs: {
        questionId: expectedQuestion.id,
        attemptId: answerId,
        resumeId: existing.resumeId,
        payloadHash: hashTraceIdentifier(input.content),
        payloadLength: input.content.length
      }
    })
  );

  if (expectedQuestion.retrievalContext) {
    await bestEffortTrace(() =>
      recordTraceStep({
        runId,
        sequence: ++traceSequence,
        kind: "RETRIEVAL",
        name: "load-question-evidence",
        inputSummary: { questionId: expectedQuestion.id },
        outputSummary: {
          competencyId: expectedQuestion.retrievalContext?.competencyId,
          evidenceCount: expectedQuestion.retrievalContext?.evidence.length ?? 0,
          knowledgeRefs:
            expectedQuestion.retrievalContext?.knowledgeEvidence?.map((item) => item.id) ?? []
        }
      })
    );
  } else {
    await bestEffortTrace(() =>
      recordTraceStep({
        runId,
        sequence: ++traceSequence,
        kind: "RETRIEVAL",
        name: "load-question-evidence",
        status: "FALLBACK",
        inputSummary: { questionId: expectedQuestion.id },
        outputSummary: {
          evidenceCount: 0,
          degradationReason: "QUESTION_CONTEXT_NOT_AVAILABLE"
        },
        errorCode: "QUESTION_CONTEXT_NOT_AVAILABLE"
      })
    );
  }

  const scoringPrompt = buildScoringPrompt({
    question: expectedQuestion,
    answer: input.content
  });
  const budget = evaluateRuntimeBudget({ inputText: scoringPrompt });
  if (!budget.allowed) degradedReason = budget.reason;
  let providerFallbackReason: string | undefined;
  const scoreStartedAt = performance.now();
  let score;
  try {
    score = await runWithTrace(
      {
        runId,
        name: "answer-score",
        sessionId: existing.id,
        userId: existing.userId,
        version: expectedQuestion.rubricVersionId ?? "unversioned",
        tags: ["v2", "score", existing.module.toLowerCase()],
        metadata: {
          questionId: expectedQuestion.id,
          attemptId: answerId,
          budgetFallback: !budget.allowed
        }
      },
      () =>
        scoreAnswer(
          { question: expectedQuestion, answer: input.content },
          {
            forceLocal: !budget.allowed,
            onFallback: (reason) => {
              providerFallbackReason = reason;
            }
          }
        )
    );
  } catch (error) {
    await bestEffortTrace(() =>
      completePersistentTraceRun({
        runId,
        status: "FAILED",
        latencyMs: performance.now() - runStartedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
        finalState: "SCORING_FAILED"
      })
    );
    throw error;
  }
  const usage = estimateModelUsage({
    inputText: scoringPrompt,
    outputText: JSON.stringify(score)
  });
  if (providerFallbackReason) degradedReason = providerFallbackReason;
  await bestEffortTrace(() =>
    recordTraceStep({
      runId,
      sequence: ++traceSequence,
      kind: "MODEL",
      name: "score-answer",
      status: budget.allowed && !providerFallbackReason ? "OK" : "FALLBACK",
      inputSummary: {
        promptVersion: "score-v1",
        rubricVersionId: expectedQuestion.rubricVersionId,
        inputTokens: usage.inputTokens
      },
      outputSummary: {
        outputTokens: usage.outputTokens,
        totalScore: score.totalScore
      },
      latencyMs: performance.now() - scoreStartedAt,
      errorCode: budget.allowed ? providerFallbackReason : budget.reason
    })
  );
  const savedScore = await store.saveScore(
    existing.id,
    answerId,
    score,
    expectedQuestion.rubricVersionId
  );
  await bestEffortTrace(() =>
    recordTraceStep({
      runId,
      sequence: ++traceSequence,
      kind: "SCORE",
      name: "persist-rubric-score",
      inputSummary: {
        attemptId: answerId,
        rubricVersionId: savedScore.rubricVersionId
      },
      outputSummary: {
        scoreId: savedScore.id,
        totalScore: savedScore.totalScore,
        dimensions: savedScore.dimensions
      }
    })
  );
  await completeRetestTrainingTask({
    sessionId: existing.id,
    questionId: input.questionId,
    answerId,
    dimensions: savedScore.dimensions
  });

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
  await bestEffortTrace(() =>
    recordTraceStep({
      runId,
      sequence: ++traceSequence,
      kind: "DECISION",
      name: "follow-up-decision",
      inputSummary: {
        round: existing.followUpRound,
        score: score.totalScore
      },
      outputSummary: followUpDecision
    })
  );
  const followUpAction =
    followUpDecision.action === "DEEPEN" || followUpDecision.action === "CHALLENGE"
      ? followUpDecision.action
      : null;
  const toolStartedAt = performance.now();
  let followUpId: string | null = null;
  let toolError: unknown;
  const readTool = await withTimeoutFallback({
    operation: () =>
      executeFollowUpReadTool(followUpDecision, {
        userId: existing.userId,
        module: existing.module,
        difficulty: existing.difficulty,
        targetRole: existing.targetRole,
        query: `${expectedQuestion.prompt}\n${input.content}`
      }),
    fallback: () => [],
    timeoutMs: boundedToolTimeoutMs()
  });
  if (readTool.degraded) {
    degradedReason = `FOLLOW_UP_${readTool.reason}`;
  }
  const resolvedDecision = {
    ...followUpDecision,
    evidenceRefs: readTool.value
  };
  try {
    followUpId =
      followUpAction && existing.resumeId
        ? await createResumeFollowUp({
            sessionId: existing.id,
            resumeId: existing.resumeId,
            targetRole: existing.targetRole,
            difficulty: existing.difficulty,
            previousQuestionId: expectedQuestion.id,
            answer: input.content,
            round: existing.followUpRound,
            decision: resolvedDecision
          })
        : followUpAction
          ? await createFollowUpQuestion({
              module: existing.module,
              targetRole: existing.targetRole,
              difficulty: existing.difficulty,
              originalPrompt: expectedQuestion.prompt,
              answer: input.content,
              round: existing.followUpRound,
              decision: followUpAction
            })
          : null;
  } catch (error) {
    toolError = error;
    degradedReason = "FOLLOW_UP_TOOL_ERROR";
  }
  await bestEffortTrace(() =>
    recordTraceStep({
      runId,
      sequence: ++traceSequence,
      kind: "TOOL",
      name: followUpDecision.tool === "none" ? "create-follow-up" : followUpDecision.tool,
      status: toolError || readTool.degraded ? "FALLBACK" : "OK",
      inputSummary: {
        action: followUpDecision.action,
        reasonCode: followUpDecision.reasonCode,
        round: existing.followUpRound
      },
      outputSummary: {
        followUpQuestionId: followUpId,
        evidenceRefs: readTool.value
      },
      latencyMs: performance.now() - toolStartedAt,
      errorCode: toolError ? "TOOL_ERROR" : readTool.reason
    })
  );
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
    await syncSessionWeaknesses(latest, report);
    await store.trackEvent({
      name: analyticsEvents.mockComplete,
      sessionId: existing.id,
      userId: latest.userId,
      payload: {
        averageScore: report.averageScore,
        questionCount: latest.questions.length
      }
    });
    await bestEffortTrace(() =>
      recordTraceStep({
        runId,
        sequence: ++traceSequence,
        kind: "OUTPUT",
        name: "workflow-transition",
        outputSummary: {
          completed: true,
          reportId: report.id
        }
      })
    );
    await bestEffortTrace(() =>
      completePersistentTraceRun({
        runId,
        status: degradedReason ? "DEGRADED" : "COMPLETED",
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: usage.estimatedCostUsd,
        latencyMs: performance.now() - runStartedAt,
        fallbackReason: degradedReason,
        finalState: "COMPLETED"
      })
    );

    return {
      session: { ...latest, report },
      currentQuestion: null,
      completed: true,
      report,
      runId
    };
  }

  await bestEffortTrace(() =>
    recordTraceStep({
      runId,
      sequence: ++traceSequence,
      kind: "OUTPUT",
      name: "workflow-transition",
      outputSummary: {
        completed: false,
        nextQuestionId: getCurrentQuestion(progressed)?.id
      }
    })
  );
  await bestEffortTrace(() =>
    completePersistentTraceRun({
      runId,
      status: degradedReason ? "DEGRADED" : "COMPLETED",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      latencyMs: performance.now() - runStartedAt,
      fallbackReason: degradedReason,
      finalState: progressed.status
    })
  );
  return {
    session: progressed,
    currentQuestion: getCurrentQuestion(progressed),
    completed: false,
    runId
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
    if (session.status === "COMPLETED") {
      await syncSessionWeaknesses(session, report);
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
    throw new DomainError("原回答尚未完成评分，暂时不能重答。", "SOURCE_SCORE_PENDING", 409);
  }
  const rubricVersionId = source.score.rubricVersionId ?? source.question.rubricVersionId;
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
  const retryTraceStartedAt = performance.now();
  await bestEffortTrace(() =>
    createPersistentTraceRun({
      runId,
      userId: actor.id,
      sessionId: source.session.id,
      attemptId: attempt.id,
      name: "answer-retry-workflow",
      workflowVersion: "v2.012",
      promptVersion: "score-v1/comparison-v1",
      model: selectedModelName(),
      inputRefs: {
        sourceAttemptId,
        retryAttemptId: attempt.id,
        payloadHash: hashTraceIdentifier(input.content),
        payloadLength: input.content.length
      }
    })
  );
  let retry = await store.getAnswerContext(attempt.id);
  if (!retry) {
    throw new Error("Retry attempt disappeared after save.");
  }
  const retryPrompt = buildScoringPrompt({
    question: source.question,
    answer: input.content
  });
  const retryBudget = evaluateRuntimeBudget({ inputText: retryPrompt });
  let retryFallbackReason: string | undefined;

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
    if (!retryBudget.allowed) retryFallbackReason = retryBudget.reason;
    let retryProviderFallbackReason: string | undefined;
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
        scoreAnswer(
          {
            question: source.question,
            answer: input.content
          },
          {
            forceLocal: !retryBudget.allowed,
            onFallback: (reason) => {
              retryProviderFallbackReason = reason;
            }
          }
        )
    );
    if (retryProviderFallbackReason) {
      retryFallbackReason = retryProviderFallbackReason;
    }
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
    await bestEffortTrace(() =>
      recordTraceStep({
        runId,
        sequence: 1,
        kind: "MODEL",
        name: "score-retry",
        status: retryFallbackReason ? "FALLBACK" : "OK",
        inputSummary: { rubricVersionId, sourceAttemptId },
        outputSummary: {
          retryAttemptId: attempt.id,
          totalScore: retry?.score?.totalScore
        },
        errorCode: retryFallbackReason
      })
    );
  }

  const comparison = compareAnswerAttempts({
    sourceAttempt: source.answer,
    sourceScore: source.score,
    retryAttempt: retry.answer,
    retryScore: retry.score
  });
  await bestEffortTrace(() =>
    recordTraceStep({
      runId,
      sequence: 2,
      kind: "SCORE",
      name: "compare-attempts",
      inputSummary: {
        sourceAttemptId,
        retryAttemptId: attempt.id,
        rubricVersionId
      },
      outputSummary: {
        totalDelta: comparison.totalDelta,
        improvedDimensions: comparison.improvedDimensions,
        adoptedActionCount: comparison.adoptedActions.length
      }
    })
  );
  if (comparison.adoptedActions.length > 0) {
    await store.trackEvent({
      name: analyticsEvents.feedbackAdopted,
      sessionId: source.session.id,
      userId: actor.id,
      payload: {
        sourceAttemptId,
        retryAttemptId: attempt.id,
        adoptedActionCount: comparison.adoptedActions.length
      }
    });
  }
  const refreshedSession = await store.getSession(source.session.id);
  if (!refreshedSession) {
    throw new Error("Session disappeared after retry scoring.");
  }
  const report = await store.saveReport(buildReport(refreshedSession));
  await syncSessionWeaknesses(refreshedSession, report);
  const retryUsage = estimateModelUsage({
    inputText: retryPrompt,
    outputText: JSON.stringify(retry.score)
  });
  await bestEffortTrace(() =>
    completePersistentTraceRun({
      runId,
      status: retryFallbackReason ? "DEGRADED" : "COMPLETED",
      inputTokens: retryUsage.inputTokens,
      outputTokens: retryUsage.outputTokens,
      estimatedCostUsd: retryUsage.estimatedCostUsd,
      latencyMs: performance.now() - retryTraceStartedAt,
      fallbackReason: retryFallbackReason,
      finalState: "COMPARISON_COMPLETED"
    })
  );

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

async function bestEffortTrace(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch {
    // Observability must not become a second business-state dependency.
  }
}

function selectedModelName() {
  if (!process.env.AI_PROVIDER || process.env.AI_PROVIDER === "local") {
    return "local-rubric";
  }
  if (process.env.AI_PROVIDER === "ark") {
    return process.env.ARK_MODEL ?? process.env.AI_MODEL ?? "ark-default";
  }
  return process.env.AI_MODEL ?? "openai-compatible-default";
}

async function executeFollowUpReadTool(
  decision: FollowUpDecision,
  context: {
    userId: string;
    module: MockSession["module"];
    difficulty: MockSession["difficulty"];
    targetRole: string;
    query: string;
  }
) {
  if (decision.tool === "retrieve_candidate_evidence") {
    const evidence = await retrieveCandidateEvidence({
      actor: { id: context.userId },
      query: context.query,
      limit: 5
    });
    return evidence.map((item) => `memory:${item.id}`);
  }
  if (decision.tool === "retrieve_interview_patterns") {
    const patterns = await retrieveInterviewPatterns({
      query: context.query,
      module: context.module,
      difficulty: context.difficulty,
      targetRole: context.targetRole,
      limit: 5
    });
    return patterns.selected.map((item) => `pattern:${item.id}`);
  }
  if (decision.tool === "get_training_memory") {
    const trainingMemory = await getTrainingMemory({
      actor: { id: context.userId },
      limit: 10
    });
    return trainingMemory.map((item) => `memory:${item.id}`);
  }
  return [];
}

function boundedToolTimeoutMs() {
  const value = Number(process.env.AGENT_TOOL_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : 1200;
}
