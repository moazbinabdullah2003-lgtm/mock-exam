/* ---------- ⏱ Time analytics block (used on every analytics page) ----------
   Time per question = how long the student stayed on that question screen (counted in background, d[k][3] secs).
   vTimeBlock(recs, id, {cmp: classRecs, stu: true})  → one fold with: summary, topic-wise, question-wise (per exam, slowest first), student-wise */
const secS = s => s >= 60 ? Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's' : Math.round(s) + 's';
function topicTime(recs){
  const m = {};
  recs.forEach(r => r.d.forEach(([i, c, ok, s]) => {
    if(!(s > 0)) return;
    const q = qinfo(r.exam, i), t = (q && q.t) || 'General', o = m[t] = m[t] || {t, n:0, sum:0, ok:0};
    o.n++; o.sum += s; if(c >= 0 && ok) o.ok++;
  }));
  return Object.values(m).map(o => ({...o, avg:o.sum / o.n})).sort((a, b) => b.avg - a.avg);
}
function stuTime(recs){
  const m = {};
  recs.forEach(r => {
    const o = m[norm(r.sid)] = m[norm(r.sid)] || {sid:norm(r.sid), name:r.name, n:0, sum:0, recs:[]};
    o.name = r.name; o.recs.push(r);
    r.d.forEach(([i, c, ok, s]) => { if(s > 0){ o.n++; o.sum += s; } });
  });
  return Object.values(m).filter(o => o.n).map(o => { const tt = topicTime(o.recs); return {...o, avg:o.sum / o.n, slow:tt[0], fast:tt[tt.length - 1]}; }).sort((a, b) => b.avg - a.avg);
}
function vTimeBlock(recs, id, opt){
  opt = opt || {};
  const qt = qTimeStats(recs);
  if(!qt.length) return sec(id, '⏱ Time analytics', '<div class="muted">এখনো সময়ের data নেই।</div>');
  const tot = qt.reduce((a, o) => a + o.sum, 0), cnt = qt.reduce((a, o) => a + o.n, 0), overall = tot / cnt;
  const cq = {}, ct = {};
  if(opt.cmp){ qTimeStats(opt.cmp).forEach(o => { cq[o.exam + '|' + o.i] = o.avg; }); topicTime(opt.cmp).forEach(o => { ct[o.t] = o.avg; }); }
  const vs = (me, cl) => cl ? ` <small class="muted">(class ${secS(cl)}${me > cl * 1.3 ? ' · <b style="color:var(--r)">ধীর</b>' : me < cl * 0.7 ? ' · <b style="color:var(--g)">দ্রুত</b>' : ''})</small>` : '';
  const bar = (v, mx, c) => `<div class="tbar"><i style="width:${Math.max(3, Math.round(v / (mx || 1) * 100))}%;${c ? 'background:' + c : ''}"></i></div>`;

  // topic-wise
  const tt = topicTime(recs), tmx = tt[0].avg;
  const tHtml = tt.map(o => `<div style="margin:10px 0"><div class="row" style="margin:0"><span>${esc(o.t)} <small>${Math.round(o.ok / o.n * 100)}% সঠিক</small></span><b>${secS(o.avg)}<small class="muted"> /Q</small></b></div>${bar(o.avg, tmx, o.avg > overall * 1.3 ? '#f59e0b' : '')}<small class="muted">মোট ${secS(o.sum)} (${Math.round(o.sum / tot * 100)}% সময়)</small>${vs(o.avg, ct[o.t])}</div>`).join('');

  // question-wise, each exam separately, slowest first
  const byEx = {}; qt.forEach(o => { (byEx[o.exam] = byEx[o.exam] || []).push(o); });
  const qHtml = Object.entries(byEx).map(([ex, list]) => {
    list.sort((a, b) => b.avg - a.avg);
    const mx = list[0].avg, eAvg = list.reduce((a, o) => a + o.avg, 0) / list.length;
    return `<h3>${esc(ex)} <small>· ${list.length} Q · গড় ${secS(eAvg)}/Q · সবচেয়ে ধীর আগে</small></h3>` + list.map((o, k) => {
      const q = qinfo(o.exam, o.i), a = o.ok / o.n, slow = o.avg > eAvg * 1.5;
      return `<div class="hist" style="display:block;padding:8px 0"><div class="row" style="margin:0"><span><b>${k + 1}.</b> Q${o.i + 1} <small>${esc(q.t || '')}</small>${slow ? '<span class="tag" style="background:#fef3c7;color:#b45309">বেশি সময়</span>' : ''}</span><b>${secS(o.avg)}</b></div>
        <div style="font-size:14px">${esc(q.q)}</div>${bar(o.avg, mx, slow ? (a < 0.5 ? 'var(--r)' : '#f59e0b') : '')}
        <small class="muted">${Math.round(a * 100)}% সঠিক · ${o.n} বার${o.n > 1 ? ' · max ' + secS(o.max) : ''}${slow ? (a < 0.5 ? ' · 🔴 কঠিন/confusing' : a >= 0.8 ? ' · 🟡 lengthy কিন্তু পারে' : '') : ''}</small>${vs(o.avg, cq[o.exam + '|' + o.i])}</div>`;
    }).join('');
  }).join('');

  // student-wise
  let sHtml = '';
  if(opt.stu){
    const st = stuTime(recs), smx = st.length ? st[0].avg : 1;
    sHtml = sec(id + '_s', '👥 Student-wise time', `<div class="scroll"><table><tr><th>Name</th><th>গড়/Q</th><th></th><th>মোট</th><th>ধীর topic</th><th>দ্রুত topic</th></tr>
      ${st.map(s => `<tr class="click" data-s="${esc(s.sid)}" onclick="openStu(this.dataset.s)"><td><b>${esc(s.name)}</b> <small>${esc(s.sid)}</small></td><td><b>${secS(s.avg)}</b></td><td style="min-width:70px">${bar(s.avg, smx, s.avg > overall * 1.3 ? '#f59e0b' : '')}</td><td>${secS(s.sum)}</td><td>${s.slow ? esc(s.slow.t) + ' ' + secS(s.slow.avg) : '–'}</td><td>${s.fast && s.fast !== s.slow ? esc(s.fast.t) + ' ' + secS(s.fast.avg) : '–'}</td></tr>`).join('')}
      </table></div><small class="muted">সবচেয়ে ধীর student উপরে · নামে tap করলে profile</small>`, st.length + '');
  }
  const body = `<div class="tiles">${tile(secS(overall), 'গড় সময় / question')}${tile(secS(tot), 'মোট সময়')}${tile(tt[0] ? esc(tt[0].t) : '–', 'সবচেয়ে ধীর topic', '#f59e0b')}</div>
    <small class="muted">Student কোন question screen-এ কতক্ষণ ছিল — background-এ গোনা হয়।</small>
    ${sec(id + '_t', '🎯 Topic-wise time', tHtml, tt.length + ' topic')}
    ${sec(id + '_q', '❓ Question-wise time (exam অনুযায়ী, ধীর আগে)', qHtml, qt.length + ' Q')}
    ${sHtml}`;
  return sec(id, '⏱ Time analytics', body, 'গড় ' + secS(overall) + '/Q');
}
