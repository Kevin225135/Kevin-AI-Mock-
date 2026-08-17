# V2-006～012 批次任务包

## Outcome

完成受控追问、全链路可回放 Trace、安全/预算降级、用户验证事件、可审计面经合同、双域检索和结构化 Memory CRUD，使 V2 从单场训练闭环升级为可解释、可治理的跨会话训练系统。

## Relevant context

- Workflow：`src/lib/domain/mock-service.ts`
- 追问：`src/lib/ai/follow-up*.ts`、`src/lib/resume/resume-service.ts`
- Trace：`src/lib/observability/*`
- RAG：`src/lib/rag/*`、`src/lib/knowledge/*`
- 数据：`prisma/schema.prisma`、`prisma/seed.ts`
- 用户控制：`src/components/account-panel.tsx`、`src/app/api/users/me/*`

## Constraints

- 模型只能返回枚举动作、原因码和只读 Tool 建议，不能修改 Session、Memory 或评分。
- 最多两轮动态追问；低置信度、超时、成本越界或 Tool 失败必须走确定性 fallback。
- Trace 只存 ID、哈希、脱敏摘要和统计，不复制完整简历或回答。
- 面经只有许可状态可用且质量通过的记录才能进入检索。
- 用户证据必须限定当前用户；未确认事实不能当作确定事实。
- Memory 必须可查看、确认/修改和删除；Weakness/TrainingState 只由 Workflow 写入。
- 保持 V2-001～005 的 Attempt、Rubric 和复测兼容性。

## Acceptance

1. 追问输出严格符合 `DEEPEN/CHALLENGE/NEXT/STOP`、原因码、置信度和两轮上限。
2. 每次回答运行保存 Retrieval/Decision/Tool/Score 时间线、版本、延迟、成本估算、fallback 和最终状态；所有者可回放。
3. Prompt Injection、越权检索、敏感日志、Tool/模型超时和成本超限有回归用例且能安全降级。
4. 核心用户事件口径固定，并提供不伪造结果的试点协议与导出方式。
5. `InterviewPattern` 具备来源、采集、许可、标签、哈希、质量、更新时间字段；重复/无许可/低质量数据不可发布。
6. 双域检索返回用户证据和面试知识的来源 ID、分数、过滤器、Trace ID 与零召回降级原因。
7. Memory 区分 Fact/Preference/Weakness/TrainingState/Temporary；具备来源、置信度、确认、过期、CRUD、隔离与级联删除。
8. 迁移、单元/数据库/权限测试、Promptfoo、生产构建和数据清洗报告全部通过。

## Non-goals

- 不执行未经用户提供参与者的真实试点，不虚构用户效果。
- 不接入新的自治 Agent 或给 Agent 暴露写状态 Tool。
- 不在本批次启用外部向量数据库或 Mem0。
- 不抓取许可不明的第三方面经。

## Risks and rollback

- 数据迁移采用新增表/可空字段，旧主链路保持可运行；生产撤回应以前向修复迁移和停用新路由为主。
- Trace/Memory 写入失败不得覆盖已保存回答；评分 fallback 保留本地 Rubric。
- 检索质量尚无人工 Gold Set；工程完成与用户效果验证分开报告。

## Return contract

- 汇总每个 V2 ID 的改动与未验证项。
- 列出迁移、测试、清洗、评测和构建证据。
- 更新 `v2-tasks.md`、ADR、测试计划和开发日志。
