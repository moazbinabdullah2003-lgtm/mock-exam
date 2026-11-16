/* ============================================================
   State
   ============================================================ */
Object.assign(EXAMS, LS.get('mq_exams', {}));
let SESS = LS.get('mq_sess', null), RUN = LS.get('mq_run', null);
let view = 'login', BACK = 'home', LAST = null, TM = null, TF = '', TSTU = null;
let EXL = [], UP = null, PASTE = '', upMsg = '', DELC = '';
let TTAB = 'dash';
let msg = '', loading = false, confirming = false, syncMsg = '', showT = false;

function render(keep){
  const a = $('#app');
  if(!a) return;
  let h = '';
  if(view === 'login') h = vLogin();
  else if(view === 'home') h = vHome();
  else if(view === 'quiz') h = vQuiz();
  else if(view === 'result') h = vResult(LAST);
  else if(view === 'teacher') h = vTeacher();
  else if(view === 'vault') h = vVault();
  const KEEP = ['#code', '#sid', '#pw', '#tid', '#tp', '#gcode', '#gname'], kv = KEEP.map(k => $(k) ? $(k).value : '');
  if(CFG.brand.footer && view !== 'quiz') h += `<div class="foot">${esc(CFG.brand.footer)}</div>`;
  if(LANGASK && view !== 'quiz') h += vLangAsk();
  if(VSAVE) h += vSavePopup();                        // 🔖 save popup (quiz / result / vault)
  if(EXITING && view === 'quiz') h += vExitPopup();   // ✕ exam exit   // ভাষা বাছাই popup (bilingual exam)
  try{ document.body.classList.toggle('in-quiz', view === 'quiz'); }catch(e){}
  a.classList.toggle('enter', !keep);
  a.innerHTML = h;
  mathify(a);
  if(view === 'teacher' && EDX && !EDX.loading) EDX.qs.forEach((_, i) => edPrev(i));
  KEEP.forEach((k, i) => { if(kv[i] && $(k)) $(k).value = kv[i]; });
  if(view === 'quiz') tick();
  if(!keep) window.scrollTo(0, 0);
}

