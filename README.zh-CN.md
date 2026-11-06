# YouTube 续播助手

Chrome / Edge 扩展程序。把 YouTube 观看进度存在浏览器本地，重新打开视频时继续上次的时间点。

![CI](https://github.com/xygowo/youtube-resume-helper/actions/workflows/ci.yml/badge.svg)
![Manifest V3](https://img.shields.io/badge/manifest-v3-3ddc84?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Chrome](https://img.shields.io/badge/chrome-88%2B-4285F4?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-install-4285F4?logo=googlechrome&logoColor=white&style=flat-square)](https://chromewebstore.google.com/detail/inkalmgdcacaphjembloclimjaekkccc)

[English](README.md) · [繁體中文](README.zh-TW.md) · 简体中文

## 问题

关闭浏览器后，浏览器还原的是最后停留的网址，而 YouTube 的网址通常不含时间参数，重新打开就从 0:00 开始。服务器端的续播功能需要开启观看历史，且同步有延迟。

这个扩展程序在浏览器本地记录「视频 ID → 秒数」，不依赖网址参数，也不依赖账号的观看记录。

## 功能

- 播放时每 2.5 秒记录一次进度，暂停、换片、切换标签页、关闭页面时补写
- 重新打开视频后自动跳回上次的位置，左下角显示继续的时间点，可选择从头播放
- 工具栏面板列出最近的观看记录（缩略图、进度、上次观看时间），点击即从该时间点打开
- 广告播放期间不写入，避免广告时间覆盖正片进度
- 距离片尾 20 秒内视为看完并清除记录，下次不会被拉回结尾
- 网址自带 `t=` 或 `start=` 时以网址为准，不覆盖分享链接指定的时间
- 拖动进度条或点击播放器后，本次续播立即取消
- 工具栏面板可切换记录功能的开关
- 界面与扩展程序名称跟着浏览器语言切换（内置英文、繁体中文与简体中文）

## 安装

### 从源码加载

1. `git clone https://github.com/xygowo/youtube-resume-helper.git`
2. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）
3. 右上角打开「开发者模式」
4. 点「加载已解压的扩展程序」，选择项目文件夹（与 `manifest.json` 同层）

修改源码后，在扩展程序页点该卡片的重新加载图标，再刷新 YouTube 标签页。

### 从商店安装

[Chrome 应用商店](https://chromewebstore.google.com/detail/inkalmgdcacaphjembloclimjaekkccc)

## 运作方式

| 动作 | 做法 |
| --- | --- |
| 记录进度 | 每秒检查播放器状态，每 2.5 秒写入一次 `chrome.storage.local`；暂停、换片、切换标签页、关闭页面时各补写一次 |
| 检测换片 | 拦截 YouTube 的单页应用事件 `yt-navigate-start` / `yt-navigate-finish`，在视频元素被替换前先写入旧进度 |
| 续播 | 读取记录后等播放器的 `duration` 就绪才 seek，0.9 秒后再验证；若被播放器重置会重试，上限 3 次 |
| 避免误判 | 广告（`.ad-showing`）期间跳过写入；直播的 `duration` 为无限大，不记录；短视频不会因「距片尾 20 秒」被误判为看完 |
| 中止条件 | 网址带时间参数、用户点击播放器或按键操作、已达重试上限 |

记录以 `v:<videoId>` 为键，最多保留 300 条，换片时会删除最旧的。

## 设置

参数集中在 `content/content.js` 与 `popup/popup.js` 上方的 `DEFAULTS`：

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `minSeconds` | 10 | 看超过几秒才值得记录 |
| `endSeconds` | 20 | 距片尾几秒内视为看完 |
| `maxEntries` | 300 | 最多保留条数 |
| `showToast` | true | 续播时是否显示提示 |

修改后需重新加载扩展程序。

## 开发

需要 Node.js 18 以上，没有第三方依赖。

```bash
npm test       # manifest 静态检查 + content script 行为测试
npm run build  # 生成 dist/youtube-resume-helper-<version>.zip
```

测试以最小化的 DOM 与 `chrome.storage` 模拟运行 `content.js`，涵盖续播、记录、广告、换片、片尾、网址参数与用户交互等路径。

### 多语言

界面文字放在 `_locales/<语言>/messages.json`，默认语言是 `en`。要新增语言，把 `_locales/en/messages.json` 复制到新的文件夹（文件夹名称用[支持的语言代码](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)，例如 `ja`），翻译 `message` 字段后运行 `npm test`。测试会检查各语言的键是否一致、占位符是否对得上。

### 项目结构

```
├─ manifest.json          # MV3 配置
├─ content/content.js     # 记录与续播逻辑
├─ popup/                 # 工具栏面板
├─ icons/                 # 16 / 32 / 48 / 128
├─ _locales/              # 英文、繁体中文与简体中文语言文件
├─ test/                  # 行为测试、manifest 与 i18n 检查
├─ tools/                 # 打包脚本（含无依赖的 zip 实现）
├─ store/                 # 商店上架用素材与文案
└─ .github/workflows/     # CI 与发布流程
```

## 隐私

所有记录存在 `chrome.storage.local`，不上传、不联网，代码中没有分析或追踪工具。移除扩展程序时记录一并删除。详见 [PRIVACY.zh-CN.md](PRIVACY.zh-CN.md)。

## 许可证

[MIT](LICENSE)
