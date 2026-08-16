# Promptfoo 评测基线

运行：

```powershell
npm.cmd run eval:promptfoo
```

该配置只调用本地确定性评分器，不需要模型密钥。当前 4 条均为 `synthetic-regression`，用于 Schema、分数带和模块 Rubric 回归，不代表人工一致率或真实用户效果。318 条数据库样本需先补齐来源标签与人工标注协议，再进入冻结评测集。

CI 使用 `PROMPTFOO_PASS_RATE_THRESHOLD=100`，任一用例失败都会阻断合并。

