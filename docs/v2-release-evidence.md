# AI Mock V2 发布证据

> 发布候选：`2.0.0`
>
> 本地验证日期：2026-08-28
>
> 原则：工程门禁与真实用户效果分开陈述；没有数据时明确写 0，不用工程指标替代用户价值。

## 本地门禁

| 门禁 | 结果 | 证据摘要 |
| --- | --- | --- |
| Prisma | PASS | Client 6.19.3 生成成功；PostgreSQL 17 个迁移，无待应用迁移 |
| TypeScript | PASS | `npm run typecheck`，0 error |
| ESLint | PASS | `npm run lint`，0 warning / 0 error |
| 自动化测试 | PASS | 58/58，包含数据库纵向闭环、隔离、幂等、Agent 降级、RAG、Memory、Trace 与 10 题简历生成 |
| 离线 AI Eval | PASS | 冻结集 318 条；Promptfoo 4/4；Hybrid RAG 14 条 Gold Query 的 Recall@5=1.0、MRR@5=0.95238、nDCG@5=0.96429 |
| Production build | PASS | Next.js 15.5.24 standalone 构建成功，32 个静态页面生成完成 |
| 浏览器闭环 | PASS | 登录 → 4 题题库面试 → 受控追问 → 报告；新导航控制台 0 error / 0 warning |
| Secret scan | PASS | Gitleaks Git 历史与发布索引工作区均为 0；真实密钥不进入 Git 与便携包 |
| Dependency audit | PASS | `npm audit --omit=dev`：0 vulnerability |
| Filesystem scan | PASS（有边界） | Trivy High/Critical：0；本地使用 2026-08-17 缓存 DB，GitHub CI 在线更新后复扫 |

## 评测边界

- 318 条冻结评测样本中，人工 Gold 数量仍为 0；它们是版本化回归资产，不代表人工一致率或 Judge 校准已完成。
- 14 条检索 Gold Query 证明当前本地 Hybrid RAG 没有回归；不证明远程 embedding/reranker 已优于本地方案。
- 真实用户试点参与者与有效事件分母仍为 0；当前不能声称完成率、训练改善率或留存已经提升。
- 远程模型、Langfuse 和远程 embedding/reranker 都是显式 opt-in；默认 CI 使用本地确定性 Provider，外部调用为 0。

## GitHub 发布门禁

合入 `main` 后必须补齐以下证据，才能将 V2-022/V2-023 标为完成：

- Security Gates：Dependency Audit、Gitleaks、Trivy 全部成功；
- AI regression evals：冻结集、切片、Hybrid RAG 与 Promptfoo 全部成功；
- Deploy：build、迁移、SSH 发布、PM2 激活与 `/login` 200 健康检查全部成功；
- `v2.0.0` Release：Windows x64 ZIP 小于 100 MiB，独立解压启动成功，并公布 SHA-256。
