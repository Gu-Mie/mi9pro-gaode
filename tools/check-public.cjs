// Small repository policy guard, not a general-purpose secret scanner.
// Report locations/rule names only; never print matched credential values.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function git(root, args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}

function blockedPath(file) {
  const normalized = file.replaceAll('\\', '/').toLowerCase();
  return /(^|\/)(\.local|\.git|signing|sign|outputs|node_modules|build|dist|\.gradle|__pycache__)(\/|$)/.test(normalized)
    || /(^|\/)\.env(?:\.|$)/.test(normalized) && !normalized.endsWith('/.env.example') && normalized !== '.env.example'
    || /(^|\/)(local\.properties|id_rsa|id_ed25519|credentials)(\/|$)/.test(normalized)
    || /\.(p12|pfx|jks|keystore|pem|key|apk|rpk|aar|hprof|log|pyc|zip|7z)$/.test(normalized);
}

const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['literal-auth-key', /\bAuthKey\b["']?\s*[:=]\s*["'][a-fA-F0-9]{32,}["']/gi]
];

function inspect(file, bytes, scope) {
  const findings = [];
  if (blockedPath(file)) findings.push({ file, scope, rule: 'private-or-generated-path' });
  if (bytes.includes(0)) return findings; // Binary contents require separate review.
  const source = bytes.toString('utf8');
  for (const [rule, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      findings.push({ file, scope, rule, line: source.slice(0, match.index).split('\n').length });
    }
  }
  return findings;
}

function checkPublic(root = path.resolve(__dirname, '..')) {
  if (git(root, ['rev-parse', '--is-shallow-repository']).toString().trim() === 'true') {
    throw new Error('History is shallow; fetch the complete history before checking public files.');
  }
  const files = [...new Set(git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .toString('utf8').split('\0').filter(Boolean))].sort();
  const findings = [];
  const existingFiles = [];
  for (const file of files) {
    const full = path.join(root, file);
    let stat;
    try { stat = fs.lstatSync(full); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      findings.push({ file, scope: 'worktree', rule: 'unsupported-file-type' });
      continue;
    }
    existingFiles.push(file);
    findings.push(...inspect(file, fs.readFileSync(full), 'worktree'));
  }

  const objects = new Map();
  function addObject(mode, hash, file, scope) {
    if (mode !== '100644' && mode !== '100755') {
      findings.push({ file, scope, rule: 'unsupported-file-type' });
      return;
    }
    const key = `${hash}\0${file}`;
    if (!objects.has(key)) objects.set(key, { hash, file, scope });
  }
  for (const entry of git(root, ['ls-files', '--stage', '-z']).toString('utf8').split('\0').filter(Boolean)) {
    const split = entry.indexOf('\t');
    const [mode, hash, stage] = entry.slice(0, split).split(' ');
    const file = entry.slice(split + 1);
    if (stage !== '0') findings.push({ file, scope: 'index', rule: 'unresolved-conflict' });
    addObject(mode, hash, file, 'index');
  }
  const commits = git(root, ['rev-list', '--all']).toString().trim().split('\n').filter(Boolean);
  for (const commit of commits) {
    for (const entry of git(root, ['ls-tree', '-r', '-z', commit]).toString('utf8').split('\0').filter(Boolean)) {
      const split = entry.indexOf('\t');
      const [mode, type, hash] = entry.slice(0, split).split(' ');
      const file = entry.slice(split + 1);
      if (type !== 'blob') findings.push({ file, scope: commit.slice(0, 12), rule: 'unsupported-file-type' });
      else addObject(mode, hash, file, commit.slice(0, 12));
    }
  }
  const blobs = new Map();
  for (const { hash, file, scope } of objects.values()) {
    if (!blobs.has(hash)) blobs.set(hash, git(root, ['cat-file', 'blob', hash]));
    findings.push(...inspect(file, blobs.get(hash), scope));
  }
  return { files: existingFiles, commits: commits.length, blobs: blobs.size, findings };
}

if (require.main === module) {
  try {
    const result = checkPublic();
    console.log(`Checked ${result.files.length} worktree files, index and ${result.commits} reachable commits (${result.blobs} unique blobs).`);
    for (const finding of result.findings) console.error(JSON.stringify(finding));
    if (result.findings.length) process.exitCode = 1;
    else console.log('Public-file policy passed. Binary images, arbitrary secrets and remote settings still require review.');
  } catch (error) {
    // exec errors can contain git output; don't echo those buffers.
    console.error(error.status !== undefined ? 'Git inspection failed; no credential output was printed.' : error.message);
    process.exitCode = 1;
  }
}

module.exports = { checkPublic, inspect, blockedPath };
