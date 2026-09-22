# 文件公开范围与发布

## 源码仓库

| 内容 | 处理方式与原因 |
| --- | --- |
| android/、wearable/ 的源码与测试 | 公开，供审阅、修改和验证 |
| 图标、箭头、字体及 OFL 文本 | 公开，属于可构建和预览所必需的资源 |
| Gradle Wrapper、package-lock.json、构建配置 | 公开，固定构建工具和依赖；Wrapper JAR 是必要的工具文件 |
| tools/、.github/、许可证、隐私与贡献说明 | 公开，支持开发和维护 |
| docs/、当前预览截图、简明 AGENTS/HANDOVER | 公开，保留使用、实现与验证所需信息 |
| APK、RPK、校验表、二进制第三方说明 | 仅作为对应 GitHub Release 附件，不提交到源码 |
| 旧安装包、旧源码 ZIP、生成的预览 HTML | 留在本地 outputs/，不重复上传 |
| 过时设计图、AI 提示词、完整开发流水、米坛草稿 | 本地归档，不是当前版本使用或构建必需材料 |
| 签名私钥、账号令牌、AuthKey、通知样本、真实路线、手机截图 | 不公开 |
| .local/、node_modules/、build/、dist/、本机 SDK 配置 | 不公开，可重新生成或仅适用于维护者电脑 |
| 小米 SDK AAR | 从官方渠道单独下载，源码仓库不收录；MIT 不覆盖该组件 |

归档只整理当前目录，不改写已有 Git 历史。发布前仍需扫描所有可达历史，不能用删除当前文件代替历史检查。

## 本地目录

```text
outputs/releases/v0.2.4/   本次指定发布附件
outputs/previews/          当前源码与设置预览
outputs/archive/          历史安装包、截图和源码快照
.local/archive/           旧设计、研究记录、米坛草稿和完整交接
.local/open-source-audit/  发布核对记录与扫描结果
```

这些目录均被 Git 忽略。不要直接把整个工作目录或 outputs/ 压缩上传。

## 发布步骤

1. 核对双端版本和原有匹配签名，更新 CHANGELOG、使用文档与验证边界。
2. 运行 `npm test`、`npm run check:public`、当前预览检查和 `git diff --check`；另用凭据扫描工具检查历史与候选源码。行为变化需要相应测试与构建，纯文档变动不用重建安装包。
3. 审阅并提交 main，推送后检查 GitHub Actions。仓库源码包含构建所需资源，不包含签名与第三方 SDK AAR。
4. 为对应提交创建版本标签，准备 GitHub Release。首次公开 0.2.4 标为 Pre-release，并说明手机配套版本为 0.2.1、APK 是调试构建。
5. 附 `NAV-PHONE-021.apk`、`NAV-BAND-024.rpk`、`SHA256SUMS.txt`、`THIRD_PARTY_NOTICES.txt`。核对已上传文件的大小与校验值后发布。
6. 在未登录状态核对仓库、文档、源码下载和 Release 附件可访问。

源码 ZIP 使用 GitHub 自动生成的对应标签归档，无需另外上传包含本机文件的源码压缩包。手机和手环安装包沿用已经验证的字节，不因整理文档而重新签名。

## 第三方许可

原创代码采用 MIT；字体与其他依赖按各自许可保留声明。小米 SDK 在手机 APK 中保留第三方身份，已经查看的文档尚未给出可确认的独立分发条款；不把“可以下载”或其他项目发布 APK 当作小米的授权证明。详见 [第三方声明](../THIRD_PARTY_NOTICES.md)。

## 近期项目参考

2026-09-23 核对了以下同类仓库的公开文件布局及 Release。时间是 GitHub API 的最近推送记录，不代表项目创建时间。

| 项目 | 最近推送 | 对本项目有用的做法 |
| --- | --- | --- |
| [CodexQuota](https://github.com/Vincent-hechuan/codex-quota-band) | 2026-09-08 | 手机与手环分模块，保留开发文档和测试；APK/RPK 放 Release，说明配套版本 |
| [AstroBox-NG](https://github.com/AstralSightStudios/AstroBox-NG) | 2026-09-19 | 源码、资源、脚本和锁文件入库；各平台安装文件单独放 Release |
| [SimpleRSS](https://github.com/yzl3014/SimpleRSS) | 2026-07-04 | 同为手环 9 Pro 应用，保留 src、资源与构建配置，分别说明代码和图片的许可范围 |

据此保留能帮助他人安装、理解、构建和验证的内容。过时草图、维护者流水账与生成缓存只在本地保留；这些是本项目的整理判断，不是上述项目制定的通用规则。
