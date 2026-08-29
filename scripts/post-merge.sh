#!/usr/bin/env bash
set -euo pipefail

# Keep both applications ready after task-agent merges.
npm ci --prefix frontend --no-audit --no-fund
npm ci --prefix backend --no-audit --no-fund
npm run build --prefix frontend