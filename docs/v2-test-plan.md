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

## P0 退出条件

- 首答与至少一次重答均可回看，原文不被覆盖。
- 同版本对比准确；异版本明确拒绝。
- API 权限、重复请求、并发请求和评分失败场景有回归测试。
- 关键运行步骤有脱敏 Trace，日志不复制完整简历或回答。
- 至少完成一轮目标用户任务；开发/种子数据只用于工程验证。
