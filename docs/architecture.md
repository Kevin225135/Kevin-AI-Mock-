# 技术架构

## 当前形态

V2 使用模块化单体：

- Next.js App Router 承载 Web 与 BFF/API
- `AppDataStore` 隔离数据层，运行时固定接 Prisma/PostgreSQL
- PostgreSQL 同时保存业务事实、结构化 Memory、检索审计和脱敏 Run Trace
- 本地 rubric scorer 默认同步执行，可切到兼容模型或 Redis/BullMQ worker；超时/成本越界回退本地 Rubric
- 报告由已保存的 answer + score 聚合生成

## 关键链路

1. 用户选择模块、岗位、难度和题量。
2. `POST /api/mock-sessions` 创建 session，筛选题库，记录 `mock_start`。
3. 简历题通过已确认用户证据域和审核面试知识域联合检索；未确认材料只作为确认线索。
4. `POST /api/mock-sessions/:sessionId/answers` 先保存答案，再执行评分与受控追问；Agent 只建议 4 个动作和只读 Tool。
5. Run 记录 Retrieval/Model/Score/Decision/Tool/Output、版本、成本、延迟与 fallback。
6. 全部题目完成后生成 report；用户可立即重答、查看同 Rubric 对比并确认弱点。
7. Weakness 和 TrainingState 写入 Memory，到期后在新 Session 插入等价题复测。
8. Bad Case 绑定 Run、根因和回归引用；试点事件按固定漏斗导出。

## 扩展点

- 动态追问：复用 `answers.follow_up_round` 与 `mock_sessions.follow_up_round`，最多两轮。
- 异步评分：在答案提交后投递 `ai-scoring` job，由 `src/workers/scoring-worker.ts` 消费。
- 语音作答：向 `answers` 增加 `audioUrl`、`transcript`、`sttStatus` 字段。
- 进步追踪：基于历史 `ai_scores` 聚合维度分趋势。
- Hybrid RAG：当前词法 + 元数据检索通过统一服务封装，V2-014 在 Gold Query 证明收益后再接 embedding/reranker。
