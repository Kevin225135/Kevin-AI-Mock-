import { prisma } from "../src/lib/repositories/prisma-client";
import { hashTraceIdentifier } from "../src/lib/observability/redaction";

const eventNames = [
  "mock_start",
  "mock_complete",
  "report_view",
  "retry_started",
  "retry_completed",
  "feedback_adopted",
  "plan_created",
  "retest_completed"
] as const;

async function main() {
  const start = parseDate(process.argv[2] ?? process.env.PILOT_START, new Date(0));
  const end = parseDate(process.argv[3] ?? process.env.PILOT_END, new Date());
  if (start >= end) throw new Error("Pilot start must be before pilot end.");

  const [events, traces] = await Promise.all([
    prisma.event.findMany({
      where: {
        name: { in: [...eventNames] },
        createdAt: { gte: start, lt: end },
        userId: { not: null }
      },
      select: { name: true, userId: true, sessionId: true, createdAt: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.traceRun.findMany({
      where: { startedAt: { gte: start, lt: end } },
      select: {
        status: true,
        estimatedCostUsd: true,
        latencyMs: true,
        steps: { select: { kind: true } }
      }
    })
  ]);

  const counts = Object.fromEntries(
    eventNames.map((name) => [name, events.filter((event) => event.name === name).length])
  ) as Record<(typeof eventNames)[number], number>;
  const startedSessions = sessionSet(events, "mock_start");
  const completedSessions = sessionSet(events, "mock_complete");
  const reportSessions = sessionSet(events, "report_view");
  const participantIds = [
    ...new Set(events.flatMap((event) => (event.userId ? [event.userId] : [])))
  ];
  const participants = participantIds.map((userId) => {
    const own = events.filter((event) => event.userId === userId);
    return {
      participantRef: hashTraceIdentifier(userId),
      firstEventAt: own[0]?.createdAt.toISOString(),
      lastEventAt: own.at(-1)?.createdAt.toISOString(),
      events: Object.fromEntries(
        eventNames.map((name) => [name, own.filter((event) => event.name === name).length])
      )
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    evidenceStatus: "OBSERVED_EVENTS_ONLY",
    window: { start: start.toISOString(), endExclusive: end.toISOString() },
    definitions: {
      mockCompletionRate: "unique completed sessions / unique started sessions",
      reportViewRate: "unique sessions with report_view / unique completed sessions",
      retryCompletionRate: "retry_completed events / retry_started events",
      feedbackAdoptionRate: "feedback_adopted events / retry_completed events",
      retestCompletionRate: "retest_completed events / plan_created events"
    },
    totals: {
      participants: participantIds.length,
      events: events.length,
      startedSessions: startedSessions.size,
      completedSessions: completedSessions.size,
      reportViewedSessions: reportSessions.size,
      ...counts
    },
    rates: {
      mockCompletionRate: ratio(completedSessions.size, startedSessions.size),
      reportViewRate: ratio(reportSessions.size, completedSessions.size),
      retryCompletionRate: ratio(counts.retry_completed, counts.retry_started),
      feedbackAdoptionRate: ratio(counts.feedback_adopted, counts.retry_completed),
      retestCompletionRate: ratio(counts.retest_completed, counts.plan_created)
    },
    traceHealth: {
      runs: traces.length,
      statusCounts: countBy(traces.map((trace) => trace.status)),
      averageLatencyMs: average(
        traces.flatMap((trace) => (trace.latencyMs === null ? [] : [trace.latencyMs]))
      ),
      estimatedCostUsd: round(traces.reduce((sum, trace) => sum + trace.estimatedCostUsd, 0)),
      stepKindCounts: countBy(traces.flatMap((trace) => trace.steps.map((step) => step.kind)))
    },
    participants
  };
  console.log(JSON.stringify(report, null, 2));
}

function sessionSet(events: Array<{ name: string; sessionId: string | null }>, name: string) {
  return new Set(
    events
      .filter((event) => event.name === name)
      .flatMap((event) => (event.sessionId ? [event.sessionId] : []))
  );
}

function parseDate(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date;
}

function ratio(numerator: number, denominator: number) {
  return denominator ? round(numerator / denominator) : null;
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function countBy(values: string[]) {
  return Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((value) => [value, values.filter((candidate) => candidate === value).length])
  );
}

function round(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
