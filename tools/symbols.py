#!/usr/bin/env python3
"""Print top-level function/const/let names with line numbers per src/js module (to refresh docs/INDEX.md)."""
import re, glob, os
for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'src', 'js', '*.js'))):
    syms = []
    for i, l in enumerate(open(f, encoding='utf-8').read().split('\n'), 1):
        m = re.match(r'^(?:async\s+)?function\s+(\w+)', l) or re.match(r'^(?:const|let)\s+(\w+)', l)
        if m: syms.append('%s:%d' % (m.group(1), i))
    print(os.path.basename(f), '\t', ', '.join(syms))
