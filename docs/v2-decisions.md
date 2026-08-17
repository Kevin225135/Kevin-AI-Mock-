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

| 项目            | 决策                                                          | 阶段    |
| --------------- | ------------------------------------------------------------- | ------- |
| Langfuse JS SDK | 通过 TraceSink 条件接入                                       | P0      |
| Promptfoo       | 固化评测集、CI Gate 与红队用例                                | P0      |
| XState          | 仅在 Weakness/Retest 状态复杂度达到阈值后做小范围试验         | P1 条件 |
| pgvector        | 复用现有 PostgreSQL；先全文/混合检索，数据证明需要后再启 HNSW | P1 条件 |
| Mem0            | 仅 PoC，与自建结构化 Memory 做召回/删除正确性对比             | P2      |

## ADR-007：弱点建议与训练状态分离

- 状态：接受
- 决策：评分结果只能生成 `PROPOSED` 弱点；只有用户确认后才能创建 `TrainingTask`。到期抢占、复测 Attempt 类型和结果状态由数据库事务与固定阈值更新。
- 不变量：每个 Session 最多 3 个弱点；每条弱点必须绑定来源 Attempt；普通题库不得抽到内部复测题；同一到期任务只能被一个新 Session 抢占。
- 复测阈值：低于或等于基线为 `NOT_IMPROVED`；高于基线但未稳定达到 4/5 为 `IMPROVING`；高于基线且达到 4/5 为 `PASSED`。
- 原因：将模型诊断与用户训练状态解耦，避免模型未经确认持久化“记忆”或伪造改善结论。

## ADR-008：有限 Agent 只建议，Workflow 决定状态

- 状态：接受
- 决策：追问输出只允许 `DEEPEN/CHALLENGE/NEXT/STOP` 和 `MISSING_EVIDENCE/VAGUE_OWNERSHIP/METRIC_UNCLEAR/OFF_TOPIC/COMPLETE`；最多两轮。
- Tool：只允许 `retrieve_candidate_evidence`、`retrieve_interview_patterns`、`get_training_memory`、`none`。Tool 只读，状态更新仍由服务层完成。
- 降级：非法/低置信度输出、Tool 超时/错误和成本越界退回确定性规则或审核题库，并写 Trace。

## ADR-009：面经先过摄取审计，再进入检索

- 状态：接受
- 决策：面经记录来源、采集方式、许可、岗位/公司/能力/项目标签、去重哈希、质量分、拒收原因和更新时间；每次摄取另存 `ACCEPTED/UPDATED/DUPLICATE/REJECTED` 审计。
- 发布门槛：只有允许的许可状态、质量通过、无 Prompt Injection 且明确发布的记录可检索。许可不明的数据不得因“公开可见”自动晋升。

## ADR-010：双域检索不混淆材料线索与已确认事实

- 状态：接受
- 决策：用户证据域只返回当前用户、`CONFIRMED`、未过期的 Fact；面试知识域只返回已审核面经。两域分别返回 ID、分数和过滤器，再组成统一 Trace。
- 事实边界：简历原文标记为 `UNCONFIRMED`，只能用于请求用户确认；只有已确认 Memory 可作为事实进入个性化上下文。零召回和超时必须显式降级。

## ADR-011：结构化 Memory 由来源和所有者约束

- 状态：接受
- 决策：Fact/Preference 可由用户创建和修改；Weakness/TrainingState 只由确定性 Workflow 更新；所有 Memory 记录来源、置信度、状态、版本和过期时间。
- 删除：普通 Memory 物理删除；Workflow Memory 删除后写入不含敏感内容的拒绝墓碑，阻止后台静默重建；账户删除通过外键级联清除全部 Memory。

## ADR-012：Trace 与产品效果证据分层

- 状态：接受
- 决策：数据库 Trace 保存 Retrieval/Model/Score/Decision/Tool/Output 步骤、版本、用量、成本、延迟和降级，只存引用、哈希和脱敏摘要。Bad Case 可绑定 Run、根因标签和回归用例。
- 证据边界：工程 Gate 通过不等于用户改善。试点导出在分母为 0 时返回 `null`；真实参与者、访谈和复测完成前不发布效果数字。

## ADR-013：冻结评测集与人工 Gold 分层

- 状态：接受
- 决策：历史 `EvalSample` 通过 `EvalDatasetVersion` 固定名称、版本、Rubric、内容哈希、来源和 TRAIN/VALIDATION/TEST 切分；冻结后只读，任何内容或标签变化都创建新版本。重复内容保留历史口径，但整个重复组只能进入同一 split。
- 标签边界：314 条模板样本与 4 条历史 curated reference 均标记为 `REFERENCE_ONLY`，不得称为人工 Gold。只有两名独立盲标完成且无需仲裁，或第三人仲裁完成后，才能升级标签状态并报告人工一致率。
- Gate：CI 从仓库内冻结文件运行，不依赖可变数据库；总体、类别和 TEST 为阻断切片，TRAIN/VALIDATION、模块和岗位在首轮人工校准前只作诊断。

## ADR-014：Hybrid RAG 外部能力显式启用

- 状态：接受
- 决策：知识检索先独立取得 PostgreSQL 全文与向量候选，用 RRF 合并，再结合 reranker、来源权威度、过期时间和新鲜度形成最终排序。远端 embedding/reranker 必须通过环境变量显式启用且具备密钥；缺失配置、超时或异常时回退确定性本地实现并返回 provider/degraded 状态。
- 数据一致性：知识条目的向量模型必须与查询 embedding provider/model 一致；切换 provider 后必须重建向量并重新运行版本化 Gold Query，不能用不同 provider 的向量混合声称语义收益。
- 验收边界：V2-014 要求 Hybrid Recall@5 不低于旧排序，并报告 MRR@5、nDCG@5、P95 与 provider；非回退证明可合并，不等于已经证明线上效果提升。
