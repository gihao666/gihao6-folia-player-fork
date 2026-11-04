# Android 部署

## 方案一：PWA（推荐，立即可用）

1. 部署到 HTTPS 静态站点（GitHub Pages / GitCode Pages / 自己的域名）；
2. Android Chrome 打开地址；
3. 菜单 →「安装应用」或「添加到主屏幕」；
4. 安装后以独立窗口运行，支持离线打开与内置曲目播放。

PWA 的在线音乐源需要可访问的 API。手机上的 `localhost` 指向手机自身，因此必须在「音乐源」里填写**可访问的 HTTPS API 地址**，例如 `https://music-api.example.com`。

## 方案二：Capacitor APK

仓库提供 Capacitor 配置。需要：

- Node.js 20+
- Android Studio（含 Android SDK 与 JDK 17+）

```bash
npm install
npm run android:sync     # 同步 www/ 并更新 android 工程
npm run android:open     # 用 Android Studio 打开
```

在 Android Studio 中：

1. 等待 Gradle Sync；
2. Build → Build Bundle(s)/APK(s) → Build APK(s)；
3. 产物在 `android/app/build/outputs/apk/debug/`。

发布签名：

1. 生成 keystore；
2. 在 `android/app/build.gradle` 配置 `signingConfigs`；
3. Build → Generate Signed Bundle / APK。

> 当前开发环境未安装 Android SDK，因此仓库已准备完整工程与构建脚本，但未附带已构建的 APK。

## API 与网络

Android 9+ 默认禁止明文 HTTP。请使用 HTTPS API；如果必须使用 HTTP，需要在 `AndroidManifest.xml` 配置 `android:usesCleartextTraffic="true"`（不推荐）。

Capacitor 使用 `https://localhost` 加载本地页面。跨域访问远程 API 时，API 仍需允许 CORS。

## 应用信息

- App ID：`com.gihao6.folia`
- App Name：`gihao6 Folia Player`
- Web 目录：`www/`

## 常见问题

**安装后没有在线源？**
在音乐源面板填写远程 API 地址，并确认 API 的 CORS 允许 Capacitor 的 origin（通常为 `https://localhost` 或 `capacitor://localhost`）。

**源码更新后 APK 没变化？**
重新执行 `npm run android:sync`，或在 Android Studio 中重新构建。

**WebView 白屏？**
检查 `www/` 是否同步、`capacitor.config.json` 的 `webDir` 是否为 `www`，以及 Android Studio 的 Logcat。