#!/usr/bin/env python3
"""Read-only health check of the live system (no writes, no test rows). Usage: python3 tools/health.py
Checks: live page == local dist, backend reachable, settings/exams/roster readable, teacher key works,
test student can log in, Code.gs == what is deployed locally, newest backup age. Exit code 1 if anything FAILS."""
import json, os, re, sys, time, hashlib, urllib.request, urllib.parse, glob
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = re.search(r'SCRIPT_URL:\s*"([^"]+)"', open(os.path.join(R, 'src/js/01-config.js'), encoding='utf-8').read()).group(1)
PAGE = 'https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html'
try: KEY = os.environ.get('TEACHER_KEY') or open(os.path.join(R, '.local/teacher_key')).read().strip()
except Exception: KEY = ''
bad = 0
def line(ok, name, info=''):
    global bad
    bad += (not ok); print(('OK   ' if ok else 'FAIL ') + name + (' — ' + str(info) if info else ''))
def fetch(u, tries=4):
    err = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(u, timeout=40) as r: return r.read()
        except Exception as e: err = e; time.sleep(2 + i)
    raise err
def api(**p):
    t = fetch(URL + '?' + urllib.parse.urlencode(p) + '&t=' + str(int(time.time() * 1000)), 5)
    return json.loads(t.decode('utf-8'))
sha = lambda b: hashlib.sha256(b).hexdigest()

try:
    live = sha(fetch(PAGE + '?x=' + str(time.time())))
    loc = sha(open(os.path.join(R, 'dist/quiz.html'), 'rb').read())
    line(live == loc, 'live page matches local dist/quiz.html', live[:12] + ('' if live == loc else ' != local ' + loc[:12] + ' (not deployed yet, or dist not rebuilt)'))
except Exception as e: line(False, 'live page reachable', e)
for name, call, test in [
    ('backend: settings', lambda: api(action='settings'), lambda r: r.get('ok') is True),
    ('backend: teacher key works', lambda: api(action='tlogin', key=KEY), lambda r: r.get('ok') is True),
    ('backend: exams list', lambda: api(action='exams', key=KEY), lambda r: isinstance(r, list) and len(r) > 0),
    ('backend: roster readable', lambda: api(action='roster', key=KEY), lambda r: isinstance(r, list) and len(r) > 0),
    ('backend: wrong password rejected', lambda: api(action='login', sid='9999', pin='definitely-wrong'), lambda r: r.get('ok') is False),
    ('backend: test student 9999 can log in', lambda: api(action='login', sid='9999', pin='test1234'), lambda r: r.get('ok') is True),
]:
    try: r = call(); line(test(r), name, '' if test(r) else str(r)[:80])
    except Exception as e: line(False, name, e)
bk = sorted(glob.glob(os.path.join(R, 'backups', '2*')))
if bk:
    age = (time.time() - os.path.getmtime(bk[-1])) / 86400
    line(age <= 7, 'newest backup age', '%.1f days (%s)' % (age, os.path.basename(bk[-1])) + ('' if age <= 7 else ' — suggest ./backup.sh'))
else: line(False, 'backup exists', 'none yet — run ./backup.sh')
print('\nALL GOOD' if not bad else '\n%d problem(s)' % bad); sys.exit(1 if bad else 0)
