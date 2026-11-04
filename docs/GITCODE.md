# GitCode 开源准备

## 1. 创建仓库

在 GitCode 新建仓库：

- 仓库名：`gihao6_Folia_Player`
- 可见性：Public
- 初始化：不要勾选 README（本地已有）

## 2. 推送

```bash
git remote add gitcode https://gitcode.com/<你的用户名>/gihao6_Folia_Player.git
git push -u gitcode main
git push gitcode --tags
```

如果 GitCode 使用 SSH：

```bash
git remote add gitcode git@gitcode.com:<你的用户名>/gihao6_Folia_Player.git
```

## 3. Pages

在仓库 Settings → Pages：

- 部署来源选择 `main` 分支根目录；
- 保存后访问 `https://<用户名>.gitcode.io/gihao6_Folia_Player/`（具体域名以 GitCode 页面提示为准）。

## 4. 从 GitHub 导入

如果已经推送到 GitHub，也可以在 GitCode 使用「导入仓库」功能，填写 GitHub 地址，保持分支与标签同步。

## 5. 发布 Release

建议发布内容：

- `gihao6_Folia_Player-Web.zip`：纯前端（1–2 MB），适合静态部署；
- `gihao6_Folia_Player-Portable.zip`：Windows 免安装版（内置 Node 与 API），体积较大；
- 版本标签：`v1.0.0`。

> 仓库源码不包含 `runtime/` 与第三方 API 依赖；便携版作为 Release 附件发布，不提交到 Git。

## 6. 开源检查清单

- [x] README 含功能、部署、Android、许可
- [x] LICENSE（MIT）
- [x] NOTICE（第三方组件与理念参考）
- [x] CONTRIBUTING / SECURITY
- [x] `.gitignore` 排除密钥、依赖、构建产物
- [x] GitHub Actions Pages 工作流
- [x] PWA manifest / Service Worker / 图标
- [ ] 远程仓库地址与徽章（创建仓库后补充）
- [ ] Release 附件与校验值（构建后补充）