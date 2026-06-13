export const analyticsEvents = {
  mockStart: "mock_start",
  questionAnswered: "question_answered",
  scoreGenerated: "score_generated",
  reportView: "report_view",
  mockComplete: "mock_complete",
  sevenDayReturn: "seven_day_return"
} as const;

export type AnalyticsEventName =
  (typeof analyticsEvents)[keyof typeof analyticsEvents];
