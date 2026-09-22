const fs = require('node:fs');
const path = require('node:path');
const { X509Certificate, createPrivateKey } = require('node:crypto');
function checkSigning(root = path.resolve(__dirname, '..'), release = false) {
  const certPath = path.join(root, 'wearable/sign/debug/certificate.pem');
  const keyPath = path.join(root, 'wearable/sign/debug/private.pem');
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new Error('缺少原手环签名。请从私下备份恢复 wearable/sign/debug/；已阻止 toolkit 自动使用其他证书。界面开发可运行 npm run dev，测试可运行 npm test。');
  }
  const cert = new X509Certificate(fs.readFileSync(certPath));
  if (!cert.checkPrivateKey(createPrivateKey(fs.readFileSync(keyPath)))) throw new Error('手环证书与私钥不匹配。');
  if (release) {
    const directory = ['wearable/sign/release', 'wearable/sign'].map(dir => path.join(root, dir))
      .find(dir => ['private.pem', 'certificate.pem'].every(file => fs.existsSync(path.join(dir, file))));
    if (!directory) throw new Error('缺少原发布签名；release 需要与 debug 同一身份的签名。');
    const releaseCert = new X509Certificate(fs.readFileSync(path.join(directory, 'certificate.pem')));
    if (releaseCert.fingerprint256 !== cert.fingerprint256 ||
      !releaseCert.checkPrivateKey(createPrivateKey(fs.readFileSync(path.join(directory, 'private.pem'))))) {
      throw new Error('发布签名与原 debug 身份不一致。');
    }
  }
  return cert.fingerprint256;
}
if (require.main === module) {
  try { console.log('手环签名文件检查通过：' + checkSigning(undefined, process.argv.includes('--release'))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { checkSigning };
