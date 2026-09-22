const { test } = require('node:test');
const assert = require('node:assert/strict');
const presentation = require('../src/common/presentation');

test('navigation stays centered at every supported size without covering the settings target', () => {
  for (let fontSize = 24; fontSize <= 44; fontSize++) {
    for (let arrowSize = 32; arrowSize <= 100; arrowSize++) {
      for (const rawText of ['直行200米', '很长的通知原文😀'.repeat(24)]) {
        const model = presentation.navigationLayout({ rawText }, { fontSize, arrowSize }, '');
        assert.equal(model.contentTop + model.contentHeight / 2, 240);
        assert.equal(24 + model.arrowLeft + arrowSize / 2, 168);
        assert.ok(model.contentTop >= 32);
        assert.ok(model.contentTop + model.contentHeight <= 384, 'keep a 16px gap above the 400px settings target');
        assert.equal(model.guidanceTop, arrowSize + 26);
        assert.equal(model.guidanceLines.join(''), rawText);
      }
    }
  }
});

test('empty state centers only visible content and keeps errors readable', () => {
  for (const status of ['等待连接', '等待导航', '导航结束', '同步已暂停', '导航已过期', '连接已断开', '连接不可用', '通知读取不可用']) {
    const empty = presentation.restLayout({ status, live: false, rawText: '', instruction: '' }, '');
    assert.equal(empty.restTop + empty.restHeight / 2, 240);
    assert.equal(empty.hasDetails, false);
    assert.equal(empty.detailsHeight, 0);
    assert.equal(empty.rawLines.length, 0);
    assert.ok(empty.hintLines.every(line => line.length <= 14));
    const failed = presentation.restLayout({ status, live: false, rawText: '连接错误内容'.repeat(40), instruction: '' }, '附加错误');
    assert.equal(failed.restTop + failed.restHeight / 2, 240);
    assert.ok(failed.restTop + failed.restHeight < 400);
    assert.equal(failed.detailsHeight, 84);
    assert.equal(failed.rawLines.join(''), '连接错误内容'.repeat(40) + '附加错误');
  }
});

test('global size scales waiting and settings without clipping long statuses or the gear', () => {
  for (let fontSize = 24; fontSize <= 44; fontSize++) {
    const type = presentation.typography(fontSize);
    assert.ok(type.buttonHeight >= 52);
    assert.ok(type.buttonHeight >= type.titleHeight);
    assert.ok(type.settingRowHeight >= type.controlTop + type.buttonHeight + 12);
    for (const status of ['等待导航', '通知读取不可用', '连接已断开']) {
      const model = presentation.restLayout({ status, rawText: '错误详情'.repeat(25) }, '', { fontSize });
      assert.equal(model.titleLines.join(''), status);
      assert.equal(model.rawLines.join(''), '错误详情'.repeat(25));
      assert.equal(model.restTop + model.restHeight / 2, 240);
      assert.ok(model.restTop + model.restHeight <= 384);
      assert.ok(model.titleLines.every(row => Array.from(row).length * fontSize <= 288));
      assert.ok(model.rawLines.every(row => Array.from(row).length * type.hintSize <= 288));
    }
  }
});
