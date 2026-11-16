// MCQ Mock Exam backend — Google Apps Script
// Default teacher password. App-এর Settings > Security থেকে বদলালে সেটা Script property 'TPASS'-এ save হয় (এই default-কে override করে)
const TEACHER_PASS = 'teacher123';
const pass_ = () => PropertiesService.getScriptProperties().getProperty('TPASS') || TEACHER_PASS;

const HEAD  = ['Timestamp','SID','NAME','EXAM','AID','MODE','SCORE','TOTAL','SECS','DETAILS'];
const QHEAD = ['CODE','TITLE','MINUTES','NEG','OPEN','Q','A','B','C','D','E','ANS','TOPIC','EXPLANATION'];

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
    sh.getRange('A:N').setNumberFormat('@'); // সব text, যাতে paste করলে বদলে না যায়
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
  if (p.action === 'settings') return json_({ ok: true, cfg: JSON.parse(kvGet_('cfg') || '{}') });
  if (p.action === 'tlogin') return json_({ ok: p.key === pass_() });
  if (p.action === 'roster') return json_(p.key === pass_() ? JSON.parse(kvGet_('roster') || '[]') : []);
  if (p.action === 'login') return json_(login_(p));
  const sh = sheet_();
  const last = sh.getLastRow();
  let rows = last > 1 ? sh.getRange(2, 1, last - 1, 10).getValues() : [];
  const isT = p.key && p.key === pass_();
  if (!isT) {
    if (!p.sid) return json_([]);
    rows = rows.filter(r => norm_(r[1]) === norm_(p.sid));
  }
  return json_(rows.map(r => ({
    sid: String(r[1]), name: r[2], exam: r[3], aid: String(r[4]), mode: r[5],
    score: r[6], total: r[7], secs: r[8], details: r[9]
  })));
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
  const questions = rows.map(r => ({
    q: String(r[ix('Q')]),
    o: ['A','B','C','D','E'].map(k => r[ix(k)]).filter(x => String(x).trim() !== '').map(String),
    a: 'ABCDE'.indexOf(String(r[ix('ANS')]).trim().toUpperCase()),
    t: String(r[ix('TOPIC')] || 'General').trim(),
    e: String(r[ix('EXPLANATION')] || '')
  }));
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
    if (p.action === 'setpass') {
      const np = String(p.newpass || '');
      if (np.length < 4) return text('short');
      PropertiesService.getScriptProperties().setProperty('TPASS', np);
      return text('ok');
    }
    const code = String(p.code || '').trim().toUpperCase();
    if (!code) return text('no code');
    const sh = qsheet_();
    const body = sh.getDataRange().getValues().slice(1).map(r => r.slice(0, QHEAD.length));
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
