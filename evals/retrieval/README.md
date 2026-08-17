# Hybrid RAG Gold Query Gate

`gold-queries.v1.json` 使用 14 条中英双语原子查询，对 463 条本地知识条目比较旧 vector-keyword 排序与新 RRF + reranker + source-quality 排序。

```powershell
npm.cmd run eval:retrieval
```

CI 强制本地 hash embedding 与本地 reranker，不调用外部模型。报告包含 Recall@5、MRR@5、nDCG@5、P95、provider 和 degradation；启用远端 embedding/reranker 后必须另存 provider/model 版本结果，不能覆盖本地基线。
