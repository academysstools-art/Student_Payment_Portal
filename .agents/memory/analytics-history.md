---
name: Migrated analytics history
description: User's data migration constraint and expected analytics destination.
---

The user states that analytics history has already been migrated to Neon and identifies its location as the Replit production database. Do not rerun the analytics history migration, including with `--force`. Treat the claimed location as something to verify before relying on it.

**Why:** The user says rerunning it would duplicate data.

**How to apply:** If history is absent, confirm which database contains the migrated history and verify the application's connection target instead of copying the history again. Student fee data stays in BigQuery, which the portal only reads.
