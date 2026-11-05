/*!
 * YouTube 續播助手 — content script
 * 把觀看進度存在瀏覽器本機（chrome.storage.local），
 * 下次打開同一支影片時自動跳回上次的時間點。
 */
(() => {
  'use strict';

  const PREFIX = 'v:';
  const SETTINGS_KEY = 'settings';
  const DEFAULTS = {
    enabled: true,
    minSeconds: 10, // 至少看超過 10 秒才值得記錄
    endSeconds: 20, // 距離片尾 20 秒內視為看完，直接清除紀錄
    maxEntries: 300, // 最多保留幾筆
    showToast: true // 接續後是否顯示提示
  };

  let settings = { ...DEFAULTS };
  let videoId = null;
  let videoEl = null;
  let lastWrite = 0;
  let writeCount = 0;
  let pending = null; // { id, target, seeks, waits }
  let restored = false;
  let userTouched = false;
  let toastHost = null;
  let toastTimer = 0;

  /* ---------------- storage ---------------- */

  const store = {
    get(keys) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        } catch (_) {
          resolve({});
        }
      });
    },
    set(obj) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.set(obj, () => resolve());
        } catch (_) {
          resolve();
        }
      });
    },
    remove(keys) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.remove(keys, () => resolve());
        } catch (_) {
          resolve();
        }
      });
    }
  };

  /* ---------------- utils ---------------- */

  function fmt(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
    return `${m}:${ss}`;
  }

  function getVideoId() {
    const u = new URL(location.href);
    if (u.pathname === '/watch') return u.searchParams.get('v') || null;
    const m = u.pathname.match(/^\/(shorts|live|embed)\/([\w-]{6,})/);
    if (m) return m[2];
    return null;
  }

  function canonicalUrl(id) {
    const p = location.pathname;
    if (p.startsWith('/shorts/')) return `${location.origin}/shorts/${id}`;
    if (p.startsWith('/live/')) return `${location.origin}/watch?v=${id}`;
    return `${location.origin}/watch?v=${id}`;
  }

  function t(key, subs) {
    try {
      return chrome.i18n.getMessage(key, subs) || key;
    } catch (_) {
      return key;
    }
  }

  // 網址本身就帶了時間（例如別人分享的 ?t=90s），代表使用者有意圖，不要覆蓋
  function hasExplicitTime() {
    const u = new URL(location.href);
    if (u.searchParams.has('t') || u.searchParams.has('start')) return true;
    return /(^|[?&#])t=/.test(u.hash || '');
  }

  function getTitle() {
    const el = document.querySelector(
      'h1.ytd-watch-metadata yt-formatted-string, ytd-watch-metadata #title yt-formatted-string, #title h1 yt-formatted-string'
    );
    const t = (el && el.textContent) || document.title || '';
    return t.replace(/\s*-\s*YouTube\s*$/, '').trim().slice(0, 160);
  }

  function getChannel() {
    const el = document.querySelector(
      '#owner #channel-name a, ytd-video-owner-renderer #channel-name a, ytd-channel-name a'
    );
    return ((el && el.textContent) || '').trim().slice(0, 80);
  }

  function player() {
    return document.getElementById('movie_player');
  }

  // 廣告播放時 video 元素的 duration / currentTime 是廣告的時間，寫進去會毀掉紀錄
  function isAdShowing() {
    const p = player();
    if (p && p.classList.contains('ad-showing')) return true;
    return !!document.querySelector('.ytp-ad-player-overlay-layout, .ytp-ad-module .ytp-ad-player-overlay');
  }

  function findVideo() {
    const v =
      document.querySelector('video.html5-main-video') ||
      document.querySelector('#movie_player video') ||
      document.querySelector('video');
    if (v && v !== videoEl) {
      videoEl = v;
      v.addEventListener('pause', () => saveNow(true));
      v.addEventListener('ended', onEnded);
    }
    return videoEl;
  }

  /* ---------------- 儲存 ---------------- */

  function saveNow(force) {
    if (!settings.enabled) return;
    if (!videoId) return;
    const v = videoEl || findVideo();
    if (!v || !v.isConnected) return;
    if (isAdShowing()) return; // 廣告時間不要蓋掉正片進度

    const t = v.currentTime;
    const d = v.duration;
    if (!Number.isFinite(t) || t < 1) return; // 還沒真正開始看
    if (!Number.isFinite(d) || d <= 0) return; // 直播或尚未載入

    const key = PREFIX + videoId;

    // 已經看到片尾，視為看完，清掉紀錄避免下次又被拉回結尾
    // 比例條件是為了避免短片（例如 15 秒）一開啟就被判定成看完
    if (d - t <= settings.endSeconds && (d - t) / d <= 0.2) {
      store.remove(key);
      lastWrite = Date.now();
      return;
    }

    // 縮圖換頁時避免無謂寫入
    if (!force && Date.now() - lastWrite < 2500) return;

    store.set({
      [key]: {
        id: videoId,
        t: Math.floor(t),
        d: Math.floor(d),
        title: getTitle(),
        channel: getChannel(),
        url: canonicalUrl(videoId),
        updatedAt: Date.now()
      }
    });
    lastWrite = Date.now();
    writeCount += 1;
    if (writeCount % 25 === 0) prune();
  }

  function onEnded() {
    if (!videoId) return;
    store.remove(PREFIX + videoId);
  }

  async function prune() {
    const all = await store.get(null);
    const keys = Object.keys(all).filter((k) => k.indexOf(PREFIX) === 0);
    const max = Math.max(20, settings.maxEntries || 300);
    if (keys.length <= max) return;
    keys.sort((a, b) => ((all[a] && all[a].updatedAt) || 0) - ((all[b] && all[b].updatedAt) || 0));
    await store.remove(keys.slice(0, keys.length - max));
  }

  /* ---------------- 續播 ---------------- */

  async function tryRestore(id) {
    if (!settings.enabled || !id) return;
    if (hasExplicitTime()) return;

    const key = PREFIX + id;
    const rec = (await store.get(key))[key];
    if (!rec || typeof rec.t !== 'number') return;
    if (rec.t < (settings.minSeconds || 0)) return;
    if (rec.d && rec.t > rec.d - (settings.endSeconds || 0)) return;

    pending = { id, target: rec.t, seeks: 0, waits: 0 };
    setTimeout(attempt, 250);
  }

  function attempt() {
    if (!pending) return;
    if (pending.id !== videoId) {
      pending = null;
      return;
    }
    if (userTouched) {
      pending = null;
      return;
    }

    const v = findVideo();
    const dur = v ? v.duration : NaN;

    if (!v || !v.isConnected || !Number.isFinite(dur) || dur < 1) {
      pending.waits += 1;
      if (pending.waits < 100) {
        // 最多等 30 秒（背景分頁載入較慢）
        setTimeout(attempt, 300);
      } else {
        pending = null;
      }
      return;
    }

    const target = Math.min(pending.target, Math.max(0, dur - 2));
    const drift = Math.abs(v.currentTime - target);

    if (drift > 2.5) {
      // 已經跳過一次卻又被拉開，代表播放器重置或使用者自己拖走了；
      // 使用者互動由 userTouched 攔，這裡只限制重試次數
      if (pending.seeks >= 3) {
        pending = null;
        return;
      }
      pending.seeks += 1;
      pending.waits = 0;
      try {
        v.currentTime = target;
      } catch (_) {
        /* 播放器還沒準備好，下一輪再試 */
      }
      setTimeout(attempt, 900);
      return;
    }

    // 位置正確，收工
    const shown = pending.target;
    pending = null;
    restored = true;
    if (settings.showToast) showToast(shown, v);
  }

  /* ---------------- 提示 ---------------- */

  function hideToast() {
    clearTimeout(toastTimer);
    if (toastHost) {
      toastHost.remove();
      toastHost = null;
    }
  }

  function showToast(seconds, v) {
    hideToast();
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:18px;bottom:18px;z-index:2147483647;pointer-events:auto;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        .box {
          display: flex; align-items: center; gap: 10px;
          font: 500 13px/1.4 "YouTube Sans", "Roboto", "Noto Sans TC", system-ui, sans-serif;
          background: rgba(24, 24, 24, .95);
          color: #f1f1f1;
          border: 1px solid rgba(255, 255, 255, .12);
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 8px 28px rgba(0, 0, 0, .45);
          animation: in .18s ease-out;
        }
        @keyframes in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        b { color: #ff4e63; font-variant-numeric: tabular-nums; }
        button {
          all: unset; cursor: pointer; font-size: 12px; padding: 4px 8px;
          border-radius: 6px; color: #cfcfcf; white-space: nowrap;
        }
        button:hover { background: rgba(255, 255, 255, .1); color: #fff; }
        .close { font-size: 12px; padding: 2px 6px; color: #8a8a8a; }
      </style>
      <div class="box">
        <span class="label"></span>
        <button class="restart"></button>
        <button class="close">✕</button>
      </div>`;

    // 用哨兵值取出時間在句子裡的位置，讓不同語言的語序都能正確上色
    const label = root.querySelector('.label');
    const sentence = t('toastResumed', ['\u0001']);
    const parts = sentence.split('\u0001');
    if (parts.length === 2) {
      const time = document.createElement('b');
      time.textContent = fmt(seconds);
      label.append(parts[0], time, parts[1]);
    } else {
      label.textContent = sentence;
    }
    root.querySelector('.restart').textContent = t('toastStartOver');

    root.querySelector('.restart').addEventListener('click', () => {
      try {
        v.currentTime = 0;
      } catch (_) {}
      if (videoId) store.remove(PREFIX + videoId);
      hideToast();
    });
    root.querySelector('.close').addEventListener('click', hideToast);

    document.body.appendChild(host);
    toastHost = host;
    toastTimer = setTimeout(hideToast, 7000);
  }

  /* ---------------- 導航 ---------------- */

  function onNavigateStart() {
    saveNow(true);
  }

  function onNavigate() {
    const id = getVideoId();

    if (id === videoId) {
      findVideo();
      return;
    }

    videoId = id;
    videoEl = null;
    pending = null;
    restored = false;
    userTouched = false;
    hideToast();

    if (!id) return;
    findVideo();
    tryRestore(id);
  }

  function heartbeat() {
    if (!settings.enabled) return;
    if (!videoId) return;
    const v = findVideo();
    if (!v || !v.isConnected) return;
    if (v.paused) return;
    saveNow(false);
  }

  function markTouched(e) {
    if (!pending) return;
    if (e.type === 'keydown') {
      userTouched = true;
      return;
    }
    const p = player();
    if (p && e.target instanceof Node && p.contains(e.target)) userTouched = true;
  }

  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    // 背景分頁計時器可能被節流，回到前景時補救一次
    if (videoId && !pending && !restored && !userTouched) {
      const v = videoEl;
      if (!v || !v.isConnected || v.currentTime < 3) tryRestore(videoId);
    }
  }

  function onHidden() {
    if (document.visibilityState !== 'hidden') return;
    saveNow(true);
  }

  function onPageHide() {
    saveNow(true);
  }

  /* ---------------- 啟動 ---------------- */

  async function boot() {
    const saved = (await store.get(SETTINGS_KEY))[SETTINGS_KEY];
    if (saved) settings = { ...DEFAULTS, ...saved };

    window.addEventListener('yt-navigate-start', onNavigateStart, true);
    window.addEventListener('yt-navigate-finish', onNavigate, true);
    window.addEventListener('yt-page-data-updated', onNavigate, true);

    ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, markTouched, { capture: true, passive: true })
    );
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[SETTINGS_KEY]) return;
        settings = { ...DEFAULTS, ...(changes[SETTINGS_KEY].newValue || {}) };
      });
    } catch (_) {}

    setInterval(heartbeat, 1000);

    onNavigate();
    setTimeout(prune, 8000);
  }

  boot();
})();
