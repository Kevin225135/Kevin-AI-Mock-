# CI/CD 部署说明

本项目已经配置为：当代码推送到 `main` 分支时，GitHub Actions 自动构建 Next.js standalone 产物，通过 SSH 上传到服务器，切换 `current` 软链接，并使用 PM2 重启应用。

## 服务器需要准备

- 一台 GitHub Actions 可以通过 SSH 访问的 Linux 服务器。
- 部署用户，例如 `deploy`，并且该用户可以写入部署目录。
- Node.js 22 或更新版本。
- PM2：

```bash
npm install -g pm2
```

- 部署目录，例如：

```bash
mkdir -p /var/www/ai-mock-interview-coach
chown -R deploy:deploy /var/www/ai-mock-interview-coach
```

- 推荐配置 Nginx 或其他反向代理，把外部域名转发到 `127.0.0.1:3000`，或转发到你在 `PRODUCTION_ENV` 里设置的 `PORT`。
- 如果要使用持久化数据，需要准备 PostgreSQL；如果要启用异步队列，需要准备 Redis。

## 你需要提供的信息

请在 GitHub 仓库里进入 `Settings -> Secrets and variables -> Actions -> New repository secret`，添加以下 Secrets。

必填：

- `SSH_HOST`：服务器 IP 或域名。
- `SSH_USER`：部署用户，例如 `deploy`。
- `SSH_PRIVATE_KEY`：可以登录服务器的 SSH 私钥内容。
- `DEPLOY_PATH`：服务器部署目录，例如 `/var/www/ai-mock-interview-coach`。
- `PRODUCTION_ENV`：生产运行时环境变量，按 `.env` 文件格式填写。

选填：

- `SSH_PORT`：SSH 端口，默认 `22`。
- `SSH_KNOWN_HOSTS`：服务器 host key，建议配置。可用 `ssh-keyscan -p 22 your.server.host` 生成。
- `PM2_APP_NAME`：PM2 进程名，默认 `ai-mock-interview-coach`。
- `BUILD_DATABASE_URL`：仅当构建阶段必须连接真实数据库时才需要；默认会使用一个 dummy URL 让 Prisma client 正常生成。

## 参数获取来源

### GitHub Secrets

| 参数 | 从哪里获取 | 如何确认 | 填写示例 |
| --- | --- | --- | --- |
| `SSH_HOST` | 云服务器控制台里的公网 IP，或已经解析到服务器的域名。 | 在本机执行 `ssh deploy@your.server.host` 能连通；如果用域名，先确认 DNS 已解析到服务器公网 IP。 | `203.0.113.10` 或 `api.example.com` |
| `SSH_USER` | 服务器上的 Linux 用户名。可以用已有用户，也可以新建 `deploy` 用户。 | SSH 登录后执行 `whoami`，输出就是该值。 | `deploy`、`ubuntu`、`root` |
| `SSH_PRIVATE_KEY` | 你本地生成的部署 SSH 私钥，不是服务器上下载的文件。 | 私钥对应的公钥已经追加到服务器该用户的 `~/.ssh/authorized_keys`，并且本机能用这把 key 登录。 | 以 `-----BEGIN OPENSSH PRIVATE KEY-----` 开头的完整内容 |
| `DEPLOY_PATH` | 你在服务器上规划的应用部署目录。 | 用 `mkdir -p` 创建目录，并用 `chown` 确认 `SSH_USER` 有写权限。 | `/var/www/ai-mock-interview-coach` |
| `PRODUCTION_ENV` | 生产环境变量集合，来源见下方 `PRODUCTION_ENV` 变量表。 | 按 `.env` 格式逐行填写，不要加 Markdown 代码块。 | `PORT=3000` 等多行内容 |
| `SSH_PORT` | 服务器 SSH 服务端口。云服务器默认通常是 `22`；如果安全组或 sshd 改过端口，以实际配置为准。 | 本机用 `ssh -p 端口 用户@服务器` 测试。 | `22` |
| `SSH_KNOWN_HOSTS` | 用 `ssh-keyscan` 从服务器获取。 | 本机执行 `ssh-keyscan -p 22 your.server.host`，把输出完整复制到 Secret。 | `your.server.host ssh-ed25519 AAAA...` |
| `PM2_APP_NAME` | 你自己定义的 PM2 进程名。 | 服务器执行 `pm2 list` 可以看到同名进程。 | `ai-mock-interview-coach` |
| `BUILD_DATABASE_URL` | 构建阶段使用的数据库连接串，通常不需要配置。 | 只有构建阶段必须访问真实数据库时才填；当前项目默认 dummy URL 已够用。 | `postgresql://user:password@host:5432/db?schema=public` |

### `PRODUCTION_ENV` 变量

| 变量 | 从哪里获取 | 是否必填 | 填写示例 |
| --- | --- | --- | --- |
| `PORT` | 你自己决定，需和 Nginx 反向代理目标端口一致。 | 建议填写 | `PORT=3000` |
| `DATABASE_URL` | PostgreSQL 服务的连接信息。来源可以是自建 PostgreSQL、云数据库控制台，或服务器本机数据库配置。 | 必填 | `DATABASE_URL=postgresql://user:password@127.0.0.1:5432/ai_mock_coach?schema=public` |
| `REDIS_URL` | Redis 服务的连接信息。来源可以是自建 Redis、云 Redis 控制台，或服务器本机 Redis 配置。 | 启用异步队列时必填 | `REDIS_URL=redis://127.0.0.1:6379` |
| `AI_PROVIDER` | 你选择的评分 provider。当前代码支持 `local`、`openai-compatible`、`ark`。 | 可选 | `AI_PROVIDER=ark` |
| `ARK_API_BASE_URL` | 火山方舟 Ark API endpoint。当前项目示例使用北京区域 API 地址。 | 使用 Ark 时填写 | `ARK_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3` |
| `ARK_MODEL` | 火山方舟控制台中开通或接入的模型 ID。 | 使用 Ark 时填写 | `ARK_MODEL=doubao-seed-2-0-pro-260215` |
| `ARK_API_KEY` | 火山方舟控制台创建的 API Key。 | 使用 Ark 时必填 | `ARK_API_KEY=你的真实 key` |
| `AI_API_BASE_URL` | OpenAI-compatible 服务商提供的 `/v1` base URL。 | 使用 openai-compatible 时填写 | `AI_API_BASE_URL=https://api.example.com/v1` |
| `AI_API_KEY` | OpenAI-compatible 服务商控制台创建的 API Key。 | 使用 openai-compatible 时必填 | `AI_API_KEY=你的真实 key` |
| `AI_MODEL` | OpenAI-compatible 服务商提供的模型名。 | 使用 openai-compatible 时填写 | `AI_MODEL=mock-interview-rubric` |
| `AI_PROVIDER_TIMEOUT_MS` | 你自己设定的 AI 请求超时时间。 | 可选 | `AI_PROVIDER_TIMEOUT_MS=15000` |

### 常用获取命令

```bash
# 确认当前登录用户名，可用于 SSH_USER
whoami

# 创建部署目录，可用于 DEPLOY_PATH
sudo mkdir -p /var/www/ai-mock-interview-coach
sudo chown -R deploy:deploy /var/www/ai-mock-interview-coach

# 生成 SSH_KNOWN_HOSTS
ssh-keyscan -p 22 your.server.host

# 测试 SSH_HOST / SSH_PORT / SSH_USER / SSH_PRIVATE_KEY 是否正确
ssh -i ./github-actions-ai-mock -p 22 deploy@your.server.host

# 查看 PM2 进程名，可用于确认 PM2_APP_NAME
pm2 list
```

`PRODUCTION_ENV` 示例：

```bash
PORT=3000
DATABASE_URL=postgresql://user:password@127.0.0.1:5432/ai_mock_coach?schema=public
REDIS_URL=redis://127.0.0.1:6379
AI_PROVIDER=ark
ARK_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-seed-2-0-pro-260215
ARK_API_KEY=replace-with-real-key
AI_PROVIDER_TIMEOUT_MS=15000
```

PostgreSQL 的 `DATABASE_URL` 必须保留；项目不再提供内存数据仓库回退。Redis 和外部 AI provider 可按需配置，未配置外部 AI provider 时仍会使用本地 rubric 评分。

## SSH Key 配置

这一节对应 GitHub Secret `SSH_PRIVATE_KEY`。注意：`SSH_PRIVATE_KEY` 填的是私钥内容，服务器 `authorized_keys` 里放的是对应的公钥内容。

### 1. 确认或创建服务器部署用户

如果你已经有可用于部署的服务器用户，例如 `deploy`、`ubuntu` 或 `root`，可以直接使用。更推荐单独创建 `deploy` 用户：

```bash
sudo adduser deploy
sudo mkdir -p /home/deploy/.ssh
sudo touch /home/deploy/.ssh/authorized_keys
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

如果服务器是 Ubuntu 云主机，也可以先用云厂商提供的默认用户登录，例如 `ubuntu`，再创建 `deploy` 用户。

### 2. 在本地生成部署专用 SSH key

Windows PowerShell 推荐生成到当前用户的 `.ssh` 目录，不要生成到项目仓库里：

```powershell
ssh-keygen -t ed25519 -C "github-actions-ai-mock" -f "$env:USERPROFILE\.ssh\github-actions-ai-mock" -N ""
```

Linux、macOS 或 Git Bash：

```bash
ssh-keygen -t ed25519 -C "github-actions-ai-mock" -f ~/.ssh/github-actions-ai-mock -N ""
```

生成后会得到两个文件：

```text
github-actions-ai-mock      # 私钥，填到 GitHub Secret: SSH_PRIVATE_KEY
github-actions-ai-mock.pub  # 公钥，追加到服务器 authorized_keys
```

这里使用 `-N ""` 表示不设置 passphrase，方便 GitHub Actions 非交互式登录。请只把这把 key 用于部署，并控制好服务器部署用户权限。

### 3. 把公钥追加到服务器 `authorized_keys`

Windows PowerShell：

```powershell
$pub = Get-Content "$env:USERPROFILE\.ssh\github-actions-ai-mock.pub"
ssh deploy@your.server.host "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pub' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

把命令里的 `deploy@your.server.host` 替换成你的服务器用户和 IP/域名。如果 SSH 不是 22 端口：

```powershell
$pub = Get-Content "$env:USERPROFILE\.ssh\github-actions-ai-mock.pub"
ssh -p 你的端口 deploy@your.server.host "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$pub' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Linux、macOS 或 Git Bash 可以用 `ssh-copy-id`：

```bash
ssh-copy-id -i ~/.ssh/github-actions-ai-mock.pub deploy@your.server.host
```

如果没有 `ssh-copy-id`，也可以手动追加：

```bash
cat ~/.ssh/github-actions-ai-mock.pub | ssh deploy@your.server.host "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

如果你是用 `root` 登录后给 `deploy` 用户配置公钥，也可以在服务器上执行：

```bash
sudo mkdir -p /home/deploy/.ssh
sudo tee -a /home/deploy/.ssh/authorized_keys < github-actions-ai-mock.pub
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

### 4. 本地验证这把 key 可以登录服务器

Windows PowerShell：

```powershell
ssh -i "$env:USERPROFILE\.ssh\github-actions-ai-mock" deploy@your.server.host
```

Linux、macOS 或 Git Bash：

```bash
ssh -i ~/.ssh/github-actions-ai-mock deploy@your.server.host
```

如果能免密码登录并进入服务器，说明 `SSH_HOST`、`SSH_USER`、`SSH_PRIVATE_KEY` 对应关系正确。登录后可执行：

```bash
whoami
pwd
```

`whoami` 的输出就是 GitHub Secret `SSH_USER` 应填写的值。

### 5. 填写 GitHub Secret `SSH_PRIVATE_KEY`

Windows PowerShell 查看私钥内容：

```powershell
Get-Content "$env:USERPROFILE\.ssh\github-actions-ai-mock" -Raw
```

Linux、macOS 或 Git Bash：

```bash
cat ~/.ssh/github-actions-ai-mock
```

复制完整输出到 GitHub Secret `SSH_PRIVATE_KEY`，必须包含开头和结尾：

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 6. 常见问题

- `Permission denied (publickey)`：通常是公钥没有写入正确用户的 `~/.ssh/authorized_keys`，或 `SSH_USER` 填错。
- `Bad permissions`：检查服务器权限，`.ssh` 应为 `700`，`authorized_keys` 应为 `600`。
- GitHub Actions 连接超时：检查 `SSH_HOST`、`SSH_PORT`、云服务器安全组、防火墙是否允许 GitHub Actions 访问 SSH 端口。
- 私钥复制后不可用：确认 Secret 里包含完整私钥，多行没有丢失，不要复制 `.pub` 文件内容到 `SSH_PRIVATE_KEY`。

完成后，这几个 Secret 的对应关系应该是：

```text
SSH_HOST=服务器公网 IP 或域名
SSH_PORT=22
SSH_USER=deploy
SSH_PRIVATE_KEY=github-actions-ai-mock 私钥完整内容
```

生成 `SSH_KNOWN_HOSTS`：

```bash
ssh-keyscan -p 22 your.server.host
```

## 服务器部署目录结构

每次部署后，服务器目录会类似这样：

```text
DEPLOY_PATH/
  current -> releases/<git-sha>
  releases/
    <git-sha>/
      server.js
      .next/
      .env.production
      ecosystem.config.cjs
```

PM2 会从 `DEPLOY_PATH/current` 启动 `server.js`。工作流默认保留最近 5 个 release。

## 数据库注意事项

当前 CI/CD 工作流不会自动执行生产数据库迁移。请先对生产库执行 `npm run db:deploy` 和 `npm run db:seed`，确认 schema 与基础题库数据已写入 PostgreSQL，再切真实流量。
