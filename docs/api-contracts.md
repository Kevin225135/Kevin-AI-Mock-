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

写入自定义埋点。

```json
{
  "name": "seven_day_return",
  "sessionId": "session_id",
  "payload": {
    "source": "email"
  }
}
```
