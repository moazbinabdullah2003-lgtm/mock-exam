/* ---------- Teacher: one exam's analytics (general + student-wise). Opened from Exams tab ---------- */
let EXA = null;   // exam code being viewed
async function openExA(code){
  EXA = code; TSTU = null; render();
  if(!EXAMS[code]){ await getExam(code); render(true); }
}
function vExamAnalytics(code){
  const e = EXAMS[code], meta = (EXL || []).find(x => x.code === code) || {};
  const all = rng(allRecs()).filter(r => r.exam === code), recs = all.filter(r => r.mode !== 'mistakes');
  const PM = +CFG.rules.passMark || 0;
  let h = `<div class="top"><button class="link" onclick="EXA=null;render()">← Exams</button><button class="btn ghost sm" onclick="refresh()">${loading ? 'Syncing…' : '↻ Refresh'}</button></div>
    <div class="card"><div class="muted">${esc(code)}</div><h2 style="font-size:22px;margin:2px 0">${esc((e && e.title) || meta.title || code)}</h2>
    <small>${e ? e.questions.length + ' questions · ' + e.minutes + ' min' + (e.neg ? ' · negative ' + e.neg : '') : ''}${meta.open === false ? ' · closed' : ''}</small></div>`;
  h += vRange({e:code}, allRaw().filter(r => r.exam === code));
  if(e) h += aiHint('সঠিক উত্তর আর আমাদের solution ') + `<button class="btn full" data-c="${esc(code)}" onclick="copyExam(this.dataset.c,-1,this)">📋 Copy full exam for AI</button><small class="muted">প্রতিটা question আলাদা copy: নিচে ❓ Question-wise খুলে 📋</small></div>`;
  h += vExitDash(code);
  if(!recs.length) return h + (allRecs().some(r => r.exam === code) ? vNoneInRange() : '<div class="card muted center">এই exam এখনো কেউ দেয়নি।</div>');

  const ps = recs.map(pct), bys = {};
  recs.forEach(r => { (bys[norm(r.sid)] = bys[norm(r.sid)] || []).push(r); });
  const nStu = Object.keys(bys).length, avgSecs = Math.round(recs.reduce((a, r) => a + r.secs, 0) / recs.length);
  h += `<div class="tiles">${tile(nStu, 'Students')}${tile(recs.length, 'Attempts')}${tile(avg(ps) + '%', 'Average')}${tile(Math.max(...ps) + '%', 'Highest', 'var(--g)')}${tile(Math.min(...ps) + '%', 'Lowest', 'var(--r)')}${PM ? tile(Math.round(ps.filter(p => p >= PM).length / ps.length * 100) + '%', 'Pass (≥' + PM + '%)') : tile(fmt(avgSecs), 'Avg time')}</div>`;

  // ---- student-wise ranking (by best score)
  const st = Object.entries(bys).map(([sid, rs]) => {
    const p = rs.map(pct), bi = p.indexOf(Math.max(...p));
    return {sid, name:rs[rs.length - 1].name, n:rs.length, first:p[0], best:p[bi], last:p[p.length - 1], bs:rs[bi].score, total:rs[bi].total, secs:rs[bi].secs, aid:rs[rs.length - 1].aid};
  }).sort((a, b) => b.best - a.best || a.secs - b.secs);
  const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1);
  h += `<div class="card"><h2>👥 Student-wise (কে কেমন করল)</h2><div class="scroll"><table>
    <tr><th>#</th><th>Name</th><th>Best</th><th>Score</th><th>1st try</th><th>Last</th><th>Att.</th><th>Time</th><th></th><th></th></tr>
    ${st.map((s, i) => `<tr class="click" data-s="${esc(s.sid)}" onclick="openStu(this.dataset.s)"><td>${medal(i)}</td><td><b>${esc(s.name)}</b> <small>${esc(s.sid)}</small></td>
      <td class="h" style="background:${heat(s.best / 100)}">${s.best}%</td><td>${s.bs}/${s.total}</td><td>${s.first}%</td><td>${s.last}%</td><td>${s.n}</td><td>${fmt(s.secs)}</td>
      <td><button class="link" data-a="${esc(s.aid)}" onclick="event.stopPropagation();openRec(this.dataset.a)">Review</button></td><td>${editBtn({s:s.sid, e:code})}</td></tr>`).join('')}
  </table></div><small class="muted">Best score অনুযায়ী সাজানো (সমান হলে কম সময় আগে)। নামে tap করলে full profile।${all.length > recs.length ? ' "Retake mistakes" attempt এখানে গোনা হয়নি।' : ''}</small></div>`;

  // ---- general analytics (folds)
  const bk = [0, 0, 0, 0, 0]; ps.forEach(p => bk[Math.min(4, Math.floor(p / 20))]++);
  const mx = Math.max(...bk) || 1, lab = ['0–19%', '20–39%', '40–59%', '60–79%', '80–100%'], col = ['var(--r)', '#f97316', '#f59e0b', '#84cc16', 'var(--g)'];
  h += sec('ea_dist', '📊 Score distribution', bk.map((c, i) => `<div class="trow" style="grid-template-columns:70px 1fr 40px"><span>${lab[i]}</span><div class="bar"><i style="width:${c / mx * 100}%;background:${col[i]}"></i></div><b>${c}</b></div>`).join('') + '<small class="muted">কতগুলো attempt কোন range-এ</small>');

  const ts = topicStats(recs);
  h += sec('ea_topic', '🎯 Topic-wise', ts.map(t => `<div class="trow"><span>${esc(t.t)} <small>${t.ok}/${t.n}</small></span><div class="bar"><i style="width:${Math.round(t.p*100)}%;background:${pcol(t.p)}"></i></div><b>${Math.round(t.p*100)}%</b></div>`).join(''), ts.length + ' topic');

  h += vTimeBlock(recs, 'ea_time', {stu:true});
  if(e){
    const qs = e.questions.map((q, i) => ({i, q, n:0, ok:0, wr:0, sk:0, secs:0, sn:0, pick:{}}));
    recs.forEach(r => r.d.forEach(([i, c, ok, s]) => { const o = qs[i]; if(!o) return; o.n++; if(c < 0) o.sk++; else if(ok) o.ok++; else { o.wr++; o.pick[c] = (o.pick[c] || 0) + 1; } if(s > 0){ o.secs += s; o.sn++; } }));
    const seen = qs.filter(o => o.n), byAcc = seen.slice().sort((a, b) => a.ok / a.n - b.ok / b.n);
    const hardSet = new Set(byAcc.slice(0, 3).filter(o => o.ok / o.n < 0.6).map(o => o.i)), easySet = new Set(byAcc.slice(-3).filter(o => o.ok / o.n >= 0.9).map(o => o.i));
    h += sec('ea_q', '❓ Question-wise', seen.map(o => {
      const a = o.ok / o.n, top = Object.entries(o.pick).sort((x, y) => y[1] - x[1])[0];
      return `<div class="hist" style="display:block"><div class="row" style="margin:0"><span><b>Q${o.i + 1}</b> <small>${esc(o.q.t || '')}</small>${hardSet.has(o.i) ? '<span class="tag" style="background:#fee2e2;color:#b91c1c">Hardest</span>' : ''}${easySet.has(o.i) ? '<span class="tag" style="background:#dcfce7;color:#15803d">Easy</span>' : ''}</span><span style="white-space:nowrap"><button class="btn sm ghost" data-c="${esc(code)}" onclick="copyExam(this.dataset.c,${o.i},this)">📋</button> <b style="color:${pcol(a)}">${Math.round(a * 100)}%</b></span></div>
        <div>${esc(o.q.q)}</div>
        <div class="bar" style="display:flex;margin:6px 0"><i style="width:${a * 100}%;background:var(--g)"></i><i style="width:${o.wr / o.n * 100}%;background:var(--r)"></i><i style="width:${o.sk / o.n * 100}%;background:#9ca3af"></i></div>
        <small class="muted">✔${o.ok} ✘${o.wr} ⏭${o.sk} · সঠিক: ${LET[o.q.a]}${top ? ' · বেশি দেওয়া ভুল: ' + LET[top[0]] + ' (' + top[1] + ')' : ''}${o.sn ? ' · গড় ' + Math.round(o.secs / o.sn) + 's' : ''}</small></div>`;
    }).join(''), seen.length + ' Q');

    // student × question grid (latest full attempt of each student)
    h += sec('ea_grid', '🟩 Student × Question', `<div class="scroll"><table><tr><th>Student</th>${e.questions.map((_, i) => `<th>Q${i + 1}</th>`).join('')}</tr>
      ${st.map(s => { const r = bys[s.sid][bys[s.sid].length - 1], m = {}; r.d.forEach(([i, c, ok]) => { m[i] = c < 0 ? '–' : ok ? '✔' : '✘'; });
        return `<tr><td>${esc(s.name)}</td>${e.questions.map((_, i) => `<td class="h" style="background:${m[i] === '✔' ? 'var(--gl)' : m[i] === '✘' ? 'var(--rl)' : 'transparent'}">${m[i] || ''}</td>`).join('')}</tr>`; }).join('')}
    </table></div><small class="muted">প্রত্যেকের শেষ attempt · ✔ সঠিক ✘ ভুল – skip</small>`);
  }
  return h;
}
