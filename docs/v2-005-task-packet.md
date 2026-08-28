# V2-005 任务包：结构化弱点与等价题复测

## Goal

让用户把本场评分中最多 3 个弱点转成可确认、可忽略、可到期执行的训练任务，并在后续 Session 用等价题验证改善。

## In Scope

- `Weakness` / `TrainingTask` 持久化模型和兼容迁移。
- 来源 Attempt、评分证据、严重度、状态和复测时间。
- 报告页确认/忽略/调整日期。
- 同模块、岗位、难度的跨 Session 等价题注入。
- `RETEST` Attempt 与未改善/改善中/已通过状态回写。

## Out of Scope

- 跨报告 Memory 管理台和删除/导出（V2-008）。
- 用 LLM 自由生成或直接更新训练状态。
- 真实用户训练效果结论（V2-012/013）。
- 同一 Session 同时消费多条到期任务。

## Acceptance Criteria

1. 单场任意时刻最多 3 个弱点，且每条有来源 Attempt 和评分证据。
2. 未经用户确认不得进入新 Session；用户可忽略或调整日期。
3. 到期任务只进入匹配模块、岗位、难度的新 Session，且一次只能被一个 Session 抢占。
4. 复测题与原题文本不同但保留能力锚点；普通题库不会抽中内部复测题。
5. 复测回答标记为 `RETEST`，按固定阈值更新结果状态。
6. 跨用户不可读写；迁移、类型、Lint、数据库测试和生产构建通过。

## Test Strategy

- 单元测试：候选排序/上限、等价题模板、结果阈值。
- 数据库集成：所有权、确认、到期、事务抢占、跨 Session 注题、Attempt 类型、状态回写。
- 构建门槛：TypeScript、ESLint、Next.js production build、Promptfoo Gate。

## Rollback

- 应用层可停止调用弱点同步与到期注题，既有 Session/Attempt/Report 契约不变。
- 新表只通过外键引用既有资源；删除新增路由和调用后，旧 V2-001～004 主链路仍可运行。
- 数据库迁移不在生产直接回滚；如需撤回，先停写并备份 `weaknesses/training_tasks`，再执行单独前向修复迁移。

## Done Evidence

- PostgreSQL 13 个迁移成功应用。
- 数据库测试 29/29，Promptfoo 4/4。
- TypeScript、ESLint、Next.js 15.5.23 production build 通过。
