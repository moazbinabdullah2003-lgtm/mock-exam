#!/usr/bin/env python3
"""Build dist/quiz.html from src/ (template + css + js modules in filename order).
Usage:  python3 build.py        -> writes dist/quiz.html
Upload dist/quiz.html to GitHub (repo: mock-exam, branch: main)."""
import glob, os
R = os.path.dirname(os.path.abspath(__file__))
rd = lambda p: open(os.path.join(R, p), encoding='utf-8').read()
tpl = rd('src/template.html')
css = rd('src/css/app.css')
js = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(R, 'src/js/*.js'))))
out = tpl.replace('{{CSS}}\n', css).replace('{{JS}}\n', js)
open(os.path.join(R, 'dist/quiz.html'), 'w', encoding='utf-8').write(out)
print('built dist/quiz.html', len(out.encode('utf-8')), 'bytes')
