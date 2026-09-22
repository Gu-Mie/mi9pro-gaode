// Display preferences for the interactive browser prototype, not device storage.
function createPreferences() {
  const key = 'mi9pro.preview.display.v1';
  const defaults = { font: 'default', fontSize: 34, arrowSize: 78, arrowWeight: 6 };
  const bounds = { fontSize: [24, 44], arrowSize: [56, 100], arrowWeight: [4, 10] };
  const fonts = ['default', 'song', 'kai', 'rounded'];
  function normalize(value) {
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const result = { ...defaults };
    if (fonts.includes(input.font)) result.font = input.font;
    for (const field of Object.keys(bounds)) {
      if (typeof input[field] !== 'number' || !Number.isFinite(input[field])) continue;
      const [min, max] = bounds[field];
      result[field] = Math.min(max, Math.max(min, Math.round(input[field])));
    }
    return result;
  }
  function read(storage) {
    try { return normalize(JSON.parse(storage.getItem(key))); }
    catch { return normalize(null); }
  }
  function write(storage, value) {
    storage.setItem(key, JSON.stringify(normalize(value)));
  }
  return { key, defaults, bounds, fonts, normalize, read, write };
}
module.exports = createPreferences;
