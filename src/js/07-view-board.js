/* ---------- Dashboard (student; teacher reuses) ---------- */
function vBoard(sid, isT){
  const recs = allRecs().filter(r => norm(r.sid) === norm(sid));
  let h = '';
  if(remoteMsg) h += `<div class="warn">${esc(remoteMsg)}</div>`;
  h += `<div class="row" style="margin:0"><h2 style="margin:0">${isT ? esc((recs[recs.length-1]||{}).name || sid) + ' — ' : ''}${esc(T('analytics'))}</h2><button class="btn ghost sm" onclick="refresh()">${loading ? 'Syncing…' : '↻ Refresh'}</button></div>`;
  if(!recs.length) return h + '<div class="card muted">এখনো কোনো attempt নেই। Exam code দিয়ে শুরু করো।</div>';
  const ps = recs.map(pct), ts = topicStats(recs);
  h += `<div class="card"><div class="stats">
    <div class="stat"><b>${recs.length}</b><small>Attempts</small></div>
    <div class="stat"><b>${avg(ps)}%</b><small>Average</small></div>
    <div class="stat"><b>${Math.max(...ps)}%</b><small>Best</small></div></div>
    <h3>Trend (last ${Math.min(12, ps.length)})</h3>
    <div class="tr">${ps.slice(-12).map(p => `<div style="height:${Math.max(4,Math.min(100,p))}%" title="${p}%"></div>`).join('')}</div></div>`;
  const weak = ts.filter(t => t.p < 0.8).slice(0, 5);
  h += `<div class="card"><h2>🎯 Focus next</h2>${weak.length ? '' : '<div class="muted">সব topic ভালো আছে 👍</div>'}` +
    ts.map(t => `<div class="trow"><span>${esc(t.t)}</span><div class="bar"><i style="width:${Math.round(t.p*100)}%;background:${t.p<0.5?'var(--r)':t.p<0.8?'#f59e0b':'var(--g)'}"></i></div><b>${Math.round(t.p*100)}%</b></div>`).join('') +
    `<small class="muted">${ts.map(t => t.ok + '/' + t.n).length ? 'সবচেয়ে দুর্বল topic উপরে' : ''}</small></div>`;
  if(!isT){
    const exams = [...new Set(recs.map(r => r.exam))].filter(c => EXAMS[c]);
    if(exams.length){
      h += `<div class="card"><h2>🔁 Retake</h2>` + exams.map(c => {
        const w = wrongIdx(sid, c).length;
        return `<div class="hist"><div><b>${esc(EXAMS[c].title)}</b> <small>${esc(c)}</small></div><div>
          <button class="btn sm ghost" ${w ? '' : 'disabled'} data-c="${esc(c)}" onclick="retake(this.dataset.c,'mistakes')">Mistakes (${w})</button>
          <button class="btn sm" data-c="${esc(c)}" onclick="retake(this.dataset.c,'full')">Full</button></div></div>`;
      }).join('') + '</div>';
    }
  }
  if(CFG.rules.history || isT) h += `<div class="card"><h2>${esc(T('history'))}</h2>` + recs.slice().reverse().map(r =>
    `<div class="hist"><div><b>${esc(r.exam)}</b>${r.mode==='mistakes'?'<span class="tag">mistakes</span>':''}<br><small>${new Date(aidTime(r.aid)).toLocaleString()} · ${fmt(r.secs)}</small></div>
     <div style="text-align:right"><b>${r.score}/${r.total}</b> <small>(${pct(r)}%)</small><br><button class="link" data-a="${esc(r.aid)}" onclick="openRec(this.dataset.a)">Review</button></div></div>`).join('') + '</div>';
  return h;
}
function openRec(aid){
  const r = allRecs().find(x => x.aid === aid);
  if(!r) return;
  BACK = SESS && SESS.teacher ? 'teacher' : 'home'; LAST = r; view = 'result'; render();
}

