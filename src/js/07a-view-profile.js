/* ---------- Student profile (teacher drill-down): activity, scores, strengths, weak points ---------- */
const pcol = p => p < 0.5 ? 'var(--r)' : p < 0.8 ? '#f59e0b' : 'var(--g)';
const dShort = aid => new Date(aidTime(aid)).toLocaleDateString(undefined, {day:'numeric', month:'short'});
const dLong = aid => new Date(aidTime(aid)).toLocaleString(undefined, {day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit'});
/* recent avg − earlier avg (in %-points); null if <2 attempts */
function trendOf(ps){
  const n = ps.length; if(n < 2) return null;
  const k = Math.min(3, n - 1);
  return avg(ps.slice(-k)) - avg(ps.slice(0, n - k));
}
const trendTag = d => d === null ? '–' : d >= 5 ? '<span style="color:var(--g)">▲ +' + d + '</span>' : d <= -5 ? '<span style="color:var(--r)">▼ ' + d + '</span>' : '<span class="muted">▬ ' + (d > 0 ? '+' : '') + d + '</span>';
function vProfile(sid){
  const all = allRecs(), recs = all.filter(r => norm(r.sid) === norm(sid));
  let h = '';
  if(remoteMsg) h += `<div class="warn">${esc(remoteMsg)}</div>`;
  const name = (recs[recs.length - 1] || {}).name || sid, guest = /^G-/i.test(String(sid));
  h += `<div class="card"><div class="row" style="margin:0"><div><h2 style="margin:0">${esc(name)}</h2><small class="muted">${guest ? 'Guest' : 'ID: ' + esc(sid)}</small></div><button class="btn ghost sm" onclick="refresh()">${loading ? 'Syncing…' : '↻ Refresh'}</button></div></div>`;
  if(!recs.length) return h + '<div class="card muted">এই student এখনো কোনো exam দেয়নি।</div>';

  const ps = recs.map(pct), n = recs.length;
  let ok = 0, wr = 0, sk = 0, qs = 0, qn = 0;
  recs.forEach(r => r.d.forEach(([i, c, k, s]) => { if(c < 0) sk++; else if(k) ok++; else wr++; if(s > 0){ qs += s; qn++; } }));
  const tot = ok + wr + sk, totSecs = recs.reduce((a, r) => a + r.secs, 0);
  const days = new Set(recs.map(r => new Date(aidTime(r.aid)).toDateString())).size;
  const tr = trendOf(ps);
  // class comparison + rank
  const bys = {}; all.forEach(r => { (bys[norm(r.sid)] = bys[norm(r.sid)] || []).push(pct(r)); });
  const avgs = Object.entries(bys).map(([s, a]) => [s, avg(a)]).sort((a, b) => b[1] - a[1]);
  const rank = avgs.findIndex(x => x[0] === norm(sid)) + 1, classAvg = avg(avgs.map(x => x[1]));
  const myAvg = avg(ps), PM = +CFG.rules.passMark || 0;
  const ts = topicStats(recs), cts = {}; topicStats(all).forEach(t => { cts[t.t] = t; });

  // ---- weak questions (latest attempt on that question was wrong/skipped), slow questions
  const qm = {};
  recs.forEach(r => r.d.forEach(([i, c, k, s]) => {
    const key = r.exam + '|' + i, o = qm[key] = qm[key] || {exam:r.exam, i, n:0, w:0, last:true, lc:-1, secs:0, sn:0};
    o.n++; if(c >= 0 && !k || c < 0) o.w++;
    o.last = !!k && c >= 0; o.lc = c; if(s > 0){ o.secs += s; o.sn++; }
  }));
  const weakQ = Object.values(qm).filter(o => !o.last && qinfo(o.exam, o.i)).sort((a, b) => b.w - a.w || b.n - a.n).slice(0, 10);
  const slowQ = Object.values(qm).filter(o => o.sn && qinfo(o.exam, o.i)).sort((a, b) => b.secs / b.sn - a.secs / a.sn).slice(0, 5);

  // ---- auto summary (plain sentences)
  const weakT = ts.filter(t => t.p < 0.8).slice(0, 3), strongT = ts.filter(t => t.p >= 0.8).slice(-3).reverse();
  const L = [];
  L.push(`Average <b>${myAvg}%</b> (class ${classAvg}%)${avgs.length > 1 ? ' · class-এ <b>' + rank + '/' + avgs.length + '</b> তম' : ''}.`);
  if(tr !== null) L.push(tr >= 5 ? `📈 উন্নতি হচ্ছে — সাম্প্রতিক attempt আগের চেয়ে ${tr}% ভালো।` : tr <= -5 ? `📉 নিচে নামছে — সাম্প্রতিক attempt আগের চেয়ে ${-tr}% খারাপ।` : '➖ Score মোটামুটি steady।');
  if(weakT.length) L.push(`⚠ দুর্বল topic: <b>${weakT.map(t => esc(t.t) + ' (' + Math.round(t.p * 100) + '%)').join(', ')}</b>`);
  if(strongT.length) L.push(`💪 শক্তিশালী topic: <b>${strongT.map(t => esc(t.t)).join(', ')}</b>`);
  if(tot && sk / tot > 0.15) L.push(`⏭ ${Math.round(sk / tot * 100)}% question skip করে — time management/confidence দেখো।`);
  if(n >= 2 && ps[n - 1] < ps[n - 2] - 10) L.push('🔻 শেষ attempt আগেরটার চেয়ে অনেক কম।');
  h += `<div class="card"><h2>📝 Summary</h2>${L.map(x => `<div style="margin:5px 0">${x}</div>`).join('')}</div>`;

  // ---- numbers
  h += `<div class="card"><div class="stats w">
    <div class="stat"><b>${n}</b><small>Attempts</small></div>
    <div class="stat"><b>${myAvg}%</b><small>Average</small></div>
    <div class="stat"><b>${Math.max(...ps)}%</b><small>Best</small></div>
    <div class="stat"><b>${Math.min(...ps)}%</b><small>Lowest</small></div>
    <div class="stat"><b>${ps[n - 1]}%</b><small>Latest</small></div>
    <div class="stat"><b>${trendTag(tr)}</b><small>Trend</small></div>
    ${PM ? `<div class="stat"><b>${ps.filter(p => p >= PM).length}/${n}</b><small>Passed (≥${PM}%)</small></div>` : ''}
    <div class="stat"><b>${days}</b><small>Active days</small></div>
    <div class="stat"><b>${fmt(totSecs)}</b><small>Total time</small></div>
  </div>
  <div class="trow" style="grid-template-columns:70px 1fr 90px"><span>Answers</span><div class="bar" style="display:flex"><i style="width:${tot ? ok / tot * 100 : 0}%;background:var(--g)"></i><i style="width:${tot ? wr / tot * 100 : 0}%;background:var(--r)"></i><i style="width:${tot ? sk / tot * 100 : 0}%;background:#9ca3af"></i></div><small>✔${ok} ✘${wr} ⏭${sk}</small></div>
  <small class="muted">প্রথম attempt: ${dLong(recs[0].aid)} · শেষ: ${dLong(recs[n - 1].aid)}${qn ? ' · গড় ' + Math.round(qs / qn) + ' sec/question' : ''}</small>
  <h3>Score trend (last ${Math.min(15, n)})</h3>
  <div class="tr">${ps.slice(-15).map((p, i) => `<div style="height:${Math.max(4, Math.min(100, p))}%;background:${pcol(p / 100)}" title="${esc(dShort(recs.slice(-15)[i].aid))}: ${p}%"></div>`).join('')}</div>
  <div class="row" style="margin:2px 0 0"><small class="muted">${dShort(recs.slice(-15)[0].aid)}</small><small class="muted">${dShort(recs[n - 1].aid)}</small></div></div>`;

  // ---- per exam
  const ex = {}; recs.forEach(r => { (ex[r.exam] = ex[r.exam] || []).push(r); });
  h += `<div class="card"><h2>📚 Exam-wise</h2><div class="scroll"><table><tr><th>Exam</th><th>Att.</th><th>Avg</th><th>Best</th><th>Last</th><th>Trend</th><th>Last date</th></tr>
    ${Object.entries(ex).map(([c, rs]) => { const p = rs.map(pct); return `<tr><td>${esc(c)}</td><td>${rs.length}</td><td class="h" style="background:${heat(avg(p) / 100)}">${avg(p)}%</td><td>${Math.max(...p)}%</td><td>${p[p.length - 1]}%</td><td>${trendTag(trendOf(p))}</td><td>${esc(dShort(rs[rs.length - 1].aid))}</td></tr>`; }).join('')}</table></div></div>`;

  // ---- topics (strong / weak) vs class
  h += `<div class="card"><h2>🎯 Topic-wise (weakest first)</h2>${ts.map(t => {
    const c = cts[t.t], tag = t.p < 0.5 ? '<span class="tag" style="background:#fee2e2;color:#b91c1c">Weak</span>' : t.p < 0.8 ? '<span class="tag" style="background:#fef3c7;color:#b45309">Improve</span>' : '<span class="tag" style="background:#dcfce7;color:#15803d">Strong</span>';
    return `<div class="trow" style="grid-template-columns:1fr 80px 46px"><span>${esc(t.t)} ${tag}<br><small class="muted">${t.ok}/${t.n} সঠিক${c ? ' · class ' + Math.round(c.p * 100) + '%' : ''}</small></span><div class="bar"><i style="width:${Math.round(t.p * 100)}%;background:${pcol(t.p)}"></i></div><b>${Math.round(t.p * 100)}%</b></div>`;
  }).join('') || '<div class="muted">Topic data নেই</div>'}</div>`;

  // ---- weak questions
  h += `<div class="card"><h2>❌ এখনো ভুল করছে (${weakQ.length})</h2>${weakQ.length ? '' : '<div class="muted">সব question-এর সর্বশেষ উত্তর ঠিক 👍</div>'}${weakQ.map(o => {
    const q = qinfo(o.exam, o.i);
    return `<div class="hist" style="display:block"><div class="muted">${esc(o.exam)} · ${esc(q.t || 'General')} · ${o.n} বারের মধ্যে ${o.w} বার ভুল/skip</div>
      <div>${esc(q.q)}</div><small>সঠিক: <b>${LET[q.a]}</b>. ${esc(q.o[q.a] || '')}${o.lc >= 0 ? ' · সে দিয়েছে: <b>' + LET[o.lc] + '</b>' : ' · skip করেছে'}</small></div>`;
  }).join('')}</div>`;
  if(slowQ.length) h += `<div class="card"><h2>🐢 সবচেয়ে বেশি সময় নেয়</h2>${slowQ.map(o => { const q = qinfo(o.exam, o.i); return `<div class="hist" style="display:block"><div class="muted">${esc(o.exam)} · ${esc(q.t || 'General')} · গড় ${Math.round(o.secs / o.sn)} sec${o.sn > 1 ? ' (' + o.sn + ' বার)' : ''}</div><div>${esc(q.q)}</div></div>`; }).join('')}</div>`;

  // ---- full activity log
  h += `<div class="card"><h2>🕒 সব Activity (${n})</h2>` + recs.slice().reverse().map(r => {
    let a = 0, b = 0, c = 0; r.d.forEach(([i, ch, k]) => { if(ch < 0) c++; else if(k) a++; else b++; });
    const p = pct(r);
    return `<div class="hist"><div><b>${esc(r.exam)}</b>${r.mode === 'mistakes' ? '<span class="tag">mistakes</span>' : ''}<br><small>${esc(dLong(r.aid))} · ${fmt(r.secs)}</small><br><small>✔${a} ✘${b} ⏭${c}</small></div>
      <div style="text-align:right"><b>${r.score}/${r.total}</b> <small style="color:${pcol(p / 100)}">(${p}%)</small><br><button class="link" data-a="${esc(r.aid)}" onclick="openRec(this.dataset.a)">Review</button></div></div>`;
  }).join('') + '</div>';
  return h;
}
