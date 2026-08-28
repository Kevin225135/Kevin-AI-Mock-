# Versioned evaluation datasets

`v2-legacy-318-v1.jsonl` 是从本地 PostgreSQL 历史 `EvalSample` 转换的冻结快照，manifest 记录版本、Rubric、SHA-256、来源和切片计数。

```powershell
npm.cmd run eval:dataset:verify
npm.cmd run eval:run
```

冻结集包含 96 条重复内容行；重复组被保留以维持 318 条历史口径，但同一内容哈希只会进入一个 split，防止 TRAIN/TEST 泄漏。314 条模板样本和 4 条 curated reference 均不是人工 Gold。

人工标注流程见 `docs/v2-eval-annotation-protocol.md`。修改样本、split 或 label status 时必须创建新版本，不覆盖本文件。
