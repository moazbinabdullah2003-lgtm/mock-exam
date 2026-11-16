/* ============================================================
   Analytics
   ============================================================ */
const qinfo = (exam, i) => EXAMS[exam] && EXAMS[exam].questions[i];
function topicStats(recs){
  const m = {};
  recs.forEach(r => r.d.forEach(([i,c,ok]) => {
    const q = qinfo(r.exam, i), t = (q && q.t) || 'General';
    const o = m[t] = m[t] || {t, n:0, ok:0};
    o.n++; o.ok += ok ? 1 : 0;
  }));
  return Object.values(m).map(x => ({...x, p: x.ok / x.n})).sort((a,b) => a.p - b.p);
}
function wrongIdx(sid, exam){
  const st = {};
  allRecs().filter(r => norm(r.sid) === norm(sid) && r.exam === exam).forEach(r => r.d.forEach(([i,c,ok]) => { st[i] = ok; }));
  return Object.keys(st).filter(i => !st[i]).map(Number);
}

