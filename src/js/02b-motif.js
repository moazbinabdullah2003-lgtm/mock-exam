/* ============================================================
   Science motif: background-এ হালকা বিজ্ঞানের symbol / shape (SVG tile, code-এই আঁকা, কোনো image নেই)
   theme keys: motif, motifOp (%), motifSize (%), motifInk ('primary'|'text'), motifQuiz (exam-এ দেখাবে?), heroSym
   ============================================================ */
const MOTIFS = {
  none:      {n:'None (কিছু না)'},
  math:      {n:'Math (π ∫ ∑)', hero:'∑', it:true, shp:.15, s:['π','√x','∫','∑','θ','∞','±','≠','dy/dx','f(x)','Δ','≈','x²','∂','log','sin θ','n!','∈'], sh:['curve']},
  physics:   {n:'Physics (λ ψ ⚛)', hero:'⚛', it:true, s:['λ','ħ','ψ','Ω','E=mc²','F=ma','ν','∇','μ₀','Δt','v=u+at','ω','ρ','ε₀'], sh:['atom','wave','atom']},
  chemistry: {n:'Chemistry (⬡ H₂O)', hero:'⚗', s:['H₂O','CO₂','NaCl','pH','⇌','Na⁺','e⁻','CH₄','O₂','NH₃','Cl⁻','H₂SO₄','mol'], sh:['hex','hex','bond']},
  biology:   {n:'Biology (🧬 DNA)', hero:'🧬', s:['DNA','ATP','RNA','C₆H₁₂O₆','A–T','G–C','CO₂','O₂','pH'], sh:['helix','cell','helix']},
  circuit:   {n:'Circuit board', hero:'⚡', s:['Ω','V=IR','+','−','5V','GND'], sh:['trace','trace','trace','chip','res']},
  periodic:  {n:'Periodic table', hero:'⚛', s:[], sh:['elem']},
  graph:     {n:'Graph paper', hero:'ƒ', grid:1, it:true, s:['y=x²','f(x)','y=sin x','(0,0)','x','y','dy/dx'], sh:['curve','axes']},
  blueprint: {n:'Blueprint (grid + formula)', hero:'∇', grid:1, s:['∇·E','∮','F=ma','Σ','λ','r=2m','∫dx','⊥','∠θ'], sh:['atom','hex','wave']},
  mix:       {n:'Science mix (সব মিলিয়ে)', hero:'⚛', it:true, s:['π','∫','λ','ψ','E=mc²','H₂O','DNA','∑','Δ','⇌','Ω','√x'], sh:['atom','hex','helix','wave','curve']}
};
const ELEMS = [['H',1],['He',2],['C',6],['N',7],['O',8],['Na',11],['Mg',12],['Cl',17],['K',19],['Ca',20],['Fe',26],['Cu',29],['Zn',30],['Ag',47],['Au',79],['S',16],['P',15],['Ne',10]];

function motifRng(seed){ let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const MOTIF_SHAPES = {
  atom: (c, r) => `<g fill="none" stroke="${c}" stroke-width="1.4">${[0, 60, 120].map(a => `<ellipse rx="${r}" ry="${r * .36}" transform="rotate(${a})"/>`).join('')}</g><circle r="${r * .14}" fill="${c}"/>`,
  hex: (c, r) => { const p = [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 3 * i + Math.PI / 6; return (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1); }).join(' ');
    return `<polygon points="${p}" fill="none" stroke="${c}" stroke-width="1.5"/><circle r="${r * .55}" fill="none" stroke="${c}" stroke-width="1.2"/>`; },
  bond: (c, r) => `<g stroke="${c}" stroke-width="1.4"><line x1="${-r}" y1="0" x2="0" y2="0"/><line x1="0" y1="0" x2="${r * .7}" y2="${-r * .7}"/><line x1="0" y1="0" x2="${r * .7}" y2="${r * .7}"/></g>` +
    [[-r, 0, 5], [0, 0, 7], [r * .7, -r * .7, 4.5], [r * .7, r * .7, 4.5]].map(([x, y, q]) => `<circle cx="${x}" cy="${y}" r="${q}" fill="${c}"/>`).join(''),
  wave: (c, r) => { let d = `M${-r * 1.4},0`; for(let i = 0; i < 4; i++){ const x = -r * 1.4 + i * r * .7; d += ` Q${(x + r * .35).toFixed(1)},${i % 2 ? r * .5 : -r * .5} ${(x + r * .7).toFixed(1)},0`; } return `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.5"/>`; },
  helix: (c, r) => { let a = '', b = '', g = ''; const h = r * 1.6;
    for(let i = 0; i <= 16; i++){ const y = -h + i * h / 8, x = Math.sin(i / 16 * Math.PI * 2) * r * .45; a += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); b += (i ? 'L' : 'M') + (-x).toFixed(1) + ',' + y.toFixed(1); if(i % 2 && i < 16) g += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(-x).toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
    return `<g fill="none" stroke="${c}" stroke-width="1.4"><path d="${a}"/><path d="${b}"/></g><g stroke="${c}" stroke-width=".9">${g}</g>`; },
  cell: (c, r) => `<ellipse rx="${r}" ry="${r * .7}" fill="none" stroke="${c}" stroke-width="1.4"/><circle cx="${r * .2}" cy="${-r * .1}" r="${r * .28}" fill="${c}" fill-opacity=".35" stroke="${c}"/><circle cx="${-r * .45}" cy="${r * .25}" r="2" fill="${c}"/><circle cx="${-r * .2}" cy="${-r * .35}" r="1.6" fill="${c}"/>`,
  curve: (c, r) => `<path d="M${-r},${-r * .8} Q0,${r * 1.2} ${r},${-r * .8}" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  axes: (c, r) => `<g stroke="${c}" stroke-width="1.3" fill="${c}"><line x1="${-r}" y1="${r * .6}" x2="${r}" y2="${r * .6}"/><line x1="${-r * .7}" y1="${r * .9}" x2="${-r * .7}" y2="${-r}"/><path d="M${r},${r * .6} l-5,-3 v6z M${-r * .7},${-r} l-3,5 h6z"/></g><path d="M${-r * .7},${r * .6} C0,${r * .5} ${r * .3},${-r * .2} ${r * .8},${-r * .8}" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  trace: (c, r, rnd) => { const s = rnd() < .5 ? 1 : -1, x2 = r * .2, y2 = s * r * .7;
    return `<path d="M${-r * 1.1},${-y2 / 2} H${x2 - r * .5} L${x2},${y2 / 2} H${r * 1.1}" fill="none" stroke="${c}" stroke-width="1.6"/><circle cx="${-r * 1.1}" cy="${-y2 / 2}" r="3.2" fill="none" stroke="${c}" stroke-width="1.5"/><circle cx="${r * 1.1}" cy="${y2 / 2}" r="3.2" fill="${c}"/>`; },
  chip: (c, r) => { let p = ''; for(let i = -2; i <= 2; i++) p += `<line x1="${i * r * .25}" y1="${-r * .6}" x2="${i * r * .25}" y2="${-r * .85}"/><line x1="${i * r * .25}" y1="${r * .6}" x2="${i * r * .25}" y2="${r * .85}"/>`;
    return `<rect x="${-r * .7}" y="${-r * .6}" width="${r * 1.4}" height="${r * 1.2}" rx="3" fill="none" stroke="${c}" stroke-width="1.5"/><g stroke="${c}" stroke-width="1.4">${p}</g>`; },
  res: (c, r) => `<path d="M${-r},0 H${-r * .5} l4,-6 l6,12 l6,-12 l6,12 l6,-12 l4,6 H${r}" fill="none" stroke="${c}" stroke-width="1.5"/>`,
  elem: (c, r, rnd) => { const [e, z] = ELEMS[Math.floor(rnd() * ELEMS.length)];
    return `<rect x="-19" y="-21" width="38" height="42" rx="4" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-width="1.4"/><text x="-15" y="-10" font-size="8" fill="${c}" font-family="Arial,sans-serif">${z}</text><text y="9" font-size="17" font-weight="700" text-anchor="middle" fill="${c}" font-family="Arial,sans-serif">${e}</text>`; }
};
const motifEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* একটা repeat-হওয়া tile (W×W px) এর SVG — একই input দিলে সবসময় একই ছবি (seeded) */
function motifSVG(kind, color){
  const m = MOTIFS[kind];
  if(!m || kind === 'none') return '';
  const W = 264, N = 4, cell = W / N, rnd = motifRng(kind.length * 977 + kind.charCodeAt(0) * 31);
  let body = '';
  if(m.grid){
    let g = '';
    for(let i = 0; i < W; i += 11) g += `<path d="M${i},0V${W}M0,${i}H${W}" stroke-width="${i % 66 ? .5 : 1.1}" stroke-opacity="${i % 66 ? .45 : .9}"/>`;
    body += `<g stroke="${color}" fill="none">${g}</g>`;
  }
  const font = m.it ? 'Georgia,Cambria,serif' : 'Arial,Helvetica,sans-serif';   // quote রাখা যাবে না (data URL ভেঙে যায়)
  for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){
    if(m.grid && rnd() < .45) continue;            // grid motif-এ কম জিনিস
    const x = c * cell + cell / 2 + (rnd() - .5) * cell * .3, y = r * cell + cell / 2 + (rnd() - .5) * cell * .3;
    const rot = Math.round((rnd() - .5) * 40);
    const useShape = m.sh && m.sh.length && (!m.s.length || rnd() < (m.shp || .38));
    if(useShape){
      const sh = m.sh[Math.floor(rnd() * m.sh.length)], sc = .8 + rnd() * .35;
      body += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${sh === 'elem' ? 0 : rot}) scale(${sc.toFixed(2)})">${MOTIF_SHAPES[sh](color, 20, rnd)}</g>`;
    } else {
      const t = m.s[Math.floor(rnd() * m.s.length)], fs = Math.round(14 + rnd() * 9 - Math.max(0, t.length - 4) * 1.2);
      body += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" font-size="${fs}" ${m.it ? 'font-style="italic"' : ''} text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="${font}">${motifEsc(t)}</text>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">${body}</svg>`;
}
const MOTIF_CACHE = {};
function motifURL(kind, color){
  const k = kind + '|' + color;
  if(!(k in MOTIF_CACHE)){ const s = motifSVG(kind, color); MOTIF_CACHE[k] = s ? `url("data:image/svg+xml,${encodeURIComponent(s).replace(/'/g, '%27')}")` : 'none'; }
  return MOTIF_CACHE[k];
}
/* applyTheme-এর জন্য CSS (variables + layer) */
function motifCSS(t){
  const kind = MOTIFS[t.motif] ? t.motif : 'none';
  if(kind === 'none') return '';
  const ink = t.motifInk === 'text' ? t.text : t.primary;
  const op = Math.max(2, Math.min(40, +t.motifOp || 12)) / 100, sz = Math.round(264 * Math.max(50, Math.min(200, +t.motifSize || 100)) / 100);
  const hero = MOTIFS[kind].hero || '';
  return `:root{--motif:${motifURL(kind, ink)};--mop:${op};--msz:${sz}px;--msym:"${hero}"}`;
}
