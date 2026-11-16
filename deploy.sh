#!/bin/bash
# One command deploy:  ./deploy.sh "what changed"
# builds quiz.html, runs tests, commits and pushes; GitHub Actions publishes it (live in ~1 min)
set -e
export PATH=/opt/homebrew/bin:$PATH
cd "$(dirname "$0")"
python3 build.py
node tests/backend.test.js
node tests/run_tests.js   # any failure stops the deploy
git add -A
git commit -m "${1:-update}" || echo "nothing new to commit"
git push origin main
echo "pushed. live in ~1 min: https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html"
