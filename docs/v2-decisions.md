# AI Mock V2 决策记录

## ADR-001：确定性 Workflow 为骨架

- 状态：接受
- 决策：Session、Turn、Attempt、Retry、Comparison、Weakness、Retest 的状态转移由服务层和数据库约束控制。模型只能给出受限决策、文本诊断或 Tool 建议。
- 原因：保证可恢复、可测试、可幂等；避免模型自行修改业务状态。

## ADR-002：在现有 API 上演进，不复制 `/api/v2`

- 状态：接受
- 决策：沿用现有 Session/Report 权限与仓储层；新增 Attempt 相关子资源。规格中的 `/api/v2` 仅作为逻辑边界，不创建第二套平行领域模型。
- 原因：当前已有 27 个 Route 和稳定鉴权，复制会造成数据/权限分叉。

## ADR-003：Answer 演进为不可覆盖的 Attempt

- 状态：接受
- 决策：为 `Answer` 增加 `attemptNo`、`attemptKind`、`parentAnswerId`；旧数据回填为 `INITIAL/1`；唯一键改为 `(sessionId, questionId, followUpRound, attemptNo)`。
- 不变量：首次回答不更新；重答追加新行；同一个父 Attempt 的编号单调递增；跨用户不可读写。
- 兼容：现有主流程仍写入第 1 次 Attempt，报告默认展示每个 Turn 的最新 Attempt，并保留历史。

## ADR-004：仅同 Rubric 版本直接比较

- 状态：接受
- 决策：Comparison 必须检查两条 `AiScore.rubricVersionId` 相同且非空；否则返回 `RUBRIC_VERSION_MISMATCH`，不计算伪精确 delta。
- 输出：原文、总分变化、四维变化、已改善维度、仍待改进维度、Rubric 版本。

## ADR-005：Trace 默认只存引用、哈希与脱敏摘要

- 状态：接受
- 决策：先定义应用内 `TraceSink`，业务代码不直接依赖某个观测供应商。原始简历和完整回答继续留在受控业务表。
- 开源接入：Langfuse 作为可选适配器；未配置时使用 no-op/数据库事件，不阻塞主链路。

## ADR-006：开源资源分级

| 项目 | 决策 | 阶段 |
|---|---|---|
| Langfuse JS SDK | 通过 TraceSink 条件接入 | P0 |
| Promptfoo | 固化评测集、CI Gate 与红队用例 | P0 |
| XState | 仅在 Weakness/Retest 状态复杂度达到阈值后做小范围试验 | P1 条件 |
| pgvector | 复用现有 PostgreSQL；先全文/混合检索，数据证明需要后再启 HNSW | P1 条件 |
| Mem0 | 仅 PoC，与自建结构化 Memory 做召回/删除正确性对比 | P2 |

## ADR-007：弱点建议与训练状态分离

- 状态：接受
- 决策：评分结果只能生成 `PROPOSED` 弱点；只有用户确认后才能创建 `TrainingTask`。到期抢占、复测 Attempt 类型和结果状态由数据库事务与固定阈值更新。
- 不变量：每个 Session 最多 3 个弱点；每条弱点必须绑定来源 Attempt；普通题库不得抽到内部复测题；同一到期任务只能被一个新 Session 抢占。
- 复测阈值：低于或等于基线为 `NOT_IMPROVED`；高于基线但未稳定达到 4/5 为 `IMPROVING`；高于基线且达到 4/5 为 `PASSED`。
- 原因：将模型诊断与用户训练状态解耦，避免模型未经确认持久化“记忆”或伪造改善结论。
