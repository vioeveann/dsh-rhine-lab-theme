# 发版流程（1.0.0）

## 产物

`npm run build` 会在 `dist/` 生成：

| 文件 | 用途 |
| --- | --- |
| `dsh-rhine-lab-theme-1.0.0.tgz` | 插件包，桌面版「插件 → 添加插件」直接安装 |
| `Rhine-Lab-DSH-Theme-1.0.0-Skin.zip` | 皮肤包，已有皮肤中心时手动安装 |
| `Rhine-Lab-DSH-Theme-1.0.0-Source.zip` | 源码包，开发用 |
| `SHA256SUMS.txt` | 三个产物的校验和 |

## 步骤

```bash
cd dsh
npm ci --ignore-scripts      # 需要 devDependencies 才能跑全部测试
npm test                     # 安装器 + 插件 8 项
npm run generate             # 可选：素材有改动时重新生成水印/网格/背景
npm run build                # 打包，输出到 dist/
sha256sum -c dist/SHA256SUMS.txt
```

发布时把 tarball 和校验和一起上传，打 tag `dsh-v1.0.0`。

npm 上架后，安装可以简写成 `dsh plugin --profile desktop add dsh-rhine-lab-theme`。

## 版本规则

- **1.0.0** 是重制版的首个版本；皮肤 id 仍为 `rhine-lab` / `rhine-lab-lumen`，覆盖安装即可，用户的皮肤选择保留；
- 皮肤清单里的 `version` 与 `package.json` 的 `version` 保持一致；
- 改动只在素材层面（配色、文案）时，可以只升补丁位。

## 打包前检查清单

- [ ] `SECURITY.md` 与 `docs/AUDIT.md` 的结论仍成立（命令重跑为空）
- [ ] `docs/market/*.png` 与 `skins/*/preview/*.png` 是新界面的截图
- [ ] `screenshots.json` 里的文件名与 `docs/market/` 一致
- [ ] `THIRD_PARTY_NOTICES.md` 里上游项目与第三方依赖都仍准确

## 推送到 GitHub

本仓库已经 `git init` 并提交了首个版本。建好远端仓库后：

```bash
git remote add origin git@github.com:<你的账号>/dsh-Rhine-Lab-Theme.git
git push -u origin main
git tag dsh-v1.0.0 && git push origin dsh-v1.0.0
```

然后在 GitHub 建 Release，附上 `dist/` 里的三个产物和 `SHA256SUMS.txt`。

## 发布到 npm

包名 `dsh-rhine-lab-theme` 在 npm 上还没被占用（实测 404）。发布前需要登录：

```bash
npm login                 # 浏览器里完成授权
cd dsh
npm publish --dry-run     # 先看一眼会发什么：87 个文件、2.8MB
npm publish --access public
```

发布后建议把 `repository` / `homepage` 写进 `package.json`（指向 GitHub 仓库），npm 页面才会显示源码链接。

## 已知限制

- 顶栏标志、空会话页的 ∞ 标与标题文案靠 CSS-Modules 类名片段（`[class*=...]`）挂载，官方大改结构时可能失效；皮肤中心的契约检查会为此给出一条提示，属已知项。
- 安装包不打包字体，字体回退链依赖系统已装字体。
