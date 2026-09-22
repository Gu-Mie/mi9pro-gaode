# 开发环境与首次检出

项目不绑定开发电脑。仓库可放在任意目录；界面预览和 JavaScript 测试不依赖手机、手环、原签名或 Android SDK。运行端目前适配 Android 手机 + 小米手环 9 Pro，其他穿戴设备尚未适配。

首次使用安装包请看 [首次使用](getting-started.md)，参与开发请看 [贡献指南](../CONTRIBUTING.md)。公开源码不包含私有签名和本地 `outputs/` 安装包。

## 只开发界面：Node.js 即可

安装 Node.js 22+（推荐 24，见 .nvmrc），在仓库根目录运行：

~~~sh
npm run doctor
npm test
npm run dev
~~~

根目录没有第三方依赖，无需先运行 npm install。测试覆盖手环协议、页面生命周期和开发工具。

提交前在完整 Git 检出中运行 `npm run check:public`（需要 Git）。它检查当前候选文件、暂存区和全部本地可达历史的禁止路径及少量凭据模式；浅克隆会被拒绝，应先获取完整历史。CI 在 Windows/Ubuntu 与 Node.js 22/24 上执行 JS 测试、公开文件检查及源码预览生成，不持有签名，也不验证真机或 Android 编译。

- http://127.0.0.1:4173/：使用当前 .ux 模板、样式与实际页面脚本生成可操作源码预览。可进入设置、加减、返回与切换导航状态；原生接口由浏览器模拟。保存页面或公共 JS 后自动刷新。
- http://127.0.0.1:4173/settings：可操作设置预览，字体/字号/箭头自定义、当前浏览器保存、项目版本号。单独生成执行 `npm run settings`。
- npm run preview / npm run settings：分别生成源码预览与设置原型的离线 HTML，输出到 `outputs/previews/`，目录自动创建。PORT 环境变量可调整服务端口。
- 服务仅监听本机，只提供固定预览路径，不暴露仓库、签名或手机截图。

示例数据只在预览工具中。浏览器字体、布局与 Vela 原生组件存在差异，预览和模拟测试不能证明真机显示、后台通信、常亮或耗电。

## Android 检查与无签名构建

需要 JDK 17+、Android SDK Platform 35、Build Tools 34.0.0、Platform Tools。Gradle Wrapper 固定为 8.9（带下载校验），AGP 8.7.3，不需要全局 Gradle。通过 JAVA_HOME 选择 JDK，通过 ANDROID_HOME 或被 Git 忽略的 android/local.properties 配置 SDK。

小米互联 SDK AAR 不在仓库中。Windows 从项目根目录运行 tools/fetch-xiaomi-sdk.ps1，从官方示例包下载并核对 SHA-256。macOS/Linux 可下载相同的 [官方 ZIP](https://cdn.cnbj3-fusion.fds.api.mi-img.com/quickapp-vela/interconnect_dev_test_demo.zip)，提取 interconnect_dev_test_demo/libs/xms-wearable-lib_1.4_release.aar 至 android/app/libs/，核对 SHA-256 为 9c40fd1c5409bb948523d503af71e2978ae522c35636afe7d64f474c0f6bc195。

没有原签名也能检查和编译，显式使用 -Punsigned：

~~~powershell
.\android\gradlew.bat -p android -Punsigned :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --console=plain
~~~

macOS/Linux 使用 sh android/gradlew 替换 .\android\gradlew.bat，其余参数相同。无签名产物为 android/app/build/outputs/apk/debug/app-debug-unsigned.apk，仅用于验证编译，不能安装或覆盖现有应用。去掉 -Punsigned 后使用原配置签名；缺少 signing/development.p12 会失败，不会生成另一套身份。

## 生成可安装包

原签名代表应用身份，不绑定电脑。可以通过可信的私下备份迁移至新电脑，也可以将打包集中在持有原签名的构建机；本仓库尚未配置远程签名服务。

恢复原文件：

~~~text
signing/development.p12
wearable/sign/debug/private.pem
wearable/sign/debug/certificate.pem
~~~

不要用新签名替代原身份。已安装包不能还原签名私钥。tools/prepare-signing.ps1 用于最初建立身份，迁移现有项目时不能运行它生成新证书。私钥始终被 Git 忽略。

~~~sh
npm run deps:wearable
npm --prefix wearable test
npm run build:wearable
node tools/check-wearable-package.cjs
~~~

依赖由 wearable/package-lock.json 锁定（aiot-toolkit 2.0.5）。prebuild 在缺少原手环证书时停止，避免 toolkit 回退到自带证书；start 和 release 也有签名前置检查。检查确认文件完整和密钥配对，不代替 APK/RPK 身份一致性及真机验证。发布包需另按 toolkit 约定恢复原发布签名，并与 debug 证书保持同一身份。

RPK 输出为 wearable/dist/io.github.mi9pro.navigation.debug.0.2.4.rpk。可使用 `node tools/verify-rpk-signature.cjs wearable/dist/io.github.mi9pro.navigation.debug.0.2.4.rpk` 检查包内签名与摘要。仅通过 AstroBox「快应用」安装至手环，方法见 [安装指南](band-install.md)。手机 APK 与手环 RPK 不可互换。

0.2.4 附加字体 TTF、许可和字符覆盖信息已经放入 wearable/src/common/，普通开发与打包仍只需 Node.js，不读取电脑安装字体。只有重新制作字体子集才需要 Python/fontTools 和原字体文件；来源、哈希及重建方式见 [显示设置记录](display-settings-024.md)。

## 真机联调

只有这一步需要手机/手环。每台新电脑首次连接都需要用户在手机确认 USB 调试授权。

1. 运行 adb devices -l，确认状态为 device。
2. 核对实际版本、通知使用权、同步开关、运动健康连接及互联授权。
3. 用户在高德自行开始导航，分别记录 SDK 发送、ACK、手环画面与锁屏表现。
4. 截图运行 node tools/phone-screenshot.cjs。ADB 按 ADB 环境变量、项目 .local/adb/platform-tools/、Android SDK、PATH 顺序查找，支持各系统文件名。

通知采集继续用 tools/capture-amap.ps1 二次过滤，避免保存其他应用通知。浏览器操作使用 agent-browser。

## 本地资料与交付边界

.local/、outputs/、SDK 路径、缓存、签名、原始通知、手机截图和 SDK AAR 不纳入 Git。旧设计提案已归档到维护者本地，不是开发依赖。当前预览放在 `outputs/previews/`，候选安装包放在 `outputs/releases/<版本>/`，历史产物放在 `outputs/archive/`。构建、传输、安装和实际显示分别记录，见 [交接摘要](../HANDOVER.md) 与 [验证摘要](navigation-verification.md)。

2026-09-18 本次验证环境为 Windows、JDK 17、Node.js 24。其他系统入口按可迁移方式编写，尚未在 macOS/Linux 实测。
