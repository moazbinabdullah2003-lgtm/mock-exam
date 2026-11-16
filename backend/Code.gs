// MCQ Mock Exam backend — Google Apps Script
// Default teacher password. App-এর Settings > Security থেকে বদলালে সেটা Script property 'TPASS'-এ save হয় (এই default-কে override করে)
const TEACHER_PASS = 'teacher123';
const pass_ = () => PropertiesService.getScriptProperties().getProperty('TPASS') || TEACHER_PASS;

const HEAD  = ['Timestamp','SID','NAME','EXAM','AID','MODE','SCORE','TOTAL','SECS','DETAILS','HIDDEN'];   // HIDDEN = '1' → teacher লুকিয়েছে (student দেখে না, analytics-এ নেই)
const QHEAD = ['CODE','TITLE','MINUTES','NEG','OPEN','Q','A','B','C','D','E','ANS','TOPIC','EXPLANATION',
               'Q_BN','A_BN','B_BN','C_BN','D_BN','E_BN','EXPLANATION_BN'];   // _BN = বাংলা version (ঐচ্ছিক)

function ss_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SSID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('MCQ Mock Data');
  props.setProperty('SSID', ss.getId());
  return ss;
}

function sheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Attempts');
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName('Attempts');
    sh.appendRow(HEAD);
    sh.getRange('B:E').setNumberFormat('@');
  }
  return sh;
}

function qsheet_() {
  const ss = ss_();
  sheet_(); // Attempts আগে তৈরি হোক
  let sh = ss.getSheetByName('Questions');
  if (!sh) {
    sh = ss.insertSheet('Questions');
    sh.getRange('A:U').setNumberFormat('@'); // সব text, যাতে paste করলে বদলে না যায়
    sh.appendRow(QHEAD);
    sh.appendRow(['DEMO1','Demo Mock Test','5','0','YES','2x + 3 = 11 হলে x = ?','2','3','4','5','','C','Algebra','2x = 8, x = 4']);
    sh.appendRow(['DEMO1','','','','','sin 30° = ?','1/2','√3/2','1','0','','A','Trigonometry','sin 30° = 1/2']);
    sh.appendRow(['DEMO1','','','','','d/dx (x²) = ?','x','2x','x²','2','','B','Calculus','Power rule']);
    sh.setFrozenRows(1);
  }
  return sh;
}

const norm_ = s => String(s == null ? '' : s).trim().toUpperCase().replace(/^0+(?=\d)/, '');

// Student result save
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'savevault') return ContentService.createTextOutput(saveVault_(p));
  if (p.action === 'report') return ContentService.createTextOutput(report_(p));
  if (p.action) return admin_(p);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_();
    const aid = String(p.aid || '');
    if (!aid) return ContentService.createTextOutput('no aid');
    const last = sh.getLastRow();
    if (last > 1) {
      const aids = sh.getRange(2, 5, last - 1, 1).getValues().flat().map(String);
      if (aids.indexOf(aid) >= 0) return ContentService.createTextOutput('dup');
    }
    sh.appendRow([new Date(), String(p.sid || ''), p.name || '', p.exam || '', aid, p.mode || '',
      Number(p.score) || 0, Number(p.total) || 0, Number(p.secs) || 0, p.details || '']);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// ?action=exam&code=CT1  -> exam questions
// ?sid=101 (শুধু নিজের)  |  ?key=PASS (teacher, সবার)  -> attempts
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'exams') return json_(p.key === pass_() ? listExams_() : []);
  if (p.action === 'exam') return json_(getExam_(String(p.code || '').trim().toUpperCase()));
  if (p.action === 'settings') return json_({ ok: true, cfg: JSON.parse(kvGet_('cfg') || '{}'), voids: voids_() });
  if (p.action === 'reports') return json_(p.key === pass_() ? { ok: true, reports: reports_(), voids: voids_(), notify: notifyInfo_() } : { ok: false });
  if (p.action === 'myreports') return json_(p.sid ? reports_().filter(r => norm_(r.sid) === norm_(p.sid)).map(r => ({ id: r.id, exam: r.exam, qi: r.qi, why: r.why, st: r.st, at: r.at, dts: r.dts })) : []);
  if (p.action === 'tlogin') return json_({ ok: p.key === pass_() });
  if (p.action === 'roster') return json_(p.key === pass_() ? JSON.parse(kvGet_('roster') || '[]') : []);
  if (p.action === 'login') return json_(login_(p));
  if (p.action === 'vault') return json_(getVault_(p));
  const sh = sheet_();
  const last = sh.getLastRow();
  let rows = last > 1 ? sh.getRange(2, 1, last - 1, 11).getValues() : [];
  const isT = p.key && p.key === pass_();
  if (!isT) {
    if (!p.sid) return json_([]);
    rows = rows.filter(r => norm_(r[1]) === norm_(p.sid) && !isHid_(r[10]));   // student লুকানো log দেখে না
  }
  return json_(rows.map(r => {
    const o = { sid: String(r[1]), name: r[2], exam: r[3], aid: String(r[4]), mode: r[5],
      score: r[6], total: r[7], secs: r[8], details: r[9] };
    if (isHid_(r[10])) o.hidden = true;
    return o;
  }));
}

function getExam_(code) {
  if (!code) return { error: 'notfound' };
  const v = qsheet_().getDataRange().getValues();
  const H = v[0].map(x => String(x).trim().toUpperCase());
  const ix = k => H.indexOf(k);
  const rows = v.slice(1).filter(r =>
    String(r[ix('CODE')]).trim().toUpperCase() === code && String(r[ix('Q')]).trim() !== '');
  if (!rows.length) return { error: 'notfound' };
  const f = rows[0];
  const cell = (r, k) => ix(k) < 0 || r[ix(k)] == null ? '' : String(r[ix(k)]);
  const questions = rows.map(r => {
    const keep = ['A','B','C','D','E'].filter(k => cell(r, k).trim() !== '');
    const q = {
      q: cell(r, 'Q'),
      o: keep.map(k => cell(r, k)),
      a: 'ABCDE'.indexOf(cell(r, 'ANS').trim().toUpperCase()),
      t: (cell(r, 'TOPIC') || 'General').trim(),
      e: cell(r, 'EXPLANATION')
    };
    if (cell(r, 'Q_BN').trim() !== '') {   // বাংলা version থাকলে
      q.qb = cell(r, 'Q_BN');
      q.ob = keep.map(k => cell(r, k + '_BN'));
      q.eb = cell(r, 'EXPLANATION_BN');
    }
    return q;
  });
  return {
    title: String(f[ix('TITLE')] || code),
    minutes: Number(f[ix('MINUTES')]) || 10,
    neg: Number(f[ix('NEG')]) || 0,
    open: String(f[ix('OPEN')]).trim().toUpperCase() !== 'NO',
    shuffle: true,
    questions: questions
  };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Teacher actions: upload / delete / setopen  (key দরকার)
function admin_(p) {
  const text = s => ContentService.createTextOutput(s);
  if (p.key !== pass_()) return text('denied');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (p.action === 'savecfg') { kvSet_('cfg', String(p.cfg || '{}')); return text('ok'); }
    if (p.action === 'saveroster') { kvSet_('roster', String(p.roster || '[]')); return text('ok'); }
    if (p.action === 'logs') return text(logs_(p));
    if (p.action === 'qvoid') return text(qvoid_(p));
    if (p.action === 'setnotify') {
      const to = String(p.to || '').trim();
      if (to && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return text('bademail');
      kvSet_('notify', JSON.stringify({ on: p.on === 'YES', to: to }));
      return text('ok');
    }
    if (p.action === 'setpass') {
      const np = String(p.newpass || '');
      if (np.length < 4) return text('short');
      PropertiesService.getScriptProperties().setProperty('TPASS', np);
      return text('ok');
    }
    const code = String(p.code || '').trim().toUpperCase();
    if (!code) return text('no code');
    const sh = qsheet_();
    // পুরোনো sheet-এ কম column থাকতে পারে: header অনুযায়ী নতুন QHEAD order-এ সাজাও (ফাঁকা = '')
    const vals = sh.getDataRange().getValues(), oh = (vals[0] || []).map(x => String(x).trim().toUpperCase());
    const body = vals.slice(1).map(r => QHEAD.map((k, i) => { const j = oh.indexOf(k); return j >= 0 ? r[j] : (oh.length ? '' : r[i]); }));
    const other = body.filter(r => String(r[0]).trim().toUpperCase() !== code);
    let out;
    if (p.action === 'upload') {
      const nr = JSON.parse(p.rows).map(r => QHEAD.map((_, i) => String(r[i] == null ? '' : r[i])));
      out = other.concat(nr);
    } else if (p.action === 'rename') {
      // exam code বদলানো: Questions-এর CODE + পুরোনো সব attempt-এর EXAM নতুন code-এ চলে যায় (history/analytics ঠিক থাকে)
      const nc = String(p.newcode || '').trim().toUpperCase();
      if (!/^[A-Z0-9_-]{1,30}$/.test(nc)) return text('badcode');
      if (nc === code) return text('same');
      if (body.some(r => String(r[0]).trim().toUpperCase() === nc)) return text('exists');
      if (!body.some(r => String(r[0]).trim().toUpperCase() === code)) return text('notfound');
      out = body.map(r => { if (String(r[0]).trim().toUpperCase() === code) r[0] = nc; return r; });
      renameReports_(code, nc);
      const ash = sheet_(), alast = ash.getLastRow();
      if (alast > 1) {
        const rg = ash.getRange(2, 4, alast - 1, 1);
        rg.setValues(rg.getValues().map(r => [String(r[0]).trim().toUpperCase() === code ? nc : r[0]]));
      }
    } else if (p.action === 'delete') {
      out = other;
    } else if (p.action === 'setopen') {
      let done = false;
      out = body.map(r => {
        if (!done && String(r[0]).trim().toUpperCase() === code) { done = true; r[4] = p.open === 'NO' ? 'NO' : 'YES'; }
        return r;
      });
    } else return text('bad action');
    const all = [QHEAD].concat(out).map(r => r.map(x => String(x == null ? '' : x)));
    sh.clearContents();
    const rng = sh.getRange(1, 1, all.length, QHEAD.length);
    rng.setNumberFormat('@');
    rng.setValues(all);
    return text('ok');
  } finally {
    lock.releaseLock();
  }
}

const isHid_ = v => String(v == null ? '' : v).trim() === '1';
// Attempt/exit log: op=hide|unhide|delete, aids=JSON ["aid",...]  (admin_-এর lock-এর ভেতরে চলে)
// hide/unhide = HIDDEN column (ফেরত আনা যায়); delete = row চিরতরে মুছে ফেলা
function logs_(p) {
  let aids;
  try { aids = JSON.parse(p.aids || '[]'); } catch (e) { return 'badjson'; }
  if (!Array.isArray(aids) || !aids.length) return 'none';
  const want = {}; aids.forEach(a => { want[String(a).trim()] = 1; });
  const sh = sheet_(), last = sh.getLastRow();
  if (last < 2) return 'ok:0';
  const ids = sh.getRange(2, 5, last - 1, 1).getValues().map(r => String(r[0]).trim());
  const hit = []; ids.forEach((a, i) => { if (want[a]) hit.push(i + 2); });
  if (p.op === 'delete') {
    for (let k = hit.length - 1; k >= 0; k--) sh.deleteRow(hit[k]);   // নিচ থেকে, যাতে row নম্বর না সরে
    return 'ok:' + hit.length;
  }
  if (p.op !== 'hide' && p.op !== 'unhide') return 'bad op';
  if (sh.getMaxColumns && sh.getMaxColumns() < 11) sh.insertColumnsAfter(sh.getMaxColumns(), 11 - sh.getMaxColumns());
  if (String(sh.getRange(1, 11).getValues()[0][0]) !== 'HIDDEN') sh.getRange(1, 11).setValue('HIDDEN');
  hit.forEach(r => sh.getRange(r, 11).setValue(p.op === 'hide' ? '1' : ''));
  return 'ok:' + hit.length;
}

function listExams_() {
  const v = qsheet_().getDataRange().getValues().slice(1);
  const m = {};
  v.forEach(r => {
    const c = String(r[0]).trim().toUpperCase();
    if (!c || !String(r[5]).trim()) return;
    const o = m[c] = m[c] || { code: c, title: String(r[1] || c), minutes: Number(r[2]) || 10,
      neg: Number(r[3]) || 0, open: String(r[4]).trim().toUpperCase() !== 'NO', count: 0 };
    o.count++;
  });
  return Object.values(m);
}

// ---------- Settings / Roster storage (sheet 'Settings': KEY | VALUE) ----------
function kvSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Settings');
  if (!sh) {
    sh = ss.insertSheet('Settings');
    sh.getRange('A:B').setNumberFormat('@');
    sh.appendRow(['KEY', 'VALUE']);
  }
  return sh;
}
function kvGet_(k) {
  const v = kvSheet_().getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === k) return String(v[i][1] || '');
  return '';
}
function kvSet_(k, val) {
  const sh = kvSheet_();
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]) === k) { sh.getRange(i + 1, 2).setValue(val); return; }
  }
  sh.appendRow([k, val]);
}

// ?action=login&sid=..&pin=..  -> Student ID + Password যাচাই (roster-এ থাকতে হবে, password খালি রাখা যাবে না)
// (field-এর নাম 'pin' রাখা হয়েছে আগের সাথে মিল রাখতে; UI-তে এটা "Password")
function login_(p) {
  const roster = JSON.parse(kvGet_('roster') || '[]');
  const r = roster.filter(x => norm_(x.id) === norm_(p.sid))[0];
  if (!r || !String(r.pin || '').trim()) return { ok: false, reason: 'badlogin' };
  if (String(r.pin).trim() !== String(p.pin || '').trim()) return { ok: false, reason: 'badlogin' };
  if (r.blocked) return { ok: false, reason: 'blocked' };
  return { ok: true, name: r.name || String(r.id) };
}

// ---------- Student question vault (sheet 'Vault': SID | TS | DATA1..DATA20) ----------
// এক student = এক row; JSON বড় হলে কয়েকটা cell-এ ভাগ (cell-এর সীমা 50,000 অক্ষর)
const VAULT_CHUNK = 45000, VAULT_MAXC = 20;
function vaultSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Vault');
  if (!sh) {
    sh = ss.insertSheet('Vault');
    sh.getRange('A:V').setNumberFormat('@');
    sh.appendRow(['SID', 'TS'].concat(Array.from({ length: VAULT_MAXC }, (_, i) => 'DATA' + (i + 1))));
  }
  return sh;
}
// নিজের vault: সঠিক ID + password, অথবা teacher key (test student)
function vaultAuth_(p) {
  if (p.key && p.key === pass_()) return !!String(p.sid || '').trim();
  return login_(p).ok === true;
}
function getVault_(p) {
  if (!vaultAuth_(p)) return { ok: false, reason: 'denied' };
  const v = vaultSheet_().getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (norm_(v[i][0]) === norm_(p.sid)) {
      const txt = v[i].slice(2).map(x => String(x == null ? '' : x)).join('');
      try { return { ok: true, ts: Number(v[i][1]) || 0, vault: txt ? JSON.parse(txt) : null }; } catch (e) { return { ok: true, ts: 0, vault: null }; }
    }
  }
  return { ok: true, ts: 0, vault: null };
}
function saveVault_(p) {
  if (!vaultAuth_(p)) return 'denied';
  const txt = String(p.vault || '');
  try { JSON.parse(txt); } catch (e) { return 'badjson'; }
  const parts = [];
  for (let i = 0; i < txt.length; i += VAULT_CHUNK) parts.push(txt.slice(i, i + VAULT_CHUNK));
  if (parts.length > VAULT_MAXC) return 'toobig';
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = vaultSheet_(), v = sh.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < v.length; i++) if (norm_(v[i][0]) === norm_(p.sid)) { row = i + 1; break; }
    if (row < 0) row = Math.max(v.length, 1) + 1;
    const line = [String(p.sid).trim(), String(Number(p.ts) || Date.now())].concat(Array.from({ length: VAULT_MAXC }, (_, i) => parts[i] || ''));
    const rg = sh.getRange(row, 1, 1, line.length);
    rg.setNumberFormat('@');
    rg.setValues([line]);
    return 'ok';
  } finally {
    lock.releaseLock();
  }
}



// ---------- 🚩 Question reports (sheet 'Reports') + বাতিল (void) question list (Settings key 'voids') ----------
// voids = { EXAM: { qi: [ {at: approve ms, fx: fixed ms (0 = এখনো ঠিক হয়নি)} ... ] } }
// একটা attempt-এ question i বাদ যাবে যদি attempt-এর সময় কোনো period-এর ভেতরে পড়ে: আগের period-এর fx ≤ t < এই period-এর fx (fx 0 = এখনো চলছে)
const RHEAD = ['ID', 'TS', 'SID', 'NAME', 'EXAM', 'QI', 'WHY', 'NOTE', 'Q', 'ST', 'DTS'];   // ST: new | approved | rejected | fixed
function repSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Reports');
  if (!sh) {
    sh = ss.insertSheet('Reports');
    sh.getRange('A:K').setNumberFormat('@');
    sh.appendRow(RHEAD);
  }
  return sh;
}
function reports_() {
  const v = repSheet_().getDataRange().getValues().slice(1);
  return v.filter(r => String(r[0]).trim()).map(r => ({ id: String(r[0]), at: Number(r[1]) || 0, sid: String(r[2]), name: String(r[3]), exam: String(r[4]).trim().toUpperCase(),
    qi: Number(r[5]) || 0, why: String(r[6]), note: String(r[7]), q: String(r[8]), st: String(r[9] || 'new'), dts: Number(r[10]) || 0 }));
}
function voids_() { try { return JSON.parse(kvGet_('voids') || '{}') || {}; } catch (e) { return {}; } }
function report_(p) {
  const exam = String(p.exam || '').trim().toUpperCase(), qi = parseInt(p.qi, 10), sid = String(p.sid || '').trim();
  if (!exam || !(qi >= 0) || !sid) return 'bad';
  const why = String(p.why || 'other').slice(0, 40), note = String(p.note || '').slice(0, 500);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = repSheet_();
    const open = reports_().filter(r => r.st === 'new' && norm_(r.sid) === norm_(sid) && r.exam === exam && r.qi === qi);
    if (open.length > 0) return 'dup';                                    // একই student একই question-এ খোলা report আছে
    if (reports_().filter(r => r.st === 'new' && norm_(r.sid) === norm_(sid)).length >= 30) return 'toomany';
    const now = Date.now();
    const id = now.toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
    sh.appendRow([id, String(now), sid, String(p.name || '').slice(0, 80), exam, String(qi), why, note, String(p.q || '').slice(0, 300), 'new', '']);
    notifyMail_({ exam: exam, qi: qi, why: why, note: note, name: String(p.name || sid), q: String(p.q || '') });
    return 'ok';
  } finally {
    lock.releaseLock();
  }
}
// op: approve (question বাতিল, নতুন report → approved) | reject (নতুন report → rejected) | fix (ঠিক করা হয়েছে, আবার চালু) | undo (approve ফিরিয়ে নাও)
function qvoid_(p) {
  const exam = String(p.code || '').trim().toUpperCase(), qi = parseInt(p.qi, 10), op = String(p.op || '');
  if (!exam || !(qi >= 0)) return 'bad';
  if (['approve', 'reject', 'fix', 'undo'].indexOf(op) < 0) return 'bad op';
  const V = voids_(), list = ((V[exam] = V[exam] || {})[qi] = V[exam][qi] || []), act = list.length && !list[list.length - 1].fx ? list[list.length - 1] : null;
  const now = Date.now();
  let from = '', to = '';
  if (op === 'approve') { if (!act) list.push({ at: now, fx: 0 }); from = 'new'; to = 'approved'; }
  if (op === 'reject') { from = 'new'; to = 'rejected'; }
  if (op === 'fix') { if (!act) return 'notvoid'; act.fx = now; from = 'approved'; to = 'fixed'; }
  if (op === 'undo') { if (!act) return 'notvoid'; list.pop(); from = 'approved'; to = 'new'; }
  if (!list.length) delete V[exam][qi];
  if (!Object.keys(V[exam]).length) delete V[exam];
  kvSet_('voids', JSON.stringify(V));
  const sh = repSheet_(), v = sh.getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][4]).trim().toUpperCase() === exam && Number(v[i][5]) === qi && String(v[i][9] || 'new') === from) {
      sh.getRange(i + 1, 10, 1, 2).setValues([[to, String(now)]]); n++;
    }
  }
  return 'ok:' + n;
}
function renameReports_(code, nc) {
  const sh = repSheet_(), last = sh.getLastRow();
  if (last > 1) {
    const rg = sh.getRange(2, 5, last - 1, 1);
    rg.setValues(rg.getValues().map(r => [String(r[0]).trim().toUpperCase() === code ? nc : r[0]]));
  }
  const V = voids_();
  if (V[code]) { V[nc] = V[code]; delete V[code]; kvSet_('voids', JSON.stringify(V)); }
}
// 📧 Gmail notification (Settings → Question report). Gmail permission না থাকলে চুপচাপ ব্যর্থ হয়, কারণ 'mailerr'-এ থাকে।
function notifyInfo_() {
  let n = {}; try { n = JSON.parse(kvGet_('notify') || '{}') || {}; } catch (e) {}
  return { on: !!n.on, to: n.to || '', err: kvGet_('mailerr') };
}
function notifyMail_(r) {
  const n = notifyInfo_();
  if (!n.on || !n.to) return;
  try {
    MailApp.sendEmail(n.to, '🚩 Question report: ' + r.exam + ' Q' + (r.qi + 1),
      r.name + ' report করেছে।\nExam: ' + r.exam + '\nQuestion ' + (r.qi + 1) + ': ' + r.q + '\nকারণ: ' + r.why + (r.note ? '\nNote: ' + r.note : '') + '\n\nApp-এর Teacher → 🚩 Reports-এ দেখো।');
    if (n.err) kvSet_('mailerr', '');
  } catch (e) {
    kvSet_('mailerr', String(e && e.message || e).slice(0, 200));
  }
}
