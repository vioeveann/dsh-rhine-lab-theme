# 1.0.0 审计记录

审计对象：`dsh-rhine-lab-theme@1.0.0`（tarball 2.68MB，解包 7.8MB，87 个文件）
审计日期：2026-11-15
审计范围：运行时代码、安装逻辑、皮肤素材、依赖、包内容、许可与署名

---

## 结论

**可安全安装。** 这是一个纯本地渲染的皮肤包：无网络、无命令执行、无动态代码、无遥测、无安装期脚本；写入范围限于 `$DSH_HOME` 下的皮肤目录与两个状态文件。发现 5 项低风险问题，均在 1.0.0 内修复或已披露。

---

## 检查项与结果

| # | 检查项 | 方法 | 结果 |
| --- | --- | --- | --- |
| 1 | 网络访问 | `grep -nE "fetch\(\|https?://\|WebSocket\|net"` 扫 `lib/`、`scripts/` | 无 |
| 2 | 命令执行 | 同上扫 `child_process\|exec\|spawn` | 无 |
| 3 | 动态代码 | 扫 `eval(\|new Function` | 无 |
| 4 | 安装期脚本 | 读 `package.json` 的 `scripts` | 仅 `test`/`build`/`generate`，无 `pre/post-install`、无 `prepare` |
| 5 | 写入范围 | 逐行读 `lib/index.mjs`、`scripts/install.mjs` 的 fs 调用 | 全部落在 `$DSH_HOME` 下（见下） |
| 6 | 路径穿越 | 读 `installSkin` 校验逻辑 | 拒绝绝对路径、拒绝含 `..`、要求文件存在 |
| 7 | 符号链接攻击 | 同上 | 目标为软链时直接拒绝替换 |
| 8 | 覆盖失败回滚 | 同上 | 先 stage 再 rename，失败回滚备份 |
| 9 | 素材外链 | `grep -rnE "url\((['\"]?)https?:|@import|@font-face" skins/*/skin.css` | 无匹配；44 处 `url()` 全部是相对 `assets/…` |
| 10 | SVG 脚本 | `grep -rlE "<script\|xlink:href=\"http\|onload=\|onclick=" skins/*/assets/*.svg` | 无匹配 |
| 11 | 皮肤内 JS | `find skins -name "*.js"` | 无 |
| 12 | 凭据/会话访问 | 扫 `credentials\|sessions\|attachments\|process.env` | 只有 `DSH_HOME`/`DSH_SKINS_HOME`/`DSH_SKINS_DIR` 三个环境变量用于定位目录 |
| 13 | 依赖面 | 读 `dependencies` | 仅 `@linxin666/dsh-client-ui-skin-center@0.4.5`（Apache-2.0，DSH 皮肤中心） |
| 14 | 包内容 | `tar tzf` 逐条比对 `files` 白名单 | 87 个文件，全部为皮肤/文档/两个 .mjs，无二进制、无 node_modules、无测试夹具 |
| 15 | 许可合规 | 读 `LICENSE`、`THIRD_PARTY_NOTICES.md` | MIT；保留上游 Galaxy-2001 版权；上游项目单独成节 |
| 16 | 单元测试 | `node --test tests/install.test.mjs tests/plugin.test.mjs` | 8/8 通过（新增：坏标记容错、备份只留 3 份） |
| 17 | 两皮肤一致性 | `diff` 两份 `skin.css` | 仅 12 行配色不同（各 3 个颜色 × 亮/暗），其余完全一致 |

---

## 写入范围（实测，非声称）

```
$DSH_HOME/skins/rhine-lab/           皮肤文件
$DSH_HOME/skins/rhine-lab-lumen/     皮肤文件
$DSH_HOME/rhine-lab-plugin.json      插件标记（版本 + 每皮肤 sha256）
$DSH_HOME/rhine-lab-backups/<uuid>/  覆盖前的备份
$DSH_HOME/skin-center-active.json    皮肤中心状态，只写 active / initialized（写前另存备份）
```

不触碰：用户目录其他部分、注册表、环境变量、其他插件的数据目录。

---

## 发现的问题与处理

| 严重度 | 问题 | 处理 |
| --- | --- | --- |
| 低 | `skin.json` 里 `author` 仍是上游「Galaxy-2001」，描述里还写着已移除的「中央动态水印 16%」 | **已修复**：作者改为「Vioeve ann（重制版；原作 Galaxy-2001）」，描述与 tagline 按当前实际效果重写 |
| 低 | `screenshots.json` 与皮肤预览图仍是 1.3.0 时期的界面 | **已修复**：换成 1.0.0 实机截图（亮/暗各两张） |
| 低 | 包内带 1.5MB × 4 的动画水印/背景素材，默认配置不引用 | **已处理**：删除未被任何 CSS/清单引用的 4 类素材（每皮肤约 3MB），动画水印本体按作者要求保留 |
| 信息 | 包名 `dsh-rhine-lab-theme` 含大写，无法发布到 npm 公共仓库 | 已在 `SECURITY.md` 披露；本地 tarball 安装正常 |
| 信息 | CSS 依赖 DSH 内部结构（`data-dsh-surface`、CSS module 类名后缀），大版本升级可能失效 | 已在 `SECURITY.md` 列为已知限制；失效只影响外观 |

---

## 隐私

- 无遥测、无统计、无外发。
- 皮肤预览图是本仓库自带的 PNG，不含用户信息。
- 插件不读取会话、附件、凭据目录。

---

## 处置建议

1. 发布前补：新截图（`preview/light.png`、`preview/dark.png` 与 `screenshots.json`）。
2. 若将来接入 CI，把本文件的 17 项检查写成脚本跑一遍。

---

## 维护性复查（同日）

| 项 | 处理 |
| --- | --- |
| 备份目录只增不减（每次覆盖留下完整皮肤） | 已改为只保留最新 3 份，并限定只删除本插件自己的 uuid 目录 |
| 插件标记损坏会导致 apply 抛错 | 已改为移到 `*.corrupt-<时间戳>` 并按首次安装继续 |
| `build.mjs` 文件白名单硬编码，容易漏文件 | 已改为读取 `package.json#files` |
| 未引用素材占包体一半 | 已删除，tarball 从 3.87MB 降到 2.68MB |
