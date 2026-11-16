/* ---------- 🤖 AI prompt for making exams + MD (Markdown + LaTeX) exam import ----------
   Teacher copies a prompt (MD or CSV), gives it + raw questions to any AI, pastes the AI's answer in Exams → upload box.
   parseQ() (11) sends MD text here (isMD). Output shape is the same as parseQ: {errors, exams:{CODE:{code,title,minutes,neg,open,rows:[{q,o,a,t,e}]}}} */
const MD_SAMPLE = `# EXAM: PHY-CT1
TITLE: Physics Class Test 1
MINUTES: 20
NEG: 0.25
OPEN: YES
MAXATTEMPTS: 1
GUEST: NO
START:
END:
INTRO: প্রতিটা প্রশ্নের ১টাই সঠিক উত্তর। ভুল উত্তরে 0.25 কাটা যাবে।

## Q1
TOPIC: Kinematics
Q: একটি বস্তু $u = 0$ থেকে $a = 2\\,\\text{m/s}^2$ ত্বরণে চলে। $5\\,\\text{s}$ পরে বেগ কত?
A) $5\\,\\text{m/s}$
B) $10\\,\\text{m/s}$
C) $15\\,\\text{m/s}$
D) $20\\,\\text{m/s}$
ANS: B
SOL: $v = u + at = 0 + 2 \\times 5 = 10\\,\\text{m/s}$

## Q2
TOPIC: Calculus
Q: $\\displaystyle \\int_0^1 2x\\,dx = $ ?
A) $0$
B) $\\frac{1}{2}$
C) $1$
D) $2$
ANS: C
SOL: $\\int_0^1 2x\\,dx = \\left[x^2\\right]_0^1 = 1 - 0 = 1$`;

const CSV_SAMPLE = `CODE,TITLE,MINUTES,NEG,OPEN,MAXATTEMPTS,GUEST,START,END,INTRO,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION
PHY-CT1,"Physics Class Test 1",20,0.25,YES,1,NO,"","","প্রতিটা প্রশ্নের ১টাই সঠিক উত্তর। ভুল উত্তরে 0.25 কাটা যাবে।","একটি বস্তু $u = 0$ থেকে $a = 2\\,\\text{m/s}^2$ ত্বরণে চলে। $5\\,\\text{s}$ পরে বেগ কত?","$5\\,\\text{m/s}$","$10\\,\\text{m/s}$","$15\\,\\text{m/s}$","$20\\,\\text{m/s}$","",B,"Kinematics","$v = u + at = 0 + 2 \\times 5 = 10\\,\\text{m/s}$"
PHY-CT1,"","","","","","","","","","$\\displaystyle \\int_0^1 2x\\,dx = $ ?","$0$","$\\frac{1}{2}$","$1$","$2$","",C,"Calculus","$\\int_0^1 2x\\,dx = \\left[x^2\\right]_0^1 = 1$"`;

const AI_COMMON = `You are an expert exam-paper formatter and subject teacher. I will give you RAW questions (copied from a book, PDF, photo text, Word file or my notes — maybe messy, maybe in Bengali, English or mixed). Convert them into the EXACT format below so I can paste it directly into my MCQ exam web app.

### EXAM INFO (use these; if I left them as "?", choose sensible values)
- Exam code: ?        (ONLY A-Z, 0-9, - or _ ; no spaces; max 30 chars; e.g. PHY-CT1)
- Title: ?
- Minutes: ?          (total exam time)
- Negative mark per wrong answer: ?   (e.g. 0.25 ; 0 = none)
- Open now: YES
- Max attempts per student: ?   (number; 0 or empty = app's global rule)
- Guest access: ?     (YES = guests with only the exam code may take it, NO = only registered students, empty = global rule)
- Start time: ?       (format YYYY-MM-DD HH:MM, 24-hour, Bangladesh time, e.g. 2026-11-20 10:00 ; empty = no start limit)
- End time: ?         (same format; empty = no end limit)
- Instructions shown before the exam starts: ?   (short; empty = none)

### RULES (follow ALL of them)
1. Every question is MCQ with 2 to 5 options, labelled A, B, C, D, E in that order. Exactly ONE correct answer.
2. Keep the question language exactly as given (Bengali stays Bengali). Do NOT translate. Fix only obvious typos/OCR errors; never change the meaning, numbers or units.
3. ALL math, chemistry and physics notation in LaTeX:
   - inline: $...$   display (own line, big): $$...$$
   - NEVER use \\( \\) or \\[ \\]. Never use a bare $ for money — write "Tk" or "taka".
   - fractions \\frac{a}{b}, roots \\sqrt{x}, powers x^{2}, subscripts H_2O → $\\text{H}_2\\text{O}$, units $\\,\\text{m/s}$, vectors \\vec{F}, degrees 30^\\circ, arrows \\rightarrow, equilibrium \\rightleftharpoons.
   - Options that are pure math must also be in $...$.
4. ANSWER: if the raw data gives the answer, use it but VERIFY it. If no answer is given, SOLVE the question yourself carefully. If the given answer looks wrong, use the correct one and list it under "⚠ CHECK" at the end.
5. SOLUTION: write a short, clear, step-by-step solution (1–4 lines) in the same language as the question, with LaTeX. Every question must have a solution.
6. TOPIC: a short chapter/topic name (1–3 words, e.g. "Kinematics", "Organic Chemistry", "Integration"). Use the SAME spelling for the same topic everywhere.
7. Do not number options inside the text (no "(a)", "i)" inside option text). Keep "None of these"/"All of the above" as the last option.
8. If a question needs a figure/graph/table that you cannot reproduce, describe it in words in the question: [Figure: ...]. If a question is impossible to understand, skip it and list it under "⚠ CHECK".
9. Keep the original question order. Do not invent extra questions unless I ask.`;

function aiPrompt(kind){
  if(kind === 'csv') return AI_COMMON + `

### OUTPUT FORMAT — CSV (comma separated, UTF-8)
- First line EXACTLY: CODE,TITLE,MINUTES,NEG,OPEN,MAXATTEMPTS,GUEST,START,END,INTRO,Q,A,B,C,D,E,ANS,TOPIC,EXPLANATION
- One question per line. CODE on every line. TITLE, MINUTES, NEG, OPEN, MAXATTEMPTS, GUEST, START, END, INTRO only on the FIRST question line (empty "" on the rest).
- Columns A–E = option texts (leave E, or D and E, empty if fewer options). ANS = a single letter A–E. EXPLANATION = the solution.
- Wrap EVERY text field (TITLE, START, END, INTRO, Q, A–E, TOPIC, EXPLANATION) in double quotes "..." — even empty ones ("") — because LaTeX like \\, contains commas. Write an inner " as "". Put the whole question/solution on ONE line (no line breaks inside a field; use "; " instead).
- Output ONLY one \`\`\`csv code block (nothing before it). After the block, optionally a short "⚠ CHECK" list.

### SAMPLE (copy this style exactly)
\`\`\`csv
${CSV_SAMPLE}
\`\`\`

### RAW QUESTIONS (convert all of these)
<<< paste raw questions here >>>`;
  return AI_COMMON + `

### OUTPUT FORMAT — Markdown + LaTeX (my app reads these exact keywords)
- Start with "# EXAM: <code>" and the lines TITLE:, MINUTES:, NEG:, OPEN:, MAXATTEMPTS:, GUEST:, START:, END:, INTRO: (leave the value empty for "global rule / no limit"; INTRO may continue on the next lines)
- Each question starts with "## Q<number>", then these lines IN THIS ORDER:
  TOPIC: <topic>
  Q: <question text — may continue on the next lines>
  A) <option>   B) <option>   ... each option on its OWN line, starting with the letter and ")"
  ANS: <one letter>
  SOL: <solution — may continue on the next lines>
- Do not use bold/italic markdown (**, _) or bullet lists inside questions. No blank line inside one question except before the next "## Q".
- Output ONLY one \`\`\`markdown code block (nothing before it). After the block, optionally a short "⚠ CHECK" list.

### SAMPLE (copy this style exactly)
\`\`\`markdown
${MD_SAMPLE}
\`\`\`

### RAW QUESTIONS (convert all of these)
<<< paste raw questions here >>>`;
}


/* Exam rules (per-exam override, CFG.exams[code]) from upload: MAXATTEMPTS, GUEST, START, END, INTRO.
   raw = {MAXATTEMPTS:'1', ...} (only keys the file has). কোনো rule key না থাকলে null (আগের rule যেমন আছে থাকবে). */
const RULE_KEYS = ['MAXATTEMPTS', 'GUEST', 'START', 'END', 'INTRO'];
function upDate(v, end){
  v = String(v || '').trim(); if(!v) return '';
  const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if(!m) return null;
  const p = n => String(n).padStart(2, '0'), s = `${m[1]}-${p(m[2])}-${p(m[3])}T${m[4] != null ? p(m[4]) + ':' + m[5] : (end ? '23:59' : '00:00')}`;
  return isNaN(new Date(s).getTime()) ? null : s;
}
function readRules(raw, lab, errs){
  if(!raw || !RULE_KEYS.some(k => k in raw)) return null;
  const ov = {}, g = k => String(raw[k] == null ? '' : raw[k]).trim();
  const ma = g('MAXATTEMPTS');
  if(ma && !/^\d+$/.test(ma)) errs.push(lab + ': MAXATTEMPTS শুধু সংখ্যা ("' + ma + '")'); else ov.maxAttempts = Number(ma || 0);
  const gu = g('GUEST').toUpperCase();
  if(gu && gu !== 'YES' && gu !== 'NO') errs.push(lab + ': GUEST হবে YES / NO / ফাঁকা ("' + g('GUEST') + '")'); else ov.guest = gu === 'YES' ? 'yes' : gu === 'NO' ? 'no' : '';
  const st = upDate(g('START')), en = upDate(g('END'), true);
  if(st === null) errs.push(lab + ': START-এর format হবে 2026-11-20 10:00 ("' + g('START') + '")'); else ov.start = st;
  if(en === null) errs.push(lab + ': END-এর format হবে 2026-11-20 11:00 ("' + g('END') + '")'); else ov.end = en;
  if(st && en && new Date(en) <= new Date(st)) errs.push(lab + ': END সময় START-এর পরে হতে হবে');
  ov.intro = g('INTRO');
  return ov;
}
const rulesTxt = ov => !ov ? 'Rules: আগের মতো (file-এ নেই)' : 'Rules: ' + [ov.maxAttempts ? 'max ' + ov.maxAttempts + ' attempt' : 'attempt: global', ov.guest === 'yes' ? 'guest ✓' : ov.guest === 'no' ? 'guest ✗' : 'guest: global',
  ov.start || ov.end ? '🕒 ' + (ov.start ? ov.start.replace('T', ' ') : '…') + ' → ' + (ov.end ? ov.end.replace('T', ' ') : '…') : 'সময়-সীমা নেই', ov.intro ? 'instructions ✓' : 'instructions নেই'].join(' · ');

/* MD detection: "# EXAM:" line or "## Q" + "ANS:" lines. AI-র ```markdown fence থাকলেও চলবে */
const isMD = t => /^\s*#\s*EXAM\s*:/mi.test(t) || (/^\s*##\s*Q\s*\d*/mi.test(t) && /^\s*ANS\s*:/mi.test(t));
function parseMD(text){
  const lines = String(text || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n');
  const errs = [], exams = {};
  let ex = null, q = null, field = null, qn = 0;
  const finish = () => {
    if(!q) return;
    const lab = 'Q' + q.n + (ex ? ' (' + ex.code + ')' : '');
    const o = q.o.map(s => s.trim());
    if(!ex){ errs.push(lab + ': উপরে "# EXAM: CODE" লাইন নেই'); }
    else if(!q.q.trim()) errs.push(lab + ': Question (Q:) লেখা নেই');
    else if(o.length < 2 || o.some(x => !x)) errs.push(lab + ': Option ঠিক নেই (অন্তত ২টা A) B) …, মাঝে ফাঁকা নয়)');
    else if(q.ans < 0 || q.ans >= o.length) errs.push(lab + ': ANS ভুল ("' + q.ansRaw + '")');
    else ex.rows.push({q:q.q.trim(), o, a:q.ans, t:q.t.trim() || 'General', e:q.e.trim()});
    q = null; field = null;
  };
  const add = (k, s) => { if(k === 'q') q.q += (q.q ? '\n' : '') + s; else if(k === 'e') q.e += (q.e ? '\n' : '') + s; else if(typeof k === 'number') q.o[k] += (q.o[k] ? '\n' : '') + s; };
  for(const raw of lines){
    const L = raw.trim();
    if(/^```/.test(L)) continue;                                   // code fence
    let m;
    if((m = L.match(/^#\s*EXAM\s*:\s*(.*)$/i))){
      finish(); const c = m[1].trim().toUpperCase();
      if(!/^[A-Z0-9_-]{1,30}$/.test(c)){ errs.push('Exam code "' + m[1].trim() + '" ভুল — শুধু A-Z, 0-9, - _ (space নয়)'); ex = null; continue; }
      ex = exams[c] = exams[c] || {code:c, title:c, minutes:'10', neg:'0', open:'YES', rows:[], raw:{}}; qn = 0; field = null; continue;
    }
    if(/^##\s*Q/i.test(L)){ finish(); qn++; q = {n:(L.match(/\d+/) || [qn])[0], q:'', o:[], ans:-1, ansRaw:'', t:'', e:''}; field = null; continue; }
    if(!q && ex && (m = L.match(/^(MAXATTEMPTS|MAX ATTEMPTS|GUEST|START|END|INTRO)\s*:\s*(.*)$/i))){
      const k = m[1].toUpperCase().replace(' ', ''); ex.raw[k] = m[2].trim(); field = k === 'INTRO' ? 'intro' : null; continue;
    }
    if(!q && ex && (m = L.match(/^(TITLE|MINUTES|NEG|OPEN)\s*:\s*(.*)$/i))){
      const k = m[1].toUpperCase(), v = m[2].trim(); field = null;
      if(k === 'TITLE') ex.title = v || ex.code; else if(k === 'MINUTES') ex.minutes = v || '10'; else if(k === 'NEG') ex.neg = v || '0'; else ex.open = v.toUpperCase() === 'NO' ? 'NO' : 'YES';
      continue;
    }
    if(!q && ex && field === 'intro'){ ex.raw.INTRO += (ex.raw.INTRO ? '\n' : '') + L; continue; }
    if(!q) continue;                                               // প্রশ্নের বাইরের লেখা (⚠ CHECK ইত্যাদি) বাদ
    if((m = L.match(/^TOPIC\s*:\s*(.*)$/i))){ q.t = m[1]; field = null; continue; }
    if((m = L.match(/^Q\s*[:.)]\s*(.*)$/i))){ q.q = m[1]; field = 'q'; continue; }
    if((m = L.match(/^\(?([A-E])\s*[).]\s*(.*)$/))){ const i = 'ABCDE'.indexOf(m[1]); while(q.o.length < i) q.o.push(''); q.o[i] = m[2]; field = i; continue; }
    if((m = L.match(/^(ANS|ANSWER)\s*:\s*\(?([A-Za-z]?)\)?/i))){ q.ansRaw = m[2]; q.ans = 'ABCDE'.indexOf(m[2].toUpperCase()); if(!m[2]) q.ans = -1; field = null; continue; }
    if((m = L.match(/^(SOL|SOLUTION|EXPLANATION)\s*:\s*(.*)$/i))){ q.e = m[2]; field = 'e'; continue; }
    if(!L){ if(field === 'q' || field === 'e') add(field, ''); continue; }
    if(field !== null) add(field, L);
  }
  finish();
  Object.values(exams).forEach(e => { e.ov = readRules(e.raw, e.code, errs); e.raw.INTRO != null && (e.ov.intro = e.ov.intro.replace(/\n+$/, '')); delete e.raw; });
  Object.values(exams).forEach(e => { if(!e.rows.length && !errs.length) errs.push(e.code + ': কোনো valid question পাওয়া যায়নি'); });
  if(!Object.keys(exams).length && !errs.length) errs.push('কোনো exam পাওয়া যায়নি — "# EXAM: CODE" লাইন আছে কিনা দেখো');
  Object.values(exams).forEach(e => e.rows.forEach(r => { r.q = r.q.replace(/\n{3,}/g, '\n\n'); r.e = r.e.replace(/\n{3,}/g, '\n\n'); }));
  return {errors:errs, exams};
}

/* Exams tab-এর box: copy buttons + sample */
let AIP_SHOW = '';
function vAiPromptBox(){
  return `<div class="card" style="margin:10px 0;border-left:4px solid var(--p)"><b>🤖 AI দিয়ে question set বানাও</b>
    <small class="muted" style="display:block;margin:4px 0 8px">১) নিচের prompt copy করো → ২) ChatGPT / Claude / Gemini-এ paste করো → ৩) "EXAM INFO"-তে code, title, minute বসাও আর শেষে raw question (বই/PDF/নোট থেকে) দাও → ৪) AI যা দেবে সেটা নিচের box-এ paste করে Preview। Math/Physics/Chem-এর জন্য <b>MD + LaTeX</b> ভালো (comma-র ঝামেলা নেই)।</small>
    <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-start;margin:0">
      <button class="btn sm" onclick="copyText(aiPrompt('md'), this)">📋 Copy prompt (MD + LaTeX) ⭐</button>
      <button class="btn sm ghost" onclick="copyText(aiPrompt('csv'), this)">📋 Copy prompt (CSV)</button>
      <button class="btn sm ghost" onclick="AIP_SHOW = AIP_SHOW === 'md' ? '' : 'md'; render(true)">👁 MD sample</button>
      <button class="btn sm ghost" onclick="AIP_SHOW = AIP_SHOW === 'csv' ? '' : 'csv'; render(true)">👁 CSV sample</button>
    </div>
    ${AIP_SHOW ? `<pre style="white-space:pre-wrap;font-size:12.5px;background:color-mix(in srgb,var(--t) 5%,var(--card));padding:10px;border-radius:10px;margin:8px 0 4px;max-height:320px;overflow:auto">${escT(AIP_SHOW === 'md' ? MD_SAMPLE : CSV_SAMPLE)}</pre>
      <button class="btn sm ghost" onclick="copyText(${AIP_SHOW === 'md' ? 'MD_SAMPLE' : 'CSV_SAMPLE'}, this)">📋 Copy sample</button> <button class="btn sm ghost" onclick="PASTE = ${AIP_SHOW === 'md' ? 'MD_SAMPLE' : 'CSV_SAMPLE'}; doPreview()">▶ Sample দিয়ে Preview দেখো</button>` : ''}
  </div>`;
}

/* publish-এর পরে: upload-এর rules settings-এ (CFG.exams[code]) save করে, backend-এ verify করে */
async function saveExamRules(list){
  list = list.filter(e => e.ov);
  if(!list.length) return true;
  let base = {};
  try{ const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=settings&t=' + Date.now())).json(); if(!(r && r.ok)) return false; base = r.cfg || {}; }catch(e){ return false; }
  base.exams = base.exams || {};
  list.forEach(e => { base.exams[e.code] = {...(base.exams[e.code] || {}), ...e.ov}; });
  const str = JSON.stringify(base);
  await tPost({action:'savecfg', cfg:str});
  let ok = false;
  for(let i = 0; i < 7 && !ok; i++){
    await sleep(1300);
    try{ const r = await (await fetch(CONFIG.SCRIPT_URL + '?action=settings&t=' + Date.now())).json(); ok = !!(r && r.ok && JSON.stringify(r.cfg) === str); }catch(e){}
  }
  if(!ok) return false;
  LS.set('mq_cfg', base);
  if(CD){ CD.exams = CD.exams || {}; list.forEach(e => { CD.exams[e.code] = clone(base.exams[e.code]); }); }
  CFG = deepMerge(DEF_CFG, DIRTY && CD ? CD : base);
  return true;
}
