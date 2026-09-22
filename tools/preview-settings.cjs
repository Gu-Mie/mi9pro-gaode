const fs = require('node:fs');
const path = require('node:path');
const createPreferences = require('./preview-preferences.cjs');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'wearable/src/manifest.json'), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const html = fs.readFileSync(path.join(__dirname, 'preview-settings.html'), 'utf8')
  .replaceAll('__APP_VERSION__', escape(manifest.versionName))
  .replace('__PREFERENCES_FACTORY__', createPreferences.toString());
const output = path.join(root, 'outputs/previews/wearable-settings-preview.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
