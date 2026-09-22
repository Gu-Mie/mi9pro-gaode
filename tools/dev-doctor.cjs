const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const exists = file => fs.existsSync(path.join(root, file));
const report = (ok, label, hint) => console.log(`${ok ? 'OK' : '--'} ${label}${ok ? '' : '：' + hint}`);
const nodeReady = Number(process.versions.node.split('.')[0]) >= 22;
report(nodeReady, `Node.js ${process.versions.node}`, '安装 Node.js 22+，推荐 24');
console.log('界面预览和 JS 测试只需要 Node.js，不需要设备、私钥或 Android SDK。');
report(exists('wearable/node_modules/aiot-toolkit'), '手环打包依赖', 'npm run deps:wearable');
report(exists('wearable/sign/debug/private.pem') && exists('wearable/sign/debug/certificate.pem'), '手环原签名', '仅安装包需要；从私下备份恢复 wearable/sign/debug/');
report(exists('signing/development.p12'), 'Android 原签名', '仅签名安装包需要；恢复 signing/development.p12');
const javaHome = process.env.JAVA_HOME;
const java = javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const result = spawnSync(java, ['-version'], { encoding: 'utf8' });
const version = (result.stderr || result.stdout || '').match(/version "(\d+)/);
report(result.status === 0 && version && Number(version[1]) >= 17, 'JDK 17+', '通过 JAVA_HOME 指向 JDK 17 或更新版本');
report(!!(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || exists('android/local.properties')), 'Android SDK 路径', '配置 ANDROID_HOME 或 android/local.properties');
report(exists('android/app/libs/xms-wearable-lib_1.4_release.aar'), '小米互联 SDK', 'Windows: tools/fetch-xiaomi-sdk.ps1；其他系统见 docs/development.md');
const { resolveAdb } = require('./resolve-adb.cjs');
const adb = resolveAdb();
report(!!adb, 'ADB（仅真机联调需要）', '安装 platform-tools，加入 PATH 或设置 ADB');
if (adb) {
  const devices = spawnSync(adb, ['devices'], { encoding: 'utf8' });
  const states = (devices.stdout || '').split(/\r?\n/).slice(1).map(line => line.trim().split(/\s+/)[1]).filter(Boolean);
  console.log('USB 设备状态：' + (states.join(', ') || '无连接；不影响离线开发'));
}
if (!nodeReady) process.exitCode = 1;
