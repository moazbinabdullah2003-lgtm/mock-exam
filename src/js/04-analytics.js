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

/* প্রতি question-এ কত সময় গেছে (শুধু যেগুলোতে ≥1s ছিল): avg/max/accuracy */
function qTimeStats(recs){
  const m = {};
  recs.forEach(r => r.d.forEach(([i, c, ok, s]) => {
    if(!(s > 0)) return;
    const k = r.exam + '|' + i, o = m[k] = m[k] || {exam:r.exam, i, n:0, sum:0, max:0, ok:0};
    o.n++; o.sum += s; o.max = Math.max(o.max, s); if(c >= 0 && ok) o.ok++;
  }));
  return Object.values(m).filter(o => qinfo(o.exam, o.i)).map(o => ({...o, avg:o.sum / o.n}));
}
