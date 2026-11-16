/* ============================================================
   Bilingual questions (English + বাংলা)
   question: q/o/e = English (প্রধান), qb/ob/eb = বাংলা version (ঐচ্ছিক; backend Q_BN, A_BN…E_BN, EXPLANATION_BN)
   Student exam শুরুর আগে একবার ভাষা বেছে নেয় (RUN.lang), result/review সেই ভাষায় (চাইলে বদলানো যায়)
   ============================================================ */
const LANGS = {en:'English', bn:'বাংলা'};
const isBi = e => !!(e && e.questions && e.questions.some(q => q && String(q.qb || '').trim()));
/* দেখানোর জন্য question-এর সেই ভাষার copy; বাংলা কোনো অংশ ফাঁকা থাকলে English দেখায় */
function LQ(q, lang){
  if(!q || lang !== 'bn' || !String(q.qb || '').trim()) return q;
  return {...q, q:q.qb, o:q.o.map((x, i) => (q.ob && String(q.ob[i] || '').trim()) ? q.ob[i] : x), e:String(q.eb || '').trim() ? q.eb : q.e};
}
let LANGASK = null;   // {exam, mode, idxs} — ভাষা বাছাইয়ের popup খোলা
let RVLANG = '';      // result page-এ review-এর ভাষা (ফাঁকা = attempt-এর ভাষা)
const prefLang = () => LS.get('mq_lang', 'en');
function chooseLang(l){
  const a = LANGASK; if(!a) return;
  LS.set('mq_lang', l); LANGASK = null; RVLANG = '';
  startRun(a.exam, a.mode, a.idxs, l);
}
function vLangAsk(){
  if(!LANGASK) return '';
  const e = EXAMS[LANGASK.exam], p = LS.get('mq_lang', '');   // আগে কখনো বেছে থাকলে সেটা দেখাও
  return `<div class="modal"><div class="card center"><h2 style="margin-top:0">🌐 ভাষা বেছে নাও / Choose language</h2>
    <div class="muted" style="margin-bottom:12px">${esc(e ? e.title : LANGASK.exam)} — পুরো exam এই ভাষায় দেখাবে (মাঝে বদলানো যাবে না)</div>
    <div class="choices" style="margin:8px 0">${Object.entries(LANGS).map(([k, n]) => `<button class="choice" onclick="chooseLang('${k}')"><span class="ic">${k === 'en' ? '🇬🇧' : '🇧🇩'}</span><span><b>${n}</b><small>${k === p ? 'আগের বার এটা নিয়েছিলে' : '&nbsp;'}</small></span></button>`).join('')}</div>
    <button class="btn ghost" onclick="LANGASK=null;render(true)">${esc(T('cancel'))}</button></div></div>`;
}
/* result page: review-এর ভাষা বদলানোর ছোট switch */
const vLangSwitch = (cur) => `<div class="row" style="justify-content:flex-start;gap:6px;margin:6px 0"><small class="muted">🌐 Review-এর ভাষা:</small> ${Object.entries(LANGS).map(([k, n]) => `<button class="btn sm ${cur === k ? '' : 'ghost'}" onclick="RVLANG='${k}';render(true)">${n}</button>`).join('')}</div>`;
