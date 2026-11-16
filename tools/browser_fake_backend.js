// Paste into the browser pane (javascript_tool) on a page that loaded dist/quiz.html over http://localhost (see docs/DEPLOY.md "Testing").
// It replaces window.fetch with an in-memory copy of backend/Code.gs so you can test login/guest/exams/settings
// WITHOUT touching the real Google Sheet. Edit window.DB to set up data.
// NOTE: use `window.__mode='block'|'ok'` style variables (not `let`) if you want to flip behaviour between calls.
localStorage.clear();
window.DB = {
  cfg: {}, roster: [{ id: '101', pin: '1234', name: 'Rahim' }, { id: '102', pin: '5678', name: '', blocked: true }],
  pass: 'teacher123', attempts: [],
  exams: {
    DEMO1: { title: 'Demo', minutes: 5, neg: 0, open: true, questions: [
      { q: '2+2=$x$?', o: ['3', '4', 'None of these'], a: 1, t: 'Arith', e: 'simple $2+2=4$' },
      { q: 'sin30?', o: ['1/2', '1'], a: 0, t: 'Trig', e: '' }] },
    CLOSED: { title: 'Closed', minutes: 5, neg: 0, open: false, questions: [{ q: 'q?', o: ['a', 'b'], a: 0, t: 'A', e: '' }] }
  }
};
const J = o => ({ ok: true, status: 200, text: async () => JSON.stringify(o), json: async () => o });
window.fetch = async (u, o) => {
  const url = new URL(u, location.href), q = url.searchParams;
  if (o && o.method === 'POST') {
    const p = Object.fromEntries(new URLSearchParams(o.body.toString()));
    if (p.action) {                                   // admin actions need the teacher key
      if (p.key !== DB.pass) return J({});
      if (p.action === 'savecfg') DB.cfg = JSON.parse(p.cfg);
      if (p.action === 'saveroster') DB.roster = JSON.parse(p.roster);
      if (p.action === 'setpass' && p.newpass.length >= 4) DB.pass = p.newpass;
      if (p.action === 'upload') { const rows = JSON.parse(p.rows), f = rows[0];
        DB.exams[p.code] = { title: f[1], minutes: +f[2] || 10, neg: +f[3] || 0, open: f[4] !== 'NO',
          questions: rows.map(r => ({ q: r[5], o: r.slice(6, 11).filter(x => x !== ''), a: 'ABCDE'.indexOf(r[11]), t: r[12], e: r[13] })) }; }
      if (p.action === 'delete') delete DB.exams[p.code];
      return J({});
    }
    DB.attempts.push(p); return J({});               // student attempt
  }
  const a = q.get('action');
  if (a === 'settings') return J({ ok: true, cfg: DB.cfg });
  if (a === 'tlogin') return J({ ok: q.get('key') === DB.pass });
  if (a === 'roster') return J(q.get('key') === DB.pass ? DB.roster : []);
  if (a === 'login') {                                // mirrors login_() in Code.gs
    const r = DB.roster.find(x => norm(x.id) === norm(q.get('sid')));
    if (!r || !String(r.pin || '').trim()) return J({ ok: false, reason: 'badlogin' });
    if (String(r.pin).trim() !== String(q.get('pin') || '').trim()) return J({ ok: false, reason: 'badlogin' });
    if (r.blocked) return J({ ok: false, reason: 'blocked' });
    return J({ ok: true, name: r.name || String(r.id) });
  }
  if (a === 'exams') return J(q.get('key') === DB.pass ? Object.entries(DB.exams).map(([code, e]) => ({ code, title: e.title, minutes: e.minutes, neg: e.neg, open: e.open, count: e.questions.length })) : []);
  if (a === 'exam') { const e = DB.exams[q.get('code')]; return J(e ? JSON.parse(JSON.stringify(e)) : { error: 'notfound' }); }
  return J(q.get('key') === DB.pass ? DB.attempts.map(p => ({ ...p })) : (q.get('sid') ? DB.attempts.filter(p => norm(p.sid) === norm(q.get('sid'))) : []));
};
'fake backend installed';
