/* ---------- Teacher ---------- */
function openStu(sid){ TSTU = sid; render(); }
function vTeacher(){
  if(EDX) return vExamEditor();
  if(EXA && !TSTU) return vExamAnalytics(EXA);
  if(TSTU) return `<div class="top"><button class="link" onclick="TSTU=null;render()">← All students</button></div>` + vProfile(TSTU);
  let recs = allRecs();
  if(TF) recs = recs.filter(r => r.exam === TF);
  const exams = [...new Set(allRecs().map(r => r.exam))];
  const by = {};
  recs.forEach(r => { (by[norm(r.sid)] = by[norm(r.sid)] || []).push(r); });
  const rows = Object.entries(by).map(([sid, rs]) => {
    const ps = rs.map(pct), ts = topicStats(rs);
    return {sid, name:rs[rs.length-1].name, n:rs.length, avg:avg(ps), best:Math.max(...ps), last:ps[ps.length-1], tr:trendOf(ps), weak:ts[0] ? ts[0].t : '-', ts};
  }).sort((a,b) => a.avg - b.avg);
  const topics = topicStats(recs);
  const qs = {};
  recs.forEach(r => r.d.forEach(([i,c,ok]) => {
    const k = r.exam + '|' + i, o = qs[k] = qs[k] || {exam:r.exam, i, n:0, ok:0, pick:{}};
    o.n++; o.ok += ok ? 1 : 0;
    if(c >= 0 && !ok) o.pick[c] = (o.pick[c] || 0) + 1;
  }));
  const hard = Object.values(qs).filter(o => qinfo(o.exam, o.i)).sort((a,b) => a.ok/a.n - b.ok/b.n).slice(0, 10);
  const hd = `<div class="top"><b>${esc(CFG.brand.emoji)} Teacher</b><span style="white-space:nowrap"><button class="btn sm ghost" onclick="asTestStudent()">🎓 Test student</button> <button class="link" onclick="logout()">Logout</button></span></div>${TSTMSG ? `<div class="warn">${esc(TSTMSG)}</div>` : ''}${vTabs()}`;
  if(TTAB === 'set') return hd + vSettings();
  if(TTAB === 'stu') return hd + vStudents();
  if(TTAB === 'exams') return hd + banner() + vExams();
  const cAvg = avg(rows.map(r => r.avg)), need = rows.filter(r => r.avg < 60).slice(0, 3);
  return `${hd}
  ${banner()}${remoteMsg ? `<div class="warn">${esc(remoteMsg)}</div>` : ''}
  <div class="row" style="margin:6px 0"><select id="tf" style="width:auto;flex:1;margin:0" onchange="TF=this.value;render(true)">
      <option value="">All exams</option>${exams.map(c => `<option ${c===TF?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
      <button class="btn ghost sm" onclick="refresh()">${loading ? 'Syncing…' : '↻ Refresh'}</button><button class="btn ghost sm" onclick="exportCSV()">⬇ CSV</button></div>
  <div class="tiles">${tile(rows.length, 'Students')}${tile(recs.length, 'Attempts')}${tile(cAvg + '%', 'Class average')}${tile((EXL || []).length || exams.length, 'Exams')}</div>
  ${!recs.length ? '<div class="card muted center">এখনো কোনো data নেই।</div>' : `
  ${need.length ? `<div class="card"><b>⚠ মনোযোগ দরকার</b>${need.map(r => `<div class="hist click" style="cursor:pointer" data-s="${esc(r.sid)}" onclick="openStu(this.dataset.s)"><span>${esc(r.name)} <small>${esc(r.sid)}</small></span><b style="color:var(--r)">${r.avg}% ›</b></div>`).join('')}</div>` : ''}
  ${sec('d_stu', '👥 Students (weakest first)', `<div class="scroll"><table>
    <tr><th>ID</th><th>Name</th><th>Att.</th><th>Avg</th><th>Best</th><th>Last</th><th>Trend</th><th>Weak topic</th></tr>
    ${rows.map(r => `<tr class="click" data-s="${esc(r.sid)}" onclick="openStu(this.dataset.s)"><td>${esc(r.sid)}</td><td>${esc(r.name)}</td><td>${r.n}</td><td class="h" style="background:${heat(r.avg/100)}">${r.avg}%</td><td>${r.best}%</td><td>${r.last}%</td><td>${trendTag(r.tr)}</td><td>${esc(r.weak)}</td></tr>`).join('')}
  </table></div><small>Row-এ tap করলে ওই student-এর full profile</small>`, rows.length + '')}
  ${sec('d_topic', '📊 Class topic accuracy', topics.map(t => `<div class="trow"><span>${esc(t.t)} <small>${t.ok}/${t.n}</small></span><div class="bar"><i style="width:${Math.round(t.p*100)}%;background:${t.p<0.5?'var(--r)':t.p<0.8?'#f59e0b':'var(--g)'}"></i></div><b>${Math.round(t.p*100)}%</b></div>`).join(''), topics.length + ' topic')}
  ${sec('d_heat', '🟩 Student × Topic heatmap', `<div class="scroll"><table>
    <tr><th>Student</th>${topics.map(t => `<th>${esc(t.t)}</th>`).join('')}</tr>
    ${rows.map(r => { const m = {}; r.ts.forEach(t => m[t.t] = t); return `<tr><td>${esc(r.name)}</td>${topics.map(t => m[t.t] ? `<td class="h" style="background:${heat(m[t.t].p)}">${Math.round(m[t.t].p*100)}</td>` : '<td class="h">–</td>').join('')}</tr>`; }).join('')}
  </table></div>`)}
  ${vTimeCard(recs)}
  ${sec('d_hard', '❌ সবচেয়ে বেশি ভুল হওয়া Questions', hard.map(o => {
    const q = qinfo(o.exam, o.i), top = Object.entries(o.pick).sort((a,b) => b[1]-a[1])[0];
    return `<div class="hist" style="display:block"><div class="muted">${esc(o.exam)} · ${esc(q.t || '')} · ${Math.round(o.ok/o.n*100)}% correct (${o.ok}/${o.n})</div>
      <div>${esc(q.q)}</div><small>সঠিক: ${LET[q.a]}${top ? ' · সবাই বেশি দিয়েছে ভুল: ' + LET[top[0]] : ''}</small></div>`;
  }).join(''), hard.length + '')}`}`;
}

/* ⏱ time analytics (general + student-wise) */
const vTimeCard = recs => vTimeBlock(recs, 'd_time', {stu:true});
