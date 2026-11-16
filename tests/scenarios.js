// Runs inside the quiz.html script scope. NOTE: the app already defines T() (texts) so asserts are TT.ok / TT.eq.
const csv = 'CODE,TITLE,MINUTES,NEG,OPEN,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION\n' +
  'CT1,Class Test 1,20,0.25,YES,"2x + 3 = 11 হলে x = ?",2,3,4,5,,C,Algebra,"x = 4"\n' +
  'CT1,,,,,"sin 30° = ?",1/2,√3/2,1,0,,A,Trigonometry,\n' +
  'CT1,,,,,"d/dx (x²) = ?",x,2x,x²,2,,B,Calculus,\n';

// 1. CSV parsing
let r = parseQ(csv);
TT.eq(r.errors, [], 'valid CSV has no errors');
TT.eq(Object.keys(r.exams), ['CT1'], 'one exam CT1');
TT.eq(r.exams.CT1.rows.length, 3, '3 questions');
TT.ok(parseQ('CODE,Q,A,B,ANS\nX,q,1,2,Z').errors.length === 1, 'bad ANS rejected');
TT.ok(parseQ('foo,bar\n1,2').errors.length > 0, 'missing headers rejected');
TT.ok(parseQ('CODE\tQ\tA\tB\tANS\nX\tq\t1\t2\tA').errors.length === 0, 'TSV paste accepted');

// 2. Teacher login (wrong then right)
el('#tid').value = 'teacher'; el('#tp').value = 'wrong'; await doTeacher();
TT.ok(!SESS, 'teacher wrong password rejected');
el('#tid').value = 'teacher'; el('#tp').value = 'teacher123'; await doTeacher();
TT.ok(SESS && SESS.teacher && view === 'teacher', 'teacher logged in');

// 3. Teacher publishes exam from pasted CSV
PASTE = csv; doPreview();
await publishUp();
TT.ok(upMsg.indexOf('Ready') >= 0, 'publish confirmed: ' + upMsg);
TT.eq(B.get({ action: 'exam', code: 'CT1' }).questions.length, 3, 'exam stored in backend');
await setOpen('CT1', false); TT.eq(B.get({ action: 'exam', code: 'CT1' }).open, false, 'exam closed in backend');
await setOpen('CT1', true);  TT.eq(B.get({ action: 'exam', code: 'CT1' }).open, true, 'exam reopened in backend');

// 4. Student login via roster
B.post({ action: 'saveroster', key: 'teacher123', roster: JSON.stringify([{ id: '007', pin: 'pw1', name: 'Rahim' }, { id: '008', pin: 'pw2', name: 'Blk', blocked: true }]) });
logout();
el('#sid').value = '007'; el('#pw').value = 'bad'; await doLogin();
TT.ok(!SESS, 'student wrong password rejected');
el('#sid').value = '008'; el('#pw').value = 'pw2'; await doLogin();
TT.ok(!SESS, 'blocked student rejected');
el('#sid').value = '007'; el('#pw').value = 'pw1'; await doLogin();
TT.ok(SESS && !SESS.teacher && SESS.name === 'Rahim', 'student logged in');

// 5. Student takes exam by code, scoring, result saved to backend
el('#code').value = 'ct1'; await startCode(); clearInterval(TM);
TT.ok(view === 'quiz' && RUN && RUN.exam === 'CT1', 'quiz started from code');
TT.eq(RUN.dur, 1200, 'timer = 20 min');
const ex = EXAMS.CT1;
RUN.order.forEach((qi, p) => { RUN.cur = p; const q = ex.questions[qi];
  /* pick() takes the ORIGINAL option index (display order is shuffled separately in RUN.op) */
  if (q.t === 'Algebra') pick(q.a);
  else if (q.t === 'Trigonometry') pick((q.a + 1) % q.o.length); });
finish(false); await new Promise(r => _origSetTimeout(r, 20));
TT.eq(LAST.score, 0.75, 'score = 1 correct - 0.25 wrong (skipped = 0)');
const saved = B.get({ key: 'teacher123' });
TT.eq(saved.length, 1, 'attempt saved in backend');
TT.eq(saved[0].sid, '7', 'sid normalised on save');
TT.eq(LS.get('mq_out', []).length, 0, 'outbox empty after flush');

// 6. Fresh device read-back, mistakes retake
LS.del('mq_local'); REMOTE = []; await loadRemote();
const mine = allRecs().filter(x => norm(x.sid) === '7');
TT.eq(mine.length, 1, 'own attempt read back from backend');
TT.eq(wrongIdx('007', 'CT1').length, 2, 'two wrong/skipped questions');
retake('CT1', 'mistakes'); clearInterval(TM);
TT.ok(RUN && RUN.mode === 'mistakes' && RUN.order.length === 2, 'mistake retake has 2 questions');
RUN = null; LS.del('mq_run');

// 7. Guest flow
logout(); el('#gcode').value = 'ct1'; await doGuest();
TT.ok(SESS && SESS.guest, 'guest enters with exam code');
logout(); el('#gcode').value = 'NOPE'; await doGuest();
TT.ok(!SESS, 'guest with bad code rejected');

// 8. Teacher sees everyone, deletes exam (two-tap)
SESS = { sid: 'TEACHER', name: 'Teacher', teacher: true, key: 'teacher123' }; view = 'teacher'; REMOTE = []; await loadRemote();
TT.eq(allRecs().length, 1, 'teacher sees all attempts');
await delExam('CT1'); TT.eq(DELC, 'CT1', 'first tap asks confirmation');
await delExam('CT1'); TT.eq(B.get({ action: 'exam', code: 'CT1' }).error, 'notfound', 'second tap deletes in backend');
