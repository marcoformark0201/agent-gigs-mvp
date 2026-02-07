# Cloudflare Tunnel 上线流程（推荐）

目标：不开放服务器 80/443，让公网只看到 Cloudflare；启用 WAF / Rate Limit。

## 1) 你在 Cloudflare 面板做

1. 把域名接入 Cloudflare（NS 切到 CF）。
2. Cloudflare Zero Trust → **Tunnels** → Create a tunnel。
3. 选择 **cloudflared** 连接方式，创建后拿到 **Tunnel Token**。
4. 在该 Tunnel 里添加 **Public Hostname**：
   - `gigs.<你的域名>` → `http://127.0.0.1:8787`

## 2) 服务器侧（我来执行）

已安装 `cloudflared`。

- 先启动本地 MVP（只监听回环，不暴露公网）：

```bash
cd /root/.openclaw/workspace/agent-gigs-mvp
export ADMIN_TOKEN='<自己设一个强随机>'
export BTC_ADDRESS='3Q5fanKT7q3ZxZUiEvGAu9ywwhXcVnvoDc'
export BIND='127.0.0.1'
export PORT='8787'
node server.mjs
```

- 再启动 Tunnel（使用 token）：

```bash
cloudflared tunnel --no-autoupdate run --token '<CF_TUNNEL_TOKEN>'
```

## 3) WAF 建议（你在 CF 配）

- WAF：对 `/admin*` 直接 Block（只允许你自己的 IP / Country）。
- Rate Limit：对 `/api/request` 限速（例如 60 req / 10 min / IP）。
- 可选：对 `/api/request` 加 Turnstile。
