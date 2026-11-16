// Runs inside the quiz.html script scope. NOTE: the app already defines T() (texts) so asserts are TT.ok / TT.eq.
const csv = 'CODE,TITLE,MINUTES,NEG,OPEN,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION\n' +
  'CT1,Class Test 1,20,0.25,YES,"2x + 3 = 11 হলে x = ?",2,3,4,5,,C,Algebra,"x = 4"\n' +
  'CT1,,,,,"sin 30° = ?",1/2,√3/2,1,0,,A,Trigonometry,\n' +
  'CT1,,,,,"d/dx (x²) = ?",x,2x,x²,2,,B,Calculus,\n';

// 0. Copy-for-AI text
{ const qq = { q: '$x^2 = 4$, $x>0$ হলে x = ?', o: ['1', '2'], a: 1, t: 'Algebra', e: 'sol: $x=2$' };
  const f = aiQ(qq, 3, 0, 'full', true);
  TT.ok(f.includes('### Question 3 (Topic: Algebra)') && f.includes('$x^2 = 4$') && f.includes('B) 2') && f.includes('My answer: A) 1') && f.includes('Correct answer: B) 2') && f.includes("Teacher's solution: sol: $x=2$"), 'AI copy: full level has LaTeX, my answer, correct answer, solution');
  const m = aiQ(qq, 1, 0, 'marks', true);
  TT.ok(m.includes('❌ wrong') && !m.includes('Correct answer') && !m.includes('solution'), 'AI copy: marks level hides correct answer + solution');
  TT.ok(!aiQ(qq, 1, 1, 'full', false).includes('solution') && aiQ(qq, 1, -1, 'full', true).includes('Skipped'), 'AI copy: explain off hides solution; skipped shown'); }

// 0b. Theme presets
CD = clone(CFG); applyPreset('notebook');
TT.ok(CD.theme.preset === 'notebook' && CD.theme.family === 'serif' && CD.theme.btnShape === 'square' && !('n' in CD.theme) && !('d' in CD.theme), 'full-look preset applies style keys, not name/desc');
applyPreset('rose'); TT.ok(CD.theme.primary === '#e11d48' && CD.theme.family === 'serif', 'colour-only preset keeps style');
TT.ok(vSettings().includes('Night Blue'), 'theme gallery lists new presets');
// 0c. Science motif themes
applyPreset('chalk');
TT.ok(CD.theme.motif === 'math' && CD.theme.motifInk === 'text' && !('sci' in CD.theme), 'science preset sets motif, not sci flag');
{ const css = motifCSS(CFG.theme); TT.ok(css.includes('--motif:url(') && css.includes('--msym:"∑"') && css.includes('--mop:0.13'), 'motifCSS builds SVG layer vars'); }
for(const k of Object.keys(MOTIFS)){ const sv = motifSVG(k, '#123456'); TT.ok(k === 'none' ? sv === '' : sv.startsWith('<svg') && sv.length > 300 && !/NaN|undefined/.test(sv), 'motif svg ok: ' + k); }
TT.eq(motifSVG('physics', '#000'), motifSVG('physics', '#000'), 'motif svg is deterministic');
for(const k of Object.keys(MOTIFS)) TT.ok(!motifURL(k, '#123456').slice(5, -2).includes("'") && !motifURL(k, '#123456').slice(5, -2).includes('"'), 'motif url has no raw quotes (safe in style attr): ' + k);
applyPreset('classic'); TT.eq(CD.theme.motif, 'none', 'old full-look preset clears motif');
applyPreset('quantum'); applyPreset('rose'); TT.eq(CD.theme.motif, 'physics', 'colour-only preset keeps motif');
TT.eq(motifCSS({...CFG.theme, motif:'none'}), '', 'no motif -> no css');
{ const v = vSettings(); TT.ok(v.includes('Science themes') && v.includes('Chalkboard') && v.includes('Background symbols') && v.includes('Circuit board'), 'settings shows science gallery + motif controls'); }
applyPreset('periodic'); TT.ok(CD.theme.boxStyle === 'bold' && CD.theme.boxSym === true && CD.theme.c2 === '#0891b2', 'science preset sets colorful box style + palette');
applyPreset('night'); TT.ok(CD.theme.boxStyle === 'plain' && CD.theme.boxSym === false, 'old full-look preset resets box style');
{ const v = vSettings(); TT.ok(v.includes('Box style') && v.includes('Extra color 2') && v.includes('thd'), 'settings shows box style controls + palette dots'); }
CD = {theme:{primary:'#000000'}}; TT.eq(gp('theme.motifOp'), 12, 'gp falls back to default for keys missing in old saved settings');
CD = null; DIRTY = false; CFG = deepMerge(DEF_CFG, {});

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

// 3b. AI prompt + Markdown/LaTeX import
{ const m = parseQ(MD_SAMPLE), e = m.exams['PHY-CT1'];
  TT.ok(!m.errors.length && e && e.rows.length === 2, 'MD sample parsed: ' + m.errors.join('|'));
  TT.ok(e.title === 'Physics Class Test 1' && e.minutes === '20' && e.neg === '0.25' && e.open === 'YES', 'MD exam header read');
  TT.ok(e.rows[0].a === 1 && e.rows[1].a === 2 && e.rows[0].o.length === 4 && e.rows[0].t === 'Kinematics', 'MD answers/options/topic');
  TT.ok(e.rows[0].q.includes('$a = 2\\,\\text{m/s}^2$') && e.rows[1].e.includes('$\\text{CO}_2$ is linear'), 'LaTeX kept as-is'); }
{ const c = parseQ(CSV_SAMPLE); TT.ok(!c.errors.length && c.exams['PHY-CT1'].rows.length === 2 && c.exams['PHY-CT1'].rows[1].a === 2, 'CSV sample parsed: ' + c.errors.join('|')); }
{ const t = "Here you go:\n```markdown\n# EXAM: x-1\nTITLE: T\n\n## Q1\nTOPIC: Alg\nQ: line one\nline two $x^2$\nA) 1\nB) 2\nC) 3\nANS: (c)\nSOL: step 1\n\nstep 2\n## Q2\nQ: no topic\nA) yes\nB) no\nANS: A\n```\n⚠ CHECK: Q1 answer\n";
  const m = parseQ(t), e = m.exams['X-1'];
  TT.ok(!m.errors.length && e.rows.length === 2, 'fenced MD with chatter + CHECK list parsed: ' + m.errors.join('|'));
  TT.ok(e.rows[0].q === 'line one\nline two $x^2$' && e.rows[0].a === 2 && e.rows[0].e === 'step 1\n\nstep 2' && e.rows[1].t === 'General', 'multi-line Q/SOL, (c) answer, default topic'); }
TT.ok(parseQ('# EXAM: A\n## Q1\nQ: q\nA) 1\nB) 2\nANS: D').errors[0].includes('ANS'), 'MD: ANS out of range rejected');
TT.ok(parseQ('# EXAM: A\n## Q1\nQ: q\nA) 1\nC) 3\nANS: A').errors[0].includes('Option'), 'MD: gap in options rejected');
TT.ok(parseQ('# EXAM: bad code\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A').errors[0].includes('code'), 'MD: bad exam code rejected');
TT.ok(parseQ('## Q1\nQ: q\nA) 1\nB) 2\nANS: A').errors[0].includes('EXAM'), 'MD: missing EXAM line rejected');
{ const pm = aiPrompt('md'), pc = aiPrompt('csv');
  TT.ok(pm.includes('# EXAM: PHY-CT1') && pm.includes('LaTeX') && pm.includes('<<< paste raw questions here >>>') && !pm.includes('CODE,TITLE'), 'MD prompt has rules + MD sample');
  TT.ok(pc.includes('CODE,TITLE,MINUTES,NEG,OPEN,MAXATTEMPTS,GUEST,START,END,INTRO,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION') && pc.includes('```csv'), 'CSV prompt has header + CSV sample'); }

// 3c. Exam rules from upload (MAXATTEMPTS / GUEST / START / END / INTRO)
{ const e = parseQ(MD_SAMPLE).exams['PHY-CT1'];
  TT.eq(e.ov, {maxAttempts:1, guest:'no', start:'', end:'', intro:'প্রতিটা প্রশ্নের ১টাই সঠিক উত্তর। ভুল উত্তরে 0.25 কাটা যাবে।'}, 'MD sample rules read');
  TT.eq(parseQ(CSV_SAMPLE).exams['PHY-CT1'].ov, e.ov, 'CSV sample rules same as MD'); }
{ const m = parseQ('# EXAM: R1\nTITLE: T\nINTRO: line 1\nline 2\nSTART: 2026-11-20 9:05\nEND: 2026-11-20\nGUEST: yes\n\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A'), e = m.exams.R1;
  TT.ok(!m.errors.length, 'MD rules parsed: ' + m.errors.join('|'));
  TT.eq(e.ov, {maxAttempts:0, guest:'yes', start:'2026-11-20T09:05', end:'2026-11-20T23:59', intro:'line 1\nline 2'}, 'multi-line INTRO, date-only END = 23:59, time padded'); }
TT.eq(parseQ('# EXAM: R2\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A').exams.R2.ov, null, 'no rule keys -> rules untouched (null)');
TT.eq(parseQ('CODE,Q,A,B,ANS\nX,q,1,2,A').exams.X.ov, null, 'old CSV without rule columns -> rules untouched');
{ const er = parseQ('# EXAM: R3\nMAXATTEMPTS: two\nGUEST: maybe\nSTART: 20/11/2026\nEND: 2026-11-19 10:00\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A').errors.join('|');
  TT.ok(er.includes('MAXATTEMPTS') && er.includes('GUEST') && er.includes('START'), 'bad rule values rejected: ' + er); }
TT.ok(parseQ('# EXAM: R4\nSTART: 2026-11-20 10:00\nEND: 2026-11-20 09:00\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A').errors.join('|').includes('END সময়'), 'END before START rejected');
TT.ok(rulesTxt(null).includes('আগের মতো') && rulesTxt({maxAttempts:2, guest:'no', start:'2026-11-20T10:00', end:'', intro:'x'}).includes('max 2 attempt'), 'rules summary text');
TT.ok(aiPrompt('md').includes('MAXATTEMPTS:') && aiPrompt('csv').includes('MAXATTEMPTS,GUEST,START,END,INTRO') && aiPrompt('md').includes('Start time'), 'prompts ask for exam rules');

// 3d. Bilingual (English + বাংলা) questions
{ const e = parseQ(MD_SAMPLE).exams['PHY-CT1'], [a, b] = e.rows;
  TT.ok(a.qb.startsWith('একটি বস্তু') && a.ob.length === 4 && a.ob[1] === '$10\\,\\text{m/s}$' && a.eb.includes('v = u + at') && a.t === 'Kinematics' && a.a === 1, 'MD [BN] block -> qb/ob/eb, topic/answer from English');
  TT.ok(b.o[3] === 'None of these' && b.ob[3] === 'কোনোটিই নয়' && b.q === 'Which of the following is a polar molecule?', 'Q2 English + Bengali options aligned');
  const c = parseQ(CSV_SAMPLE).exams['PHY-CT1'];
  TT.eq(c.rows.map(r => [r.q, r.o, r.a, r.qb, r.ob, r.eb]), e.rows.map(r => [r.q, r.o, r.a, r.qb, r.ob, r.eb]), 'CSV _BN columns == MD [BN] blocks');
  TT.eq(rowsOf(c)[0].length, 21, 'upload rows have 21 columns (with _BN)');
  TT.eq(rowsOf({code:'X', title:'X', minutes:'1', neg:'0', open:'YES', rows:[{q:'q', o:['1','2'], a:0, t:'T', e:''}]})[0].slice(14), ['','','','','','',''], 'single-language row: empty _BN columns'); }
TT.ok(parseQ('# EXAM: B1\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A\n[BN]\nA) এক').errors[0].includes('বাংলা প্রশ্ন'), 'BN options without BN question rejected');
TT.ok(parseQ('# EXAM: B1\n## Q1\nQ: q\nA) 1\nB) 2\nANS: A\n[BN]\nQ: প্র\nA) এক\nB) দুই\nC) তিন').errors[0].includes('বেশি'), 'more BN options than English rejected');
{ const m = parseQ('# EXAM: B2\n## Q1\nQ: What?\nA) $x$\nB) two\nANS: B\nSOL: because\n--- বাংলা ---\nQ: কী?\nB) দুই\n\n## Q2\nQ: only english\nA) 1\nB) 2\nANS: A'), r = m.exams.B2.rows;
  TT.ok(!m.errors.length && r[0].qb === 'কী?' && r[0].ob[0] === '' && r[0].ob[1] === 'দুই' && r[0].eb === '' && !r[1].qb, 'missing BN option allowed (falls back), "--- বাংলা ---" marker, mixed exam: ' + m.errors.join('|'));
  const q = r[0], v = LQ(q, 'bn');
  TT.eq([v.q, v.o, v.e], ['কী?', ['$x$', 'দুই'], 'because'], 'LQ bn view: English fallback for empty option + solution');
  TT.ok(LQ(q, 'en') === q && LQ(r[1], 'bn') === r[1], 'LQ en / no-bn question unchanged'); }
TT.ok(isBi(parseQ(MD_SAMPLE).exams['PHY-CT1'] && {questions:parseQ(MD_SAMPLE).exams['PHY-CT1'].rows}) && !isBi({questions:[{q:'a', o:[]}]}), 'isBi detects bilingual exams');
PASTE = MD_SAMPLE.replace('START:', 'START: 2026-01-01 08:00').replace('MAXATTEMPTS: 1', 'MAXATTEMPTS: 3'); doPreview(); TT.ok(vExams().includes('max 3 attempt'), 'preview shows rules'); await publishUp();
TT.ok(upMsg.indexOf('Ready') >= 0, 'MD exam published: ' + upMsg);
{ const x = B.get({ action: 'exam', code: 'PHY-CT1' }); TT.ok(x.questions && x.questions.length === 2 && x.questions[0].q.includes('\\text{m/s}') && x.questions[1].a === 2, 'MD exam stored in backend with LaTeX'); }
{ const x = B.get({ action: 'exam', code: 'PHY-CT1' }).questions; TT.ok(x[0].qb.startsWith('একটি বস্তু') && x[1].ob[3] === 'কোনোটিই নয়' && x[1].eb.includes('বাঁকা'), 'bilingual exam stored in backend'); }
TT.ok(vExams() !== '' , 'exams view ok after bilingual publish');
// student: language chosen once at start, quiz + review in that language
{ const sv = SESS, sv2 = view; SESS = {sid:'LANGT', name:'Lang'}; await getExam('PHY-CT1');
  startRun('PHY-CT1', 'full');
  TT.ok(LANGASK && LANGASK.exam === 'PHY-CT1' && !RUN, 'bilingual exam asks language first');
  view = 'home'; TT.ok(vLangAsk().includes('English') && vLangAsk().includes('বাংলা'), 'language popup rendered');
  chooseLang('bn'); clearInterval(TM);
  TT.ok(RUN && RUN.lang === 'bn' && view === 'quiz' && !LANGASK && LS.get('mq_lang') === 'bn', 'chose বাংলা -> run in bn');
  const qz = vQuiz(); TT.ok(/স্থির অবস্থা|পোলার অণু/.test(qz) && !/A body starts|polar molecule\?/.test(qz), 'quiz shows Bengali text');
  RUN = null; LS.del('mq_run'); view = 'result';
  const r = {aid:'x', sid:'LANGT', name:'Lang', exam:'PHY-CT1', mode:'full', score:1, total:2, secs:9, d:[[0, 1, 1, 5], [1, 0, 0, 4]], lang:'bn'};
  RVLANG = ''; let h = vResult(r);
  TT.ok(h.includes('স্থির অবস্থা') && h.includes('বাঁকা') && h.includes("RVLANG='en'"), 'review in Bengali + language switch');
  RVLANG = 'en'; h = vResult(r); TT.ok(h.includes('A body starts') && !h.includes('স্থির অবস্থা'), 'switch review to English');
  RVLANG = ''; LS.set('mq_lang', 'en'); view = 'home'; startRun('PHY-CT1', 'full'); chooseLang('en'); clearInterval(TM);
  TT.ok(RUN.lang === 'en' && vQuiz().includes('polar molecule') || vQuiz().includes('A body starts'), 'chose English -> English quiz');
  RUN = null; LS.del('mq_run'); SESS = sv; view = sv2; }
// editor keeps the Bengali version when an exam is edited + saved
await openEditor('PHY-CT1');
TT.ok(EDX.qs[1].ob[3] === 'কোনোটিই নয়' && vExamEditor().includes('বাংলা version'), 'editor loads Bengali fields');
EDX.qs[0].eb = 'নতুন সমাধান'; await saveExam();
{ const x = B.get({ action: 'exam', code: 'PHY-CT1' }).questions; TT.ok(/saved/.test(EDX.msg) && x[0].eb === 'নতুন সমাধান' && x[1].qb === 'নিচের কোনটি পোলার অণু?', 'editor save keeps/updates Bengali: ' + EDX.msg); }
EDX = null;
{ const sc = B.get({ action: 'settings' }).cfg.exams['PHY-CT1'];
  TT.ok(sc && sc.maxAttempts === 3 && sc.guest === 'no' && sc.start === '2026-01-01T08:00' && sc.intro.includes('0.25'), 'rules saved to backend settings: ' + JSON.stringify(sc));
  TT.ok(exOv('PHY-CT1').maxAttempts === 3 && /exam rules-ও saved/.test(upMsg), 'rules active locally + message: ' + upMsg); }
await delExam('PHY-CT1'); await delExam('PHY-CT1'); TT.eq(B.get({ action: 'exam', code: 'PHY-CT1' }).error, 'notfound', 'MD test exam removed');

// 4. Student login via roster
B.post({ action: 'saveroster', key: 'teacher123', roster: JSON.stringify([{ id: '007', pin: 'pw1', name: 'Rahim' }, { id: '008', pin: 'pw2', name: 'Blk', blocked: true }]) });
logout();
el('#sid').value = '007'; el('#pw').value = 'bad'; await doLogin();
TT.ok(!SESS, 'student wrong password rejected');
el('#sid').value = '008'; el('#pw').value = 'pw2'; await doLogin();
TT.ok(!SESS, 'blocked student rejected');
el('#sid').value = '007'; el('#pw').value = 'pw1'; await doLogin();
TT.ok(SESS && !SESS.teacher && SESS.name === 'Rahim', 'student logged in');

// 4b. ✕ Exit exam (cancel = nothing saved) + 🔖 vault (folders, sync)
TT.eq(SESS.pin, 'pw1', 'student session keeps password for vault sync');
el('#code').value = 'ct1'; await startCode(); clearInterval(TM);
{ const qz = vQuiz(); TT.ok(qz.includes('✕ Exit') && qz.includes('🔖 Save'), 'quiz has Exit + Save buttons'); }
EXITING = true; TT.ok(vExitPopup().includes('Submit করে বের হও') && vExitPopup().includes('বাতিল করে বের হও'), 'exit popup: submit / cancel');
onQuizKey({ key: '1', target: { tagName: 'BODY' }, preventDefault(){} }); TT.eq(Object.keys(RUN.ans).length, 0, 'quiz keys ignored while exit popup open');
EXITING = 'cancel'; TT.ok(vExitPopup().includes('Attempt গুনবে না'), 'cancel asks for confirmation');
pick(0); cancelRun(); await new Promise(r => _origSetTimeout(r, 20));
TT.ok(!RUN && view === 'home' && !LS.get('mq_run', null) && !EXITING, 'cancel exit discards the run');
TT.eq(B.get({ key: 'teacher123' }).length, 0, 'cancelled attempt NOT saved in backend');
TT.eq(LS.get('mq_out', []).length + LS.get('mq_local', []).length, 0, 'cancelled attempt not in outbox/local');
TT.ok(vHome().includes('Saved questions'), 'home shows vault button');
saveQ('CT1', 0); TT.ok(VSAVE && vSavePopup().includes('General') && vSavePopup().includes('নতুন folder'), 'save popup with folders');
VSAVE.nf = 'Physics'; doSaveQ(); await new Promise(r => _origSetTimeout(r, 20));
{ const v = vGet(); TT.ok(v.items.length === 1 && v.items[0].f === 'Physics' && v.folders.join() === 'General,Physics' && v.items[0].q.o.length === 4 && v.items[0].title === EXAMS.CT1.title, 'question saved to new folder with snapshot'); }
saveQ('CT1', 1); VSAVE.f = 'physics'; doSaveQ();   // same folder, different case
saveQ('CT1', 2); doSaveQ();                         // last used folder remembered
{ const v = vGet(); TT.ok(v.items.length === 3 && v.folders.length === 2 && v.items.every(x => x.f === 'Physics'), 'folder names case-insensitive + last folder remembered'); }
TT.ok(vSaveBtn('CT1', 0).includes('🔖 Saved'), 'save button shows saved state');
await vPush();
{ const r = B.get({ action: 'vault', sid: '7', pin: 'pw1' }); TT.ok(r.ok && r.vault.items.length === 3 && r.ts === vGet().ts, 'vault synced to backend'); TT.ok(/synced/.test(VSYNC), 'sync status: ' + VSYNC); }
view = 'vault'; VF = ''; let vh = vVault();
TT.ok(vh.includes('📁 Physics') && vh.includes('🔒') && !vh.includes('class="opt ok"'), 'vault page: folders, answers locked before submitting this exam');
vMove('CT1#0', 'General'); TT.eq(vGet().items.find(x => x.id === 'CT1#0').f, 'General', 'move question to another folder');
VF = 'Physics'; vh = vVault(); TT.ok((vh.match(/class="card vq"/g) || []).length === 2 && vh.includes('Rename'), 'folder filter + rename/delete buttons');
global.prompt = () => 'Chem'; vRenameFolder(); TT.ok(vGet().folders.includes('Chem') && !vGet().folders.includes('Physics') && vGet().items.filter(x => x.f === 'Chem').length === 2 && VF === 'Chem', 'rename folder moves items');
global.confirm = () => true; vDelFolder(); TT.ok(!vGet().folders.includes('Chem') && vGet().items.every(x => x.f === 'General'), 'delete folder -> items go to General');
unsaveQ('CT1#2'); TT.eq(vGet().items.length, 2, 'remove from vault');
await vPush();
LS.del(vKey()); TT.eq(vGet().items.length, 0, 'other device: empty local vault');
await vPull(); TT.eq(vGet().items.length, 2, 'other device: vault pulled from account');
{ const sv = SESS; SESS = {...sv, pin:'wrong'}; LS.del(vKey()); await vPull(); TT.ok(vGet().items.length === 0 && /login/.test(VSYNC), 'wrong password: no pull, asks re-login'); SESS = sv; await vPull(); }
{ const sv = SESS; SESS = {sid:sv.sid, name:sv.name, teacher:false}; TT.ok(/logout করে আবার login/.test(vSyncNote()), 'old session without password: local-only note'); SESS = sv; }
view = 'home';

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
{ view = 'vault'; VF = ''; const vh = vVault(); TT.ok(!vh.includes('🔒') && vh.includes('class="opt ok"'), 'vault shows answers after the exam was submitted'); view = 'result'; }
{ const rh = vResult(LAST); TT.ok(rh.includes('🔖 Saved') && rh.includes('🔖 Save'), 'result review has save buttons'); }

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
