// Runs the REAL backend/Code.gs under node with in-memory fakes of the Apps Script services.
const fs = require('fs'), path = require('path'), vm = require('vm');

function makeSheet(name) {
  const s = { name, rows: [], frozen: 0 };
  const api = {
    setName(n) { s.name = n; }, getName: () => s.name,
    appendRow(r) { s.rows.push(r.slice()); },
    getLastRow: () => s.rows.length,
    setFrozenRows(n) { s.frozen = n; },
    clearContents() { s.rows = []; },
    deleteRow(n) { s.rows.splice(n - 1, 1); },
    getDataRange() { return { getValues: () => s.rows.map(r => r.slice()) }; },
    getRange(a, b, c, d) {
      if (typeof a === 'string') return { setNumberFormat() {} };
      const r0 = a - 1, c0 = b - 1, nr = c || 1, nc = d || 1;
      return {
        setNumberFormat() {},
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (s.rows[r0 + i] || [])[c0 + j] ?? '')),
        setValues(v) { v.forEach((row, i) => { s.rows[r0 + i] = s.rows[r0 + i] || []; row.forEach((x, j) => { s.rows[r0 + i][c0 + j] = x; }); }); },
        setValue(x) { s.rows[r0] = s.rows[r0] || []; s.rows[r0][c0] = x; },
      };
    },
    _s: s,
  };
  return api;
}

function createBackend() {
  const sheets = [makeSheet('Sheet1')];
  const ss = {
    getId: () => 'fake-ss',
    getSheets: () => sheets,
    getSheetByName: n => sheets.find(x => x.getName() === n) || null,
    insertSheet(n) { const sh = makeSheet(n); sheets.push(sh); return sh; },
  };
  const props = {}, mails = [], mailCfg = { allowed: true };
  const ctx = {
    SpreadsheetApp: { create: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: t => ({ text: t, setMimeType() { return this; } }) },
    MailApp: { sendEmail(to, sub, body) { if (!mailCfg.allowed) throw new Error('You do not have permission to call MailApp.sendEmail'); mails.push({ to, sub, body }); } },
    console,
  };
  vm.createContext(ctx);
  // top-level `const` is not a property of the context, so expose the entry points explicitly
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/Code.gs'), 'utf8') +
    '\n;this.__api={doGet,doPost,TEACHER_PASS};', ctx);
  const A = ctx.__api;
  const out = o => o.text;
  return {
    get: p => { const t = out(A.doGet({ parameter: p })); try { return JSON.parse(t); } catch (e) { return t; } },
    post: p => out(A.doPost({ parameter: p })),
    sheets, props, mails, mailCfg,
  };
}
module.exports = { createBackend };
