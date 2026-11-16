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
{ const K = (key, t) => onQuizKey({ key, target: { tagName: t || 'BODY' }, preventDefault(){} });
  RUN.cur = 0; const perm0 = RUN.op[RUN.order[0]], n0 = perm0.length;
  K('2'); TT.eq(RUN.ans[0], perm0[1], 'key 2 picks the 2nd DISPLAYED option (original index kept)');
  K(String(n0 + 1)); TT.eq(RUN.ans[0], perm0[1], 'key beyond option count ignored');
  RUN.last = Date.now() - 7000; K('Enter'); TT.eq(RUN.cur, 1, 'Enter -> next question');
  TT.ok(RUN.secs[0] >= 6.9 && RUN.secs[0] < 9, 'time on question 1 counted (' + RUN.secs[0] + 's)');
  K('ArrowLeft'); TT.eq(RUN.cur, 0, 'ArrowLeft -> prev'); K('ArrowRight'); TT.eq(RUN.cur, 1, 'ArrowRight -> next');
  K('1', 'INPUT'); TT.eq(RUN.ans[1], undefined, 'keys ignored while typing in an input');
  RUN.cur = RUN.order.length - 1; K('Enter'); TT.ok(confirming === true && RUN.cur === RUN.order.length - 1, 'Enter on last question opens submit confirm');
  K('Escape'); TT.eq(confirming, false, 'Escape closes confirm');
  RUN.cur = 0; RUN.ans = {}; RUN.secs = {}; }
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
logout(); setLM('guest'); el('#gcode').value = 'ct1'; await doGuest();
TT.ok(!SESS, 'guest without name rejected');
logout(); setLM('guest'); el('#gname').value = 'Rahim'; el('#gcode').value = 'ct1'; await doGuest();
TT.ok(SESS && SESS.guest && SESS.name === 'Rahim (Guest)', 'guest enters with name + exam code');
logout(); setLM('guest'); el('#gname').value = 'Rahim'; el('#gcode').value = 'NOPE'; await doGuest();
TT.ok(!SESS, 'guest with bad code rejected');

// 8. Teacher sees everyone, deletes exam (two-tap)
SESS = { sid: 'TEACHER', name: 'Teacher', teacher: true, key: 'teacher123' }; view = 'teacher'; REMOTE = []; await loadRemote();
TT.eq(allRecs().length, 1, 'teacher sees all attempts');
{ const ph = vProfile('7');
  TT.ok(ph.includes('Summary') && ph.includes('Topic-wise') && ph.includes('Exam-wise') && ph.includes('Activity'), 'profile renders all sections');
  TT.ok(/Attempts/.test(ph) && ph.includes('CT1'), 'profile shows attempts + exam');
  TT.ok((() => { const h = vTimeCard([{ exam: 'CT1', sid: '7', name: 'R', aid: 'x', secs: 42, score: 1, total: 2, d: [[0, 1, 1, 12], [1, 0, 0, 30]] }]); return h.includes('30s') && h.includes('Topic-wise time') && h.includes('Question-wise time') && h.includes('Student-wise time') && h.indexOf('Q2') < h.indexOf('Q1 '); })(), 'teacher time-per-question card renders');
  TT.ok(vProfile('nobody').includes('এখনো কোনো exam দেয়নি'), 'profile of student without attempts'); }
B.post({ action: 'saveroster', key: 'teacher123', roster: JSON.stringify([{ id: '007', pin: 'pw1', name: 'Rahim' }]) });
await asTestStudent();
TT.ok(SESS && SESS.teacher && /নেই/.test(TSTMSG), 'no test student in roster -> stays teacher with message');
B.post({ action: 'saveroster', key: 'teacher123', roster: JSON.stringify([{ id: '9999', pin: 'tpw', name: 'Test Student' }]) });
await asTestStudent();
TT.ok(SESS && SESS.sid === '9999' && !SESS.teacher && SESS.back && SESS.back.teacher && view === 'home', 'teacher -> test student in one click');
TT.ok(vHome().includes('backToTeacher'), 'student home shows back-to-teacher button');
backToTeacher();
TT.ok(SESS && SESS.teacher && SESS.key === 'teacher123' && view === 'teacher', 'back to teacher keeps session');
{ const ea = vExamAnalytics('CT1');
  TT.ok(ea.includes('Student-wise') && ea.includes('Score distribution') && ea.includes('Question-wise') && ea.includes('🥇'), 'exam analytics page renders general + student-wise');
  TT.ok(vExamAnalytics('NOPE').includes('কেউ দেয়নি'), 'exam analytics with no attempts'); }
await openEditor('CT1');
EDX.newCode = 'ct 2!'; await saveExam();
TT.ok(/শুধু A-Z/.test(EDX.msg) && B.get({ action: 'exam', code: 'CT1' }).questions, 'invalid new exam code refused, exam untouched');
EDX.newCode = ' ct-2 '; await saveExam();
TT.ok(EDX.code === 'CT-2' && /saved/.test(EDX.msg), 'exam code changed in editor: ' + EDX.msg);
TT.eq(B.get({ action: 'exam', code: 'CT1' }).error, 'notfound', 'old code gone after rename');
TT.eq(B.get({ action: 'exam', code: 'CT-2' }).questions.length, 3, 'questions under new code');
TT.eq(B.get({ key: 'teacher123' }).map(a => a.exam), ['CT-2'], 'old attempt moved to new code');
EDX.newCode = 'CT-2'; await openEditor('CT-2'); EDX.newCode = 'ct1'; await saveExam();
TT.eq(B.get({ action: 'exam', code: 'CT1' }).questions.length, 3, 'renamed back to CT1');
EDX = null;
await delExam('CT1'); TT.eq(DELC, 'CT1', 'first tap asks confirmation');
await delExam('CT1'); TT.eq(B.get({ action: 'exam', code: 'CT1' }).error, 'notfound', 'second tap deletes in backend');
