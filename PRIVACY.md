# Privacy Policy

Applies to the Chrome / Edge extension "YouTube Resume Helper" (the "extension").

English · [繁體中文](PRIVACY.zh-TW.md)

## Data collected

None. The extension has no accounts, no analytics, and no tracking code.

## Data stored

While a video plays, the extension writes the following to the browser's local storage (`chrome.storage.local`):

- video ID
- current playback position and total duration
- video title and channel name
- last updated timestamp

This data is used to resume playback and to populate the record list in the toolbar popup.

## Data transmission

None. The data stays on your device. It is not sent to any server and not shared with third parties. The extension makes no network requests.

## Deleting data

- One record: open the toolbar popup, hover over a row, click the ✕ on the right
- All records: open the toolbar popup, click 「清除全部」 at the bottom left
- Removing the extension deletes the data in `chrome.storage.local`

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Store watch progress |

The content script runs only on `youtube.com`, where it reads the player state and writes progress.

## Changes

If this policy changes, this file will be updated and the change noted in [CHANGELOG](CHANGELOG.md).

## Contact

Open an [issue](https://github.com/xygowo/youtube-resume-helper/issues) for privacy questions.

Last updated: 2026-11-05
