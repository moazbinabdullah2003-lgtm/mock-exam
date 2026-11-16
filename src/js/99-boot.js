/* ============================================================
   Boot
   ============================================================ */
function boot(){
  applyTheme();
  if(SESS){
    view = SESS.teacher ? 'teacher' : 'home';
    if(RUN && !SESS.teacher && RUN.sid === SESS.sid && EXAMS[RUN.exam]){ RUN.last = Date.now(); view = 'quiz'; }
    else if(RUN){ RUN = null; LS.del('mq_run'); }
  } else { RUN = null; }
  render();
  if(view === 'quiz') startTimer();
  if(!SESS) loadCfg().then(ok => { const f = document.querySelector('#sid'), t = document.querySelector('#tp'); if(ok && view === 'login' && !(f && f.value) && !(t && t.value)) render(true); });
  else if(view !== 'quiz') refresh(); else flush();
}
if(typeof document !== 'undefined' && document.getElementById('app') && !window.__TEST__) boot();
