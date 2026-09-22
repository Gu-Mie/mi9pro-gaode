const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { resolveAdb } = require('./resolve-adb.cjs');

const root = path.resolve(__dirname, '..');
const serial = process.argv[2];
const prefix = serial ? ['-s', serial] : [];
const output = path.join(root, '.local', 'screenshots');
mkdirSync(output, { recursive: true });
const file = path.join(output, 'phone.png');
const adb = resolveAdb();
if (!adb) throw new Error('ADB not found. Set ADB / ANDROID_HOME, or add platform-tools to PATH.');
const pixels = execFileSync(adb, [...prefix, 'exec-out', 'screencap', '-p'], { maxBuffer: 20 * 1024 * 1024 });
if (!pixels.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('ADB did not return a PNG.');
writeFileSync(file, pixels);
console.log(file);
