// Verify the toolkit's RPK signing block, content digest and nested META-INF/CERT.
// Format reference: aiot-toolkit 2.0.5 SignUtil.js. Reads public certificates only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const Zip = require('../wearable/node_modules/adm-zip');
const expectedCert = new crypto.X509Certificate(fs.readFileSync(require('node:path').join(__dirname, '../wearable/sign/debug/certificate.pem')));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest();
function reader(buffer) {
  let offset = 0;
  return { int() { const value = buffer.readUInt32LE(offset); offset += 4; return value; },
    bytes() { const length = this.int(); assert.ok(length <= buffer.length - offset); const value = buffer.subarray(offset, offset + length); offset += length; return value; } };
}
function verify(buffer) {
  const zip = new Zip(buffer);
  // This adm-zip version's test() indexes entries by object; read each file directly.
  for (const entry of zip.getEntries()) if (!entry.isDirectory) entry.getData();
  let footer = buffer.length - 22;
  while (footer >= 0 && buffer.readUInt32LE(footer) !== 0x06054b50) footer--;
  assert.ok(footer >= 0, 'Missing ZIP footer');
  const central = buffer.readUInt32LE(footer + 16);
  assert.equal(buffer.subarray(central - 16, central).toString(), 'RPK Sig Block 42');
  const length = Number(buffer.readBigUInt64LE(central - 24));
  const start = central - length - 8;
  assert.equal(Number(buffer.readBigUInt64LE(start)), length);
  let signed = false;
  for (let offset = start + 8; offset < central - 24;) {
    const size = Number(buffer.readBigUInt64LE(offset));
    assert.ok(size >= 4 && offset + 8 + size <= central - 24);
    const id = buffer.readUInt32LE(offset + 8);
    if (id === 0x01000101) {
      const signers = reader(buffer.subarray(offset + 12, offset + 8 + size)).bytes();
      const signer = reader(reader(signers).bytes());
      const data = signer.bytes();
      const signatures = reader(signer.bytes());
      const publicKey = signer.bytes();
      const signature = reader(signatures.bytes());
      assert.equal(signature.int(), 0x0103, 'Unsupported signing algorithm');
      const sig = signature.bytes();
      const fields = reader(data);
      const digest = reader(reader(fields.bytes()).bytes());
      assert.equal(digest.int(), 0x0103);
      const expected = digest.bytes();
      const cert = new crypto.X509Certificate(reader(fields.bytes()).bytes());
      assert.equal(cert.fingerprint256, expectedCert.fingerprint256, 'Certificate changed');
      assert.deepEqual(publicKey, cert.publicKey.export({ format: 'der', type: 'spki' }));
      assert.ok(crypto.verify('RSA-SHA256', data, cert.publicKey, sig), 'Signature mismatch');
      const originalFooter = Buffer.from(buffer.subarray(footer));
      originalFooter.writeUInt32LE(start, 16);
      const chunks = [buffer.subarray(0, start), buffer.subarray(central, footer), originalFooter];
      const digests = chunks.map(chunk => {
        const prefix = Buffer.alloc(5); prefix[0] = 0xa5; prefix.writeUInt32LE(chunk.length, 1);
        return hash(Buffer.concat([prefix, chunk]));
      });
      assert.deepEqual(hash(Buffer.concat([Buffer.from([0x5a, 3, 0, 0, 0]), ...digests])), expected,
        'Signed content digest mismatch');
      signed = true;
    }
    offset += size + 8;
  }
  assert.ok(signed, 'Missing signer block');
  const nested = zip.readFile('META-INF/CERT');
  if (nested) {
    const metadata = verify(nested);
    const digests = JSON.parse(metadata.readAsText('hash.json')).digests;
    for (const [name, digest] of Object.entries(digests)) {
      assert.equal(hash(zip.readFile(name)).toString('hex'), digest, 'Metadata digest mismatch: ' + name);
    }
  }
  return zip;
}
if (require.main === module) {
  assert.ok(process.argv.length > 2, 'Usage: node tools/verify-rpk-signature.cjs <rpk> ...');
  for (const file of process.argv.slice(2)) {
    const archive = verify(fs.readFileSync(file));
    const manifest = JSON.parse(archive.readAsText('manifest.json'));
    console.log(file + ': ZIP CRC, signed content, shared certificate and nested signature passed (' + manifest.versionName + ')');
  }
}
module.exports = { verify };
