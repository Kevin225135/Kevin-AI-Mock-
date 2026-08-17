# AI Mock V2 测试与发布门槛

## 自动化层级

| 层级        | 必测内容                                                                |
| ----------- | ----------------------------------------------------------------------- |
| 单元        | Attempt 编号、Rubric 可比性、dimension delta、Weakness 状态、脱敏/哈希  |
| 仓储/数据库 | 旧数据回填、不可覆盖、幂等键、并发重答、级联删除、跨用户隔离            |
| API         | 未登录/越权、非法父 Attempt、重复提交、版本不一致、模型失败后数据仍保留 |
| 端到端      | 首答 → 报告 → 重答 → 对比 → 弱点 → 新 Session 复测                      |
| 离线评测    | Retrieval、Decision、Scoring 分模块；真实与合成样本分开报告             |

## 当前 Gate

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`
- Prisma `validate` 与 `migrate status`
- 新迁移先在开发库演练，确认旧 Answer 数量和内容不变
- 任何 Comparison 必须具备相同且可追溯的 Rubric 版本
- 任何用户效果结论必须报告样本、分母、版本、人工协议与限制

## V2-005 验证结果（2026-08-17）

- 纯函数：弱点按分数排序且最多 3 条；等价题不得与原题相同；复测阈值覆盖未改善/改善中/已通过。
- 数据库：确认/忽略状态、跨用户 404、到期筛选、事务抢占、`RETEST` Attempt 和结果回写。
- 跨 Session：到期任务自动成为相同模块/岗位/难度新 Mock 的第一题；普通选题排除内部复测题。
- Gate：`typecheck`、`lint`、29/29 DB tests、production build、Promptfoo 4/4 全部通过。
- 未覆盖：真实用户对“等价性”和训练效果的人工判断；归入 V2-012/013。

## V2-006～012 验证结果（2026-08-17）

- 数据迁移：新增 `MemoryItem`、`InterviewPattern`、摄取审计、`TraceRun/TraceStep`、`BadCase`，并把用户事件改为级联删除；本地 PostgreSQL 共 16 个迁移，状态同步。
- 面经审计：208 条内部题目全部为 `INTERNAL/APPROVED`，208 条摄取审计为 `ACCEPTED`；来源/岗位/能力标签缺失均为 0，非法发布为 0。
- 单元/数据库：45/45 通过；覆盖严格 Agent 枚举与低置信度降级、注入、脱敏、成本/超时、面经拒收/判重、双域零召回/超时、Memory 污染/越权/删除、Trace 回放/越权和账户级联。
- 事件：事件名白名单通过；retry/feedback/plan/retest 使用固定命名。试点导出脚本在当前窗口观测到 0 名参与者，所有比率为 `null`，未生成用户效果结论。
- Gate：`typecheck`、`lint`、Promptfoo 4/4、Next.js 生产构建全部通过。
- 未覆盖：真实用户访谈、人工 Gold Query/Judge 校准、等价题迁移效果；分别进入真实试点和 V2-013。

## V2-013～014 验证结果（2026-08-17）

- 冻结数据集：`ai-mock-v2-legacy@1.0.0` 共 318 条，SHA-256 为 `d89cbd566f4ea8e55449d4c6cb15698197081ffca0567e981e2cf709855f6bc1`；TRAIN/VALIDATION/TEST 为 219/49/50，五类 category 在三个 split 均有覆盖，96 条重复内容没有跨 split 泄漏。
- 标签边界：314 条 legacy synthetic + 4 条 curated reference 全部为 `REFERENCE_ONLY`，人工 Gold 为 0；验证器和评测输出把人工一致率显示为 `PENDING`，标注协议规定双盲、四维证据与第三人仲裁阈值。
- 自动评测：冻结文件评测与 Promptfoo 4/4 通过；总体 Schema 1.0、追问 1.0、安全 1.0、幻觉率 0。总体/类别/TEST 为阻断切片，模块及 TRAIN/VALIDATION 在人工校准前为诊断切片。
- Retrieval：14 条双语 Gold Query、463 条知识条目；本地 fallback 下 Hybrid Recall@5=1.0、MRR@5=0.95238、nDCG@5=0.96429，Recall@5 不低于 legacy，P95 低于 35ms，外部调用为 0。该结果证明非回退，不声称优于 legacy 或线上效果提升。
- 工程 Gate：17 个 Prisma 迁移同步；`typecheck`、`lint`、52/52（含数据库）tests、`eval:ci` 和 Next.js 15.5.23 production build 全部通过。
- 安全基线：`npm audit --omit=dev` 仍报告 Next.js 间接依赖 PostCSS/Sharp 的 3 个 high，自动修复需要破坏性升级 Next 16；本机未安装 Gitleaks。本轮未擅自升级或豁免，分别进入独立 hardening 任务。
- 未覆盖：真人双盲标注、远端 embedding/reranker 质量与成本、真实用户试点、线上 Trace，以及 Next 16 兼容性升级。

## V2-015 验证结果（2026-08-17）

- 合同：前端和 API 共用 `MIN/DEFAULT/MAX_MOCK_QUESTIONS=1/3/10`；Schema 接受 10，拒绝 0 和 11。
- 检索：同一能力从证据核验、方案取舍、结果验证三个角度生成候选；稀疏 Software Engineer 简历请求 10 题时返回 10 道唯一问题，四类能力均被覆盖且每题至少有一条证据。
- 回归：57/57 含数据库测试、TypeScript、ESLint 和 production build 通过；LLM 将多题改写为重复 Prompt 时，后续题回退原始唯一问题。
- UI：Playwright 0.1.18 从默认 3 连续增加至 10；显示值为 10，增加按钮在上限正确禁用。主页和知识库 API 均返回 200；未登录的 `/api/auth/me`、`/api/resumes` 返回预期 401，另有既存 favicon 404。
- 运行：重新生成 standalone build 并在 `http://localhost:3000` 启动；不修改数据库 Schema。

## P0 退出条件

- 首答与至少一次重答均可回看，原文不被覆盖。
- 同版本对比准确；异版本明确拒绝。
- API 权限、重复请求、并发请求和评分失败场景有回归测试。
- 关键运行步骤有脱敏 Trace，日志不复制完整简历或回答。
- 至少完成一轮目标用户任务；开发/种子数据只用于工程验证。
