# API 合约

## POST `/api/mock-sessions`

创建一场 mock。

```json
{
  "module": "BEHAVIORAL",
  "targetRole": "Product Manager",
  "difficulty": "MEDIUM",
  "questionCount": 3
}
```

返回：

```json
{
  "session": {},
  "currentQuestion": {}
}
```

## GET `/api/mock-sessions/:sessionId`

返回 session 快照和当前题目。

## POST `/api/mock-sessions/:sessionId/answers`

提交当前题目的文字答案，V1 同步评分。

```json
{
  "questionId": "beh-pm-001",
  "content": "..."
}
```

返回：

```json
{
  "session": {},
  "currentQuestion": null,
  "completed": true,
  "report": {}
}
```

未完成时 `currentQuestion` 为下一题。

## GET `/api/reports/:sessionId`

返回复盘报告，并记录 `report_view`。

## POST `/api/events`

登录用户写入白名单埋点；若包含 `sessionId`，必须是本人 Session。任意事件名和敏感 payload 会被拒绝或脱敏。

```json
{
  "name": "seven_day_return",
  "sessionId": "session_id",
  "payload": {
    "source": "email"
  }
}
```

允许的产品事件以 `src/lib/analytics/events.ts` 为准。

## GET/POST `/api/memories`

- `GET`：列出当前用户未过期的结构化 Memory。
- `POST`：用户只可创建 `FACT` 或 `PREFERENCE`；`WEAKNESS/TRAINING_STATE` 由 Workflow 写入。

## PATCH/DELETE `/api/memories/:memoryId`

确认、拒绝、修改或删除本人 Memory。跨用户统一返回 404；训练状态不可通过通用 UPDATE 修改。

## POST `/api/retrievals/questions`

执行用户已确认证据域 + 审核面试知识域检索，返回两域结果、来源 ID、分数、过滤器、Trace ID 和降级原因。

## GET `/api/traces/:runId`

仅所有者或管理员可回放 Run，返回版本、模型、用量、成本、延迟、fallback、Bad Case 引用和按序步骤；不返回完整简历或回答。

## PATCH `/api/badcases/:badCaseId`

为本人 Bad Case 设置根因、状态和回归用例引用。`REGRESSION_ADDED` 必须提供 `regressionRef`。
