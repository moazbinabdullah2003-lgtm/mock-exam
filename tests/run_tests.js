// ⚠ OUTDATED (2026-11-16): written before login/guest/settings/roster/shuffle changes and needs `node` (not installed on this Mac).
// Use the browser-pane harness instead: tools/browser_fake_backend.js + docs/DEPLOY.md §C. Rewrite this file if node becomes available.
// Headless logic tests for dist/quiz.html (no browser, no network). Run:  node tests/run_tests.js
// Harness = DOM/localStorage stubs + in-memory fake of backend/Code.gs. Scenarios live in tests/scenarios.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist/quiz.html'), 'utf8');
let js = html.match(/<script>([\s\S]*)<\/script>/)[1];
js = js.replace('SCRIPT_URL: ""', 'SCRIPT_URL: "http://fake/exec"')
       .replace(/SCRIPT_URL: "https:[^"]*"/, 'SCRIPT_URL: "http://fake/exec"');

// ---- stubs ----
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const els = {};
global.el = s => els[s] || (els[s] = { value: '', textContent: '', innerHTML: '', classList: { toggle() {} } });
global.document = { getElementById: () => el('#app'), querySelector: s => el(s) };
global.window = { __TEST__: true, scrollTo() {} };
global._origSetTimeout = global.setTimeout; global.setTimeout = (f, ms) => { f(); return 0; };   // make sleep() instant

// ---- fake backend (mirrors Code.gs) ----
const db = { attempts: [], exams: {} };   // exams[code] = {title,minutes,neg,open,questions:[{q,o,a,t,e}]}
db.exams.DEMO1 = { title: 'Demo Mock Test', minutes: 5, neg: 0, open: true, questions: [
  { q: '2x+3=11, x=?', o: ['2','3','4','5'], a: 2, t: 'Algebra', e: '' }, { q: 'sin30=?', o: ['1/2','1'], a: 0, t: 'Trig', e: '' }] };
const TEACHER_PASS = 'teacher123';
global.fetch = async (u, o) => {
  const url = new URL(u);
  if (o && o.method === 'POST') {
    const p = Object.fromEntries(new URLSearchParams(o.body.toString()));
    if (p.action) {
      if (p.key !== TEACHER_PASS) return {};
      const code = (p.code || '').toUpperCase();
      if (p.action === 'upload') db.exams[code] = rowsToExam(JSON.parse(p.rows));
      if (p.action === 'delete') delete db.exams[code];
      if (p.action === 'setopen' && db.exams[code]) db.exams[code].open = p.open !== 'NO';
      return {};
    }
    if (!db.attempts.find(a => a.aid === p.aid)) db.attempts.push({ sid: p.sid, name: p.name, exam: p.exam, aid: p.aid, mode: p.mode, score: p.score, total: p.total, secs: p.secs, details: p.details });
    return {};
  }
  const q = url.searchParams;
  if (q.get('action') === 'exams') return { json: async () => q.get('key') === TEACHER_PASS ? Object.entries(db.exams).map(([code, e]) => ({ code, title: e.title, minutes: e.minutes, neg: e.neg, open: e.open, count: e.questions.length })) : [] };
  if (q.get('action') === 'exam') { const e = db.exams[(q.get('code') || '').toUpperCase()]; return { json: async () => e || { error: 'notfound' } }; }
  const norm = s => String(s).trim().toUpperCase().replace(/^0+(?=\d)/, '');
  const rows = q.get('key') === TEACHER_PASS ? db.attempts : db.attempts.filter(a => norm(a.sid) === norm(q.get('sid') || '#'));
  return { json: async () => rows };
};
function rowsToExam(rows) {   // rows = QHEAD order
  const f = rows[0];
  return { title: f[1] || f[0], minutes: Number(f[2]) || 10, neg: Number(f[3]) || 0, open: String(f[4]).toUpperCase() !== 'NO',
    questions: rows.map(r => ({ q: r[5], o: r.slice(6, 11).filter(x => x !== ''), a: 'ABCDE'.indexOf(r[11]), t: r[12] || 'General', e: r[13] || '' })) };
}

// ---- tiny assert ----
let pass = 0, fail = 0;
global.T = {
  ok(c, m) { if (c) pass++; else { fail++; console.log('  FAIL:', m); } },
  eq(a, b, m) { const ok = JSON.stringify(a) === JSON.stringify(b); if (ok) pass++; else { fail++; console.log('  FAIL:', m, '\n    got', JSON.stringify(a), '\n    exp', JSON.stringify(b)); } },
  db,
};

const scen = fs.readFileSync(path.join(__dirname, 'scenarios.js'), 'utf8');
const full = js + '\n;(async()=>{\n' + scen + '\n})().catch(e=>{ console.log("CRASH", e); process.exitCode = 2; });\n';
process.on('exit', () => { console.log(`\n${pass} passed, ${fail} failed`); if (fail) process.exitCode = 1; });
(0, eval)(full);
