#!/usr/bin/env python3
"""Convert samples/math_questions_with_solutions.md-style markdown into the app's CSV (3 exams by level emoji).
Usage: python3 tools/md2csv.py <input.md> <output.csv>
Markdown block per question: `**Qn.** 🟢|🟡|🔴 text`, options `**(a)** …`, `**Answer: (x)**`, `**Solution:**` + numbered steps.
Edit the TOPIC map / EX table (exam codes, titles, minutes) below for other question sets. Output: UTF-8 with BOM, NEG=0.25.
Then upload in the app: Teacher → Exams → CSV upload → Preview → Publish."""
import re, csv, sys
src, out = sys.argv[1], sys.argv[2]
txt = open(src, encoding='utf-8').read()
blocks = [b for b in txt.split('\n---\n') if '**Q' in b]
TOPIC = {}
for t, qs in {
 'Functions':[1], 'Sets':[31],
 'Complex Numbers':[2,4,5,6,7,12,15,18,19,21,23,26,35,44,49],
 'Quadratic Equations':[3,9,11,24,25,27,36,37,39,40,41,48],
 'Inequalities':[10,13,16,20,29,33,34,45,50],
 'Binomial Theorem':[8,14,17,22,28,30,32,38,42,43,46,47],
}.items():
    for q in qs: TOPIC[q] = t
assert sorted(TOPIC) == list(range(1,51)), set(range(1,51)) - set(TOPIC)
EX = {'🟢':('MATH-B','Higher Math - Beginner','20'), '🟡':('MATH-I','Higher Math - Intermediate','25'), '🔴':('MATH-A','Higher Math - Advanced','30')}
rows = {k: [] for k in EX}
for b in blocks:
    m = re.search(r'\*\*Q(\d+)\.\*\*\s*(🟢|🟡|🔴)\s*(.*?)\n\n\*\*\(a\)', b, re.S)
    n, lv, q = int(m.group(1)), m.group(2), m.group(3).strip()
    opts = [re.sub(r'\s*\\\s*$', '', x).strip() for x in re.findall(r'^\*\*\([a-e]\)\*\*\s*(.*)$', b, re.M)]
    ans = re.search(r'\*\*Answer: \(([a-e])\)\*\*', b).group(1).upper()
    sol = b.split('**Solution:**')[1].strip()
    sol = re.sub(r'\n+', '\n', sol)
    sol = sol.replace('**','')
    assert len(opts) == 4, (n, opts)
    rows[lv].append((n, q, opts, ans, TOPIC[n], sol))
with open(out, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['CODE','TITLE','MINUTES','NEG','OPEN','Q','A','B','C','D','E','ANS','TOPIC','EXPLANATION'])
    for lv,(code,title,mins) in EX.items():
        for i,(n,q,o,a,t,s) in enumerate(sorted(rows[lv])):
            w.writerow([code, title if not i else '', mins if not i else '', '0.25' if not i else '', 'YES' if not i else '', q, *o, '', a, t, s])
print({EX[k][0]: len(v) for k,v in rows.items()})
