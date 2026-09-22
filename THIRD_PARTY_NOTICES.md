# 第三方代码、资源与工具

项目根目录的 [MIT 许可证](LICENSE) 适用于原创代码和文档。以下内容保留各自许可，不因本项目开源而重新授权。

## 随源码提供的字体

| 文件/家族 | 上游 | 许可与版权声明 |
| --- | --- | --- |
| `BandSong.ttf` / BandSong | [ZCOOL XiaoWei](https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei) | [SIL OFL 1.1 与原作者声明](wearable/src/common/fonts/BandSong-OFL.txt) |
| `BandKai.ttf` / BandKai | [LXGW WenKai Lite v1.522](https://github.com/lxgw/LxgwWenKai-Lite/releases/tag/v1.522) | [SIL OFL 1.1、保留字体名称及附加许可](wearable/src/common/fonts/BandKai-OFL.txt) |
| `BandRound.ttf` / BandRound | [ZCOOL QingKe HuangYou](https://github.com/google/fonts/tree/main/ofl/zcoolqingkehuangyou) | [SIL OFL 1.1 与原作者声明](wearable/src/common/fonts/BandRound-OFL.txt) |

这些文件由 `tools/prepare-band-fonts.py` 制作子集并改名，保留原始版权与许可记录；上游哈希及修改范围见 [字体实现记录](docs/display-settings-024.md)。完整许可随字体和 RPK 一同提供。未分发电脑自带的宋体、楷体或圆体字库。

## Gradle Wrapper

`android/gradlew`、`android/gradlew.bat`、`android/gradle/wrapper/gradle-wrapper.jar` 来自 Gradle 8.9，保留原作者版权及 Apache-2.0 许可，完整文本见 [Apache-2.0](licenses/Apache-2.0.txt) 和 [Gradle 上游 LICENSE](licenses/Gradle-LICENSE.txt)。来源为 [Gradle v8.9.0](https://github.com/gradle/gradle/tree/v8.9.0)。

## 单独下载的依赖

- 小米 `xms-wearable-lib_1.4_release.aar`：从小米官方示例包单独获取并校验哈希，源码仓库不分发该 AAR；获取入口见 [开发文档](docs/development.md)。手机 APK 内含此互联组件，其权利归原权利人所有，不适用本项目 MIT 许可。已检查的官方文档与示例包未提供可确认的独立再分发条款，本项目不据此声称已取得额外授权或该 SDK 可以任意再分发。
- `aiot-toolkit` 2.0.5 及依赖：由 `wearable/package-lock.json` 锁定，仅构建时安装；许可见各依赖包。`node_modules/` 不随源码提交。
- Android Gradle Plugin 8.7.3、AndroidX Annotation 1.8.2、JUnit 4.13.2 及其依赖由 Gradle 获取，按各自许可使用。发布二进制前还需检查最终打包依赖及所需声明，本文不替代 APK 的完整依赖清单。

## 图片与名称

导航图标由仓库内绘图脚本生成；`docs/images/` 的图片是使用虚构数据的浏览器预览截图，不代表真机效果。历史 AI 概念图及提示词已归档到维护者本地，不属于当前公开源码的必要资源。

高德、小米、AstroBox 等名称仅用于说明兼容对象与安装流程，不表示官方合作或背书。仓库不分发运动健康、高德或 AstroBox 的安装包及其提取内容。
