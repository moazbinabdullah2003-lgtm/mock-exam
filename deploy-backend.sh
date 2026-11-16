#!/bin/bash
# Deploy backend/Code.gs to Apps Script and move the existing /exec deployment to the new version (URL does not change).
# Usage: ./deploy-backend.sh "what changed"
set -e
export PATH=/opt/homebrew/bin:$PATH
cd "$(dirname "$0")"
DEPLOYMENT_ID="AKfycbx2xuErMRJf9XPij0Yt28hqLXf79oAN3MnQva2ERw4rTJLQsFrkmQwO6qpFxTCG3IRPjw"
clasp push -f
clasp deploy -i "$DEPLOYMENT_ID" -d "${1:-update}"
clasp deployments
