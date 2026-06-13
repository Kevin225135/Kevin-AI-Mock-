# AI Mock 面试教练

基于需求文档创建的 V1 项目骨架：Next.js + TypeScript + Tailwind CSS + Prisma，预留 Redis/BullMQ AI Worker，默认提供本地 rubric 评分以便无外部服务时跑通闭环。

## V1 闭环

- 选择模块、岗位、难度与题量
- 创建 mock session 并返回固定题库题目
- 文本作答，每题一问一答
- 基于 rubric 输出结构化评分 JSON
- 生成复盘报告、逐题反馈、改进建议、范例答案
- 记录 `mock_start`、`question_answered`、`score_generated`、`report_view`、`mock_complete`

## 本地启动

```bash
npm install
npm run dev
```

然后访问 `http://localhost:3000`。

没有配置 `DATABASE_URL` 时，应用使用内存数据仓库，适合快速体验；配置 PostgreSQL 后可执行：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## 常用脚本

- `npm run dev`：启动 Next.js 开发服务
- `npm run build`：生产构建
- `npm run lint`：代码规范检查
- `npm run typecheck`：TypeScript 类型检查
- `npm run worker:score`：启动预留的 BullMQ 评分 worker

## 目录

- `src/app`：页面与 Route Handlers
- `src/components`：前端组件
- `src/lib/domain`：核心业务流程与类型
- `src/lib/ai`：评分 schema、prompt 与 scorer
- `src/lib/repositories`：数据访问接口、内存仓库、Prisma 仓库
- `src/lib/analytics`：埋点事件定义
- `src/workers`：异步 worker 入口
- `prisma`：数据库 schema 与 seed
- `docs`：项目规范与架构说明
