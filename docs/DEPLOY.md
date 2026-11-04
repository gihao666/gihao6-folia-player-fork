# 部署指南

本项目是纯静态站点，可部署到 GitHub Pages、GitCode Pages、Vercel、Netlify、Cloudflare Pages 或任意 Nginx。

## 静态站点

站点根目录就是仓库根目录，入口 `index.html`。无需构建。

### GitHub Pages

仓库已包含 `.github/workflows/pages.yml`：

1. 在 GitHub 创建仓库 `gihao6_Folia_Player`；
2. 推送 `main` 分支；
3. 仓库 Settings → Pages → Source 选择 **GitHub Actions**；
4. 工作流会发布整个仓库根目录。

部署后地址形如 `https://<user>.github.io/gihao6_Folia_Player/`。

### GitCode Pages

见 [GITCODE.md](GITCODE.md)。

### Nginx 示例

```nginx
server {
  listen 443 ssl;
  server_name player.example.com;

  root /var/www/gihao6_Folia_Player;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location = /sw.js {
    add_header Cache-Control "no-cache";
  }
}
```

> Service Worker 更新时请修改 `sw.js` 里的缓存版本号（`gihao6-folia-v1`），否则浏览器可能继续使用旧缓存。

## 在线音乐 API

Web 版必须自行部署兼容 API。默认端口：

| 平台 | 项目 | 默认地址 |
| --- | --- | --- |
| 网易云音乐 | NeteaseCloudMusicApiEnhanced | `http://localhost:3000` |
| QQ 音乐 | @yakult-green-tea/qq-music-api | `http://localhost:3200` |

### CORS

播放器需要跨域请求 API，并且扫码后的登录态通过 `cookie` 参数传递。API 必须允许：

```http
Access-Control-Allow-Origin: https://player.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

如果使用 Nginx 反向代理，可加：

```nginx
location /api/netease/ {
  proxy_pass http://127.0.0.1:3000/;
  proxy_set_header Host $host;
  add_header Access-Control-Allow-Origin $http_origin always;
  add_header Access-Control-Allow-Credentials true always;
  add_header Access-Control-Allow-Headers "Content-Type" always;
  add_header Access-Control-Allow-Methods "GET,POST,OPTIONS" always;
  if ($request_method = OPTIONS) { return 204; }
}
```

然后在播放器的「音乐源」里填写 `https://player.example.com/api/netease`。

### 安全

- 不要把 API Secret、Cookie、账号密码写进前端或仓库；
- 生产环境使用 HTTPS；
- 限制 CORS 到自己的域名；
- 对外提供的 API 建议加访问频率限制与鉴权代理。

## PWA

`manifest.webmanifest` 与 `sw.js` 已内置。部署到 HTTPS 后：

- Android Chrome：菜单 →「安装应用 / 添加到主屏幕」；
- 桌面 Chrome / Edge：地址栏安装图标；
- Service Worker 会缓存前端静态资源，离线时仍能打开界面并播放内置合成曲。