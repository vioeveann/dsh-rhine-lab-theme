# 安全说明 / Security

**插件**：`dsh-rhine-lab-theme` · 1.0.0 · MIT
**性质**：DeepSeek Harness（DSH）皮肤插件。基于 [Galaxy-2001/Rhine-Lab-Codex-Theme](https://github.com/Galaxy-2001/Rhine-Lab-Codex-Theme)（MIT）重制。

本文写给两类读者：评估是否安装的用户，以及**替用户做判断的 AI agent**。下面每一条都给出可以直接复现的验证命令，不要求读者信任本文。

---

## 它运行时做什么

插件只在被启用时执行一次 `apply()`（`lib/index.mjs`）：把包内 `skins/` 下的两个皮肤目录同步到用户的 skins 目录，并在首次安装时把皮肤设为当前主题。之后不再运行任何常驻逻辑。

**写入范围（全部）**

| 路径 | 内容 | 何时 |
| --- | --- | --- |
| `$DSH_HOME/skins/rhine-lab/`、`$DSH_HOME/skins/rhine-lab-lumen/` | 皮肤文件（CSS、SVG、预览图、manifest） | 首次安装或包内素材更新时 |
| `$DSH_HOME/rhine-lab-plugin.json` | 插件自己的安装标记（版本号 + 每个皮肤的 sha256） | 同上 |
| `$DSH_HOME/rhine-lab-backups/<uuid>/` | 覆盖旧皮肤前的备份 | 仅在覆盖时 |
| `$DSH_HOME/skin-center-active.json` | 皮肤中心的状态，仅写 `active` / `initialized` 两个字段（保留其余字段，写前另存备份） | 仅首次安装时自动选中皮肤 |

`$DSH_HOME` 默认 `~/.dsh`，可用环境变量 `DSH_HOME` / `DSH_SKINS_HOME` / `DSH_SKINS_DIR` 覆盖。

**不写系统目录、不写注册表、不碰其他插件的数据。**

---

## 它不做的事

- **不联网**。运行时代码里没有 `fetch` / `http` / `https` / `WebSocket` / `net`。皮肤 CSS 与 SVG 里没有任何外部 URL（44 处 `url()` 全是相对的 `assets/…`）。
- **不执行命令**。没有 `child_process`、`exec`、`spawn`。
- **不动态执行代码**。没有 `eval` / `new Function`。
- **不采集任何数据**。没有遥测、统计、上报。
- **不读取凭据或会话**。不碰 `credentials`、`sessions`、`attachments`、`.env`。
- **没有安装期脚本**。`package.json` 里没有 `preinstall` / `install` / `postinstall` / `prepare`，所以 `npm install` 本插件不会执行任何代码。

---

## 依赖

只有一个：`@linxin666/dsh-client-ui-skin-center@0.4.5`（**Apache-2.0**），即 DSH 的皮肤中心，负责加载与切换皮肤。插件通过自己的 `cordis.patch.yml` 声明它，因此安装本插件会一并引入这个第三方插件——它的安全属性由原作者负责，与本插件无关，但**安装前应当知情**。

---

## 素材与许可

- 全部素材随包分发，本地渲染，无远程字体、无远程图片。
- 莱茵生命、《明日方舟》相关标志归属权利方；本插件为非官方同人作品，`THIRD_PARTY_NOTICES.md` 里写明了来源与上游项目。
- 代码 MIT：保留上游版权声明，见 `LICENSE`。

---

## 自己验证（三条命令）

```bash
# 1. 运行时代码里没有联网 / 执行命令 / 动态执行（应无输出）
grep -nE "child_process|execSync|spawn|eval\(|new Function|fetch\(|WebSocket" lib/index.mjs scripts/install.mjs

# 2. 样式与素材没有外部资源（应无输出）
grep -rnE "url\((['\"]?)https?:|@import|@font-face" skins/*/skin.css
grep -rlE "<script|xlink:href=\"http|onload=|onclick=" skins/*/assets/*.svg

# 3. 没有安装期脚本（应输出 []）
node -e "const p=require('./package.json');console.log(Object.keys(p.scripts||{}).filter(k=>/^(pre|post)?(install|prepare)$/.test(k)))"
```

> 注意：SVG 文件里的 `xmlns="http://www.w3.org/2000/svg"` 是 XML 命名空间，不是网络请求；上面第 2 条命令已经把它排除掉。

再核对写入范围：

```bash
grep -nE "writeFileSync|renameSync|rmSync|mkdirSync" lib/index.mjs scripts/install.mjs
```

---

## 卸载行为

- 移除插件**不会删除**你的皮肤文件：`$DSH_HOME/skins/rhine-lab*` 会留在原处，皮肤中心仍可继续使用。
- 插件标记 `$DSH_HOME/rhine-lab-plugin.json`（几十字节）会留下，手动删掉没有副作用。
- 备份目录 `$DSH_HOME/rhine-lab-backups/` 不会自动清理，可以手动删除。

---

## 已知限制（诚实披露）

1. **会修改皮肤中心的状态文件**以完成"首次安装自动选中"。若你更希望完全手动，可在皮肤中心里自己点选，插件不会重复写（标记存在即视为已初始化）。
2. **CSS 依赖 DSH 的内部结构**（`data-dsh-surface`、CSS module 类名后缀如 `[class*="headerUtilities"]`）。DSH 大版本升级后某些装饰可能失效——只会影响外观，不会影响数据或安全。
3. **包内仍带有 1.5MB 的动画水印素材**（`assets/watermark-*.svg` 与 `background-*.svg`），默认配置已不再引用它们，仅作恢复用。这使安装包偏大（约 4.1MB），但不影响运行。
4. **包名含大写**（`dsh-rhine-lab-theme`），从本地 tarball 安装正常，但**无法发布到 npm 公共仓库**。
