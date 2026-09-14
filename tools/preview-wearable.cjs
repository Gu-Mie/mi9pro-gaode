// Static design preview using the same template, styles and display projection as the RPK.
// Browser fonts/rendering differ from Vela. Example data stays outside wearable/src.
const fs = require('node:fs');
const path = require('node:path');
const presentation = require('../wearable/src/common/presentation');
const protocol = require('../wearable/src/common/protocol');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'wearable/src/pages/index/index.ux'), 'utf8');
const template = source.match(/<template>([\s\S]*?)<\/template>/)[1];
const styles = source.match(/<style>([\s\S]*?)<\/style>/)[1];
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function render(view) {
  const model = { ...view, ...presentation.layout(view) };
  model.icon = '/common/' + view.icon + '.png';
  model.rawLines = presentation.lines(model.details);
  let markup = template.replace(/<list-item[^>]*class="detail-row"[^>]*>[\s\S]*?<\/list-item>/,
    model.rawLines.map(line => '<div class="detail-row"><div class="raw">' + escape(line) + '</div></div>').join(''));
  markup = markup.replace(/{{\s*(!?)([a-zA-Z]+)\s*}}/g, (_, negate, key) => escape(negate ? !model[key] : model[key]));
  markup = markup.replace(/show="false"/g, 'hidden').replace(/show="true"/g, '')
    .replace(/<text/g, '<div').replace(/<\/text>/g, '</div>')
    .replace(/<list/g, '<div').replace(/<\/list>/g, '</div>')
    .replace(/<image class="arrow" src="([^"]+)"><\/image>/g, (_, uri) =>
      '<img class="arrow" alt="" src="data:image/png;base64,' + fs.readFileSync(path.join(root, 'wearable/src', uri)).toString('base64') + '">');
  return '<div class="band">' + markup + '</div>';
}
const sample = (distance, maneuver, instruction, rawText) => protocol.present({
  status: 'active', distance, maneuver, instruction, rawText
}, 0, true);
const views = [
  ['01 / 路口转向', sample('200 米', 'right', '右转', '200米右转\n进入示例路\n高德导航中')],
  ['02 / 长距离指引', sample('1.2 公里', 'straight', '沿当前道路直行', '1.2公里沿当前道路直行\n高德导航中')],
  ['03 / 等待导航', protocol.present(null, 0, true)]
];
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>腕上导航 · 手环界面 0.2.1</title><style>
*{box-sizing:border-box}body{margin:0;background:#f0f3ed;color:#25382c;font-family:"Microsoft YaHei",sans-serif;padding:42px}
h1{font-size:30px;font-weight:600;margin:0 0 10px}p{color:#6b7d70;font-size:14px;margin:0 0 32px}
main{display:flex;gap:32px;flex-wrap:wrap}.caption{font-size:13px;letter-spacing:1px;color:#607667;margin:20px 6px 0}
.band{width:352px;height:496px;padding:8px;border-radius:52px;background:#26372c;box-shadow:0 20px 36px #17261a20;overflow:hidden}
.page{border-radius:44px;overflow:hidden}.page div{display:flex;flex-shrink:0;border-style:solid;border-width:0}.page{display:flex;flex-shrink:0}
.page [hidden]{display:none!important}.details{overflow:hidden;display:block!important}.detail-row{display:block!important}
.raw,.status,.distance,.unit,.instruction,.rest-title,.rest-hint{display:block!important;white-space:pre-wrap;overflow:hidden}
.instruction{display:flex!important;align-items:center}.rest-hint{overflow:hidden}
${styles}
</style><h1>腕上导航，换一种清晰。</h1><p>手环 0.2.1 设计预览 · 336 × 480 · 示例数据，非真机截图</p><main>
${views.map(([caption, view]) => '<section>' + render(view) + '<div class="caption">' + caption + '</div></section>').join('')}
</main></html>`;
const output = path.join(root, 'outputs/wearable-ui-021.html');
fs.writeFileSync(output, html);
console.log(output);
