# 技术架构

## 当前形态

V1 使用模块化单体：

- Next.js App Router 承载 Web 与 BFF/API
- `AppDataStore` 隔离数据层，运行时固定接 Prisma/PostgreSQL
- 本地 rubric scorer 默认同步执行，后续可切到 Redis/BullMQ worker
- 报告由已保存的 answer + score 聚合生成

## 关键链路

1. 用户选择模块、岗位、难度和题量。
2. `POST /api/mock-sessions` 创建 session，筛选题库，记录 `mock_start`。
3. `POST /api/mock-sessions/:sessionId/answers` 保存答案，执行评分，记录 `question_answered` 与 `score_generated`。
4. 全部题目完成后生成 report，记录 `mock_complete`。
5. `GET /api/reports/:sessionId` 返回报告并记录 `report_view`。

## 扩展点

- 动态追问：复用 `answers.follow_up_round` 与 `mock_sessions.follow_up_round`。
- 异步评分：在答案提交后投递 `ai-scoring` job，由 `src/workers/scoring-worker.ts` 消费。
- 语音作答：向 `answers` 增加 `audioUrl`、`transcript`、`sttStatus` 字段。
- 进步追踪：基于历史 `ai_scores` 聚合维度分趋势。
