# 项目开发约定

本项目把 Android 高德地图导航通知同步到小米手环 9 Pro。与用户使用中文沟通。

## 开始工作

1. 先读根目录 `HANDOVER.md`，了解最近的用户反馈、已安装版本和未完成工作，再读相关源码。
2. `docs/navigation-verification.md` 保存历史联调证据；`docs/band-install.md` 保存安装方法。不要把历史验证结果当作当前版本已验证。
3. 工作目录为 `D:\VscodeProject\mi9pro-gaode`，终端是 Windows PowerShell。已初始化 Git，使用 main 分支；每次先检查工作区和远程状态。
4. 当前手机 0.2.1 已安装，手环已安装 0.2.0；手环 0.2.1 界面初稿仅本地构建。用户要求今天停止开发、先上传 GitHub。下次继续时再落实「导航页只保留箭头和距离，去掉下方文字，整体居中」，保留用户认可的手机界面。
5. 用户已要求暂停设备测试。恢复联调前以新的用户指令为准；浏览器操作使用 agent-browser。旧版自动打开、锁屏常亮已确认，不能替代新版本验收。

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

## 本机工具与验证

从项目根目录运行 Android 检查：

```powershell
$env:JAVA_HOME = "$PWD\.local\jdk\jdk-21.0.12.1+1"
$env:GRADLE_USER_HOME = "$PWD\.local\gradle-cache"
& .local/gradle/gradle-8.9/bin/gradle.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --console=plain
```

手环改动：

```powershell
npm --prefix wearable test
npm --prefix wearable run build
node tools/check-wearable-package.cjs
```

- 针对行为变化增加有意义的测试，尤其自动启动的去重、重试和结束状态；文档变动不必重跑构建。
- 构建后更新 `outputs/` 中交付文件和 `outputs/SHA256SUMS.txt`。推送手机后核对 SHA-256，并分别记录「已构建」「已传输」「已安装」「真机已验证」。
- 更新交接记录时保留未验证的限制，不能把计划写成实现。

## ADB 与本地数据

- ADB 为 `.local/adb/platform-tools/adb.exe`。每次联调先运行 `adb devices -l`，不要假定手机仍连接、解锁或处于上次页面。
- 手机截图使用 `node tools/phone-screenshot.cjs`，输出 `.local/screenshots/phone.png`；不要通过 PowerShell 文本重定向保存 PNG。
- UI 自动化必须以新鲜的 UI 树或截图为依据；`uiautomator dump` 超时、空树或页面被用户切换后，不能用旧坐标继续点击。
- 原始手机截图为 1200×2670，工具展示时可能缩放；点击坐标要按原始尺寸换算。
- 采集高德通知使用 `tools/capture-amap.ps1`。该手机可能忽略 `dumpsys notification` 包过滤，脚本会在保存前二次过滤。不要直接输出或保存所有应用的通知；`dumpsys notification --help` 在此手机也可能直接输出通知。
- `.local/`、签名目录、通知样本和工具缓存不应公开。不要在文档或日志中写入 AuthKey、私钥、账号令牌或用户路线详情。
- 只检查任务相关应用的数据；暂停点击时应明确告知用户，避免与其同时操作手机。
