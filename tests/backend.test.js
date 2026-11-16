// node tests/backend.test.js  — logic tests of the real Code.gs
const { createBackend } = require('./gas_harness');
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log('  FAIL:', m, '\n    got', JSON.stringify(a), '\n    exp', JSON.stringify(b)); } };
const ok = (c, m) => eq(!!c, true, m);
const K = 'teacher123';

// ---- fresh backend: demo exam seeded ----
let B = createBackend();
let ex = B.get({ action: 'exams', key: K });
eq(ex.length, 1, 'demo exam listed'); eq(ex[0].code, 'DEMO1', 'demo code'); eq(ex[0].count, 3, 'demo has 3 questions');
eq(B.get({ action: 'exams', key: 'wrong' }), [], 'exams list hidden without key');
let d = B.get({ action: 'exam', code: ' demo1 ' });
eq(d.questions.length, 3, 'exam fetched case/space-insensitive'); eq(d.questions[0].a, 2, 'answer C -> index 2'); eq(d.open, true, 'open by default');
eq(B.get({ action: 'exam', code: 'NOPE' }).error, 'notfound', 'unknown exam');

// ---- teacher auth ----
eq(B.get({ action: 'tlogin', key: K }).ok, true, 'teacher login ok');
eq(B.get({ action: 'tlogin', key: 'x' }).ok, false, 'teacher login bad');
eq(B.post({ action: 'delete', code: 'DEMO1', key: 'x' }), 'denied', 'admin action needs key');

// ---- upload / setopen / delete ----
const row = (code, q, ans, extra) => [code, extra ? 'Test CT' : '', extra ? '20' : '', extra ? '0.25' : '', extra ? 'YES' : '', q, '1', '2', '3', '4', '', ans, 'Topic', 'Expl'];
eq(B.post({ action: 'upload', code: 'CT1', key: K, rows: JSON.stringify([row('CT1', 'q1', 'B', 1), row('CT1', 'q2', 'D')]) }), 'ok', 'upload ok');
d = B.get({ action: 'exam', code: 'CT1' });
eq([d.title, d.minutes, d.neg, d.questions.length], ['Test CT', 20, 0.25, 2], 'uploaded exam read back');
eq(B.get({ action: 'exams', key: K }).length, 2, 'two exams now');
B.post({ action: 'setopen', code: 'CT1', open: 'NO', key: K });
eq(B.get({ action: 'exam', code: 'CT1' }).open, false, 'exam closed');
B.post({ action: 'setopen', code: 'CT1', open: 'YES', key: K });
eq(B.get({ action: 'exam', code: 'CT1' }).open, true, 'exam reopened');
B.post({ action: 'upload', code: 'CT1', key: K, rows: JSON.stringify([row('CT1', 'only', 'A', 1)]) });
eq(B.get({ action: 'exam', code: 'CT1' }).questions.length, 1, 're-upload replaces old questions');
eq(B.get({ action: 'exams', key: K }).length, 2, 're-upload does not duplicate exam');
eq(B.post({ action: 'delete', code: 'CT1', key: K }), 'ok', 'delete ok');
eq(B.get({ action: 'exam', code: 'CT1' }).error, 'notfound', 'deleted exam gone');
eq(B.get({ action: 'exam', code: 'DEMO1' }).questions.length, 3, 'other exam untouched');
eq(B.post({ action: 'bogus', code: 'X', key: K }), 'bad action', 'bad action rejected');
eq(B.post({ action: 'delete', key: K }), 'no code', 'missing code rejected');

// ---- results: save, dedupe, visibility ----
const att = (aid, sid, score) => ({ sid, name: 'Rahim', exam: 'DEMO1', aid, mode: 'full', score, total: 3, secs: 60, details: '[]' });
eq(B.post(att('a1', '007', 2)), 'ok', 'attempt saved');
eq(B.post(att('a1', '007', 2)), 'dup', 'duplicate aid ignored');
eq(B.post({ sid: '1' }), 'no aid', 'missing aid rejected');
B.post(att('a2', '8', 1));
eq(B.get({ sid: '7' }).length, 1, 'student sees own attempt (leading zeros normalised)');
eq(B.get({ sid: '7' })[0].score, 2, 'score stored as number');
eq(B.get({}).length, 0, 'no sid and no key -> nothing');
eq(B.get({ key: K }).length, 2, 'teacher sees all attempts');
eq(B.get({ key: 'x', sid: '8' }).length, 1, 'wrong key falls back to own');

// ---- settings / roster ----
eq(B.get({ action: 'settings' }).cfg, {}, 'settings empty at start');
eq(B.post({ action: 'savecfg', key: K, cfg: JSON.stringify({ theme: { primary: '#000' } }) }), 'ok', 'savecfg ok');
eq(B.get({ action: 'settings' }).cfg.theme.primary, '#000', 'settings read back (public)');
eq(B.get({ action: 'roster', key: 'x' }), [], 'roster hidden without key');
B.post({ action: 'saveroster', key: K, roster: JSON.stringify([{ id: '101', name: 'Karim', pin: 'abc' }, { id: '102', name: 'Blocked', pin: 'zz', blocked: true }, { id: '103', name: 'NoPass', pin: '' }]) });
eq(B.get({ action: 'roster', key: K }).length, 3, 'roster stored');
eq(B.get({ action: 'login', sid: '101', pin: 'abc' }), { ok: true, name: 'Karim' }, 'student login ok');
eq(B.get({ action: 'login', sid: '101', pin: 'bad' }).reason, 'badlogin', 'wrong password');
eq(B.get({ action: 'login', sid: '999', pin: 'x' }).reason, 'badlogin', 'unknown student');
eq(B.get({ action: 'login', sid: '102', pin: 'zz' }).reason, 'blocked', 'blocked student');
eq(B.get({ action: 'login', sid: '103', pin: '' }).reason, 'badlogin', 'empty password never works');
eq(B.get({ action: 'login', sid: '0101', pin: 'abc' }).ok, true, 'leading zeros in id tolerated');

// ---- change teacher password ----
eq(B.post({ action: 'setpass', key: K, newpass: 'ab' }), 'short', 'short password rejected');
eq(B.post({ action: 'setpass', key: K, newpass: 'newpass1' }), 'ok', 'password changed');
eq(B.get({ action: 'tlogin', key: K }).ok, false, 'old password stops working');
eq(B.get({ action: 'tlogin', key: 'newpass1' }).ok, true, 'new password works');

console.log(`backend: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
