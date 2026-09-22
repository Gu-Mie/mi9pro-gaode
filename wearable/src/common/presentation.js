// Fixed-height list rows must each fit one line on the 336px Band 9 Pro display.
// Use a conservative full-width character budget, preserving surrogate pairs.
function lines(text, budget) {
  const limit = typeof budget === 'number' && isFinite(budget) && budget > 0 ? Math.max(1, Math.floor(budget)) : 14;
  const result = [];
  const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  for (let p = 0; p < paragraphs.length; p++) {
    let row = '';
    let count = 0;
    for (let i = 0; i < paragraphs[p].length; i++) {
      const code = paragraphs[p].charCodeAt(i);
      row += paragraphs[p][i];
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < paragraphs[p].length) {
        const next = paragraphs[p].charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) row += paragraphs[p][++i];
      }
      if (++count === limit) { result.push(row); row = ''; count = 0; }
    }
    if (row || !paragraphs[p]) result.push(row || ' ');
  }
  return result;
}

function errorText(stage, data, code) {
  const errorCode = code !== undefined ? code : data && data.code;
  const detail = typeof data === 'string' ? data : data && (data.message || data.data);
  return stage + (errorCode !== undefined && errorCode !== null ? ' (' + errorCode + ')' : '') +
    (detail ? '\n' + String(detail).slice(0, 160) : '');
}

// Remove only exact duplicate guidance and Gaode's fixed status label; keep all other text.
function details(view) {
  if (!view.live) return view.rawText === view.instruction ? '' : view.rawText;
  const compact = value => String(value || '').replace(/\s/g, '');
  const instruction = compact(view.instruction);
  const distance = compact(view.distance);
  return String(view.rawText || '').split('\n').filter(line => {
    const value = compact(line);
    return value && value !== '高德导航中' && value !== '高德地图' &&
      value !== instruction && value !== instruction + distance && value !== distance + instruction;
  }).join('\n');
}

// A display-only projection: retain the packet's wording and original unit.
function layout(view) {
  const guidance = !!view.live || view.status === '演示 · 非真实导航';
  const distance = String(view.distance || '').trim();
  const parts = distance.match(/^(\d+(?:\.\d+)?)\s*(公里|千米|米|km|m)$/i);
  const value = parts ? parts[1] : distance.length <= 6 ? distance : '';
  const size = value.length <= 3 ? 72 : value.length <= 5 ? 52 : value.length <= 8 ? 32 : 24;
  let extra = details(view);
  // Long/unrecognised fields remain readable in the scrollable text area.
  const overflow = [];
  if (guidance && distance.length > 6 && !parts) overflow.push(distance);
  if (guidance && String(view.instruction || '').length > 16) overflow.push(view.instruction);
  for (const field of overflow) {
    if (extra.indexOf(field) < 0) extra = field + (extra ? '\n' + extra : '');
  }
  const hints = {
    '等待连接': '在手机上连接小米运动健康',
    '等待导航': '在高德开始导航后自动同步',
    '导航结束': '下一次出发时自动同步',
    '同步已暂停': '在手机上开启同步',
    '导航已过期': '等待手机更新导航',
    '连接已断开': '在手机上重新连接手环',
    '连接不可用': '在手机上重新连接手环',
    '通知读取不可用': '检查手机的通知使用权'
  };
  return {
    guidance, header: guidance ? view.status : '腕上导航',
    statusColor: view.live ? '#80f5be' : /过期|断开|不可用|演示/.test(view.status) ? '#d4b57b' : '#64776b',
    distanceValue: guidance ? value || '—' : '',
    distanceUnit: guidance ? parts ? parts[2] : distance && !value ? '查看原文' : '' : '',
    distanceSize: size, hint: hints[view.status] || '', details: extra
  };
}

// Preserve the notification's wording, including unrecognized directions and roads.
// Only remove the exact fixed app/status labels; never reconstruct a sentence.
function navigationText(view) {
  const raw = String(view.rawText || '').trim();
  if (!raw) return String(view.instruction || '').trim() || String(view.distance || '').trim();
  const content = raw.split(/\r?\n/).filter(line => {
    const label = line.trim();
    return label !== '高德地图' && label !== '高德导航中';
  }).join('\n').trim();
  return content || raw;
}

function navigationLayout(view, settings, warning) {
  const size = settings.fontSize;
  const rowHeight = Math.ceil(size * 1.4);
  let text = navigationText(view);
  if (warning) text += (text ? '\n' : '') + warning;
  const rows = lines(text, Math.floor(288 / size));
  const guidanceHeight = Math.min(166, 288 - settings.arrowSize - 26, rows.length * rowHeight);
  const contentHeight = settings.arrowSize + 26 + guidanceHeight;
  return { guidanceLines: rows, rowHeight, guidanceHeight, contentHeight,
    contentTop: (480 - contentHeight) / 2, arrowLeft: (288 - settings.arrowSize) / 2,
    guidanceTop: settings.arrowSize + 26 };
}

// All three screens share one type scale. Bigger settings scroll instead of
// squeezing controls or silently ignoring the user's chosen font size.
function typography(fontSize) {
  const labelSize = Math.round(fontSize * 0.8);
  const hintSize = Math.round(fontSize * 0.72);
  const auxiliarySize = Math.round(fontSize * 0.6);
  const titleHeight = Math.ceil(fontSize * 1.4);
  const labelHeight = Math.ceil(labelSize * 1.16);
  const hintHeight = Math.ceil(hintSize * 1.4);
  const auxiliaryHeight = Math.ceil(auxiliarySize * 1.25);
  const buttonHeight = Math.max(52, titleHeight);
  const fontSelectorHeight = Math.max(44, labelHeight + 12);
  return { labelSize, hintSize, auxiliarySize, titleHeight, labelHeight, hintHeight, auxiliaryHeight,
    buttonHeight, controlTop: labelHeight + 4, settingRowHeight: labelHeight + 4 + buttonHeight + 12,
    fontSelectorHeight, fontRowHeight: fontSelectorHeight + 12,
    footerHeight: auxiliaryHeight * 2 + 4, adjustSize: Math.round(fontSize * 1.15),
    fontChoiceHeight: labelHeight + titleHeight + 16 };
}

function restLayout(view, warning, settings) {
  const type = typography(settings ? settings.fontSize : 30);
  const hints = {
    '等待连接': ['请在手机上连接', '小米运动健康'],
    '等待导航': ['在高德开始导航', '指引将在这里显示'],
    '导航结束': ['下一次出发时', '自动同步导航'],
    '同步已暂停': ['请在手机端', '开启导航同步'],
    '导航已过期': ['等待手机更新导航'],
    '连接已断开': ['请在手机上', '重新连接手环'],
    '连接不可用': ['请在手机上', '重新连接手环'],
    '通知读取不可用': ['请检查手机的', '通知使用权']
  };
  const hintLines = (hints[view.status] || []).reduce((all, text) => all.concat(lines(text, Math.floor(288 / type.hintSize))), []);
  const titleLines = lines(view.status, Math.floor(288 / (settings ? settings.fontSize : 30)));
  const restTitleHeight = titleLines.length * type.titleHeight;
  const hintTop = restTitleHeight + 12;
  const hintsHeight = hintLines.length * type.hintHeight;
  const text = [details(view), warning].filter(Boolean).join('\n');
  const rawLines = text ? lines(text, Math.floor(288 / type.hintSize)) : [];
  const detailsTop = restTitleHeight + (hintLines.length ? 12 + hintsHeight : 0) + (text ? 16 : 0);
  // Keep even the longest status/error above the bottom gear. All error rows
  // remain in a scrollable list, including at the largest global font size.
  const detailsHeight = Math.min(84, Math.max(type.hintHeight, 288 - detailsTop), rawLines.length * type.hintHeight);
  const restHeight = detailsTop + detailsHeight;
  return { titleLines, restTitleHeight, hintTop, hintsHeight, hintLines, rawLines, hasDetails: !!text, detailsTop, detailsHeight, restHeight,
    restTop: (480 - restHeight) / 2 };
}

module.exports = { lines, errorText, details, layout, navigationText, navigationLayout, restLayout, typography };
