/* Browser adapter for the source UX. Only used by preview-wearable.cjs. */
/* global bundle */
(() => {
  const template = document.createElement('template');
  template.innerHTML = bundle.template;
  function launch(index, initialScene, initialSettings, settingsOpen) {
    const host = document.getElementById('band-' + index);
    let page;
    let queued = false;
    let offset = 0;
    let connected = true;
    let seq = 0;
    let timer = null;
    let expire = null;
    let scene = initialScene;
    const storageKey = 'wrist.native-preview.' + index;
    const screenRequests = [];
    const events = [];
    const callbacks = [];
    const moduleCache = {};
    const connection = {
      getReadyState: cb => cb.success({ status: connected ? 1 : 2 }),
      send: cb => events.push(JSON.parse(cb.data))
    };
    const storage = {
      get(cb) { try { cb.success(localStorage.getItem(storageKey) || ''); } catch { cb.fail(); } },
      set(cb) { try { localStorage.setItem(storageKey, cb.value); cb.success(); } catch { cb.fail(); } }
    };
    const clock = { now: () => Date.now() + offset };
    function schedule(fn, ms) {
      expire = fn;
      timer = window.setTimeout(() => { fn(); render(); }, ms);
      return timer;
    }
    function unschedule(id) { window.clearTimeout(id); timer = null; expire = null; }
    function requireModule(name) {
      if (name === '@system.storage') return storage;
      if (name === '@system.interconnect') return { instance: () => connection };
      if (name === '@system.brightness') return { setKeepScreenOn: cb => screenRequests.push(cb.keepScreenOn) };
      if (!moduleCache[name]) {
        if (!bundle.modules[name]) throw new Error('Unknown preview module: ' + name);
        const module = { exports: {} };
        new Function('module', 'require', bundle.modules[name])(module,
          child => requireModule(child.startsWith('./') ? name.slice(0, name.lastIndexOf('/') + 1) + child.slice(2) : child));
        moduleCache[name] = module.exports;
      }
      return moduleCache[name];
    }
    const module = { exports: {} };
    new Function('module', 'require', 'Date', 'setTimeout', 'clearTimeout', bundle.script)(module, requireModule, clock, schedule, unschedule);
    const definition = module.exports;
    page = new Proxy(Object.assign({}, definition.private, definition), {
      set(target, key, value) {
        target[key] = value;
        if (!queued) { queued = true; queueMicrotask(() => { queued = false; render(); }); }
        return true;
      }
    });
    function expression(code, scope) { return new Function('scope', 'with(scope){return (' + code + ')}')(scope); }
    function interpolate(value, scope) {
      return value.replace(/{{\s*([\s\S]*?)\s*}}/g, (_, code) => String(expression(code, scope)));
    }
    function renderNode(source, scope, repeated = false) {
      if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(interpolate(source.textContent, scope));
      if (source.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
      if (!repeated && source.hasAttribute('for')) {
        const items = expression(source.getAttribute('for').replace(/{{|}}/g, ''), scope);
        const fragment = document.createDocumentFragment();
        items.forEach((item, i) => fragment.append(renderNode(source, Object.assign({}, scope, { $item: item, $idx: i }), true)));
        return fragment;
      }
      if (source.hasAttribute('if') && !expression(source.getAttribute('if').replace(/{{|}}/g, ''), scope)) return document.createDocumentFragment();
      const tag = source.tagName.toLowerCase();
      const target = document.createElement(tag === 'text' ? 'p' : tag === 'image' ? 'img' : tag.startsWith('list') ? 'div' : tag);
      target.dataset.type = tag;
      for (const attribute of source.attributes) {
        if (['for', 'if'].includes(attribute.name)) continue;
        if (attribute.name === 'onclick') {
          const code = attribute.value;
          const click = event => {
            callbacks.push(code);
            if (/^[\w]+$/.test(code)) page[code](event);
            else new Function('page', '$item', '$idx', 'with(page){return (' + code + ')}')(page, scope.$item, scope.$idx);
            render();
          };
          target.addEventListener('click', click);
          target.setAttribute('role', 'button'); target.tabIndex = 0;
          target.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); click(event); } });
        } else if (attribute.name === 'show') {
          if (!expression(attribute.value.replace(/{{|}}/g, ''), scope)) target.style.display = 'none';
        } else if (attribute.name === 'src') {
          target.src = bundle.images[interpolate(attribute.value, scope)]; target.alt = '';
        } else target.setAttribute(attribute.name, interpolate(attribute.value, scope));
      }
      for (const child of source.childNodes) target.append(renderNode(child, scope));
      if (target.classList.contains('settings-entry')) target.setAttribute('aria-label', '打开显示设置');
      if (target.classList.contains('back')) target.setAttribute('aria-label', '返回导航');
      return target;
    }
    function render() {
      const positions = [...host.querySelectorAll('[data-type=list]')].map(el => [el.className, el.scrollTop]);
      host.replaceChildren(renderNode(template.content.firstElementChild, page));
      positions.forEach(([name, scroll]) => { const list = host.getElementsByClassName(name)[0]; if (list) list.scrollTop = scroll; });
    }
    function setScene(next) {
      scene = next;
      offset = 0;
      if (next === 'disconnected') {
        connected = false; connection.onclose(''); render(); return;
      }
      if (next === 'error') { connection.onerror('本地模拟连接错误'); render(); return; }
      connected = true;
      const active = ['active', 'long', 'expired'].includes(next);
      connection.onmessage({ data: JSON.stringify({ v: 1, type: 'navigation', session: 'browser-only', seq: ++seq,
        status: active ? 'active' : next, title: '高德地图', maneuver: next === 'long' ? 'right' : 'straight',
        distance: active ? '200 米' : '', instruction: active ? '直行' : '',
        rawText: next === 'long' ? '前方1.2公里右转进入示例道路，请注意路况并继续查看完整指引' : active ? '直行200米\n高德导航中' : '' }) });
      if (next === 'expired') advance(20000);
      render();
    }
    function advance(ms) { offset += ms; if (expire) { const run = expire; window.clearTimeout(timer); run(); } render(); }
    page.onInit(); page.onReady(); page.onShow();
    if (initialSettings) page.applySettings(initialSettings);
    setScene(initialScene);
    if (settingsOpen) page.openSettings();
    render();
    const heartbeat = window.setInterval(() => { if (scene === 'active' || scene === 'long') setScene(scene); }, 8000);
    return { page, setScene, advance, render, screenRequests, events, callbacks,
      stop() { window.clearInterval(heartbeat); page.onDestroy(); },
      reset() { localStorage.removeItem(storageKey); page.applySettings(initialSettings || requireModule('../../common/settings').DEFAULTS); page.paint(); render(); }
    };
  }
  const previews = [launch(0, 'active'), launch(1, 'idle'), launch(2, 'idle', null, true), launch(3, 'long', { fontSize: 44, arrowSize: 100, arrowWeight: 6 })];
  window.nativePreviews = previews;
  const controls = [...document.querySelectorAll('[data-scene]')];
  controls.forEach(button => button.addEventListener('click', () => {
    previews[0].setScene(button.dataset.scene);
    controls.forEach(item => item.classList.toggle('selected', item === button));
  }));
  controls[0].classList.add('selected');
  document.getElementById('reset').addEventListener('click', () => previews.forEach(preview => preview.reset()));
  window.addEventListener('keydown', event => { if (event.key === 'Escape') previews.forEach(preview => { preview.page.onBackPress(); preview.render(); }); });
  window.addEventListener('beforeunload', () => previews.forEach(preview => preview.stop()));
})();
