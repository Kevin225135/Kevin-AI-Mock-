AI Mock Portable - Windows x64
================================

启动：双击 START_AI_MOCK.cmd
停止：双击 STOP_AI_MOCK.cmd

浏览器地址：http://127.0.0.1:3000
演示账号：demo@ai-mock.local
演示密码：demo-password-change-me

这个压缩包自带 Node.js、PostgreSQL 和一个全新的演示数据库，不要求目标电脑预装开发环境。
默认只监听 127.0.0.1，不应直接暴露到公网。

默认能力：
- 登录与会话
- PDF / DOC / DOCX 简历解析
- 基于简历证据生成最多 10 道问题
- 文本作答、确定性本地评分、追问与报告
- 弱点、训练任务、历史与本地知识检索

默认未启用：
- 外部大模型、远程 embedding、reranker、联网搜索
- Redis/BullMQ 异步评分
- Langfuse 远程 Trace
- 图片简历 OCR 语言包（首次使用可能需要联网下载）

如需使用自己的 DashScope 模型：
1. 复制 optional-model.env.example 为 optional-model.env。
2. 填写你自己的 AI_API_KEY。
3. 停止并重新启动 AI Mock。

安全说明：
- 发布包不包含开发电脑上的 .env.local、API Key、简历或历史用户数据。
- 每次首次解压启动时都会在本机生成独立的 JWT 签名密钥，不在 ZIP 中预置共享密钥。
- database 文件夹会保存测试设备上新增的本地数据；传给下一位测试者前应重新使用原始 ZIP 解压。
- 测试完成后先运行 STOP_AI_MOCK.cmd，再移动或删除文件夹。
