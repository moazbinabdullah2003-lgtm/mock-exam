/* ---------- Dashboard (student's own view): few big numbers up front, details in folds ---------- */
const tile = (v, l, c) => `<div class="tile"><b ${c ? 'style="color:' + c + '"' : ''}>${v}</b><small>${esc(l)}</small></div>`;
function vBoard(sid, isT){
  const mine = allRecs().filter(r => norm(r.sid) === norm(sid)), recs = rng(mine);
  let h = '';
  if(remoteMsg) h += `<div class="warn">${esc(remoteMsg)}</div>`;
  if(!mine.length) return h + '<div class="card muted center">এখনো কোনো attempt নেই। উপরে exam code দিয়ে শুরু করো 🚀</div>';
  h += vRange({s:sid}, mine);
  if(!recs.length) return h + vNoneInRange();
  const ps = recs.map(pct), ts = topicStats(recs);
  h += `<div class="tiles">${tile(recs.length, T('statAttempts'))}${tile(avg(ps) + '%', T('statAvg'))}${tile(Math.max(...ps) + '%', T('statBest'), 'var(--g)')}</div>`;
  const weak = ts.filter(t => t.p < 0.8);
  h += sec('b_focus', esc(T('focusTitle')), (weak.length ? '' : '<div class="muted">সব topic ভালো আছে 👍</div>') +
    ts.map(t => `<div class="trow"><span>${esc(t.t)}</span><div class="bar"><i style="width:${Math.round(t.p*100)}%;background:${t.p<0.5?'var(--r)':t.p<0.8?'#f59e0b':'var(--g)'}"></i></div><b>${Math.round(t.p*100)}%</b></div>`).join('') +
    '<small class="muted">সবচেয়ে দুর্বল topic উপরে</small>', weak.length ? weak.length + ' topic' : '');
  h += sec('b_trend', esc(T('trendTitle')), `<div class="tr">${ps.slice(-12).map(p => `<div style="height:${Math.max(4,Math.min(100,p))}%" title="${p}%"></div>`).join('')}</div><small class="muted">শেষ ${Math.min(12, ps.length)}টা attempt</small>`);
  h += vTimeBlock(recs, 'b_time');
  if(!isT){
    const exams = [...new Set(mine.map(r => r.exam))].filter(c => EXAMS[c]);
    if(exams.length) h += sec('b_retake', esc(T('retakeTitle')), exams.map(c => {
      const w = wrongIdx(sid, c).length;
      return `<div class="hist"><div><b>${esc(EXAMS[c].title)}</b> <small>${esc(c)}</small></div><div>
        <button class="btn sm ghost" ${w ? '' : 'disabled'} data-c="${esc(c)}" onclick="retake(this.dataset.c,'mistakes')">Mistakes (${w})</button>
        <button class="btn sm" data-c="${esc(c)}" onclick="retake(this.dataset.c,'full')">Full</button></div></div>`;
    }).join(''), exams.length + ' exam');
  }
  if(CFG.rules.history || isT) h += sec('b_hist', '🕒 ' + esc(T('history')), recs.slice().reverse().map(r =>
    `<div class="hist"><div><b>${esc(r.exam)}</b>${r.mode==='mistakes'?'<span class="tag">mistakes</span>':''}<br><small>${new Date(aidTime(r.aid)).toLocaleString()} · ${fmt(r.secs)}</small></div>
     <div style="text-align:right"><b>${r.score}/${r.total}</b> <small>(${pct(r)}%)</small><br><button class="link" data-a="${esc(r.aid)}" onclick="openRec(this.dataset.a)">Review</button></div></div>`).join(''), recs.length + '');
  return h;
}
function openRec(aid){
  const r = allRecs().find(x => x.aid === aid);
  if(!r) return;
  BACK = SESS && SESS.teacher ? 'teacher' : 'home'; LAST = r; RVLANG = ''; view = 'result'; render();
}
