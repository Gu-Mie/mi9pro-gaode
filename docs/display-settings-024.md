# 0.2.4 显示设置实现与验证

本功能于 2026-09-20 实现。当前安装与验收状态见 [验证摘要](navigation-verification.md)，下文记录显示设计和字体资源来源。

## 实现

- 默认字体为系统默认，字号 30、箭头大小 42、箭头粗细 8；箭头与文字的布局间距为 26。底部设置入口保持 42 像素齿轮、64×64 点击区、距底 16。导航组仍围绕 (168, 240) 居中，最大字号长文可滚动，至少留出 16 像素避开齿轮。
- 字号范围 24–44；箭头范围扩为 32–100；粗细范围 4–10。设置、导航、等待/断连/结束/过期等状态共用字体和字号体系。设置标签按 0.8 倍、等待辅助文字按 0.72 倍、页脚按 0.6 倍缩放；导航正文、等待标题和设置数值使用所选基准字号。
- 字体入口为 288 像素通栏，与各设置组对齐。加减按钮宽 44、高至少 52，字号较大时高度随文字增加；数值框两侧间距各 12。标签与按钮之间 4，设置组尾部留 12。固定标题下采用有明确尺寸的原生 list，大字号时滚动查看后续控件及版本。
- 字体选择有独立的互斥列表：系统默认、宋体、楷体、圆体，显示各自的“直行200米”样例。选择后返回设置并立即保存；系统返回键先退出字体列表，再退出设置。保留原导航数据接收、过期处理及亮屏生命周期。
- 沿用 navigation.display.v1 存储键，保留已有的个人设置；字号调整不会重置字体。设置底部新增“恢复默认”，可将旧版本保存的 78 像素箭头等设置恢复为新比例。继续串行写入，阻止迟到读取覆盖新调整。
- 附加字体没有的生僻字或 emoji，会使对应导航/错误文字区回退到系统字体，文字内容保持原样，不删字或替换路名。

## 字体资源及可迁移性

普通开发、测试、构建直接使用仓库中的 TTF 与覆盖范围文件，不依赖开发电脑已安装的字体，不要求 Python 或联网。只有重新制作字体子集才使用 tools/prepare-band-fonts.py 与 fontTools（本机 4.51.0）。字体保留 GB2312、拉丁字符、标点及源码 UI 所用字；修改后的字体家族统一重命名为 BandSong / BandKai / BandRound，原作者版权与完整 OFL 文本保留在同目录并进入 RPK。

| UI 名称 | 原始字体来源 | 原始文件 SHA-256 |
| --- | --- | --- |
| 宋体 | [站酷小薇体 / ZCOOL XiaoWei](https://github.com/google/fonts/tree/main/ofl/zcoolxiaowei) | a42b620140f493db42f741351dfbf343c0936d58588ee8004b8b2a218d997ff1 |
| 楷体 | [霞鹜文楷轻便版 v1.522](https://github.com/lxgw/LxgwWenKai-Lite/releases/tag/v1.522) | 140c99ba4e28e817cec49bf82a0c5fcdc4fe633fb9dfda16d0ee8d59a8545f15 |
| 圆体 | [站酷庆科黄油体 / ZCOOL QingKe HuangYou](https://github.com/google/fonts/tree/main/ofl/zcoolqingkehuangyou) | 54f0c0df4308cd74cd0f2fd3494ae054dbc4a1fd6fa7d71f4807eb4cdd8b4136 |

原始下载放在被忽略的 .local/font-sources/；重建脚本读取 song.ttf / kai.ttf / round.ttf 和各自的 *-OFL.txt。产物 TTF 大小分别为 6230420 / 3521060 / 5522084 字节。字符覆盖信息使用紧凑位图字符串，避免在手环创建大量嵌套数组。

原生 UX 通过 @font-face 和动态 font-family 引用这些资源。当前 aiot-toolkit 2.0.5 的 Vela 编译器支持生成 fontface 定义，已检查包内声明、字体字节、选择事件与保存值。官方 [text 组件文档](https://iot.mi.com/vela/quickapp/zh/components/basic/text.html) 未明确承诺这台手环固件的外部字体支持；编译成功和浏览器可加载字体不能证明真机字形已切换。构建工具提示三份字体单文件超过 1 MiB，仍需设备实测加载、切换耗时、内存及安装后表现；没有把这些写成已验证。

## 本地验证

- npm test：39 项通过，包括旧设置恢复、字体选择后字号调整仍保留字体、原文/生僻字回退、恢复默认、各字号下等待状态与齿轮避让、存储及导航生命周期。
- RPK 构建通过；tools/check-wearable-package.cjs 检查实际编译后的字体行/四个选择项/加减/返回/恢复默认点击、互斥页面、保存结果及资源字节。
- tools/verify-rpk-signature.cjs 检查 ZIP CRC、嵌套摘要、签名和复用原证书通过。
- agent-browser 执行 tools/check-preview-browser.js，1779 项交互和几何断言通过；另检查刷新后恢复设置、390 像素窄屏无横向溢出、最大字号可以滚动到恢复默认、无浏览器 JS 错误。三种内嵌字体均实际加载为 loaded。
- outputs/previews/wearable-native-024.png 与 outputs/previews/wearable-fonts-024.png 为已目视核对的源码浏览器截图，并非 AI 预览或真机截图。
- Android 本轮未修改，未重跑 Android 构建。

## 交付和设备边界

outputs/releases/v0.2.4/NAV-BAND-024.rpk：0.2.4 / code 9，8169272 字节，SHA-256 为 885a2fa250de1a1a8587f4fbcbb75e9f0c7e3af5e6f2c7dc9d752d96b5277bd9，已写入 outputs/releases/v0.2.4/SHA256SUMS.txt。包名与原签名保持一致。

0.2.4 已构建、传输并核对 SHA-256，用户于 2026-09-22 确认安装基本使用正常。字体实际变化、默认比例、最大字号滚动、设置重开持久化及长期导航/亮屏仍需逐项确认；历史自动打开/锁屏证据不能替代当前验收。
