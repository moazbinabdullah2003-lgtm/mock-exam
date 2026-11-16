// Frontend integration tests: dist/quiz.html logic against the REAL backend/Code.gs (in-memory sheets).
// Run: node tests/run_tests.js   (build first: python3 build.py)
const fs = require('fs'), path = require('path');
const { createBackend } = require('./gas_harness');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist/quiz.html'), 'utf8');
let js = html.match(/<script>([\s\S]*)<\/script>/)[1];
js = js.replace(/SCRIPT_URL: "https:[^"]*"/, 'SCRIPT_URL: "http://fake/exec"');

const B = createBackend();
global.B = B;
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear() { for (const k in store) delete store[k]; } };
const els = {};
global.el = s => els[s] || (els[s] = { value: '', textContent: '', innerHTML: '', style: {}, classList: { toggle() {}, add() {}, remove() {} }, focus() {}, scrollIntoView() {} });
global.document = { getElementById: () => el('#app'), querySelector: s => el(s), querySelectorAll: () => [], addEventListener() {}, body: el('body'), documentElement: el('html'), title: '' };
global.window = { __TEST__: true, scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }) };
global.navigator = { onLine: true, userAgent: 'node-test' };
global.location = { pathname: '/quiz.html', href: 'http://fake/quiz.html', search: '', hash: '' };
global._origSetTimeout = global.setTimeout; global.setTimeout = (f, ms) => { f(); return 0; };

// fetch -> real Code.gs
global.fetch = async (u, o) => {
  const J = t => ({ ok: true, status: 200, text: async () => t, json: async () => JSON.parse(t) });
  if (o && o.method === 'POST') return J(B.post(Object.fromEntries(new URLSearchParams(o.body.toString()))));
  const q = Object.fromEntries(new URL(u).searchParams);
  const r = B.get(q);
  return J(typeof r === 'string' ? r : JSON.stringify(r));
};

let pass = 0, fail = 0;
global.TT = {
  ok(c, m) { if (c) pass++; else { fail++; console.log('  FAIL:', m); } },
  eq(a, b, m) { const ok = JSON.stringify(a) === JSON.stringify(b); if (ok) pass++; else { fail++; console.log('  FAIL:', m, '\n    got', JSON.stringify(a), '\n    exp', JSON.stringify(b)); } },
};

const scen = fs.readFileSync(path.join(__dirname, 'scenarios.js'), 'utf8');
const full = js + '\n;(async()=>{\n' + scen + '\n})().catch(e=>{ console.log("CRASH", e); process.exitCode = 2; });\n';
process.on('exit', () => { console.log(`frontend: ${pass} passed, ${fail} failed`); if (fail && !process.exitCode) process.exitCode = 1; });
(0, eval)(full);
