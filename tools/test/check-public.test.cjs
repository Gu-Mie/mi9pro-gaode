const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { checkPublic } = require('../check-public.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wrist-public-test-'));
  t.after(() => {
    if (path.dirname(root) !== os.tmpdir() || !path.basename(root).startsWith('wrist-public-test-')) throw new Error('Unsafe fixture path');
    fs.rmSync(root, { recursive: true, force: true });
  });
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  git('init', '--quiet');
  git('config', 'user.name', 'Policy Test');
  git('config', 'user.email', 'policy-test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  write('.gitignore', '.local/\nsigning/\n');
  write('README.md', 'Synthetic fixture.\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  return { root, git, write };
}

test('ordinary clone excludes ignored local secrets while retaining untracked source', t => {
  const { root, write } = fixture(t);
  write('.local/private.txt', 'local only');
  write('new-source.js', 'module.exports = {};');
  const result = checkPublic(root);
  assert.deepEqual(result.findings, []);
  assert.ok(result.files.includes('new-source.js'));
  assert.ok(!result.files.includes('.local/private.txt'));
});

test('force-added signing material cannot bypass ignore rules', t => {
  const { root, git, write } = fixture(t);
  write('signing/development.p12', Buffer.from([0, 1, 2]));
  git('add', '-f', 'signing/development.p12');
  assert.ok(checkPublic(root).findings.some(f => f.file === 'signing/development.p12'));
});

test('a staged credential remains detectable after worktree sanitization', t => {
  const { root, git, write } = fixture(t);
  const synthetic = ['ghp', '_', 'A'.repeat(36)].join('');
  write('config.js', `const token = '${synthetic}';`);
  git('add', 'config.js');
  write('config.js', 'const token = process.env.TOKEN;');
  const result = checkPublic(root);
  assert.ok(result.findings.some(f => f.scope === 'index' && f.rule === 'github-token'));
  assert.ok(!JSON.stringify(result).includes(synthetic));
});

test('deleting a key file does not remove it from the history check', t => {
  const { root, git, write } = fixture(t);
  write('old.key', ['-----BEGIN ', 'PRIVATE KEY-----\nsynthetic'].join(''));
  git('add', 'old.key');
  git('commit', '--quiet', '-m', 'synthetic legacy file');
  git('rm', '--quiet', 'old.key');
  git('commit', '--quiet', '-m', 'remove legacy file');
  const result = checkPublic(root);
  assert.equal(result.commits, 3);
  assert.ok(result.findings.some(f => f.file === 'old.key' && f.rule === 'private-key'));
});

test('a token in untracked source is reported without disclosing the value', t => {
  const { root, write } = fixture(t);
  const synthetic = ['github', '_pat_', 'b'.repeat(70)].join('');
  write('new.js', `const token = '${synthetic}';`);
  const result = checkPublic(root);
  assert.ok(result.findings.some(f => f.scope === 'worktree' && f.rule === 'github-token'));
  assert.ok(!JSON.stringify(result).includes(synthetic));
});
