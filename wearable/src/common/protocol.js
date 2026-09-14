const statuses = ['active', 'demo', 'idle', 'ended', 'paused', 'unavailable'];
const EXPIRY_MS = 20000;
const maneuvers = ['left', 'right', 'straight', 'slight_left', 'slight_right', 'sharp_left', 'sharp_right', 'uturn', 'roundabout', 'arrive', 'unknown'];

function decode(input) {
  let message;
  try {
    // Some firmware revisions deliver message bytes as ArrayBuffer instead of a string.
    if (typeof ArrayBuffer !== 'undefined' && input instanceof ArrayBuffer) {
      if (input.byteLength > 4096) return null;
      const bytes = new Uint8Array(input);
      let escaped = '';
      for (let i = 0; i < bytes.length; i++) escaped += '%' + ('0' + bytes[i].toString(16)).slice(-2);
      input = decodeURIComponent(escaped);
    }
    if (typeof input !== 'string' || input.length > 4096) return null;
    message = JSON.parse(input);
  } catch (error) { return null; }
  if (!message || message.v !== 1 || message.type !== 'navigation') return null;
  if (typeof message.session !== 'string' || !message.session || message.session.length > 80) return null;
  if (typeof message.seq !== 'number' || message.seq < 1 || message.seq > 9007199254740991 || Math.floor(message.seq) !== message.seq || statuses.indexOf(message.status) < 0) return null;
  for (const field of ['title', 'rawText', 'instruction', 'distance', 'maneuver']) {
    if (typeof message[field] !== 'string') return null;
  }
  if (message.title.length > 80 || message.rawText.length > 480 || message.instruction.length > 48 || message.distance.length > 32) return null;
  if (maneuvers.indexOf(message.maneuver) < 0) message.maneuver = 'unknown';
  if (message.keepScreenOn !== undefined && typeof message.keepScreenOn !== 'boolean') return null;
  return message;
}

function accept(previous, incoming) {
  return !!incoming && (!previous || previous.session !== incoming.session || incoming.seq > previous.seq);
}

function present(message, age, connected) {
  if (!message) return { status: connected ? '等待导航' : '等待连接', live: false, icon: 'unknown', distance: '', instruction: '', rawText: '' };
  const timed = message.status === 'active' || message.status === 'demo';
  const fresh = connected && (!timed || (age >= 0 && age < EXPIRY_MS));
  if (!fresh) return { status: connected ? '导航已过期' : '连接已断开', live: false, icon: 'unknown', distance: '', instruction: '请查看手机', rawText: '' };
  const labels = { active: '高德导航', demo: '演示 · 非真实导航', idle: '等待导航', ended: '导航结束', paused: '同步已暂停', unavailable: '通知读取不可用' };
  return {
    status: labels[message.status], live: message.status === 'active',
    icon: message.maneuver, distance: message.distance,
    instruction: message.instruction, rawText: message.rawText
  };
}

module.exports = { decode, accept, present, EXPIRY_MS };
