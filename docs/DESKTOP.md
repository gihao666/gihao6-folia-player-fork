# 桌面端部署

## Windows

- 推荐：下载 Release 中的 `gihao6_Folia_Player-Portable.zip`，解压后双击 `start-player.bat`。
- 便携版内置 Node 22、网易云 API（3000）与 QQ 音乐 API（3200），无需 Git / Node / npm。
- 也可用浏览器打开 `index.html`，但需要自行启动 API。

## macOS

1. 安装 Node.js 20+（Homebrew：`brew install node`）。
2. 双击 `start-player.command`，首次会克隆并安装 API 依赖。
3. 首次运行如被 Gatekeeper 拦截：右键 → 打开，或在终端执行 `./start-player.sh`。

## Linux

```bash
chmod +x start-player.sh
./start-player.sh
```

脚本会启动 API（3000/3200，取决于本地是否安装 QQ API）并在 8080 提供播放器页面。

也可以直接部署 PWA：

```bash
python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080/`，Chrome / Edge 可安装为桌面应用。

## 三端通用

- 在线扫码需要本机或局域网可访问的 API；
- 手机 / 其他设备请把 API 部署到 HTTPS 域名，并在音乐源面板填写该地址；
- PWA 安装后支持离线打开与内置曲目播放。
