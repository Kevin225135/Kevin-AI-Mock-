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

