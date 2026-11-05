# 參與開發

## 環境

Node.js 18 以上，不需要安裝任何套件。

```bash
npm test       # manifest 靜態檢查 + content script 行為測試
npm run build  # 打包 dist/youtube-resume-helper-<version>.zip
```

載入測試：`chrome://extensions` → 開發人員模式 → 載入未封裝項目 → 選擇專案根目錄。

## 程式風格

- 縮排 2 個空白，字串使用單引號，結尾加分號（`.editorconfig` 已設定）
- 不引入第三方依賴。需要新功能時優先用瀏覽器與 Node 內建 API
- 註解說明「為什麼」，不重述程式碼在做什麼
- UI 文字使用繁體中文
- 介面字串一律放進 `_locales/<語言>/messages.json`，不要寫死在程式或 HTML 裡。新增字串時 `en` 與 `zh_TW` 兩邊都要加，鍵必須一致
- README 有三個版本：`README.md`（英文，GitHub 預設顯示）、`README.zh-TW.md`、`README.zh-CN.md`。隱私政策同樣有 `PRIVACY.md`、`PRIVACY.zh-TW.md`、`PRIVACY.zh-CN.md`。內容有變動時三邊都要更新

## 測試

`test/content.test.js` 與 `test/guards.test.js` 以 `test/harness.js` 提供的模擬環境執行 `content.js`。修改續播或記錄邏輯時，請在對應檔案補上涵蓋新行為的檢查。

`test/manifest.test.js` 檢查上架相關的靜態條件（版本號、圖示尺寸、權限範圍、檔案引用）。

## 送出 Pull Request

1. 從 `main` 開分支
2. 確認 `npm test` 全部通過
3. PR 說明寫清楚改了什麼、為什麼改
4. 行為有變動時，同步更新 `CHANGELOG.md` 的 `[Unreleased]` 段落

## 版本發布

維護者流程：

1. 更新 `manifest.json` 與 `package.json` 的 `version`
2. 在 `CHANGELOG.md` 補上該版本段落
3. 建立 tag：`git tag v1.0.0 && git push origin v1.0.0`
4. GitHub Actions 會執行測試、打包，並把 zip 附加到 Release
5. 將 `dist/` 內的 zip 上傳到 Chrome Web Store
