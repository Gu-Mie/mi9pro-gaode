// Run with agent-browser eval --stdin on the local source preview.
// Checks browser geometry/interactions; does not certify the Vela renderer.
(async () => {
  let checks = 0;
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks++; };
  const q = (selector, index = 0) => document.querySelector('#band-' + index + ' ' + selector);
  const click = selector => { const node = q(selector); assert(!!node, 'click target: ' + selector); node.click(); };
  const scene = name => document.querySelector('[data-scene="' + name + '"]').click();
  const near = (actual, expected) => Math.abs(actual - expected) < 0.6;
  const app = window.nativePreviews[0];
  document.getElementById('reset').click();
  app.page.closeSettings();
  app.render();
  function geometry(index = 0) {
    const page = q('.page', index).getBoundingClientRect();
    const content = q('.navigation-stage', index) || q('.rest', index);
    const rect = content.getBoundingClientRect();
    const gear = q('.settings-entry', index).getBoundingClientRect();
    assert(near(rect.x + rect.width / 2 - page.x, 168), 'content centered horizontally');
    assert(near(rect.y + rect.height / 2 - page.y, 240), 'content centered vertically');
    assert(rect.bottom <= gear.top - 16, 'content leaves space for the gear');
    assert(gear.width === 64 && gear.height === 64, '64px hit target');
    assert(q('.settings-icon', index).getBoundingClientRect().width === 42, '42px gear icon');
    assert(near(gear.x + gear.width / 2 - page.x, 168), 'gear centered horizontally');
    assert(near(gear.bottom - page.y, 464), 'gear 16px from bottom');
  }
  function settingsGeometry() {
    assert(!q('.home'), 'home removed on settings entry');
    const page = q('.page').getBoundingClientRect();
    const settings = q('.settings').getBoundingClientRect();
    assert(settings.x === page.x && settings.y === page.y, 'settings starts at screen origin');
    const list = q('.settings-list');
    const viewport = list.getBoundingClientRect();
    assert(viewport.top >= q('.settings-title').getBoundingClientRect().bottom, 'settings list below scaled header');
    assert(viewport.bottom <= page.bottom - 16, 'settings list inside bottom safe area');
    assert(list.scrollWidth <= list.clientWidth, 'settings has no horizontal overflow');
    for (const row of list.children) {
      const outer = row.getBoundingClientRect();
      for (const node of row.querySelectorAll('p')) {
        const rect = node.getBoundingClientRect();
        assert(rect.width > 0 && rect.height > 0 && rect.left >= outer.left && rect.top >= outer.top && rect.right <= outer.right && rect.bottom <= outer.bottom,
          'settings text/button inside scrollable row: ' + node.className);
        assert(node.scrollWidth <= node.clientWidth, 'text not clipped horizontally: ' + node.className);
      }
    }
    for (const selector of ['.font-size-row', '.arrow-size-row', '.arrow-weight-row']) {
      const row = q(selector);
      const less = row.querySelector('.decrease').getBoundingClientRect();
      const value = row.querySelector('.setting-value').getBoundingClientRect();
      const more = row.querySelector('.increase').getBoundingClientRect();
      assert(less.width === 44 && less.height >= 52, 'narrower, tall button');
      assert(near(value.left - less.right, 12) && near(more.left - value.right, 12), 'equal compact stepper gaps');
      assert(near(value.x + value.width / 2 - page.x, 168), 'values centered');
    }
    assert(q('.font-selector').getBoundingClientRect().width === 288, 'font selector spans the common content width');
    assert(q('.version').textContent.includes(app.page.versionName), 'current version rendered');
    list.scrollTop = list.scrollHeight;
    const reset = q('.reset-defaults').getBoundingClientRect();
    assert(reset.bottom <= viewport.bottom && reset.top >= viewport.top, 'restore defaults reachable by scrolling');
    list.scrollTop = 0;
  }
  for (const name of ['active', 'idle', 'ended', 'paused', 'disconnected', 'error', 'expired']) {
    scene(name); geometry();
    click('.settings-entry'); settingsGeometry();
    click('.back'); assert(!q('.settings'), 'settings removed on return'); geometry();
  }
  scene('active'); click('.settings-entry');
  click('.font-size-row .increase');
  click('.arrow-size-row .increase');
  click('.arrow-weight-row .increase');
  assert(app.page.fontSize === 31 && app.page.arrowSize === 44 && app.page.arrowWeight === 9, 'three stepper events applied');
  const saved = JSON.parse(localStorage.getItem('wrist.native-preview.0'));
  assert(saved.fontSize === 31 && saved.arrowSize === 44 && saved.arrowWeight === 9, 'settings saved');
  scene('expired'); settingsGeometry();
  click('.back'); assert(!q('.navigation-stage'), 'return after expiry does not show stale guidance');
  scene('long');
  for (const fontSize of [24, 30, 44]) {
    for (const arrowSize of [32, 42, 100]) {
      app.page.applySettings({ fontSize, arrowSize, arrowWeight: 6 }); app.page.paint(); app.render();
      geometry();
      const list = q('.guidance-list');
      assert(list.scrollWidth <= list.clientWidth, 'no horizontal text overflow');
      if (app.page.guidanceLines.length * app.page.rowHeight > app.page.guidanceHeight) {
        assert(list.scrollHeight > list.clientHeight, 'overflowing content scrolls');
        list.scrollTop = list.scrollHeight;
        assert(list.scrollTop > 0, 'can reach later guidance rows');
      } else assert(list.scrollHeight === list.clientHeight, 'short content fits without scrolling');
    }
  }
  for (const font of ['default', 'song', 'kai', 'round']) {
    scene('active'); click('.settings-entry'); click('.font-selector');
    assert(!q('.settings-list') && q('.font-options'), 'font picker is an exclusive view');
    const index = ['default', 'song', 'kai', 'round'].indexOf(font);
    q('.font-options').children[index].querySelector('.font-choice').click();
    assert(app.page.font === font && !app.page.fontPickerOpen, 'font-choice click selects and returns');
    await document.fonts.ready;
    for (const fontSize of [24, 30, 44]) {
      app.page.saveSettings({ font, fontSize, arrowSize: 42, arrowWeight: 8 }); app.render();
      settingsGeometry();
      assert(parseFloat(getComputedStyle(q('.setting-value')).fontSize) === fontSize, 'settings values scale with global font');
      click('.back');
      scene('active'); geometry();
      assert(parseFloat(getComputedStyle(q('.guidance-text')).fontSize) === fontSize, 'navigation global size');
      if (font !== 'default') {
        assert(getComputedStyle(q('.guidance-text')).fontFamily === app.page.fontFamily, 'selected family used for navigation');
        assert(document.fonts.check(fontSize + 'px ' + app.page.fontFamily, '直行200米'), 'bundled browser font loaded');
      }
      for (const state of ['idle', 'error', 'expired']) {
        scene(state); geometry();
        assert(parseFloat(getComputedStyle(q('.rest-title')).fontSize) === fontSize, 'waiting title global size');
        assert(parseFloat(getComputedStyle(q('.rest-hint')).fontSize) === app.page.hintSize, 'waiting hint proportional size');
      }
      click('.settings-entry');
    }
    click('.back');
  }
  click('.settings-entry'); click('.reset-defaults');
  assert(app.page.fontSize === 30 && app.page.arrowSize === 42 && app.page.arrowWeight === 8 && app.page.font === 'default', 'restore defaults');
  click('.back');
  // Leave the saved stepper settings for the separate reload check.
  app.page.saveSettings(saved); scene('active');
  geometry();
  await Promise.resolve();
  return { checks, saved, status: 'source preview interactions and geometry passed' };
})();
