# AI Mock V2 执行清单

> 状态：`DONE` 已有验证证据；`DOING` 当前唯一主任务；`TODO` 尚未开始；`BLOCKED` 有明确外部阻塞。

## P0：先证明训练闭环

| ID     | 状态 | 交付物与验收                                                                                               |
| ------ | ---- | ---------------------------------------------------------------------------------------------------------- |
| V2-001 | DONE | 基线、命令、页面/API/表、FR 差距与测试证据见 `v2-baseline.md`                                              |
| V2-002 | DONE | Attempt/Retry/Comparison 契约、2 个兼容迁移、旧评分 Rubric 回填和事件命名                                  |
| V2-003 | DONE | retry attempt 追加写；原答不覆盖；所有权、幂等与并发数据库用例通过                                         |
| V2-004 | DONE | 同 Rubric 分维度 delta；版本不同返回 409；报告页可立即重答并展示变化                                       |
| V2-005 | DONE | 最多 3 个证据化 Weakness；确认/忽略/到期；等价题跨 Session 复测；29/29 DB 测试通过                         |
| V2-009 | DONE | 严格 `DEEPEN/CHALLENGE/NEXT/STOP` + 5 个原因码；只读 Tool 白名单、低置信度降级和两轮上限均有回归           |
| V2-010 | DONE | PostgreSQL Run/Step 时间线、版本/成本/延迟/fallback、所有者回放 API；Bad Case 可关联 Trace、根因与回归用例 |
| V2-011 | DONE | 跨用户隔离、Prompt Injection、Trace 脱敏、模型/Tool 超时和成本上限降级通过测试                             |
| V2-012 | DONE | 固定漏斗事件、白名单事件 API、去标识导出、知情说明、任务/访谈/样本/决策模板齐全；真实试点尚未执行          |

## P1：内容质量与个性化

| ID     | 状态 | 交付物与验收                                                                                              |
| ------ | ---- | --------------------------------------------------------------------------------------------------------- |
| V2-006 | DONE | `InterviewPattern` + 摄取审计；来源/许可/标签/哈希/质量/更新时间、判重/拒收原因、导入与审计脚本齐全       |
| V2-007 | DONE | 已确认用户证据域 + 审核面试知识域独立/联合检索；来源、分数、过滤器、Trace、零召回/超时降级齐全            |
| V2-008 | DONE | Fact/Preference/Weakness/TrainingState/Temporary 分离；来源、置信度、过期、CRUD、隔离、拒绝墓碑与级联删除 |
| V2-013 | TODO | Promptfoo 4 条合成回归 + CI 100% Gate 已完成；仍需转换 318 样本并补人工标注协议                           |
| V2-014 | TODO | 合并远端 Hybrid RAG 的 embedding/reranker/source-quality 模块，逐文件审查而非覆盖                         |

## 本轮交付顺序

1. `DONE`：V2-002～012，已打通首答 → 重答 → 弱点复测，并补齐受控 Agent、Trace/Bad Case、安全降级、面经合同、双域检索、Memory 与试点工程包。
2. `NEXT`：V2-013，把 318 条历史样本转换为版本化评测集，建立人工标注协议和分切片 Gate。
3. `THEN`：V2-014，逐文件审查远端 Hybrid RAG 的 embedding/reranker/source-quality 模块，用 Gold Query 对比后再合并。
4. `VALIDATE`：按 `v2-pilot-research-pack.md` 招募真实用户执行 V2-012 试点；当前导出分母为 0，不声称用户效果。
