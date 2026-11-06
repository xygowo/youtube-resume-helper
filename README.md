# YouTube Resume Helper

Chrome / Edge extension that keeps YouTube watch progress in the browser's local storage and resumes playback from where you stopped.

![CI](https://github.com/xygowo/youtube-resume-helper/actions/workflows/ci.yml/badge.svg)
![Manifest V3](https://img.shields.io/badge/manifest-v3-3ddc84?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
![Chrome](https://img.shields.io/badge/chrome-88%2B-4285F4?style=flat-square)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-install-4285F4?logo=googlechrome&logoColor=white&style=flat-square)](https://chromewebstore.google.com/detail/inkalmgdcacaphjembloclimjaekkccc)

English · [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md)

## The problem

When you close the browser, it restores the last URL. YouTube watch URLs rarely include a timestamp, so playback starts at 0:00. The built-in resume depends on watch history and can lag behind.

This extension stores `videoId → seconds` in `chrome.storage.local`. It does not depend on URL parameters or on your account's watch history.

## Features

- Writes progress every 2.5 seconds while playing, plus on pause, video change, tab switch, and page hide
- Reopens at the saved position with a notice in the bottom-left corner and a "Start over" action
- Popup lists recent records with thumbnail, progress, and last-watched time; click one to open at that timestamp
- Skips writes while an ad is playing, so ad time never overwrites the video's position
- Clears the record when you stop within 20 seconds of the end
- Defers to `t=` / `start=` when the URL already carries a timestamp
- Aborts the resume as soon as you interact with the player
- Interface and extension name follow the browser language (English, Traditional Chinese, and Simplified Chinese)
- Toggle in the popup to pause recording

## Install

### From source

1. `git clone https://github.com/xygowo/youtube-resume-helper.git`
2. Open `chrome://extensions` (Edge: `edge://extensions`)
3. Turn on Developer mode
4. Click "Load unpacked" and select the repository folder (the one containing `manifest.json`)

After editing files, click the reload icon on the extension card, then refresh any open YouTube tab.

### From the Chrome Web Store

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/inkalmgdcacaphjembloclimjaekkccc)

## How it works

| Step | Implementation |
| --- | --- |
| Recording | Reads the player state every second and writes every 2.5s; also writes on pause, video change, tab switch, and page hide |
| Navigation | Listens for `yt-navigate-start` / `yt-navigate-finish` and saves before the video element is replaced |
| Resuming | Waits for `duration` before seeking, verifies 0.9s later, retries up to 3 times if the player resets |
| Edge cases | Skips ads (`.ad-showing`); live streams have an infinite `duration` and are not recorded; short videos are not mistaken for finished |
| Abort conditions | URL timestamp present, player interaction, retry limit reached |

Records use `v:<videoId>` keys, capped at 300 entries; the oldest are removed when you switch videos.

## Configuration

Options live in the `DEFAULTS` object at the top of `content/content.js` and `popup/popup.js`:

| Option | Default | Description |
| --- | --- | --- |
| `minSeconds` | 10 | Minimum watched time before a record is worth keeping |
| `endSeconds` | 20 | Distance from the end that counts as finished |
| `maxEntries` | 300 | Maximum number of records kept |
| `showToast` | true | Show the resume notice |

Reload the extension after changing these.

## Development

Node.js 18 or newer. No dependencies.

```bash
npm test       # manifest checks + content script behaviour tests
npm run build  # produces dist/youtube-resume-helper-<version>.zip
```

The tests run `content.js` against a minimal DOM and `chrome.storage` mock, covering resume, recording, ads, navigation, end of video, URL timestamps, and user interaction.

### Localization

All user-facing strings live in `_locales/<locale>/messages.json`, with `en` as the default locale. To add a language, copy `_locales/en/messages.json` into a new folder using a [supported locale code](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales) such as `ja`, translate the `message` values, and run `npm test`. The test checks that every locale has the same keys and that placeholders match.

### Project layout

```
├─ manifest.json          # MV3 manifest
├─ content/content.js     # recording and resume logic
├─ popup/                 # toolbar panel
├─ icons/                 # 16 / 32 / 48 / 128
├─ _locales/              # en and zh_TW message files
├─ test/                  # behaviour tests, manifest and i18n checks
├─ tools/                 # build script (dependency-free zip writer)
├─ store/                 # Chrome Web Store assets and listing copy
└─ .github/workflows/     # CI and release
```

## Privacy

Everything is stored in `chrome.storage.local`. Nothing is uploaded, and there is no analytics or tracking code. Removing the extension deletes the records. See [PRIVACY.md](PRIVACY.md) for details.

## License

[MIT](LICENSE)
