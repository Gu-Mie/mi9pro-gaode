# 项目开发约定

本项目把 Android 高德地图导航通知同步到小米手环 9 Pro。与用户使用中文沟通。

2026-09-22 开源准备后用户接入手机：已只读核对手机 0.2.1/code 6，恢复原签名 `outputs/releases/v0.2.4/NAV-PHONE-021.apk` 并核对手机/电脑/历史 SHA-256 一致，APK 签名与手环 0.2.4 原证书匹配。它是历史 debug 构建，不是 unsigned 或新 release 构建。随后按用户要求将 `NAV-BAND-024.rpk` 传至手机 `/sdcard/Download/` 并核对两端 SHA-256 和大小一致；没有点击安装界面。用户自行安装后反馈“已经ok”，记录为 0.2.4 已安装、基本使用正常（用户确认），不扩展为全部功能或长时稳定性验收通过。最新记录优先看 HANDOVER.md 顶部。

## 开始工作

用户已于 2026-09-20 明确“开始开发”，第 5 版方案已实施为手环 0.2.4 / code 9，不再受此前“仅预览、等待确认”限制。默认字号 30、箭头 42、粗细 8、图文间距 26，底部齿轮仍为 42 / 64×64 点击区；全页面字体字号联动、字体选择、设置滚动、恢复默认已实现并通过本地检查。旧设置保留；查看新默认比例需在设置底部点“恢复默认”。

原生新增系统默认、宋体、楷体、圆体选择，附加字体资源和许可随包内置，不依赖电脑本地字体。源码浏览器预览已加载字体，RPK 编译事件/资源已检查；手环固件字体支持、资源加载性能与显示效果仍待真机，不能把构建或浏览器当作真机验收。新源码截图 outputs/previews/wearable-native-024.png / wearable-fonts-024.png；实现和边界见 docs/display-settings-024.md。历史 font-controls-proposal 系列仅是概念图。

1. 先读根目录 `HANDOVER.md`，了解最近的用户反馈、已安装版本和未完成工作，再读相关源码。
2. `docs/navigation-verification.md` 保存验证摘要；完整历史联调记录归档在被忽略的 `.local/archive/`。`docs/band-install.md` 保存安装方法。不要把历史验证结果当作当前版本已验证。
3. 工作目录以当前检出的仓库根目录为准，不依赖旧电脑绝对路径。当前为 Windows PowerShell；使用 main 分支，每次先检查工作区和远程状态。可迁移开发入口见 docs/development.md。
4. 手机 0.2.1 已于 2026-09-22 重新核对；0.2.2 实拍证明导航能显示，0.2.3 后续实拍证明设置页已恢复显示。0.2.4 本地 39 项测试、1779 项浏览器交互/几何断言、RPK 编译检查及签名验证通过；交付 outputs/releases/v0.2.4/NAV-BAND-024.rpk，2026-09-22 已传至手机并核对 SHA-256，用户确认安装使用正常，具体功能与长期表现尚未逐项验收。保留用户认可的手机界面。
5. 0.2.4 开发轮仅在电脑验证；2026-09-22 经用户授权只传包，未操作安装界面。以后传包仍需重新查 ADB 状态并核对 SHA-256。浏览器操作使用 agent-browser，源码交互预览为 http://127.0.0.1:4173/。字体、字号联动、原生滚动和保存等需本版本真机反馈，旧版自动打开、锁屏常亮不能替代当前验收。

## 核心边界

- Android APK 与 Vela RPK 必须保持相同包名 `io.github.mi9pro.navigation` 和匹配的签名。复用 `signing/development.p12` 与 `wearable/sign/debug/`，不要重新生成或轮换证书。
- 手环只安装 RPK；AstroBox 中使用「快应用」类型。手机 APK 不能安装到手环。
- 只处理 `com.autonavi.minimap` 的通知。保留无法识别的原文，不编造转向、距离、道路或路线。
- 同步启停、导航开始/结束、断连、过期、页面隐藏和销毁必须分别处理。自动打开手环页面应按一次导航控制，不能每次通知更新都抢回前台。
- 保留已能显示的通信格式，除非取得不兼容证据。SDK 发送成功、收到 ACK、用户看到画面是不同证据。
- 常亮是手环导航页面在前台保持点亮，不等于后台显示或系统 AOD。手机 0.1.3 的自动打开及超过两分钟锁屏同步已获用户确认；长时与重启恢复等限制见交接文件。
- 不因缺少 ACK 就否认用户已确认的实际显示；也不能用模拟原生接口的测试证明真机常亮或后台运行成功。
- 普通开发、构建、检查和已授权的安装联调无需反复确认。不要自行 root、降级/替换运动健康、重置手环或改用他人的签名。

## 代码位置

| 文件 | 作用 |
| --- | --- |
| `android/app/src/main/java/io/github/mi9pro/navigation/NavigationParser.java` | 纯 Java 通知文字解析 |
| 同目录 `NavigationNotificationListener.java` | 通知监听、350 毫秒去抖、活动心跳补读、等待 60 秒兜底 |
| 同目录 `WearBridge.java`、`SendPolicy.java` | XMS 授权、连接、发送去重/节流、手动打开调试、诊断 |
| 同目录 `MainActivity.java` | 手机设置及诊断页面 |
| 同目录 `NavigationSyncService.java`、`SyncRestoreReceiver.java` | 后台同步、唤醒锁、停止和恢复 |
| 同目录 `AutoLaunchPolicy.java` | 按导航控制自动打开、短暂无通知去抖、有限重试 |
| `wearable/src/pages/index/index.ux` | 手环固定尺寸页面、互联、常亮与生命周期 |
| `wearable/src/common/protocol.js` | 消息校验、去重、20 秒过期与显示状态 |
| `wearable/src/common/presentation.js` | 原文分行及错误显示 |
| `wearable/src/common/settings.js` | 显示设置边界、原生存储、串行写入与销毁保护 |

## 本机工具与验证

离线界面开发只需要 Node.js 22+（推荐 24）：npm test、npm run dev。无需手机、手环、签名或 Android SDK。

从项目根目录运行 Android 检查（先配置 JAVA_HOME 为 JDK 17+，ANDROID_HOME 为本机 SDK；本次电脑可先执行 `. .local/environment.ps1`，该文件不提交）：

```powershell
& android/gradlew.bat -p android -Punsigned :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --console=plain
```

无签名 APK 仅验证编译，不能安装。生成可安装包时恢复原签名并去掉 -Punsigned。手环改动（构建需要原签名，npm 脚本会在缺失时拦截，禁止回退为 toolkit 默认签名）：

```powershell
npm --prefix wearable test
npm --prefix wearable run build
node tools/check-wearable-package.cjs
```

- 针对行为变化增加有意义的测试，尤其自动启动的去重、重试和结束状态；文档变动不必重跑构建。
- 构建后更新 `outputs/releases/<版本>/` 中交付文件和同目录 `SHA256SUMS.txt`。推送手机后核对 SHA-256，并分别记录「已构建」「已传输」「已安装」「真机已验证」。
- 更新交接记录时保留未验证的限制，不能把计划写成实现。

## ADB 与本地数据

- 本次 ADB 为 `.local/adb/platform-tools/adb.exe`；截图工具也支持 ADB / ANDROID_HOME 环境变量和 PATH。每次联调先运行 `adb devices -l`，不要假定手机仍连接、解锁或处于上次页面。
- 手机截图使用 `node tools/phone-screenshot.cjs`，输出 `.local/screenshots/phone.png`；不要通过 PowerShell 文本重定向保存 PNG。
- UI 自动化必须以新鲜的 UI 树或截图为依据；`uiautomator dump` 超时、空树或页面被用户切换后，不能用旧坐标继续点击。
- 原始手机截图为 1200×2670，工具展示时可能缩放；点击坐标要按原始尺寸换算。
- 采集高德通知使用 `tools/capture-amap.ps1`。该手机可能忽略 `dumpsys notification` 包过滤，脚本会在保存前二次过滤。不要直接输出或保存所有应用的通知；`dumpsys notification --help` 在此手机也可能直接输出通知。
- `.local/`、签名目录、通知样本和工具缓存不应公开。不要在文档或日志中写入 AuthKey、私钥、账号令牌或用户路线详情。
- 只检查任务相关应用的数据；暂停点击时应明确告知用户，避免与其同时操作手机。
