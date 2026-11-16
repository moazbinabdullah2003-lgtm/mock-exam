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

// ---- rename exam code (questions + old attempts move together) ----
eq(B.post({ action: 'rename', code: 'DEMO1', newcode: 'x', key: 'bad' }), 'denied', 'rename needs key');
eq(B.post({ action: 'rename', code: 'DEMO1', newcode: 'bad code!', key: K }), 'badcode', 'rename: invalid new code rejected');
eq(B.post({ action: 'rename', code: 'DEMO1', newcode: 'demo1', key: K }), 'same', 'rename: same code');
eq(B.post({ action: 'rename', code: 'NOPE', newcode: 'NEW1', key: K }), 'notfound', 'rename: unknown exam');
eq(B.post({ action: 'rename', code: 'DEMO1', newcode: ' math-1 ', key: K }), 'ok', 'rename ok (trim + uppercase)');
eq(B.get({ action: 'exam', code: 'DEMO1' }).error, 'notfound', 'old code gone');
eq(B.get({ action: 'exam', code: 'MATH-1' }).questions.length, 3, 'questions under new code');
eq(B.get({ key: K }).map(r => r.exam), ['MATH-1', 'MATH-1'], 'old attempts moved to new code');
B.post({ action: 'upload', code: 'OTHER', key: K, rows: JSON.stringify([['OTHER', 'o', '5', '0', 'YES', 'q', '1', '2', '', '', '', 'A', 'T', '']]) });
eq(B.post({ action: 'rename', code: 'OTHER', newcode: 'MATH-1', key: K }), 'exists', 'rename onto existing code refused');
eq(B.get({ action: 'exam', code: 'MATH-1' }).questions.length, 3, 'existing exam not overwritten');
B.post({ action: 'delete', code: 'OTHER', key: K });
eq(B.post({ action: 'rename', code: 'MATH-1', newcode: 'DEMO1', key: K }), 'ok', 'rename back');
eq(B.get({ key: K }).map(r => r.exam), ['DEMO1', 'DEMO1'], 'attempts back on DEMO1');
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


// ---- bilingual (বাংলা) columns + migration of an old 14-column Questions sheet ----
{ const B2 = createBackend();
  B2.get({ action: 'exams', key: K });                       // seeds sheets
  const qs = B2.sheets.find(x => x.getName() === 'Questions')._s;
  qs.rows = [['CODE','TITLE','MINUTES','NEG','OPEN','Q','A','B','C','D','E','ANS','TOPIC','EXPLANATION'],
             ['OLD1','Old exam','10','0','YES','old q','1','2','','','','B','T','ex']];   // old live sheet shape
  eq(B2.get({ action: 'exam', code: 'OLD1' }).questions[0], { q: 'old q', o: ['1', '2'], a: 1, t: 'T', e: 'ex' }, 'old sheet still readable, no bn fields');
  const bi = ['BI1','Bi','10','0','YES','English q','one','two','three','','','C','Topic','sol EN','বাংলা প্রশ্ন','এক','দুই','','','','সমাধান'];
  eq(B2.post({ action: 'upload', code: 'BI1', key: K, rows: JSON.stringify([bi]) }), 'ok', 'bilingual upload ok');
  eq(qs.rows[0].length, 21, 'header migrated to 21 columns');
  eq(qs.rows[1].slice(0, 14).concat(qs.rows[1].slice(14).every(x => x === '')), ['OLD1','Old exam','10','0','YES','old q','1','2','','','','B','T','ex', true], 'old exam row kept, bn cols empty');
  eq(B2.get({ action: 'exam', code: 'OLD1' }).questions[0].qb, undefined, 'old exam has no qb');
  const q = B2.get({ action: 'exam', code: 'BI1' }).questions[0];
  eq([q.q, q.o, q.a, q.e, q.qb, q.ob, q.eb], ['English q', ['one','two','three'], 2, 'sol EN', 'বাংলা প্রশ্ন', ['এক','দুই',''], 'সমাধান'], 'bn fields served, options aligned (missing bn option = "")');
  B2.post({ action: 'setopen', code: 'BI1', open: 'NO', key: K });
  eq(B2.get({ action: 'exam', code: 'BI1' }).questions[0].qb, 'বাংলা প্রশ্ন', 'setopen keeps bn columns');
  eq(B2.get({ action: 'exam', code: 'BI1' }).open, false, 'setopen still works on new layout'); }


// ---- student vault (sync) ----
{ const vt = { ts: 5, folders: ['General', 'Physics'], items: [{ id: 'a1', f: 'Physics', ex: 'CT1', qi: 0, q: { q: 'বাংলা ' + 'x'.repeat(100000), o: ['1', '2'], a: 0 } }] };
  eq(B.get({ action: 'vault', sid: '101', pin: 'bad' }), { ok: false, reason: 'denied' }, 'vault read needs right password');
  eq(B.get({ action: 'vault', sid: '101', pin: 'abc' }), { ok: true, ts: 0, vault: null }, 'empty vault');
  eq(B.post({ action: 'savevault', sid: '101', pin: 'nope', ts: '5', vault: JSON.stringify(vt) }), 'denied', 'vault write needs right password');
  eq(B.post({ action: 'savevault', sid: '102', pin: 'zz', ts: '5', vault: '{}' }), 'denied', 'blocked student cannot write vault');
  eq(B.post({ action: 'savevault', sid: '101', pin: 'abc', ts: '5', vault: JSON.stringify(vt) }), 'ok', 'vault saved (big, chunked)');
  let g = B.get({ action: 'vault', sid: ' 0101 ', pin: 'abc' });
  eq([g.ok, g.ts, g.vault && g.vault.items[0].q.q.length, g.vault && g.vault.folders], [true, 5, vt.items[0].q.q.length, ['General', 'Physics']], 'vault read back intact (chunks joined, id normalised)');
  const vs = B.sheets.find(x => x.getName() === 'Vault')._s;
  ok(vs.rows[1].slice(2).filter(Boolean).length === 3, 'big vault split into 3 cells');
  eq(B.post({ action: 'savevault', sid: '101', pin: 'abc', ts: '9', vault: JSON.stringify({ ts: 9, folders: ['General'], items: [] }) }), 'ok', 'vault overwritten smaller');
  g = B.get({ action: 'vault', sid: '101', pin: 'abc' });
  eq([g.ts, g.vault.items.length, vs.rows.length, vs.rows[1].slice(3).every(x => x === '')], [9, 0, 2, true], 'same row reused, old chunks cleared');
  eq(B.get({ action: 'vault', sid: '101', key: K }).ts, 9, 'teacher key can read a student vault (test student)');
  eq(B.post({ action: 'savevault', sid: '101', pin: 'abc', vault: '{bad' }), 'badjson', 'bad json rejected');
  eq(B.post({ action: 'savevault', sid: '101', pin: 'abc', vault: JSON.stringify({ x: 'y'.repeat(45000 * 21) }) }), 'toobig', 'too big vault rejected'); }

// ---- attempt logs: hide / unhide / permanent delete (teacher only) ----
{ const L = createBackend(), post = (sid, aid, mode) => L.post({ sid, name: 'S' + sid, exam: 'DEMO1', aid, mode: mode || 'full', score: '1', total: '3', secs: '9', details: '[[0,1,0,3]]' });
  post('5', 'a1'); post('5', 'a2'); post('6', 'a3'); post('5', 'a4', 'exit');
  eq(L.post({ action: 'logs', op: 'hide', aids: '["a1"]', key: 'x' }), 'denied', 'logs need teacher key');
  eq(L.post({ action: 'logs', op: 'hide', aids: JSON.stringify(['a1', 'a4', 'zz']), key: K }), 'ok:2', 'hide 2 logs (unknown aid ignored)');
  eq(L.get({ sid: '5' }).map(r => r.aid), ['a2'], 'student does not see hidden logs (attempt + exit)');
  eq(L.get({ key: K }).map(r => r.aid + (r.hidden ? 'H' : '')), ['a1H', 'a2', 'a3', 'a4H'], 'teacher sees hidden logs with flag');
  eq(L.sheets[0]._s.rows[0][10], 'HIDDEN', 'HIDDEN header written');
  eq(L.post({ action: 'logs', op: 'unhide', aids: '["a4"]', key: K }), 'ok:1', 'unhide');
  eq(L.get({ sid: '5' }).map(r => r.aid), ['a2', 'a4'], 'unhidden log visible again');
  eq(L.post({ action: 'logs', op: 'delete', aids: JSON.stringify(['a1', 'a3']), key: K }), 'ok:2', 'permanent delete 2');
  eq(L.get({ key: K }).map(r => r.aid), ['a2', 'a4'], 'deleted rows gone, others kept in order');
  eq([L.post({ action: 'logs', op: 'x', aids: '["a2"]', key: K }), L.post({ action: 'logs', op: 'hide', aids: '{bad', key: K }), L.post({ action: 'logs', op: 'hide', aids: '[]', key: K })], ['bad op', 'badjson', 'none'], 'bad requests refused');
  post('5', 'a1'); eq(L.get({ key: K }).length, 3, 'a deleted aid can be saved again'); }

// ---- 🚩 question reports + void (বাতিল) questions ----
{ const Q = createBackend(), rep = (sid, qi, why, note) => Q.post({ action: 'report', sid, name: 'N' + sid, exam: 'demo1', qi: String(qi), why, note: note || '', q: 'question text' });
  eq(rep('5', 1, 'typo', 'sin spelling'), 'ok', 'student report saved');
  eq(rep('5', 1, 'key'), 'dup', 'same student, same open question -> dup');
  eq(rep('6', 1, 'key'), 'ok', 'another student reports same question');
  eq(rep('5', 2, 'noopt'), 'ok', 'report on another question');
  eq([Q.post({ action: 'report', sid: '5', exam: '', qi: '1' }), Q.post({ action: 'report', sid: '5', exam: 'X', qi: '-1' }), Q.post({ action: 'report', sid: '', exam: 'X', qi: '1' })], ['bad', 'bad', 'bad'], 'bad reports refused');
  eq(Q.get({ action: 'reports', key: 'x' }).ok, false, 'reports list needs teacher key');
  let R = Q.get({ action: 'reports', key: K });
  eq(R.reports.map(r => [r.sid, r.exam, r.qi, r.why, r.st]), [['5', 'DEMO1', 1, 'typo', 'new'], ['6', 'DEMO1', 1, 'key', 'new'], ['5', 'DEMO1', 2, 'noopt', 'new']], 'teacher sees reports (exam upper-cased)');
  eq(R.reports[0].note, 'sin spelling', 'note kept');
  eq(Q.get({ action: 'myreports', sid: '005' }).map(r => r.qi), [1, 2], 'student sees own reports (id normalised)');
  eq(Q.post({ action: 'qvoid', key: 'x', code: 'DEMO1', qi: '1', op: 'approve' }), 'denied', 'approve needs key');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'approve' }), 'ok:2', 'approve -> both new reports approved');
  let V = Q.get({ action: 'settings' }).voids;
  ok(V.DEMO1 && V.DEMO1[1].length === 1 && V.DEMO1[1][0].fx === 0 && V.DEMO1[1][0].at > 0, 'void is public in settings (active, not fixed)');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'approve' }), 'ok:0', 'approve again does not add a 2nd period');
  eq(Q.get({ action: 'settings' }).voids.DEMO1[1].length, 1, 'still one period');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '2', op: 'reject' }), 'ok:1', 'reject');
  eq(Q.get({ action: 'settings' }).voids.DEMO1[2], undefined, 'reject does not void');
  eq(Q.get({ action: 'myreports', sid: '5' }).map(r => r.st), ['approved', 'rejected'], 'student sees decisions');
  ok(Q.get({ action: 'myreports', sid: '5' })[0].dts > 0, 'decision time stored');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'fix' }), 'ok:2', 'fix -> approved reports become fixed');
  V = Q.get({ action: 'settings' }).voids; ok(V.DEMO1[1][0].fx >= V.DEMO1[1][0].at, 'fix time stored');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'fix' }), 'notvoid', 'fix twice refused');
  eq(rep('5', 1, 'typo'), 'ok', 'can report the same question again after it was fixed');
  Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'approve' });
  eq(Q.get({ action: 'settings' }).voids.DEMO1[1].length, 2, 'second void period');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'undo' }), 'ok:1', 'undo approve');
  eq([Q.get({ action: 'settings' }).voids.DEMO1[1].length, Q.get({ action: 'reports', key: K }).reports[3].st], [1, 'new'], 'undo removes the period, report back to new');
  eq(Q.post({ action: 'qvoid', key: K, code: 'DEMO1', qi: '1', op: 'zap' }), 'bad op', 'bad op');
  // rename moves reports + voids
  eq(Q.post({ action: 'rename', key: K, code: 'DEMO1', newcode: 'DEMO9' }), 'ok', 'rename exam');
  ok(Q.get({ action: 'reports', key: K }).reports.every(r => r.exam === 'DEMO9') && Q.get({ action: 'settings' }).voids.DEMO9 && !Q.get({ action: 'settings' }).voids.DEMO1, 'rename moves reports + voids');
  // gmail notification
  eq(Q.mails.length, 0, 'no mail while notify off');
  eq(Q.post({ action: 'setnotify', key: K, on: 'YES', to: 'bad' }), 'bademail', 'bad email refused');
  eq(Q.post({ action: 'setnotify', key: K, on: 'YES', to: 't@x.com' }), 'ok', 'notify on');
  rep('7', 0, 'sol', 'no solution');
  ok(Q.mails.length === 1 && Q.mails[0].to === 't@x.com' && /DEMO1 Q1/.test(Q.mails[0].sub) && /no solution/.test(Q.mails[0].body), 'mail sent on report');
  Q.mailCfg.allowed = false; rep('8', 0, 'sol');
  ok(/permission/.test(Q.get({ action: 'reports', key: K }).notify.err), 'missing Gmail permission -> error stored, report still saved');
  eq(Q.get({ action: 'reports', key: K }).reports.length, 6, 'report saved even if mail fails');
  Q.mailCfg.allowed = true; rep('9', 0, 'sol');
  eq([Q.mails.length, Q.get({ action: 'reports', key: K }).notify.err], [2, ''], 'error cleared after a successful mail');
  eq(Q.get({ action: 'reports', key: K }).notify.to, 't@x.com', 'notify address only for teacher'); ok(!JSON.stringify(Q.get({ action: 'settings' })).includes('t@x.com'), 'email not in public settings'); }

// ---- change teacher password ----
eq(B.post({ action: 'setpass', key: K, newpass: 'ab' }), 'short', 'short password rejected');
eq(B.post({ action: 'setpass', key: K, newpass: 'newpass1' }), 'ok', 'password changed');
eq(B.get({ action: 'tlogin', key: K }).ok, false, 'old password stops working');
eq(B.get({ action: 'tlogin', key: 'newpass1' }).ok, true, 'new password works');

console.log(`backend: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
