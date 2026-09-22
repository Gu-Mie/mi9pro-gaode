const KEY = 'navigation.display.v1';
const FONT_COVERAGE = require('./font-coverage');
const DEFAULTS = { font: 'default', fontSize: 30, arrowSize: 42, arrowWeight: 8 };
const LIMITS = { fontSize: [24, 44], arrowSize: [32, 100], arrowWeight: [4, 10] };
const FONTS = ['default', 'song', 'kai', 'round'];
const FONT_OPTIONS = [
  { id: 'default', name: '系统默认', family: 'sans-serif' },
  { id: 'song', name: '宋体', family: 'BandSong' },
  { id: 'kai', name: '楷体', family: 'BandKai' },
  { id: 'round', name: '圆体', family: 'BandRound' }
];

function fontOption(id) {
  return FONT_OPTIONS[FONTS.indexOf(id)] || FONT_OPTIONS[0];
}

// An uncommon road name or emoji must not disappear because of a font subset.
// Fall back for the whole text block, retaining the notification verbatim.
function fontForText(id, text) {
  const coverage = FONT_COVERAGE[id];
  if (!coverage) return 'sans-serif';
  for (const character of String(text || '')) {
    const point = character.codePointAt(0);
    if (point === 10 || point === 13) continue;
    if (point >= 65536 || !(parseInt(coverage.charAt(point >> 2), 16) & (1 << (point & 3)))) return 'sans-serif';
  }
  return fontOption(id).family;
}

function normalize(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = { font: DEFAULTS.font, fontSize: DEFAULTS.fontSize,
    arrowSize: DEFAULTS.arrowSize, arrowWeight: DEFAULTS.arrowWeight };
  if (FONTS.indexOf(input.font) >= 0) result.font = input.font;
  for (const name of Object.keys(LIMITS)) {
    const number = input[name];
    if (typeof number === 'number' && isFinite(number)) {
      result[name] = Math.min(LIMITS[name][1], Math.max(LIMITS[name][0], Math.round(number)));
    }
  }
  return result;
}

// Serialize writes: firmware callbacks may arrive late; only the latest value may win.
function createStore(storage, onLoad, onStatus) {
  let alive = true;
  let revision = 0;
  let pending = null;
  let writing = false;
  function status(value) { if (alive) onStatus(value); }
  function flush() {
    if (writing || !pending) return;
    const job = pending;
    pending = null;
    writing = true;
    let completed = false;
    function finish(ok) {
      if (completed) return;
      completed = true;
      writing = false;
      if (revision === job.revision) status(ok ? '已保存' : '保存失败，本次仍有效');
      flush();
    }
    try {
      storage.set({ key: KEY, value: JSON.stringify(job.value),
        success: () => finish(true), fail: () => finish(false) });
    } catch (error) { finish(false); }
  }
  return {
    load() {
      const started = revision;
      try {
        storage.get({ key: KEY, default: '', success: raw => {
          if (!alive || revision !== started) return;
          let value;
          try { value = JSON.parse(raw || '{}'); } catch (error) { value = {}; }
          onLoad(normalize(value));
        }, fail: () => { if (revision === started) status('读取失败，使用当前设置'); } });
      } catch (error) { status('本次调整无法保存'); }
    },
    save(value) {
      if (!alive) return;
      pending = { revision: ++revision, value: normalize(value) };
      status('保存中');
      flush();
    },
    // Already queued writes may finish after closing; callbacks no longer touch UI.
    dispose() { alive = false; }
  };
}

module.exports = { KEY, DEFAULTS, LIMITS, FONTS, FONT_OPTIONS, fontOption, fontForText, normalize, createStore };
