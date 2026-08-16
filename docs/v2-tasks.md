# AI Mock V2 执行清单

> 状态：`DONE` 已有验证证据；`DOING` 当前唯一主任务；`TODO` 尚未开始；`BLOCKED` 有明确外部阻塞。

## P0：先证明训练闭环

| ID | 状态 | 交付物与验收 |
|---|---|---|
| V2-001 | DONE | 基线、命令、页面/API/表、FR 差距与测试证据见 `v2-baseline.md` |
| V2-002 | DONE | Attempt/Retry/Comparison 契约、2 个兼容迁移、旧评分 Rubric 回填和事件命名 |
| V2-003 | DONE | retry attempt 追加写；原答不覆盖；所有权、幂等与并发数据库用例通过 |
| V2-004 | DONE | 同 Rubric 分维度 delta；版本不同返回 409；报告页可立即重答并展示变化 |
| V2-005 | TODO | 每场最多 3 个 Weakness；确认/忽略/到期；等价题复测 |
| V2-009 | TODO | 追问只输出枚举动作和原因码；两轮上限与降级回归 |
| V2-010 | DOING | 已完成重答评分 Run ID、脱敏 TraceSink/Langfuse 适配；仍需覆盖检索—决策—Tool 全时间线与回放 |
| V2-011 | TODO | 权限隔离、Prompt Injection、脱敏、超时/成本降级测试 |
| V2-012 | TODO | `retry_started/completed`、`feedback_adopted`、`plan_created`、`retest_completed` 事件与试点研究包 |

## P1：内容质量与个性化

| ID | 状态 | 交付物与验收 |
|---|---|---|
| V2-006 | TODO | 面经来源、许可、标签、去重哈希、质量状态、更新时间字段与清洗报告 |
| V2-007 | TODO | 用户证据域 + 面试知识域独立/联合检索；来源、分数、过滤器、零召回降级 |
| V2-008 | TODO | Fact/Preference/Weakness/TrainingState 分离；来源、置信度、CRUD、隔离与级联删除 |
| V2-013 | DOING | Promptfoo 4 条合成回归 + CI 100% Gate 已完成；仍需转换 318 样本并补人工标注协议 |
| V2-014 | TODO | 合并远端 Hybrid RAG 的 embedding/reranker/source-quality 模块，逐文件审查而非覆盖 |

## 本轮交付顺序

1. V2-002～004：首答 → 重答 → 同版本对比。
2. V2-010/013：TraceSink + Promptfoo 回归基线。
3. V2-005/008：弱点状态 → 跨 Session 定向复测 → 可编辑/删除 Memory。
4. V2-006/007/014：清洗合同 → 双域检索 → 质量评测。
5. V2-012：小规模真实用户验证；不以种子数据代替用户效果。
