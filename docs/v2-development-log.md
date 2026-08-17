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

## 2026-08-17：V2-006～012 可治理训练系统

- 目标：在训练闭环上补齐面经治理、双域检索、结构化 Memory、有限 Agent、可回放 Trace、安全降级和真实试点准备。
- 本次改动：
  - 新增 `InterviewPattern` 和摄取审计，导入时评估许可、标签、质量、Prompt Injection 与去重哈希；提供导入/清洗审计命令；
  - 新增当前用户已确认 Fact + 审核面经的双域检索，返回来源、分数、过滤器、Trace ID 与零召回/超时原因；简历材料保持未确认标记；
  - 新增 Fact/Preference/Weakness/TrainingState/Temporary Memory 合同、账户管理 UI 和 CRUD API；Workflow 状态不可由模型修改，用户删除不会被后台静默恢复；
  - 追问收敛为 4 个动作、5 个原因码、3 个只读 Tool 和两轮上限；低置信度/非法输出走确定性 fallback；
  - 新增持久化 Run/Step，保存 Retrieval、Model、Score、Decision、Tool、Output、版本、Token/成本、延迟、错误和降级；所有者可通过 `/api/traces/[runId]` 回放；
  - Bad Case 从普通事件升级为正式记录，可绑定 Run、根因标签和回归用例引用；事件不再复制用户评论；
  - 补 Prompt Injection、防越权、敏感字段脱敏、模型/Tool 超时和成本上限；外部事件 API 只接受白名单、登录用户和本人 Session；
  - 固化试点漏斗事件，提供去标识导出、知情说明、任务/访谈脚本、空白样本表、决策模板和停止条件。
- 实际证据：
  - 16 个迁移全部应用且数据库状态同步；
  - 面经审计 208/208 为内部授权且审核通过，缺失来源/岗位/能力标签和非法发布均为 0；
  - 启用数据库后 45/45 tests passed；Promptfoo 4/4；TypeScript、ESLint、Next.js 生产构建全部通过；
  - 试点导出脚本运行成功，当前真实参与者/事件分母为 0，所有率指标为 `null`。
- 限制：
  - 当前面经资产只包含 208 条内部审核题，不包含许可不明的外部抓取内容；
  - 检索仍为 PostgreSQL 元数据 + 词法排序，尚未用人工 Gold Query 证明需要 pgvector/reranker；
  - 工程闭环完成不代表用户已改善；真实试点、访谈、盲评和等价题迁移验证尚未执行；
  - Langfuse 线上导出仍需要部署环境密钥，本地 PostgreSQL Trace 已可用；
  - GitHub HTTPS 传输问题未在本批次重新验证。
- 决策：V2-006～012 工程任务关闭；下一项优先任务为 V2-013（历史样本转换、人工标注协议与分切片评测）。

## 2026-08-17：V2-013～014 版本化评测与 Hybrid RAG

- 目标：把历史评测资产变成可复现、不可冒充人工 Gold 的版本化数据集，并在不覆盖 V2-006～012 治理边界的前提下审查合入远端 Hybrid RAG 模块。
- 本次改动：
  - 新增 `EvalDatasetVersion`、稳定 `sampleKey`、split/source/label/content hash 与双盲标注角色；17 号迁移完成 318 条历史数据回填；
  - 冻结 `ai-mock-v2-legacy@1.0.0` JSONL + manifest，固定 SHA-256、来源与切片；96 条重复内容被保留但没有跨 split 泄漏；
  - 离线评测改为直接读取冻结文件，按总体、类别、模块、岗位和 split 输出；阻断与诊断切片分离；人工标注协议要求两名独立标注员、四维证据和第三人仲裁；
  - 逐文件审查公开远端的 `embedding-provider`、`reranker`、`source-quality` 和 `knowledge-service` 思路，仅移植与本地 Schema/隐私/降级合同兼容的部分；
  - 知识检索增加 PostgreSQL 全文候选、向量候选、RRF、来源权威度/过期/新鲜度与可选 reranker；远端 provider 仍为显式 opt-in，默认确定性本地 fallback；
  - 新增 14 条双语 Gold Query、检索指标脚本和 `eval:ci`，CI 固定本地 provider，保证零外部调用。
- 实际证据：
  - 冻结集 318 条：TRAIN/VALIDATION/TEST=219/49/50，五类 category 全切片覆盖，314 synthetic + 4 curated reference，人工 Gold=0；内容哈希为 `d89cbd566f4ea8e55449d4c6cb15698197081ffca0567e981e2cf709855f6bc1`；
  - 知识库 463 条；Gold Query 的 Hybrid Recall@5=1.0、MRR@5=0.95238、nDCG@5=0.96429，Recall@5 不低于旧排序，P95 低于 35ms；本地 provider、0 次外部调用；
  - `eval:ci` 与 Promptfoo 4/4 通过；`typecheck`、`lint`、52/52 含数据库测试、17 个迁移和 Next.js production build 全部通过；
  - `npm audit --omit=dev` 仍有 3 个 Next.js/PostCSS/Sharp high，自动修复要求 Next 16 破坏性升级；本机未安装 Gitleaks。
- 限制：
  - 当前 318 条全部为 reference-only，标注协议已就绪但真人双盲标注尚未执行，因此不能报告人工一致率或 Judge 校准；
  - 本地 hash embedding 只证明离线可用性和非回退，不等价于真实语义 embedding，也没有证明 Hybrid 优于 legacy；
  - 远端 embedding/reranker 未调用；启用后必须用相同 provider/model 重建知识向量，并另存 Gold Query 结果、成本和延迟；
  - 真实用户试点分母仍为 0，V2-013/014 的工程关闭不代表训练效果已被验证；
  - GitHub CLI 传输仍不可用，本轮只核对公开 raw 源文件，未 push、未部署。
- 根因分类：DATA / EVAL / RETRIEVAL / GOVERNANCE。
- 决策：V2-013 与 V2-014 工程任务关闭；下一项唯一优先任务为执行人工双盲校准子集，然后开展真实用户试点。
