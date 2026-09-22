const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function resolveAdb(env = process.env) {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const candidates = [env.ADB, path.resolve(__dirname, '../.local/adb/platform-tools', exe),
    ...[env.ANDROID_HOME, env.ANDROID_SDK_ROOT].filter(Boolean).map(sdk => path.join(sdk, 'platform-tools', exe))];
  for (const candidate of candidates) if (candidate && fs.existsSync(candidate)) return candidate;
  return spawnSync(exe, ['version'], { stdio: 'ignore' }).status === 0 ? exe : null;
}
module.exports = { resolveAdb };
