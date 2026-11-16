/* ============================================================
   🚪 Exit report (teacher): student exam বাতিল করে বের হলে (mode 'exit') কখন, কতটা উত্তর দিয়েছিল, কত সময় পরে —
   dashboard, exam analytics আর student profile-এ। ফাঁকি সন্দেহ হলে ⚠ flag।
   ============================================================ */
function exitInfo(r){
  const d = r.d || [], ans = d.filter(x => x[1] >= 0), seen = d.filter(x => x[3] > 0 || x[1] >= 0);
  const t = aidTime(r.aid);
  // একই exam পরে submit করেছে কিনা (exit-এর পরে আসল attempt)
  const later = allRecs().filter(x => norm(x.sid) === norm(r.sid) && x.exam === r.exam && aidTime(x.aid) > t);
  const before = allExits().filter(x => norm(x.sid) === norm(r.sid) && x.exam === r.exam && aidTime(x.aid) <= t).length;   // এটা কত নম্বর exit (এই exam-এ)
  const flags = [];
  if(later.length) flags.push('exit-এর পরে একই exam submit করেছে' + (later[0] ? ' (' + pct(later[0]) + '%)' : ''));
  if(before >= 2) flags.push('এই exam-এ ' + before + ' নম্বর exit');
  if(d.length && seen.length >= Math.max(2, Math.ceil(d.length * 0.5))) flags.push(seen.length + '/' + d.length + 'টা question দেখে ফেলেছিল');
  if(ans.length && ans.length >= Math.ceil(d.length * 0.5)) flags.push('অর্ধেকের বেশি উত্তর দিয়ে বের হয়েছে');
  return {t, total:d.length || r.total, answered:ans.length, correct:ans.filter(x => x[2]).length, seen:seen.length, secs:r.secs,
    reached:d.reduce((m, x, i) => x[3] > 0 || x[1] >= 0 ? i + 1 : m, 0), mistakes:r.mode === 'exit-mistakes', later:later.length, flags};
}
const exitWhen = t => new Date(t).toLocaleString(undefined, {day:'numeric', month:'short', hour:'numeric', minute:'2-digit'});
/* টেবিল: who = student কলাম দেখাবে, ex = exam কলাম দেখাবে */
function vExitTable(list, who, ex){
  if(!list.length) return '<div class="muted">কোনো exit নেই 👍</div>';
  return `<div class="scroll"><table>
    <tr><th>কখন</th>${who ? '<th>Student</th>' : ''}${ex ? '<th>Exam</th>' : ''}<th>উত্তর দিয়েছিল</th><th>সঠিক</th><th>দেখেছিল</th><th>কত পরে exit</th><th>⚠</th></tr>
    ${list.slice().sort((a, b) => aidTime(b.aid) - aidTime(a.aid)).map(r => { const x = exitInfo(r);
      return `<tr ${who ? `class="click" data-s="${esc(norm(r.sid))}" onclick="openStu(this.dataset.s)"` : ''}><td>${esc(exitWhen(x.t))}</td>${who ? `<td><b>${esc(r.name)}</b> <small>${esc(r.sid)}</small></td>` : ''}${ex ? `<td>${esc(r.exam)}${x.mistakes ? ' <span class="tag">mistakes</span>' : ''}</td>` : ''}
        <td><b>${x.answered}</b>/${x.total}</td><td>${x.correct}</td><td>${x.seen}/${x.total}</td><td>${fmt(x.secs)}</td>
        <td style="min-width:210px">${x.flags.length ? `<span style="color:var(--r)" title="${esc(x.flags.join(' · '))}">⚠ ${x.flags.length}</span><br><small>${x.flags.map(esc).join('<br>')}</small>` : '<small class="muted">–</small>'}</td></tr>`; }).join('')}
  </table></div>`;
}
/* student-wise summary: কে কতবার exit করেছে */
function exitBySt(list){
  const m = {};
  list.forEach(r => { const k = norm(r.sid), o = m[k] = m[k] || {sid:k, name:r.name, n:0, exams:{}, flagged:0, last:0};
    o.n++; o.exams[r.exam] = (o.exams[r.exam] || 0) + 1; o.name = r.name; o.last = Math.max(o.last, aidTime(r.aid)); if(exitInfo(r).flags.length) o.flagged++; });
  return Object.values(m).sort((a, b) => b.flagged - a.flagged || b.n - a.n);
}
/* dashboard section */
function vExitDash(exam){
  const list = allExits().filter(r => !exam || r.exam === exam);
  const st = exitBySt(list), fl = list.filter(r => exitInfo(r).flags.length).length;
  const body = !list.length ? '<div class="muted">কেউ এখনো exam বাতিল করে বের হয়নি 👍</div>' :
    `<small class="muted">Student exam-এর মাঝে "বাতিল করে বের হও" চাপলে এখানে আসে (attempt হিসেবে গোনা হয় না)। ⚠ = ফাঁকি দেওয়ার সন্দেহ: বের হয়ে আবার একই exam দিয়েছে, বারবার exit, বা অনেক question দেখে বের হয়েছে।</small>
    <h3 style="margin:10px 0 4px">👤 কে কতবার</h3><div class="scroll"><table><tr><th>Student</th><th>Exit</th><th>⚠</th><th>কোন exam-এ</th><th>শেষ exit</th></tr>
      ${st.map(o => `<tr class="click" data-s="${esc(o.sid)}" onclick="openStu(this.dataset.s)"><td><b>${esc(o.name)}</b> <small>${esc(o.sid)}</small></td><td><b>${o.n}</b></td><td>${o.flagged ? `<b style="color:var(--r)">${o.flagged}</b>` : '–'}</td><td><small>${Object.entries(o.exams).map(([c, n]) => esc(c) + (n > 1 ? ' ×' + n : '')).join(', ')}</small></td><td><small>${esc(exitWhen(o.last))}</small></td></tr>`).join('')}
    </table></div>
    <h3 style="margin:12px 0 4px">🧾 সব exit (নতুন আগে)</h3>${vExitTable(list, true, !exam)}`;
  return sec(exam ? 'x_exit_' + exam : 'd_exit', '🚪 Exam exit report', body, list.length ? list.length + ' exit' + (fl ? ' · ⚠ ' + fl : '') : '0');
}
/* student profile section + summary line */
function vExitProfile(sid){
  const list = allExits().filter(r => norm(r.sid) === norm(sid));
  if(!list.length) return '';
  const fl = list.filter(r => exitInfo(r).flags.length).length, ex = [...new Set(list.map(r => r.exam))];
  return `<div class="card" style="border-left:4px solid ${fl ? 'var(--r)' : '#f59e0b'}"><h2 style="margin-top:0">🚪 Exam exit history</h2>
    <div style="margin-bottom:6px"><b>${list.length}</b> বার exam বাতিল করে বের হয়েছে (${ex.map(esc).join(', ')})${fl ? ` · <b style="color:var(--r)">⚠ ${fl}টা সন্দেহজনক</b>` : ''}</div>
    ${vExitTable(list, false, true)}</div>`;
}
const exitCount = sid => allExits().filter(r => norm(r.sid) === norm(sid)).length;
