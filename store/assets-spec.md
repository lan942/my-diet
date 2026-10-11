# Store Assets Spec（图标 / 截图 / Feature Graphic）

> 产出目录：`assets/store/`。截图来源：模拟器截屏（iOS Simulator + Android Emulator），
> 用任何图像工具叠加 `store/listing-copy.md` 中的英文 Headline。

---

## 1. App 图标

| 项 | 要求 | 现状 |
| --- | --- | --- |
| iOS App Store 图标 | 1024×1024 PNG/JPG，**无透明通道**、无圆角（系统自动裁） | 用 assets/images/icon.png 导出检查 alpha 通道 |
| Google Play 图标 | 512×512 PNG，32 位（允许透明） | assets/images/icon.png 缩放导出 |
| Android 自适应图标 | 前景 432×432 安全区 + 背景色 #A8E6C9 | assets/images/adaptive-icon.png 已配置 ✓ |

**核查命令**（PowerShell，检查透明通道）：
```powershell
# 1024 图标若含 alpha 会被 App Store Connect 拒收
magick identify -format "%[channels]" icon-1024.png   # 期望 srgb（不含 alpha）
```

## 2. 截图（iPhone）

| 设备槽位 | 尺寸 | 数量 |
| --- | --- | --- |
| 6.7"（iPhone 15/16 Pro Max） | 1290×2796 竖屏 | ≥3 张（建议 6 张） |
| 5.5"（iPhone SE/8 Plus 世代） | 1242×2208 竖屏 | ≥3 张（可选，仅当保留该槽位；新 App 已可跳过） |

**来源**：iOS Simulator 对应机型 Cmd+S 截图（依赖 macOS 环境；无 Mac 时此任务挂起）。

## 3. 截图（Android）

| 项 | 要求 |
| --- | --- |
| 手机截图 | ≥4 张，最短边 ≥1080px，最长边 ≤7680px，16:9 或 9:16 |
| 7" 平板截图 | 可选（supportsTablet: false 时不必填） |
| 10" 平板截图 | 可选（同上） |

**来源**：Android Emulator Pixel 7 Pro（1080×2400）`adb exec-out screencap -p > shot.png`。

## 4. Feature Graphic（仅 Google Play）

| 项 | 要求 |
| --- | --- |
| 尺寸 | 1024×500 PNG/JPG，<15MB |
| 内容 | 标语 "Offline nutrition tracking. Zero data leaves your phone." + 图标 + 品牌色底 |
| 注意 | 无边框、关键内容居中 80% 区域内（部分版位会裁边）、文字在缩略图下仍可读 |

## 5. 截图页面构图建议（两平台共用）

按用户旅程排序（对应 App 实际页面）：
1. 引导页·目标选择（onboarding step 1）
2. 今日页·餐次记录（IntakeScreen）
3. 今日页·达成率（ProgressCard 区域）
4. 步数页（StepScreen，展示 sync 卡片）
5. 我的页·TDEE 目标（ProfileScreen targetRow）
6. 食物库（FoodLibraryScreen）

要求：语言统一用英文系统 locale 截图（zh 包已就绪但商店首图用英文）；
状态栏干净（满电、满信号、无调试图标，`adb shell settings put global sysui_demo_allowed 1` 可用 demo 模式）。

## 6. 交付核对清单

- [ ] icon-1024（无 alpha）→ App Store Connect
- [ ] icon-512 + 自适应图标 → Play Console
- [ ] iOS 6.7" 截图 ×≥3
- [ ] Android 截图 ×≥4（≥1080px）
- [ ] feature-graphic-1024x500.png
- [ ] 所有截图已叠加英文 Headline、无中文残留、状态栏干净
