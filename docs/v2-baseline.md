# AI Mock V2 工程基线

> 基线日期：2026-08-17  
> 本地基线提交：`66b0244`（`v2-local`）  
> 远端：`https://github.com/Kevin225135/Kevin-AI-Mock-.git`  
> 远端 `main` 已核验最新提交：`d4301b4`（2026-07-29）

## 1. 可复现位置与版本

- 仓库绝对路径：`C:\Users\TianT\OneDrive\Desktop\AI面试助手`
- 包管理器：npm 11.9.0，锁文件 `package-lock.json`
- Node.js：v24.14.0
- Next.js：15.5.22（锁文件实际安装版本）
- Prisma CLI：6.19.3；PostgreSQL；10 个迁移
- 队列：BullMQ + Redis；`ASYNC_SCORING=true` 时使用评分队列
- 本地分支：`v2-local`

本地目录比远端 `main` 更新，包含 7 月 31 日隐私迁移、隐私页面/接口、更多测试以及本 V2 规格；远端则包含本地缺少的 7 月 29 日 Hybrid RAG 文件。两边不能通过覆盖目录合并。当前 HTTPS Git 传输在本机网络被重置，因此先以本地快照开发，待连接恢复后再按文件审查合并远端模块。

## 2. 安装、校验与运行命令

PowerShell 执行策略会拦截 `npm.ps1`，本机使用 `npm.cmd`：

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Prisma 默认不会读取 `.env.local`。迁移检查需先仅把 `DATABASE_URL` 注入当前进程，不打印值：

```powershell
$dbLine = Get-Content .env.local | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$env:DATABASE_URL = $dbLine.Substring($dbLine.IndexOf('=') + 1).Trim('"')
node_modules\.bin\prisma.cmd validate
node_modules\.bin\prisma.cmd migrate status
```

2026-08-17 结果：

| 检查 | 结果 |
|---|---|
| TypeScript | 通过 |
| ESLint（0 warning） | 通过 |
| Node Test | 18/18 通过 |
| Prisma schema | 通过 |
| 数据库迁移 | 10/10 已应用，schema up to date |
| Next.js 生产构建 | 通过，30 个静态/动态路由完成生成 |

## 3. 当前资产清单

| 资产 | 数量/入口 | 说明 |
|---|---:|---|
| 页面 | 14 | 首页、登录注册、Mock、报告、历史、进度、知识库、账户/隐私、后台等 |
| API Route | 27 | Auth、Session/Answer、Report、Resume、Knowledge、Progress、Admin 等 |
| Prisma Model | 17 | User、Resume、MockSession、Answer、AiScore、RubricVersion、Event、Eval 等 |
| 自动化测试 | 10 个文件 / 18 个用例 | 追问、Rubric、Auth、题库、RAG、隐私 |
| 评分队列 | 1 | `src/workers/scoring-worker.ts` |
| 评测入口 | 3 | seed、run、annotate |

数据库仅作为开发基线，不代表真实用户效果：5 users、13 sessions、1 completed session、1 report、318 EvalSample、0 EvalAnnotation、463 KnowledgeEntry、10 RagRetrievalTrace。由于人工标注为 0，不得声称评分一致率已验证。

## 4. V2 需求差距

| 规格 | 当前状态 | 证据/差距 |
|---|---|---|
| FR-001 用户证据确认 | 部分存在 | 有简历解析与来源关联；缺逐条确认/未知/个人与团队边界 |
| FR-002 受控 Workflow | 部分存在 | 主链路与最多两轮追问已存在；未形成显式状态契约与决策 Trace |
| FR-003 证据化反馈 | 部分存在 | 有 RAG 引用；评分反馈未逐条关联证据或“材料未提供” |
| FR-004 立即重答 | 缺失 | `Answer` 的唯一键只允许每题每轮一条记录，会覆盖/复用原答 |
| FR-005 前后对比 | 缺失 | 无 Attempt 版本、同 Rubric 约束和 dimension delta |
| FR-006 弱点状态 | 缺失 | 历史进度只有聚合分数，无结构化 Weakness 生命周期 |
| FR-007 定向复测 | 缺失 | 无等价题任务与复测状态 |
| FR-008 基础 Trace | 部分存在 | 有 Retrieval Trace/Event；无统一 Run/Model/Decision/Tool 时间线 |
| FR-009 用户验证事件 | 部分存在 | 开始、回答、评分、完成、报告、反馈已埋；缺重答/采纳/计划/复测 |
| FR-010 隐私控制 | 部分存在 | 有简历/账号删除与保留策略；尚未覆盖未来 Memory/Trace 派生数据 |

## 5. 最小阻塞项

1. `Answer` 唯一键不支持 Attempt，需要兼容旧数据的迁移。
2. `AiScore` 虽关联 `RubricVersion`，领域返回值未暴露版本，无法安全对比。
3. 318 条评测样本尚无人工标注，质量门槛只能先做结构/回归 Gate。
4. GitHub HTTPS 传输不可用；Secrets 页面需要用户登录，密钥不得通过聊天或仓库传递。

