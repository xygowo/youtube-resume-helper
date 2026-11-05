'use strict';

const PREFIX = 'v:';
const DEFAULTS = {
  enabled: true,
  minSeconds: 10,
  endSeconds: 20,
  maxEntries: 300,
  showToast: true
};

const $ = (sel) => document.querySelector(sel);

let settings = { ...DEFAULTS };
let items = [];
let armed = false;
let armTimer = 0;

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function ago(ts) {
  const diff = Date.now() - (ts || 0);
  const min = Math.floor(diff / 60000);
  if (min < 1) return '剛剛';
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return `${Math.floor(day / 30)} 個月前`;
}

async function load() {
  let all = {};
  try {
    all = await chrome.storage.local.get(null);
  } catch (_) {
    all = {};
  }
  settings = { ...DEFAULTS, ...(all.settings || {}) };
  items = Object.keys(all)
    .filter((k) => k.indexOf(PREFIX) === 0)
    .map((k) => all[k])
    .filter((r) => r && r.id && typeof r.t === 'number')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function itemUrl(rec) {
  const base = rec.url || `https://www.youtube.com/watch?v=${rec.id}`;
  const sep = base.indexOf('?') >= 0 ? '&' : '?';
  return `${base}${sep}t=${Math.max(0, Math.floor(rec.t || 0))}s`;
}

function render() {
  const list = $('#list');
  const empty = $('#empty');
  list.textContent = '';

  $('#enabled').checked = !!settings.enabled;
  document.body.classList.toggle('off', !settings.enabled);
  $('#subtitle').textContent = settings.enabled
    ? items.length
      ? '已記錄的影片，點一下就接續'
      : '自動記住觀看進度'
    : '目前已暫停記錄';
  $('#count').textContent = items.length ? `共 ${items.length} 部` : '';

  empty.hidden = items.length > 0;
  list.hidden = items.length === 0;

  for (const rec of items) {
    const row = document.createElement('div');
    row.className = 'item';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.title = rec.title || rec.id;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = `https://i.ytimg.com/vi/${rec.id}/mqdefault.jpg`;
    img.addEventListener('error', () => {
      img.src = `https://i.ytimg.com/vi/${rec.id}/default.jpg`;
    });
    const pct = document.createElement('span');
    pct.className = 'pct';
    pct.textContent = rec.d ? `${Math.min(99, Math.round((rec.t / rec.d) * 100))}%` : '—';
    thumb.append(img, pct);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const title = document.createElement('p');
    title.className = 'title';
    title.textContent = rec.title || rec.id;

    const sub = document.createElement('p');
    sub.className = 'sub';
    const time = document.createElement('span');
    time.textContent = rec.d ? `${fmt(rec.t)} / ${fmt(rec.d)}` : fmt(rec.t);
    const dot = document.createElement('i');
    dot.className = 'dot';
    const when = document.createElement('span');
    when.textContent = ago(rec.updatedAt);
    sub.append(time, dot, when);

    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = `${rec.d ? Math.min(100, (rec.t / rec.d) * 100) : 0}%`;
    bar.append(fill);

    meta.append(title, sub, bar);

    const del = document.createElement('button');
    del.className = 'del';
    del.type = 'button';
    del.title = '移除這筆紀錄';
    del.textContent = '✕';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await chrome.storage.local.remove(PREFIX + rec.id);
      await refresh();
    });

    row.append(thumb, meta, del);

    const open = () => {
      chrome.tabs.create({ url: itemUrl(rec) });
      window.close();
    };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    list.append(row);
  }
}

async function refresh() {
  await load();
  render();
}

function disarm() {
  clearTimeout(armTimer);
  armed = false;
  const btn = $('#clear');
  btn.classList.remove('armed');
  btn.textContent = '清除全部';
}

$('#enabled').addEventListener('change', async (e) => {
  settings = { ...settings, enabled: e.target.checked };
  await chrome.storage.local.set({ settings });
  render();
});

$('#clear').addEventListener('click', async () => {
  const btn = $('#clear');
  if (!armed) {
    armed = true;
    btn.classList.add('armed');
    btn.textContent = '再按一次確認';
    armTimer = setTimeout(disarm, 3500);
    return;
  }
  disarm();
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.indexOf(PREFIX) === 0);
  if (keys.length) await chrome.storage.local.remove(keys);
  await refresh();
});

(async () => {
  await refresh();
})();
