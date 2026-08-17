# AI Mock V2 开发日志

## 2026-08-17：V2-001～V2-004 首条纵向切片

- 原假设：现有 `Answer` 可以小改后支持重答。
- 实际发现：旧唯一键会覆盖同题回答；历史 `QuestionBank/AiScore` 中还有 4 条 Rubric 引用为空；远端与本地目录已分叉，不能直接覆盖同步。
- 本次改动：
  - 保存本地 Git 基线 `66b0244`，建立 baseline/ADR/task/test 台账；
  - `Answer` 增加 Attempt 编号、类型、父 Attempt 与幂等键；
  - 新增重答与对比 API，复用现有鉴权；首次回答保持只读；
  - 报告页增加当前回答、Attempt 次数、立即重答、四维 delta、已观察采纳和剩余建议；
  - 评分强制保存 Rubric 版本，版本不同返回 `RUBRIC_VERSION_MISMATCH`；
  - 增加 Run ID、脱敏/哈希策略和可选 Langfuse v5 OpenTelemetry 接入；未配置时不导出；
  - 增加 Promptfoo 0.122.0 按需评测与 GitHub Actions 100% Gate；样本明确标注为合成回归；
  - Promptfoo 捕获市场答案 Bad Case，补上反方证据与失效条件识别规则。
- 实际证据：
  - Prisma 12 个迁移全部应用；4 条历史评分 Rubric 空值已降为 0；
  - 默认测试 23 passed / 2 skipped；启用数据库后 25/25 passed；
  - Promptfoo 4/4 passed，pass rate 100%；
  - TypeScript、ESLint、Next.js 15.5.23 production build 全部通过；
  - 数据库测试覆盖不可覆盖、幂等、并发编号、跨用户隔离和完整重答闭环；
  - 本地页面 HTTP 返回 200；当前 Codex 会话无可用浏览器实例，未生成交互截图。
- 根因分类：ENGINEERING / EVAL / DATA / UX。
- 限制：
  - Langfuse 需要在 GitHub/部署环境配置密钥后才能产生线上 Trace；当前只验证未配置降级与脱敏单测；
  - Trace 尚未串起 Retrieval/Decision/Tool 全时间线；
  - 318 条 EvalSample 仍为未校准资产，`EvalAnnotation=0`，不能声称人工一致率；
  - npm audit 仍报告 3 个来自 Next.js 15/PostCSS/Sharp 的 high，自动修复要求升级 Next 16，需单独兼容性任务；
  - 本机到 GitHub 的 HTTPS Git 传输仍被重置，尚未 push。
- 决策：继续。
- 下一项唯一优先任务：V2-005——把每场最多 3 个弱点沉淀为可确认/忽略/到期的结构化状态，并生成下一 Session 的等价题复测。

## 2026-08-17：V2-005 结构化弱点与跨 Session 复测

- 目标：把报告中的文本建议变成用户可控、可追溯、可复测的训练状态。
- 本次改动：
  - 新增 `Weakness`、`TrainingTask` 及 4 组枚举；13 号迁移已在本地 PostgreSQL 演练；
  - 报告完成或重答后，按四维平均分确定性生成最多 3 个弱点；每条绑定来源 Attempt、基线分、扣分依据和改进建议；
  - 新增弱点列表与状态更新 API；用户可确认日期、调整日期或忽略，跨用户访问返回 404；
  - 确认后用固定模板生成同能力、不同场景的等价题，不让模型直接修改训练状态；
  - 到期任务只在相同模块、岗位和难度的新 Session 中插入一次，并以事务抢占；普通题库选择排除内部复测题；
  - 复测回答保存为 `RETEST` Attempt，按同维度基线确定性更新为“未改善 / 改善中 / 已通过”；
  - 报告页展示证据、严重度、状态、复测日期和等价题，并新增 `plan_created`、`retest_completed` 事件。
- 实际证据：
  - 默认测试 26 passed / 3 skipped；启用数据库后 29/29 passed；
  - 数据库闭环覆盖最多 3 条、越权隔离、确认、到期筛选、新 Session 自动插题、`RETEST` 类型和改善状态；
  - TypeScript、ESLint、Next.js 15.5.23 production build 通过；
  - Promptfoo 4/4 passed，Gate 100%；
  - 新 API 已进入生产构建路由表：`/api/reports/[sessionId]/weaknesses`、`/api/weaknesses/[weaknessId]`。
- 限制：
  - 等价题当前为确定性模板重写，尚未用真实用户样本验证题目等价性；
  - 每次新 Session 最多自动插入 1 条到期任务；多条任务按到期时间逐场消费；
  - 当前只有报告页 CRUD 入口，跨报告的统一 Memory 管理台归 V2-008；
  - 本轮是工程闭环验证，不代表训练效果已经通过用户研究。
- 决策：继续。
- 下一项唯一优先任务：V2-009——把追问输出收敛为枚举动作和原因码，补足两轮上限、非法转移和降级回归。
