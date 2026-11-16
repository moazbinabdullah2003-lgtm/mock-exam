#!/bin/bash
# One-command backup of everything live (data + project) into backups/<time>/  — see docs/BACKUP.md
cd "$(dirname "$0")" && python3 tools/backup.py "$@"
