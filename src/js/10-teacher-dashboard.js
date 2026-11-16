/* ---------- Teacher ---------- */
function openStu(sid){ TSTU = sid; render(); }
function vTeacher(){
  if(EDX) return vExamEditor();
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
  const hd = `<div class="top"><b>👩‍🏫 Teacher</b><span><button class="btn sm ghost" onclick="asTestStudent()">🎓 Test student</button> <button class="link" onclick="logout()">Logout</button></span></div>${TSTMSG ? `<div class="warn">${esc(TSTMSG)}</div>` : ''}${vTabs()}`;
  if(TTAB === 'set') return hd + vSettings();
  if(TTAB === 'stu') return hd + vStudents();
  if(TTAB === 'exams') return hd + banner() + vExams();
  return `${hd}
  ${banner()}${remoteMsg ? `<div class="warn">${esc(remoteMsg)}</div>` : ''}
  <div class="card"><div class="row" style="margin:0"><select id="tf" style="width:auto;flex:1" onchange="TF=this.value;render(true)">
      <option value="">All exams</option>${exams.map(c => `<option ${c===TF?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
      <button class="btn ghost sm" onclick="refresh()">${loading ? 'Syncing…' : '↻ Refresh'}</button><button class="btn ghost sm" onclick="exportCSV()">⬇ CSV</button></div>
    <small>${recs.length} attempts · ${rows.length} students</small></div>
  ${!recs.length ? '<div class="card muted">এখনো কোনো data নেই।</div>' : `
  <div class="card"><h2>Students (weakest first)</h2><div class="scroll"><table>
    <tr><th>ID</th><th>Name</th><th>Att.</th><th>Avg</th><th>Best</th><th>Last</th><th>Trend</th><th>Weak topic</th></tr>
    ${rows.map(r => `<tr class="click" data-s="${esc(r.sid)}" onclick="openStu(this.dataset.s)"><td>${esc(r.sid)}</td><td>${esc(r.name)}</td><td>${r.n}</td><td class="h" style="background:${heat(r.avg/100)}">${r.avg}%</td><td>${r.best}%</td><td>${r.last}%</td><td>${trendTag(r.tr)}</td><td>${esc(r.weak)}</td></tr>`).join('')}
  </table></div><small>Row-এ tap করলে ওই student-এর full profile</small></div>
  <div class="card"><h2>Class topic accuracy</h2>${topics.map(t => `<div class="trow"><span>${esc(t.t)} <small>${t.ok}/${t.n}</small></span><div class="bar"><i style="width:${Math.round(t.p*100)}%;background:${t.p<0.5?'var(--r)':t.p<0.8?'#f59e0b':'var(--g)'}"></i></div><b>${Math.round(t.p*100)}%</b></div>`).join('')}</div>
  <div class="card"><h2>Student × Topic heatmap</h2><div class="scroll"><table>
    <tr><th>Student</th>${topics.map(t => `<th>${esc(t.t)}</th>`).join('')}</tr>
    ${rows.map(r => { const m = {}; r.ts.forEach(t => m[t.t] = t); return `<tr><td>${esc(r.name)}</td>${topics.map(t => m[t.t] ? `<td class="h" style="background:${heat(m[t.t].p)}">${Math.round(m[t.t].p*100)}</td>` : '<td class="h">–</td>').join('')}</tr>`; }).join('')}
  </table></div></div>
  <div class="card"><h2>সবচেয়ে বেশি ভুল হওয়া Questions</h2>${hard.map(o => {
    const q = qinfo(o.exam, o.i), top = Object.entries(o.pick).sort((a,b) => b[1]-a[1])[0];
    return `<div class="hist" style="display:block"><div class="muted">${esc(o.exam)} · ${esc(q.t || '')} · ${Math.round(o.ok/o.n*100)}% correct (${o.ok}/${o.n})</div>
      <div>${esc(q.q)}</div><small>সঠিক: ${LET[q.a]}${top ? ' · সবাই বেশি দিয়েছে ভুল: ' + LET[top[0]] : ''}</small></div>`;
  }).join('')}</div>`}`;
}

