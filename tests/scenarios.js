// Runs inside the quiz.html script scope (all top-level functions/vars of the app are visible here).
// Add new scenarios at the bottom. Style: T.ok(cond,msg) / T.eq(got,expected,msg)

// --- 1. CSV parsing / validation (parseQ) ---
const csv = 'CODE,TITLE,MINUTES,NEG,OPEN,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION\n' +
  'CT1,Class Test 1,20,0.25,YES,"2x + 3 = 11 হলে x = ?",2,3,4,5,,C,Algebra,"x = 4"\n' +
  'CT1,,,,,"sin 30° = ?",1/2,√3/2,1,0,,A,Trigonometry,\n' +
  'CT1,,,,,"d/dx (x²) = ?",x,2x,x²,2,,B,Calculus,\n';
let r = parseQ(csv);
T.eq(r.errors, [], 'valid CSV has no errors');
T.eq(Object.keys(r.exams), ['CT1'], 'one exam CT1');
T.eq(r.exams.CT1.rows.length, 3, '3 questions');
T.eq([r.exams.CT1.minutes, r.exams.CT1.neg], ['20', '0.25'], 'title row settings');
T.ok(parseQ('CODE,Q,A,B,ANS\nX,q,1,2,Z').errors.length === 1, 'bad ANS rejected');
T.ok(parseQ('foo,bar\n1,2').errors.length > 0, 'missing headers rejected');
T.ok(parseQ('CODE\tQ\tA\tB\tANS\nX\tq\t1\t2\tA').errors.length === 0, 'TSV paste accepted');

// --- 2. Teacher: login, publish, list, close/open, (not yet delete) ---
CONFIG.TEACHER_PASS = 'teacher123';
SESS = { sid: 'TEACHER', name: 'Teacher', teacher: true };
PASTE = csv; doPreview();
await publishUp();
T.ok(upMsg.indexOf('Ready') >= 0, 'publish confirmed: ' + upMsg);
T.ok(!!T.db.exams.CT1 && T.db.exams.CT1.questions.length === 3, 'exam stored on server');
await setOpen('CT1', false); T.eq(EXL.find(x => x.code === 'CT1').open, false, 'exam closed');
await setOpen('CT1', true);  T.eq(EXL.find(x => x.code === 'CT1').open, true, 'exam reopened');

// --- 3. Student: exam by code, timer run, scoring, save ---
SESS = { sid: '007', name: 'Rahim', teacher: false };
el('#code').value = 'ct1'; await startCode(); clearInterval(TM);
T.ok(view === 'quiz' && RUN && RUN.exam === 'CT1', 'quiz started from code');
T.eq(RUN.dur, 1200, 'timer = 20 min');
const ex = EXAMS.CT1;
RUN.order.forEach((qi, p) => { RUN.cur = p; const q = ex.questions[qi];
  if (q.t === 'Algebra') pick(q.a);               // correct
  else if (q.t === 'Trigonometry') pick((q.a + 1) % q.o.length);   // wrong
  /* Calculus skipped */ });
finish(false); await new Promise(r => _origSetTimeout(r, 20));
T.eq(LAST.score, 0.75, 'score = 1 correct - 0.25 wrong');
T.eq(T.db.attempts.length, 1, 'attempt saved to server');
T.eq(LS.get('mq_out', []).length, 0, 'outbox empty after flush');

// --- 4. Fresh device read-back + analytics + mistake retake ---
LS.del('mq_local'); REMOTE = []; await loadRemote();
const mine = allRecs().filter(x => norm(x.sid) === '7');
T.eq(mine.length, 1, 'own attempt read from server (leading zeros normalised)');
T.eq(wrongIdx('007', 'CT1').length, 2, 'two wrong/skipped questions');
retake('CT1', 'mistakes'); clearInterval(TM);
T.ok(RUN && RUN.mode === 'mistakes' && RUN.order.length === 2, 'mistake retake has 2 questions');
RUN = null; LS.del('mq_run');
const ts = topicStats(mine);
T.eq(ts[0].p, 0, 'weakest topic accuracy 0');

// --- 5. Teacher dashboard sees everyone ---
SESS = { sid: 'T', name: 'Teacher', teacher: true }; view = 'teacher'; REMOTE = []; await loadRemote();
T.eq(allRecs().length, 1, 'teacher sees all attempts');
T.ok(vTeacher().indexOf('Rahim') >= 0, 'teacher dashboard renders student');

// --- 6. Delete exam (two-tap confirm) ---
await delExam('CT1'); T.eq(DELC, 'CT1', 'first tap asks confirmation');
await delExam('CT1'); T.ok(!T.db.exams.CT1, 'second tap deletes');
