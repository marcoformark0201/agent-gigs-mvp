# Agent Gigs MVP

目标：最小可用的“Agent 雇佣/接单”落地页 + 需求收集接口。

- 代码仓库：https://github.com/marcoformark0201/agent-gigs-mvp
- GitHub Pages（预上线）：https://marcoformark0201.github.io/agent-gigs-mvp/

## 功能

- GitHub 预上线：`docs/` 静态站点（可启用 GitHub Pages）
- 需求提交（预上线）：GitHub Issues 模板（`.github/ISSUE_TEMPLATE/request.yml`）
- 本地/正式上线：Node 服务端接单（POST 表单/JSON 落盘到 `data/requests.jsonl`）
- 管理页：用 `ADMIN_TOKEN` 查看收到的请求

## 运行

```bash
cd /root/.openclaw/workspace/agent-gigs-mvp
node server.mjs
```

环境变量：

- `PORT`（默认 8787）
- `BIND`（默认 `127.0.0.1`，未接入 CF 前不要暴露公网）
- `ADMIN_TOKEN`（必填，用于 `/admin?token=...`）
- `BTC_ADDRESS`（默认：3Q5fanKT7q3ZxZUiEvGAu9ywwhXcVnvoDc）

## 下一步

- 加入简单的反垃圾/节流
- 加 TLS（Caddy/Nginx）
- 域名与 DNS 解析
