# Promptfoo 评测基线

运行：

```powershell
npm.cmd run eval:promptfoo
```

该配置只调用本地确定性评分器，不需要模型密钥。当前 4 条均为 `synthetic-regression`，用于 Schema、分数带和模块 Rubric 回归，不代表人工一致率或真实用户效果。

历史 318 条样本现已冻结为 `ai-mock-v2-legacy@1.0.0`，来源、稳定切分、内容哈希和分切片 Gate 见 `evals/datasets/`。其中 314 条仍是 legacy synthetic，人工 Gold 数为 0；双盲标注完成前，人工一致率继续报告为 `PENDING/null`。

CI 使用 `PROMPTFOO_PASS_RATE_THRESHOLD=100`，任一用例失败都会阻断合并。
