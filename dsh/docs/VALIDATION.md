# 验证记录

## 2026-11-15：1.0.0 重制版

**环境**：DeepSeek Harness 桌面版 0.2.2-rc.3 · 皮肤中心 0.4.5 · Windows

**自动测试**（`node --test tests/install.test.mjs tests/plugin.test.mjs`）——8 项全通过：

- 首次启动安装并选中，后续启动保留用户选择；
- 包内两个皮肤一次装完，只有第一个被选中；
- 本地改过的皮肤不会被升级覆盖；
- 卸载标记损坏时移到一边（`.corrupt-<时间戳>`）并按首次安装继续；
- 覆盖旧皮肤时只保留最新 3 份备份；
- 符号链接、路径穿越、坏状态文件都会被拒绝。

**安全审计**：`SECURITY.md` 的 17 项逐条实测，结果见 `docs/AUDIT.md`。

**实机核对**：亮色 / 深色各一张（`docs/market/`），确认顶栏标志位置与悬停动效、空会话页 ∞ 标与「存续于星辰之间」及三色细边、用户气泡贴内容宽度、背景只剩网格纹理。

**未覆盖**：`contract` / `contrast` / `native-chrome` / `billing` 四组测试需要 devDependencies（playwright 等）与已构建的客户端产物，本次环境未安装依赖，未运行。发版前应在 `npm ci --ignore-scripts` 后补跑。
