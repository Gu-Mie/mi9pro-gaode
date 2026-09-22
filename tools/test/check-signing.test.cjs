const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkSigning } = require('../check-signing.cjs');
test('a fresh checkout cannot silently build with toolkit default certificates', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrist-signing-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => checkSigning(root), /缺少原手环签名/);
  assert.deepEqual(fs.readdirSync(root), []);
  const signing = path.join(root, 'wearable/sign/debug');
  fs.mkdirSync(signing, { recursive: true });
  fs.writeFileSync(path.join(signing, 'certificate.pem'), 'incomplete backup');
  assert.throws(() => checkSigning(root), /缺少原手环签名/);
  fs.writeFileSync(path.join(signing, 'private.pem'), 'invalid key');
  assert.throws(() => checkSigning(root));
});
