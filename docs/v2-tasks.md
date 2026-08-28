# AI Mock V2 执行清单

> 状态：`DONE` 已有验证证据；`DOING` 当前唯一主任务；`TODO` 尚未开始；`BLOCKED` 有明确外部阻塞。

## P0：先证明训练闭环

| ID     | 状态 | 交付物与验收                                                                                               |
| ------ | ---- | ---------------------------------------------------------------------------------------------------------- |
| V2-001 | DONE | 基线、命令、页面/API/表、FR 差距与测试证据见 `v2-baseline.md`                                              |
| V2-002 | DONE | Attempt/Retry/Comparison 契约、2 个兼容迁移、旧评分 Rubric 回填和事件命名                                  |
| V2-003 | DONE | retry attempt 追加写；原答不覆盖；所有权、幂等与并发数据库用例通过                                         |
| V2-004 | DONE | 同 Rubric 分维度 delta；版本不同返回 409；报告页可立即重答并展示变化                                       |
| V2-005 | DONE | 最多 3 个证据化 Weakness；确认/忽略/到期；等价题跨 Session 复测；29/29 DB 测试通过                         |
| V2-009 | DONE | 严格 `DEEPEN/CHALLENGE/NEXT/STOP` + 5 个原因码；只读 Tool 白名单、低置信度降级和两轮上限均有回归           |
| V2-010 | DONE | PostgreSQL Run/Step 时间线、版本/成本/延迟/fallback、所有者回放 API；Bad Case 可关联 Trace、根因与回归用例 |
| V2-011 | DONE | 跨用户隔离、Prompt Injection、Trace 脱敏、模型/Tool 超时和成本上限降级通过测试                             |
| V2-012 | DONE | 固定漏斗事件、白名单事件 API、去标识导出、知情说明、任务/访谈/样本/决策模板齐全；真实试点尚未执行          |

## P1：内容质量与个性化

| ID     | 状态 | 交付物与验收                                                                                              |
| ------ | ---- | --------------------------------------------------------------------------------------------------------- |
| V2-006 | DONE | `InterviewPattern` + 摄取审计；来源/许可/标签/哈希/质量/更新时间、判重/拒收原因、导入与审计脚本齐全       |
| V2-007 | DONE | 已确认用户证据域 + 审核面试知识域独立/联合检索；来源、分数、过滤器、Trace、零召回/超时降级齐全            |
| V2-008 | DONE | Fact/Preference/Weakness/TrainingState/Temporary 分离；来源、置信度、过期、CRUD、隔离、拒绝墓碑与级联删除 |
| V2-013 | DONE | 318 条历史样本冻结为 `ai-mock-v2-legacy@1.0.0`；稳定切分/哈希、双盲标注协议和总体/类别/模块/岗位/split Gate 齐全；人工 Gold 仍为 0 |
| V2-014 | DONE | 逐文件审查并合入 embedding/RRF/reranker/source-quality；14 条双语 Gold Query 的 Recall@5 无回退，外部调用保持显式 opt-in |
| V2-015 | DONE | 单场题量上限由 4 提升到 10；简历题按证据核验/方案取舍/结果验证生成多角度唯一问题，UI、API 与检索回归通过 |

## P0：V2 发布

| ID     | 状态  | 交付物与验收 |
| ------ | ----- | ------------ |
| V2-017 | DONE  | 可复现的 Windows x64 便携版模板、启动/停止脚本、构建脚本与验证记录已纳入版本控制；二进制、数据库、日志、ZIP、密钥和测试者数据保持忽略 |
| V2-018 | DOING | `npm run dev` 可在未启用 Langfuse 时启动，首页返回 200，OpenTelemetry 依赖不再被错误打包到客户端 |
| V2-019 | TODO  | 类型、Lint、单元/数据库测试、迁移、冻结集、Hybrid RAG、Promptfoo、生产构建和浏览器主链路全部有本轮证据 |
| V2-020 | TODO  | Gitleaks Git/工作区扫描、Trivy/npm 依赖扫描完成；真实秘密为 0，High/Critical 已修复或记录发布例外与适用边界 |
| V2-021 | TODO  | README 准确说明 V2 用户旅程、Agent/RAG/Memory/Trace、评测、便携运行、隐私边界、限制和发布证据 |
| V2-022 | TODO  | V2 历史与 `main` 建立可审查关系，推送并合并；GitHub Actions 的 AI Eval 与 Deploy 成功，线上健康检查通过 |
| V2-023 | TODO  | 创建 `v2.0.0` Tag/Release，上传小于 100 MiB 的 Windows x64 ZIP、SHA-256 和 Release Notes |

## 本轮交付顺序

1. `DONE`：V2-002～015 的工程交付已关闭；首答 → 重答 → 弱点复测、受控 Agent、Trace/Bad Case、安全降级、内容治理、双域/Hybrid RAG、Memory、版本化评测、10 题简历面试与试点工程包均有自动化证据。
2. `NEXT`：按 `v2-eval-annotation-protocol.md` 先对校准子集执行两名独立标注员 + 第三人仲裁，把 `REFERENCE_ONLY` 样本逐版本升级为人工 Gold；当前人工 Gold 仍为 0。
3. `VALIDATE`：按 `v2-pilot-research-pack.md` 招募真实用户执行 V2-012 试点；当前参与者/事件分母为 0，不声称用户效果。
4. `HARDEN`：单独规划 Next.js 16 兼容性升级，处理 `npm audit` 报告的 3 个 high；补装 Gitleaks 后执行仓库与工作区双扫描。
