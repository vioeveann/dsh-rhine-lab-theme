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

## 版本规则

- **1.0.0** 是重制版的首个版本；皮肤 id 仍为 `rhine-lab` / `rhine-lab-lumen`，覆盖安装即可，用户的皮肤选择保留；
- 皮肤清单里的 `version` 与 `package.json` 的 `version` 保持一致；
- 改动只在素材层面（配色、文案）时，可以只升补丁位。

## 打包前检查清单

- [ ] `SECURITY.md` 与 `docs/AUDIT.md` 的结论仍成立（命令重跑为空）
- [ ] `docs/market/*.png` 与 `skins/*/preview/*.png` 是新界面的截图
- [ ] `screenshots.json` 里的文件名与 `docs/market/` 一致
- [ ] `THIRD_PARTY_NOTICES.md` 里上游项目与第三方依赖都仍准确
