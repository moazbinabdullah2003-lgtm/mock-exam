/* ---------- 📋 Copy for AI: exam / one question as clean Markdown + LaTeX ($…$), with answers + our solution ----------
   Student (result page): obeys rules.review — 'full' = correct answer (+ solution if rules.explain), 'marks' = only ✅/❌, 'none' = no copy.
   Teacher: always full (exam page + result page). */
function copyText(t, btn){
  const done = ok => {
    if(btn){ const o = btn.textContent; btn.textContent = ok ? '✅ Copied!' : '⚠ Copy হয়নি'; setTimeout(() => { btn.textContent = o; }, 1800); }
  };
  const fallback = () => {
    try{ const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); done(ok); }catch(e){ done(false); }
  };
  try{ if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(() => done(true), fallback); else fallback(); }catch(e){ fallback(); }
}
/* one question block. c = student's chosen ORIGINAL index (-1 skipped, undefined = no student), lv = 'full'|'marks' */
function aiQ(q, n, c, lv, withExp){
  let s = `### Question ${n} (Topic: ${q.t || 'General'})\n${String(q.q).trim()}\n\n` + q.o.map((o, i) => `${LET[i]}) ${String(o).trim()}`).join('\n') + '\n';
  if(c !== undefined) s += `\nMy answer: ${c < 0 ? 'Skipped (did not answer)' : LET[c] + ') ' + String(q.o[c]).trim()}` + (lv === 'marks' && c >= 0 ? (c === q.a ? ' — ✅ correct' : ' — ❌ wrong') : '') + '\n';
  if(lv === 'full') s += `Correct answer: ${LET[q.a]}) ${String(q.o[q.a]).trim()}` + (c !== undefined && c >= 0 ? (c === q.a ? '  ✅ (I got it right)' : '  ❌ (I got it wrong)') : '') + '\n';
  if(lv === 'full' && withExp && String(q.e || '').trim()) s += `Teacher's solution: ${String(q.e).trim()}\n`;
  return s;
}
const AI_NOTE = 'Math is written in LaTeX between $…$ (e.g. $\\dfrac{1}{2}$). Options are labelled A, B, C, …';
function aiHead(e, code, who){
  return who === 'teacher'
    ? `I am a teacher. Below is an MCQ exam I made, with the correct answers and my solutions. ${AI_NOTE}\nPlease check every question and solution for mistakes or ambiguity, suggest clearer wording or better distractors, and tell me which topics/skills it tests.\n\n# ${e.title || code} (${code}) — ${e.questions.length} questions\n\n`
    : `I am a student. Below is an MCQ exam I took, with my answers${who === 'full' ? ', the correct answers and my teacher\'s solutions' : ''}. ${AI_NOTE}\nPlease explain step by step why the correct answer is right, why my wrong answers are wrong, what concept I am missing, and give me 2 similar practice questions for my weak areas. Answer in simple language (Bangla/English mix is fine).\n\n# ${e.title || code} (${code})\n\n`;
}
/* result page: n = -1 → whole attempt, else index in r.d */
function copyRes(n, btn){
  const r = LAST, e = r && EXAMS[r.exam]; if(!e) return;
  const isT = SESS && SESS.teacher, lv = isT ? 'full' : CFG.rules.review, withExp = isT || CFG.rules.explain;
  if(lv === 'none') return;
  const one = ([qi, c], k) => { const q = qinfo(r.exam, qi); return q ? aiQ(q, k + 1, c, lv, withExp) : ''; };
  let t;
  if(n < 0){
    const ok = r.d.filter(x => x[2]).length, wr = r.d.filter(x => !x[2] && x[1] >= 0).length;
    t = aiHead(e, r.exam, lv === 'full' ? 'full' : 'marks') + `My score: ${r.score}/${r.total} (✅ ${ok} correct, ❌ ${wr} wrong, ${r.total - ok - wr} skipped)\n\n` + r.d.map(one).join('\n');
  } else {
    t = `I am a student. Help me understand this MCQ question from my exam "${e.title || r.exam}". ${AI_NOTE}\nExplain step by step, tell me the concept behind it, and if I got it wrong, explain my mistake. Then give 1 similar practice question.\n\n` + one(r.d[n], n);
  }
  copyText(t, btn);
}
/* teacher exam page: n = -1 → whole exam, else question index */
function copyExam(code, n, btn){
  const e = EXAMS[code]; if(!e) return;
  const t = n < 0 ? aiHead(e, code, 'teacher') + e.questions.map((q, i) => aiQ(q, i + 1, undefined, 'full', true)).join('\n')
    : `Here is one MCQ question from my exam "${e.title || code}" with the correct answer and my solution. ${AI_NOTE}\nPlease explain it step by step, check if my solution is correct and complete, and suggest how to make it clearer.\n\n` + aiQ(e.questions[n], n + 1, undefined, 'full', true);
  copyText(t, btn);
}
const aiHint = full => `<div class="card" style="border-left:4px solid var(--p)"><b>🤖 AI দিয়ে বুঝে নাও</b>
  <div class="muted" style="margin:4px 0 8px">📋 Copy চাপলে question, option, ${full}LaTeX ($…$) সহ সুন্দর করে copy হবে। তারপর ChatGPT / Claude / Gemini-তে paste করলেই AI বুঝিয়ে দেবে। পুরো exam একসাথে, অথবা নিচে প্রতিটা question-এর পাশের 📋 দিয়ে একটা একটা করে।</div>`;
