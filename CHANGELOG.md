# 更新記錄

格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號依循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

## [1.0.0] - 2026-11-05

### 新增

- 將觀看進度寫入 `chrome.storage.local`，關閉瀏覽器後仍可接續
- 重新打開影片時自動跳到上次的時間點，左下角顯示提示並可選擇從頭播放
- 工具列面板：記錄清單（縮圖、進度、時間）、單筆刪除、清除全部、記錄開關
- 廣告播放期間跳過寫入，避免覆蓋正片進度
- 直播與短片的邊界處理
- 網址自帶 `t=` / `start=` 時以網址為準
- 使用者互動後中止本次續播

[Unreleased]: https://github.com/xygowo/youtube-resume-helper/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/xygowo/youtube-resume-helper/releases/tag/v1.0.0
