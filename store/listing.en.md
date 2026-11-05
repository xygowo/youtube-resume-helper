# Store listing — English

Chrome Web Store 的英文版商品頁面文案。商店欄位是純文字，不支援 Markdown，直接複製程式碼區塊內容貼上。

---

## 名稱

上限 45 字元。

```
YouTube Resume Helper
```

## 簡短說明

上限 132 字元。目前 86 字元。

```
Keeps YouTube watch progress in local storage and resumes playback where you left off.
```

## 詳細說明

上限 16,000 字元。

```
YouTube restores the URL when you reopen the browser, and watch URLs rarely carry a timestamp, so playback starts at 0:00. This extension stores your position in the browser and picks up where you stopped.

What it does
- Writes your position every 2.5 seconds, plus on pause, video change, tab switch, and page close
- Reopens the video at the saved time, with a notice in the corner and a "Start over" option
- Lists recent records in the toolbar popup; click one to open at that timestamp
- Skips writes while an ad is playing, so ad time never overwrites the video position
- Clears the record when you stop within 20 seconds of the end
- Defers to the URL when it already carries a timestamp (t= or start=)
- Aborts the resume as soon as you interact with the player
- Toggle in the popup to pause recording

Where the data lives
Records are stored in the browser's local storage (chrome.storage.local). Nothing is uploaded, and there is no analytics or tracking code.

Permissions
storage: stores the video ID and watch position. The content script runs only on youtube.com.

Open source
Source and issue tracker: https://github.com/xygowo/youtube-resume-helper
License: MIT
```

---

## 上架設定

| 欄位 | 值 |
| --- | --- |
| 商品頁面語言 | English |
| 類別 | Productivity |
| 隱私權政策 | https://github.com/xygowo/youtube-resume-helper/blob/main/PRIVACY.md |

截圖目前只有中文版。若要讓英文頁面一致，需重新產生英文截圖（`PREVIEW_LOCALE=en` 只換工具列面板，外框文案在 `store/screens/*.html` 內仍是中文）。
