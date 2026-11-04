# 贡献指南

感谢你愿意改进 gihao6_Folia_Player。

## 开发环境

- Node.js 20+（仅 Capacitor / 开发脚本需要；纯前端运行不需要）
- 现代浏览器（Chrome / Edge / Safari / Firefox）
- Android 构建需要 Android Studio 与 Android SDK

## 本地运行

```bash
python3 -m http.server 8080
# 或
npm run serve
```

打开 `http://localhost:8080/`。

## 代码约定

- 前端无构建步骤，保持 `index.html` + `styles.css` + 原生 ES5/ES2017 JavaScript。
- 不引入运行时第三方依赖；所有资源本地化或程序化生成。
- 新增歌词样式时，在 `js/app.js` 的 `LYRIC_STYLES` 与 `styles.css` 的 `data-lstyle` 规则中同步添加。
- 新增音乐源时，保持“用户自建 API / 官方授权”的边界，不要提交平台私有接口、Cookie、密钥或抓流逻辑。
- 不要提交 `node_modules/`、`www/`、`runtime/`、构建产物或任何密钥。

## 提交

1. 从 `main` 创建功能分支：`feat/xxx`、`fix/xxx`。
2. 提交信息使用 Conventional Commits 风格：
   - `feat: add ...`
   - `fix: correct ...`
   - `docs: update ...`
3. 提交前自查：
   - 浏览器控制台无报错；
   - 手机竖屏 / 横屏无横向溢出；
   - 歌词样式切换正常；
   - 不包含密钥与个人数据。

## 开源边界

- 本项目不内置任何音乐平台的破解接口、扫码逆向或版权音频抓取。
- 在线播放只通过用户自建的兼容 API 或官方授权服务完成。
- 新增示例数据时，请使用原创或已获授权的内容。

## 许可证

贡献即表示同意以 [MIT License](LICENSE) 授权你的代码贡献。