/* ============================================================
   Helpers
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/\n/g,'<br>');
const norm = s => String(s == null ? '' : s).trim().toUpperCase().replace(/^0+(?=\d)/, '');
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const fmt = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), x = s%60; return (h ? h+':' : '') + String(m).padStart(h?2:1,'0') + ':' + String(x).padStart(2,'0'); };
const pct = r => r.total ? Math.round(r.score / r.total * 100) : 0;
const avg = a => a.length ? Math.round(a.reduce((x,y)=>x+y,0) / a.length) : 0;
const heat = p => `hsl(${Math.round(Math.max(0,Math.min(1,p))*120)},65%,82%)`;
const shuffle = a => { for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const aidTime = aid => parseInt(String(aid).slice(0,-2), 36) || 0;
const newAid = () => Date.now().toString(36) + Math.floor(Math.random()*1296).toString(36).padStart(2,'0');
const LET = 'ABCDEFGH';

function parseCSV(t, d){
  d = d || ',';
  const rows=[]; let r=[], c='', q=false;
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(q){ if(ch==='"'){ if(t[i+1]==='"'){ c+='"'; i++; } else q=false; } else c+=ch; }
    else if(ch==='"') q=true;
    else if(ch===d){ r.push(c); c=''; }
    else if(ch==='\n'){ r.push(c); rows.push(r); r=[]; c=''; }
    else if(ch!=='\r') c+=ch;
  }
  if(c!==''||r.length){ r.push(c); rows.push(r); }
  return rows;
}


/* Math (KaTeX): renders $...$ and $$...$$ ; silently skipped if CDN/offline */
function mathify(el){
  try{
    if(typeof renderMathInElement !== 'function' || !el) return;
    renderMathInElement(el, {delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}], throwOnError:false});
  }catch(e){}
}
if(typeof addEventListener === 'function') addEventListener('load', () => mathify(document.getElementById('app')));
