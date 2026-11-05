# YouTube 續播助手

Chrome / Edge 擴充功能。把 YouTube 觀看進度存在瀏覽器本機，重新打開影片時接續上次的時間點。

![CI](https://github.com/xygowo/youtube-resume-helper/actions/workflows/ci.yml/badge.svg)
![Manifest V3](https://img.shields.io/badge/manifest-v3-3ddc84?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Chrome](https://img.shields.io/badge/chrome-88%2B-4285F4?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)

[English](README.md) · 繁體中文 · [简体中文](README.zh-CN.md)

## 問題

關掉瀏覽器後，瀏覽器還原的是最後停留的網址，而 YouTube 的網址通常不含時間參數，重新打開就從 0:00 開始。伺服器端的續播功能需要開啟觀看歷史，且同步有延遲。

這個擴充功能在瀏覽器本機記錄「影片 ID → 秒數」，不依賴網址參數，也不依賴帳號的觀看記錄。

## 功能

- 播放時每 2.5 秒記錄一次進度，暫停、換片、切換分頁、關閉頁面時補寫
- 重新打開影片後自動跳到上次的位置，左下角顯示接續的時間點，可選擇從頭播放
- 工具列面板列出最近的觀看記錄（縮圖、進度、上次觀看時間），點擊即從該時間點開啟
- 廣告播放期間不寫入，避免廣告秒數覆蓋正片進度
- 距離片尾 20 秒內視為看完並清除記錄，下次不會被拉回結尾
- 網址自帶 `t=` 或 `start=` 時以網址為準，不覆蓋分享連結指定的時間
- 拖動進度條或點擊播放器後，本次續播立即取消
- 工具列面板可切換記錄功能的開關
- 介面與擴充功能名稱跟著瀏覽器語言切換（內建英文、繁體中文與簡體中文）

## 安裝

### 從原始碼載入

1. `git clone https://github.com/xygowo/youtube-resume-helper.git`
2. 開啟 `chrome://extensions`（Edge 為 `edge://extensions`）
3. 右上角開啟「開發人員模式」
4. 點「載入未封裝項目」，選擇專案資料夾（與 `manifest.json` 同層）

修改原始碼後，在擴充功能頁點該卡片的重新載入圖示，再整理 YouTube 分頁。

### 從商店安裝

Chrome Web Store 上架後補上連結。

## 運作方式

| 動作 | 做法 |
| --- | --- |
| 記錄進度 | 每秒檢查播放器狀態，每 2.5 秒寫入一次 `chrome.storage.local`；暫停、換片、分頁切換、關閉頁面時各補寫一次 |
| 偵測換片 | 攔截 YouTube 的單頁應用事件 `yt-navigate-start` / `yt-navigate-finish`，在影片元素被替換前先寫入舊進度 |
| 續播 | 讀取記錄後等待播放器的 `duration` 就緒才 seek，0.9 秒後再驗證；若被播放器重置會重試，上限 3 次 |
| 避免誤判 | 廣告（`.ad-showing`）期間跳過寫入；直播的 `duration` 為無限大，不記錄；短片不會因「距片尾 20 秒」被誤判為看完 |
| 中止條件 | 網址帶時間參數、使用者點擊播放器或按鍵操作、已達重試上限 |

記錄以 `v:<videoId>` 為鍵，最多保留 300 筆，換片時會刪除最舊的。

## 設定

參數集中在 `content/content.js` 與 `popup/popup.js` 上方的 `DEFAULTS`：

| 參數 | 預設 | 說明 |
| --- | --- | --- |
| `minSeconds` | 10 | 看超過幾秒才值得記錄 |
| `endSeconds` | 20 | 距片尾幾秒內視為看完 |
| `maxEntries` | 300 | 最多保留筆數 |
| `showToast` | true | 接續時是否顯示提示 |

修改後需重新載入擴充功能。

## 開發

需要 Node.js 18 以上，沒有第三方依賴。

```bash
npm test       # manifest 靜態檢查 + content script 行為測試
npm run build  # 產生 dist/youtube-resume-helper-<version>.zip
```

測試以最小化的 DOM 與 `chrome.storage` 模擬執行 `content.js`，涵蓋續播、記錄、廣告、換片、片尾、網址參數與使用者互動等路徑。

### 多語言

介面文字放在 `_locales/<語言>/messages.json`，預設語言是 `en`。要新增語言，把 `_locales/en/messages.json` 複製到新的資料夾（資料夾名稱用[支援的語言代碼](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)，例如 `ja`），翻譯 `message` 欄位後執行 `npm test`。測試會檢查各語言的鍵是否一致、佔位符是否對得上。

### 專案結構

```
├─ manifest.json          # MV3 設定
├─ content/content.js     # 記錄與續播邏輯
├─ popup/                 # 工具列面板
├─ icons/                 # 16 / 32 / 48 / 128
├─ _locales/              # 英文與繁體中文語言檔
├─ test/                  # 行為測試、manifest 與 i18n 檢查
├─ tools/                 # 打包腳本（含無依賴的 zip 實作）
├─ store/                 # 商店上架用素材與文案
└─ .github/workflows/     # CI 與發版流程
```

## 隱私

所有記錄存在 `chrome.storage.local`，不上傳、不連外，程式碼中沒有分析或追蹤工具。移除擴充功能時記錄一併刪除。詳見 [PRIVACY.zh-TW.md](PRIVACY.zh-TW.md)。

## 授權

[MIT](LICENSE)
