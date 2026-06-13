# 项目规范

## 范围边界

V1 只实现文字 mock、固定题库、rubric 评分、复盘报告和基础埋点。动态追问、语音作答、跨场次雷达图、复杂个性化路径只保留数据结构和扩展入口，不在默认流程中打开。

## 代码组织

- 页面与 API 只做编排，核心业务放在 `src/lib/domain`。
- AI 输出必须先经过 `src/lib/ai/score-schema.ts` 校验，失败重试一次。
- 数据访问必须经由 `AppDataStore` 接口，避免页面/API 直接访问 Prisma。
- 埋点事件统一使用 `src/lib/analytics/events.ts` 中的事件名。
- UI 组件保持小而明确，优先组合现有组件，不引入无业务意义的抽象。

## 命名

- 业务枚举使用数据库一致的大写值：`BEHAVIORAL`、`CV_RELATED`、`TECHNICAL`、`MARKET`。
- Route Handler 返回 JSON 时使用 camelCase。
- 数据表使用 snake_case，由 Prisma `@@map` 映射。

## API 约定

- 输入使用 Zod 校验，失败返回 `400` 和字段错误。
- 业务资源不存在返回 `404`。
- 服务端异常返回 `500`，不要把 provider token、prompt 全量内容写到响应里。
- 创建 session 时记录 `mock_start`；提交答案时记录 `question_answered` 和 `score_generated`；完成时记录 `mock_complete`；打开报告时记录 `report_view`。

## AI 评分

结构化输出字段：

- `dimensions.starCompleteness`
- `dimensions.logicStructure`
- `dimensions.contentDepth`
- `dimensions.communication`
- `totalScore`
- `deductions`
- `improvements`
- `sampleAnswer`
- `reasoning`

维度分为 1 到 5，总分为 0 到 100。LLM provider 必须返回 JSON；本地 scorer 用同一 schema 兜底。

## 前端体验

- 第一屏就是 mock 配置与练习入口，不做营销型落地页。
- 桌面优先，移动端自适应。
- 控件使用清晰的表单、分段选择、图标按钮与状态标签。
- 页面颜色以中性底色为主，使用少量 teal、coral、brass 做信息分层。

## 质量门槛

提交前至少运行：

```bash
npm run typecheck
npm run lint
npm run build
```

涉及 Prisma schema 时补充迁移；涉及评分逻辑时补充 eval sample 或人工样例。
