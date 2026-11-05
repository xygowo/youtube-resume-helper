'use strict';

/**
 * 測試用的最小 DOM 與 chrome.storage 模擬。
 * 每個測試檔在獨立行程執行，因此一個行程只會 setup 一次。
 */

const path = require('path');

const CONTENT_SCRIPT = path.resolve(__dirname, '..', 'content', 'content.js');

class FakeEl {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.style = {};
    this._listeners = {};
    this._text = '';
    this._classes = new Set();
    this.classList = {
      add: (c) => this._classes.add(c),
      remove: (c) => this._classes.delete(c),
      contains: (c) => this._classes.has(c),
      toggle: (c, on) => (on ? this._classes.add(c) : this._classes.delete(c))
    };
  }

  get textContent() {
    return this._text;
  }

  set textContent(v) {
    this._text = v;
  }

  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  remove() {
    this.removed = true;
  }

  attachShadow() {
    return { innerHTML: '', querySelector: () => new FakeEl('button') };
  }

  contains(node) {
    return node === this || (node && node.owner === this);
  }

  dispatch(type, target) {
    (this._listeners[type] || []).forEach((fn) => fn({ type, target: target || this }));
  }
}

class FakeVideo extends FakeEl {
  constructor(duration) {
    super('video');
    this.currentTime = 0;
    this.duration = duration;
    this.paused = true;
    this.isConnected = true;
    this._listeners = {};
  }
}

function setup(options = {}) {
  const state = {
    href: options.href || 'https://www.youtube.com/watch?v=abc123',
    video: new FakeVideo(options.duration || 600),
    data: options.data || {}
  };

  const player = new FakeEl('div');
  const titleEl = new FakeEl('h1');
  titleEl.textContent = '測試影片標題';
  const channelEl = new FakeEl('a');
  channelEl.textContent = '測試頻道';
  const windowListeners = {};
  const documentListeners = {};

  global.Node = FakeEl;
  global.location = {
    get href() {
      return state.href;
    },
    get pathname() {
      return new URL(state.href).pathname;
    },
    get origin() {
      return 'https://www.youtube.com';
    }
  };

  global.window = {
    addEventListener(type, fn) {
      (windowListeners[type] = windowListeners[type] || []).push(fn);
    }
  };

  global.document = {
    title: '測試影片標題 - YouTube',
    visibilityState: 'visible',
    body: new FakeEl('body'),
    addEventListener(type, fn) {
      (documentListeners[type] = documentListeners[type] || []).push(fn);
    },
    getElementById: (id) => (id === 'movie_player' ? player : null),
    createElement: (tag) => new FakeEl(tag),
    querySelector(sel) {
      if (sel.indexOf('video') >= 0) return state.video;
      if (sel.indexOf('h1') >= 0) return titleEl;
      if (sel.indexOf('channel') >= 0) return channelEl;
      return null;
    }
  };

  global.chrome = {
    storage: {
      local: {
        get(keys, cb) {
          setTimeout(() => {
            if (keys === null || keys === undefined) return cb({ ...state.data });
            const out = {};
            if (typeof keys === 'string' && keys in state.data) out[keys] = state.data[keys];
            cb(out);
          }, 0);
        },
        set(obj, cb) {
          Object.assign(state.data, JSON.parse(JSON.stringify(obj)));
          if (cb) setTimeout(cb, 0);
        },
        remove(keys, cb) {
          (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete state.data[k]);
          if (cb) setTimeout(cb, 0);
        }
      },
      onChanged: { addListener() {} }
    },
    i18n: {
      // 測試只在意字串有沒有被取出，回傳 key 加上替代值即可
      getMessage(key, subs) {
        const list = subs === undefined ? [] : Array.isArray(subs) ? subs : [subs];
        return list.length ? `${key}:${list.join(',')}` : key;
      },
      getUILanguage: () => 'zh-TW'
    }
  };

  return {
    state,
    player,
    listeners: windowListeners,
    load() {
      require(CONTENT_SCRIPT);
    },
    fire(type) {
      (windowListeners[type] || []).forEach((fn) => fn({ type }));
    },
    setVisibility(value) {
      global.document.visibilityState = value;
      (documentListeners['visibilitychange'] || []).forEach((fn) => fn({ type: 'visibilitychange' }));
    },
    navigate(href, duration) {
      state.href = href;
      state.video = new FakeVideo(duration);
    }
  };
}

module.exports = { setup, FakeEl, FakeVideo };
