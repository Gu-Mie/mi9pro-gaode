const { test } = require('node:test');
const assert = require('node:assert/strict');
const preferences = require('../preview-preferences.cjs')();

test('corrupted or unavailable browser storage preserves usable defaults', () => {
  for (const raw of ['{bad', 'null', '[]', '"text"', '{"font":"untrusted","fontSize":"999"}']) {
    assert.deepEqual(preferences.read({ getItem: () => raw }), preferences.defaults);
  }
  assert.deepEqual(preferences.read({ getItem() { throw new Error('denied'); } }), preferences.defaults);
  assert.deepEqual(preferences.read(undefined), preferences.defaults);
});

test('saved settings survive reload and clamp layout-breaking sizes', () => {
  let raw;
  const storage = { setItem(key, value) { raw = value; }, getItem() { return raw; } };
  preferences.write(storage, { font: 'kai', fontSize: 40, arrowSize: 82, arrowWeight: 7 });
  assert.deepEqual(preferences.read(storage), { font: 'kai', fontSize: 40, arrowSize: 82, arrowWeight: 7 });
  assert.deepEqual(preferences.normalize({ fontSize: 999, arrowSize: -1, arrowWeight: Infinity }),
    { font: 'default', fontSize: 44, arrowSize: 56, arrowWeight: 6 });
  assert.equal(preferences.normalize({ fontSize: 35.7 }).fontSize, 36);
});
