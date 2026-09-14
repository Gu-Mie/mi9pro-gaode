# 开发环境与首次检出

本项目包括原生 Android 手机程序和 Xiaomi Vela 手环快应用。当前源码双端版本为 0.2.1；安装及真机验证状态见 [HANDOVER.md](../HANDOVER.md)。

## 仓库内容

仓库保存源码、测试、构建配置、工具和交接文档。.local/、outputs/、本机 SDK 路径、依赖缓存、通知样本、手机截图、签名目录与小米 SDK AAR 均不纳入版本控制。安装包保留在原开发电脑的 outputs/，首次检出不会自带安装包。

## Android

需要 JDK 17 或兼容版本、Android SDK Platform 35、Gradle 8.9；项目使用 AGP 8.7.3，Java 源码级别为 17。设置 JAVA_HOME，通过 ANDROID_HOME 或本地 android/local.properties 指定 Android SDK。

小米互联 SDK 可通过 tools/fetch-xiaomi-sdk.ps1 从官方示例包下载，并核对固定 SHA-256。

当前已配对设备依赖原签名。请从受信任的私下备份恢复 signing/development.p12 和 wearable/sign/debug/，不要上传私钥。tools/prepare-signing.ps1 在证书缺失时会生成新身份，**不能用于替换现有设备的签名**；恢复已有项目时不要运行它生成新证书。

环境和签名就绪后，从项目根目录运行：

~~~powershell
.\android\gradlew.bat -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --console=plain
~~~

APK 输出：android/app/build/outputs/apk/debug/app-debug.apk。原开发电脑的已安装工具链路径见 [AGENTS.md](../AGENTS.md)。

## 手环

需要 Node.js 与 npm；本机现有环境使用 Node.js 24，aiot-toolkit 锁定为 2.0.5。先恢复上述同身份签名，再执行：

~~~powershell
npm --prefix wearable ci
npm --prefix wearable test
npm --prefix wearable run build
node tools/check-wearable-package.cjs
~~~

RPK 输出：wearable/dist/io.github.mi9pro.navigation.debug.0.2.1.rpk。手环通过 AstroBox 的「快应用」类型安装，详细步骤见 [安装指南](band-install.md)。

node tools/preview-wearable.cjs 可生成本地 HTML 设计预览，运行前确保 outputs/ 存在；预览数据只在工具内，未打入手环程序。浏览器操作使用 agent-browser。浏览器排版与 Vela 字体、原生组件可能不同，预览不代表真机通过。

## 验证边界

以上是后续开发的命令，不代表本次交接已运行。用户暂停测试后，手环 0.2.1 仅完成构建，没有重新运行测试和包内检查，也未安装到手环。每次交付分别记录已构建、已传输、已安装和真机已验证。
