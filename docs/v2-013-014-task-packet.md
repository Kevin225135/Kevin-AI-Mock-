# V2-013 / V2-014 任务包

## Outcome

- V2-013：现有 318 条历史 `EvalSample` 成为有固定版本、来源、内容哈希和稳定切分的离线评测集；自动 Gate 按类别、模块、岗位和 split 报告，人工结论只来自双盲标注。
- V2-014：远端 Hybrid RAG 的 embedding、RRF/reranker 与 source-quality 能力经逐文件审查后进入当前 V2 分支，并由版本化 Gold Query 证明不劣于旧检索。

## Relevant context

- 数据：`eval_samples=318`，其中 314 条为 `generated:*`，4 条为历史 curated reference；`eval_annotations=0`。
- 当前评测：`scripts/run-evals.ts` 直接读取数据库，并错误地把 legacy reference score 描述成人工一致率。
- 当前检索：`src/lib/knowledge/knowledge-service.ts` 使用本地 hash embedding + 关键词加权；尚无来源时效、RRF 或 reranker。
- 远端来源：`https://github.com/Kevin225135/Kevin-AI-Mock-/tree/main/src/lib/knowledge` 与 `20260729030000_hybrid_rag_quality`。

## Constraints

- 必须保留所有 318 条历史样本，不把合成标签冒充人工 Gold。
- 数据切分、样本 ID、内容哈希和 Gate 必须可重复。
- 外部 embedding/reranker 必须显式启用；缺密钥、超时或异常时使用确定性本地降级。
- 只迁入经当前 V2 Schema、隐私和 Trace 边界审查过的文件，不覆盖本地 V2-006～012。
- 不部署、不推送远端、不调用付费模型。

## Acceptance

1. 冻结数据集恰好 318 条，样本 ID/哈希唯一，TRAIN/VALIDATION/TEST 与五类 category 均有覆盖。
2. 自动评测从冻结文件运行，输出总体和分切片指标；人工一致率在无双盲标注时明确为 `PENDING`。
3. 人工协议要求两名独立标注员、四维评分、证据、追问动作；维度分歧超过 1 分或总分差超过 10 分进入第三人仲裁。
4. Hybrid RAG 支持显式远端 embedding、RRF、reranker、来源权威度/时效与本地 fallback。
5. Gold Query 报告 Recall@5、MRR@5、nDCG@5、P95，并且 Hybrid Recall@5 不低于旧基线。
6. Prisma 迁移、单元/数据库测试、Promptfoo、TypeScript、ESLint 和生产构建通过。

## Risks

- 历史 318 条以模板生成样本为主，只能证明工程回归，不能证明 Judge 与真人一致。
- Hash embedding 是可用性 fallback，不等价于真实语义 embedding；Gold Query 结果需按 provider 分开解释。
- 当前 Git HTTPS 无法访问 GitHub，远端来源通过公开 raw 文件核对，最终 push 仍是独立动作。

## Return contract

- 列出变更文件、迁移与数据集版本。
- 列出所有命令、通过结果和未覆盖风险。
- 只有证据齐全后才把 V2-013 / V2-014 改为 `DONE`。
