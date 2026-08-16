# AI Mock V2 测试与发布门槛

## 自动化层级

| 层级 | 必测内容 |
|---|---|
| 单元 | Attempt 编号、Rubric 可比性、dimension delta、Weakness 状态、脱敏/哈希 |
| 仓储/数据库 | 旧数据回填、不可覆盖、幂等键、并发重答、级联删除、跨用户隔离 |
| API | 未登录/越权、非法父 Attempt、重复提交、版本不一致、模型失败后数据仍保留 |
| 端到端 | 首答 → 报告 → 重答 → 对比 → 弱点 → 新 Session 复测 |
| 离线评测 | Retrieval、Decision、Scoring 分模块；真实与合成样本分开报告 |

## 当前 Gate

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`
- Prisma `validate` 与 `migrate status`
- 新迁移先在开发库演练，确认旧 Answer 数量和内容不变
- 任何 Comparison 必须具备相同且可追溯的 Rubric 版本
- 任何用户效果结论必须报告样本、分母、版本、人工协议与限制

## P0 退出条件

- 首答与至少一次重答均可回看，原文不被覆盖。
- 同版本对比准确；异版本明确拒绝。
- API 权限、重复请求、并发请求和评分失败场景有回归测试。
- 关键运行步骤有脱敏 Trace，日志不复制完整简历或回答。
- 至少完成一轮目标用户任务；开发/种子数据只用于工程验证。

