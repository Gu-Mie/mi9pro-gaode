# 腕上导航开发交接

更新日期：2026-09-14。项目路径：`D:\VscodeProject\mi9pro-gaode`。

## 当前交接：停止开发，保存 GitHub

用户已认可手机界面，最新明确要求：**导航页只保留箭头和距离，去掉下方文字，整体居中**。随后要求「先上传到 github 仓库吧，今天的开发先到这里」。因此最新精简要求只记录为下一次待办，尚未改入源码；不再进行设备测试或安装。

### 当前版本与证据

| 端 / 文件 | 当前状态 | SHA-256 |
| --- | --- | --- |
| 手机 outputs/NAV-PHONE-021.apk | 0.2.1 / code 6，已构建、已传输校验、已安装；用户认可界面 | d88eb86aba8b31a533dc518a6c7ba59fbc09a91987b2b36c54f9817482026dad |
| 手环 outputs/NAV-BAND-021.rpk | 0.2.1 / code 6，界面初稿仅本地构建；未传输、未安装、未真机验证 | a6ab848c23119c51c4f9df6246fa8ba0b6ae5a029de9eaf1f4eab33490dfef06 |
| 手环 outputs/NAV-BAND-020.rpk | 0.2.0 / code 5 已安装，AstroBox 显示 v5；用户确认可以正常打开 | d77802147f840c23f51f0d59ed8f6ebef6f250b33c1a03a6c7f80513adc5702a |

通用名 APK/RPK 均已更新为本地 0.2.1，原版文件仍保留；校验表见 outputs/SHA256SUMS.txt。两端始终复用原证书。

- 手机 0.2.1 重做首页及设置面板：浅色背景、深绿色主视觉、清晰的同步开关与连接入口，支持深色配色和系统窗口边距。用户反馈「手机端 app 我觉得做的不错了」。
- 手机 26 项单元测试、Lint（0 错误、3 警告）和 APK 构建通过；初次安装暴露窗口尚未创建时获取 InsetsController 导致的启动崩溃，已调整为创建 decor 后获取并重新安装。首页与偏好面板已查看；深色模式和大字体尚未真机核验。
- 手环 0.2.1 初稿采用箭头与大号距离、绿色指引卡、等待页手机/手环图形；页面仍包含下方指引和原文。保留原通信、过期与常亮生命周期。用户叫停测试后仅构建，没有运行该版本测试或包内检查。
- 本地预览生成器为 tools/preview-wearable.cjs，示例数据只在工具内。agent-browser 已用于打开预览；最近输出的 PNG 为白图，未作为交付截图或真机证据，下一次需重新截图核对。

### 安装重启反馈与暂停现场

用户曾反馈安装 0.2.0 过程中重启，后恢复正常。先装回 0.1.2 成功；安装 0.2.0 期间 AstroBox 曾断连，当时用户未观察到是否重启，不能将断连等同于重启。一次重试的文件选择器返回非 RPK 文件，未继续安装该文件。后续 AstroBox 显示腕上导航 v5，用户明确确认能正常打开，当前无需再重复安装 0.2.0。

本地 tools/verify-rpk-signature.cjs 已验证 0.1.2、0.2.0 的签名、内容摘要和文件清单，篡改样本被拒绝；没有取得原生崩溃日志，安装重启根因仍不确定，不要声称被新 UI 修复。

暂停时手机「同步导航」仍为关闭，用于安装期间停止转发；AstroBox 已退出，运动健康最后显示「正在连接设备」，尚未确认恢复连接。用户要求停止测试后没有继续操作。下次获准联调时先重新检查 USB、设备连接、同步开关与实际已安装版本，不能假定仍处于上次页面。

### 下一次继续

1. 保留手机 0.2.1 界面；只调整手环导航页为箭头和距离居中，移除下方文字。等待页是否继续调整不是本次确认的要求。
2. 按用户的新指令恢复检查；浏览器使用 agent-browser。构建后区分本地包、传输、安装和真机验证状态。
3. 旧版的自动打开、约两分钟锁屏常亮是历史证据；新版、长时稳定性、耗电对照和 ACK 仍不可直接宣称通过。

Git 已在本地初始化 main 分支，上传目标为 Gu-Mie/mi9pro-gaode 私有仓库；实际提交与远程以 git status、git remote -v 和远程记录为准。签名、缓存、通知样本和安装包被忽略，首次检出说明见 [开发环境](docs/development.md)。

## 历史：0.2.0 优化初次交接

用户要求双端页面精简、耗电优化，并探索高德直连。目前已完成代码、构建与自动检查，**手机 0.2.0 已安装；手环 0.2.0 已传输并校验，尚未安装**。手机仍通过 USB 连接但锁屏，已请求用户解锁，暂未收到回复。

下一步：收到解锁回复后，检查手机精简页面，通过 AstroBox「快应用」更新手机 Download 中的 NAV-BAND-020.rpk，再恢复运动健康连接，验证手环新版显示、常亮开关、自动打开及锁屏。不要将旧版本验收当作新版验收。

| 文件 | 状态与 SHA-256 |
| --- | --- |
| outputs/NAV-PHONE-020.apk | 已构建、已传输校验、已安装；d99c03c97843a4fc74ab8340fc0a35200d19092a5a32ffed02928084bb6af253 |
| outputs/NAV-BAND-020.rpk | 已构建、已传输校验、尚未安装；d77802147f840c23f51f0d59ed8f6ebef6f250b33c1a03a6c7f80513adc5702a |

通用文件名 wrist-navigation-phone-debug.apk 与 wrist-navigation-band9pro-debug.rpk 也已更新为 0.2.0。实际手环仍为用户此前确认的 0.1.2。两端新包 versionCode 均为 5，复用原签名。

本轮关键变化：

- 手机首页仅状态、同步开关和设置，移除每秒刷新、原文调试与演示按钮；手环保留必要导航内容，移除演示、按钮和说明。
- SendPolicy 使相同活动导航仅保留 8 秒心跳；变化及时发送，500 毫秒内的突发变化合并。等待/结束/暂停状态仅发送一次。
- 通知监听关闭同步后停止读取；活动导航按心跳期限补读，等待时 60 秒兜底。重新启用先清理旧快照，再读取当前通知，避免发送暂停前的旧路线。
- 手环用一个 20 秒过期定时器替代每秒 paint；无导航/页面隐藏时没有计时器，重复心跳不重建字段和原文列表。
- 可选布尔字段 keepScreenOn 默认沿用常亮；手机设置可关闭。手机活动导航的部分唤醒锁保留，每约 30 秒续期，不能把减少 acquire 调用说成减少持锁时长。
- 26 项 Android 测试、Lint 0 错误和构建通过；24 项手环测试、构建与 RPK 包内检查通过。模拟接口不是原生界面验收。
- 22:48:01 安装后进程 24070 在手机锁屏中恢复前台服务和真实导航，约每 8 秒发送；至 22:50:13 已连续超过两分钟，SDK 发送成功、唤醒锁有效。手环 0.2.0 画面及实际电量对照尚未验证。
- demo 运行时生成和调试命令已移除；旧 demo 帧仍明确标注以兼容旧端。测试夹具只存在于测试和打包检查中。

详细改动和测量边界见 [0.2.0 优化记录](docs/optimization-020.md)。直连研究见 [高德直连探索](docs/direct-amap.md)：运动健康存在专用通道，但要求配套应用身份和签名，尚未取得并验证适配 9 Pro 的官方高德 RPK；保留手机转发服务，日常无需打开其页面。

以下均为 **0.1.3 手机 + 0.1.2 手环的历史记录**，包含旧文件名、旧 UI 和旧调试命令；当前实现以本节与 optimization-020.md 为准。

## 历史功能版验收

**手机 0.1.3 已构建、校验并安装；用户已确认高德开始导航后，手环从表盘自动打开腕上导航并显示真实指引，手机持续锁屏超过两分钟后手环仍显示导航并保持亮屏。** 本轮自动打开及短时锁屏问题已通过真机验收。详细实现和验证边界见 [后台同步记录](docs/background-sync.md)。

改动前的关键反馈：

> 可以常亮，但必须要保持腕上导航一直持续前台才可以。

进一步询问是哪一端后，用户明确回答：

> 手机和手环都必须停留在腕上导航页面。

因此不要继续把问题描述为「常亮接口完全无效」。上述前台限制是旧版反馈；手机 0.1.3 后续已通过自动打开及超过两分钟锁屏持续同步验证。手环离开导航页面后释放常亮是当前设计，不等于系统 AOD。

本轮新增 `NavigationSyncService`、`SyncRestoreReceiver`、`AutoLaunchPolicy`，目前有 10 项策略测试。手机 APK 更新为 0.1.3，手环继续使用原有 0.1.2。手机 0.1.2 曾漏发快速结束/重启的打开请求：空通知至新导航仅 1983 毫秒，小于旧 5 秒阈值。0.1.3 改为依据空通知集合和 1 秒间隔判断，并修复重复连接的 `you have registered` 及旧权限状态提示。用户明确反馈「已自动打开并显示导航」。

锁屏联调发现 Greezer 在 22:06:27 以 `reason : tobg caller : 1` 冻结本应用，前台服务和 AOSP 电池优化豁免并不足以证明锁屏正常。随后检查了小米省电页面（显示「无限制」）、系统 `MILLET_NO_RESTRICT_APP`（已含本应用），并操作自启动开关。手机 0.1.3 在 22:25:24 至 22:27:44 持续锁屏约 140 秒仍持续发送导航、唤醒锁未禁用、无新增冻结记录；用户随后确认「仍显示导航并保持亮屏」。不能单凭本次结果把成功归因于某一个设置。

## 历史：当前设备与版本

| 项目 | 交接时已知状态 |
| --- | --- |
| 手机 | 小米 15，Android 16 / API 36 |
| ADB | `.local/adb/platform-tools/adb.exe`；此前序列号 `<device-serial>`，下次重新检查连接 |
| 高德 | `com.autonavi.minimap`，16.22.0.2018 |
| 小米运动健康 | `com.mi.health`，3.59.0 |
| 手环 | 小米手环 9 Pro，AstroBox 显示固件 3.1.175 |
| AstroBox | `moe.astralsight.astrobox`，2.1.0；通过「快应用」安装 RPK |
| 手机腕上导航 | `io.github.mi9pro.navigation`，0.1.3 / versionCode 4，已安装 |
| 手环腕上导航 | 同包名，0.1.2 / versionCode 3；用户明确确认顶部显示 0.1.2 |

用户此前允许通过 USB 安装、操作手机和联调；手机曾已解锁。下一次不要假定连接、解锁和蓝牙归属仍与本次相同。

## 历史：已完成及证据

1. **黑屏修复**：手环 0.1.1 将首屏改成固定尺寸的 `div`，原文用明确高度的列表行；互联接口延后加载并捕获异常。用户确认本地演示能显示。
2. **高德通知读取修复**：手机主用户的高德 `POST_NOTIFICATIONS` 曾关闭，开启后才出现真实通知。真实样本为「直行152米 / 高德导航中」，ID 1236，没有 ongoing 标志。解析器已支持动作后紧接距离，不需要读取焦点通知私有字段。
3. **通知监听恢复**：更新 APK 后曾出现权限仍在、服务未绑定。`MainActivity.onResume()` 加入 `requestRebind`；联调时还重新注册了原已授权的监听。随后确认 `listenerConnected=true`。
4. **两端实际显示**：用户反馈「现在手机端可以了，手环显示的是手机端内容」。手机 SDK 授权、配套应用检查、发送也成功。
5. **导航常亮 0.1.2**：声明 `system.brightness` 并调用 `setKeepScreenOn`；用户更新后最终确认可常亮，条件是手机和手环都停留在腕上导航页面。
6. **交付与检查**：手机 0.1.3 的 21 项测试（11 项解析、10 项自动启动）、Lint（0 错误）及 APK 构建通过。手环代码未改动，沿用此前通过的 19 项 JavaScript 测试与打包验证结果。
7. **从表盘自动打开**：0.1.3 在 22:23:41 检测高德空通知，22:23:45 新导航触发打开请求，SDK 接受；用户确认「已自动打开并显示导航」，测试时手机保持亮屏，没有打开手机腕上导航页面。
8. **手机连续锁屏**：0.1.3 的进程 26254 在约 140 秒锁屏内持续发送真实活动导航，序号增至 83；系统保持 Dozing、最后入睡时间未变、部分唤醒锁有效。用户确认同期手环「仍显示导航并保持亮屏」。

不能夸大的部分：

- 手机诊断中 `lastAckAt=0`，ACK 回程还没验证成功。实际显示由用户确认。
- 本轮已取得 Greezer 冻结本应用的记录，冻结时 `dumpsys power` 将本应用唤醒锁标为 DISABLED，应用服务 dump 超时；唤醒手机后系统记录 `THAW ... reason : screen on`，发送恢复。
- 没有取得手环原生系统日志；已验证约 140 秒手机锁屏持续发送，尚未完成长时间锁屏稳定性验证。
- 用户最初反馈「仍自动熄屏」，随后确认在两端前台可常亮，以最新反馈为准。

## 历史：已交付文件

| 文件 | 版本与用途 |
| --- | --- |
| `outputs/NAV-PHONE-AUTO-013.apk` | 手机 0.1.3，当前已安装，快速重启导航等修复 |
| `outputs/NAV-PHONE-AUTO-012.apk` | 保留的手机 0.1.2，后台同步初版 |
| `outputs/wrist-navigation-phone-debug.apk` | 与手机 0.1.3 内容相同的通用文件名 |
| `outputs/NAV-PHONE-011.apk` | 保留的旧手机 0.1.1 |
| `outputs/NAV-KEEPON-012.rpk` | 手环 0.1.2，当前已安装，包含常亮 |
| `outputs/wrist-navigation-band9pro-debug.rpk` | 本地与 0.1.2 内容相同的通用文件名 |
| `outputs/NAV-FIX-011.rpk` | 保留的手环 0.1.1 黑屏修复版 |

0.1.2 已传到手机 `内部存储 / Download / NAV-KEEPON-012.rpk`，并核对手机与电脑 SHA-256 一致：

```text
52c8157a5b0f66aad75a2db14f1b03ca50ab821c3fe3233c09b3f99dc12b6fb6
```

当前手机 0.1.3 APK SHA-256（手机 Download 中同名文件已核对一致）：

```text
d9809c8c9c177a0c6a333bb098fd55fa9e0ef65bc73aa0d771faf7ace5091235
```

完整校验表见 `outputs/SHA256SUMS.txt`。手机 Download 中可能还有旧的通用名 RPK，不能根据通用文件名认定是最新版；优先使用带版本号的文件。

## 历史：当前实现

```text
高德标准通知文字
  → Android NotificationListenerService
  → 手机 WearBridge / 小米 XMS SDK
  → 小米运动健康与手环连接
  → Vela interconnect
  → 手环导航页面
```

- Android：Java 17，AGP 8.7.3，Gradle 8.9，compile/target SDK 35，最低 API 26；使用官方 `xms-wearable-lib_1.4_release.aar`。
- `NavigationNotificationListener`：只处理高德，通知变动去抖 350 毫秒；每 8 秒重读活动通知；选最新可识别且非分组摘要的记录。
- `WearBridge`：主线程串行化 SDK 回调；只连接一个设备；检查权限和同签名手环应用；UTF-8 JSON、会话与序号、发送节流、超时、重连、15 秒演示。
- `WearBridge` 已接入 `AutoLaunchPolicy`，在真实导航及节点就绪时调用 `nodes.launchWearApp(nodeId, "/pages/index")`。SDK 返回 `Task<Void>`，有成功/失败、10 秒超时和有限重试；保留手动按钮。
- `NavigationSyncService` 是带可停止通知的 `connectedDevice` 前台服务；使用附近设备权限，真实导航期间续期 60 秒的部分唤醒锁。`SyncRestoreReceiver` 尝试恢复开机/更新前已启用的同步。实际开机恢复尚未验证。
- 界面提供后台同步、电池优化、系统应用省电与自启动入口。小米的 Greezer 限制需要与 Android 标准电池优化分别核对。
- 手环 `index.ux`：336×480 固定布局；页面可见且导航有效时请求常亮；消息 20 秒未更新、断连、结束/暂停、隐藏/销毁页面时释放。演示也按有效期控制。
- 消息格式当前已经能显示。不要因官方 `send` 文档示例使用对象，就未经证据把现有 JSON 字符串改掉。
- 开发签名位于 `signing/development.p12` 与 `wearable/sign/debug/`。两端已匹配，继续复用。

## 历史：后续验证与改进

自动打开和超过两分钟锁屏持续显示、常亮已取得用户确认。以下为可继续完善的验证及明确限制，不要重复从零开发前台服务：

1. **长时间使用**：本轮自动打开及超过两分钟锁屏已通过；如继续扩大测试，再验证更长时间、真实移动路线及无 USB 供电场景。不要把短时成功扩展为全天候保证。
2. **冻结排查**：若后续复现停止，检查本应用的 Greezer FZ/THAW 记录、唤醒锁及无限制名单。不要全局关闭系统冻结器，也不要修改其他应用设置。
3. **停止与退出**：确认主动离开手环导航后不会反复抢回；结束导航/停用同步后释放唤醒锁及常亮。
4. **恢复边界**：真实重启、无 USB 供电深度休眠、长时断连恢复待测。自动打开去重目前限于单进程，进程重建后活动导航可能再次打开一次；缺少可靠的路线会话标识，暂未持久化去重。
5. **回程 ACK**：手机仍未记录 ACK；已有实际显示证据，不要因此推翻正向传输，也不要猜测性修改消息格式。

本机已授予新增加的 `BLUETOOTH_CONNECT` 与 `POST_NOTIFICATIONS`，并通过 `cmd deviceidle whitelist +io.github.mi9pro.navigation` 添加 Android 电池优化豁免。小米自启动属于另一项系统设置；开机恢复不作无条件保证。

## 历史：手机联调命令

从项目根目录运行；序列号以现场连接为准：

```powershell
& .local/adb/platform-tools/adb.exe devices -l
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell dumpsys activity io.github.mi9pro.navigation
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell dumpsys activity service io.github.mi9pro.navigation.NavigationNotificationListener
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell dumpsys activity service io.github.mi9pro.navigation.NavigationSyncService
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell logcat -d -s WristNav:I '*:S'
.\tools\capture-amap.ps1 -Serial '<device-serial>'
```

服务 dump 偶尔超时，可改看 activity dump 或专用日志；不要仅凭一次 dump 超时断言进程死锁。诊断输出已显式 `writer.flush()`。

调试 APK 接收器仅接受持有 Android `DUMP` 权限的调用方；release 不包含它：

```powershell
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell am broadcast -n io.github.mi9pro.navigation/.DiagnosticReceiver --es command connect
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell am broadcast -n io.github.mi9pro.navigation/.DiagnosticReceiver --es command open
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell am broadcast -n io.github.mi9pro.navigation/.DiagnosticReceiver --es command demo
```

`demo` 会临时替换实际指引 15 秒并明确标注演示，之后恢复，不应在用户需要实际导航时反复调用。

已确认的启动组件：

```powershell
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell am start -n com.mi.health/com.xiaomi.fitness.login.SplashActivity
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell am start -n moe.astralsight.astrobox/.MainActivityDefault
& .local/adb/platform-tools/adb.exe -s '<device-serial>' shell am start -n io.github.mi9pro.navigation/.MainActivity
```

AstroBox 安装后需让运动健康恢复连接才能使用当前互联链路。不要选择恢复出厂设置。此前曾需要用户在手环确认连接；电脑能操作手机不代表能直接操作手环屏幕。

## 关于「直接通过运动健康同步高德」

已针对手机上实际安装的运动健康 3.59.0 APK 作只读分析：

- `NotificationFilterHelper.isMipmapNotification` 对 `com.autonavi.minimap` 且通知 ID 1236 返回 true；`BaseNotifySyncService.handleNotificationPosted` 命中后直接返回，过滤普通通知转发。当前真实导航通知正好命中。
- 运动健康也包含 `AmapWearableConnectService` / `AmapConnectProvider` 高德专用通道。连接要检查手环目标应用存在及手机/手环签名匹配。因此不能说「高德完全不能通过运动健康同步」。
- 自制腕上导航没有高德官方的包名/签名身份，不能直接代替其配套手环应用。尚未验证 9 Pro 当前能获得哪款兼容的高德手环应用。
- 米坛百度作者说明要求相应手机 App、手环快应用及运动健康配合；没有取得其源码或搬运其安装包，不能据此认定第三方手环应用有通用手机通知读取接口。
- 没有 root、安装 Hook 模块、降级或修改运动健康。当前继续开发的是已打通的自有手机配套程序方案。

相关本地材料（均在 `.local/`，不公开）：

- `mi-health-3.59.0.apk`：从用户手机拉取的 APK。
- `mi-health-amap-filter.txt`、`mi-health-base-notify-service.txt`：过滤方法及实际调用处。
- `mi-health-amap-provider.txt`、`mi-health-amap-service.txt`：高德专用通道。
- `mi-health-classes.txt`：约 223 MB 的类/方法清单，已有结果，避免重跑或全量输出。
- `samples/amap-*.txt`：仅高德通知样本，可能包含出行信息。
- `xms-classes.jar`：已提取的 XMS 类，可用本地 JDK 的 `javap` 查看接口。

## 资料索引

- [手环安装步骤](docs/band-install.md)
- [历史联调记录](docs/navigation-verification.md)
- [Vela 常亮接口](https://iot.mi.com/vela/quickapp/zh/features/system/brightness.html)
- [Vela interconnect 与签名要求](https://iot.mi.com/vela/quickapp/zh/features/network/interconnect.html)
- [Android 前台服务类型](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [Android 后台启动前台服务限制](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start)
- [Android Doze 与电池优化](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [米坛小米手环 9 Pro 百度地图作者帖](https://www.bandbbs.cn/threads/18336/)
- [MiHealth_AmapFix 作者记录](https://github.com/JoyElliot/MiHealth_AmapFix)

恢复开发时可直接给代理：**「先读 AGENTS.md、HANDOVER.md 和 docs/background-sync.md，依据最新真机结果继续完善自动导航同步。」**
