---
name: Dependency security overrides
description: Why security overrides are scoped to a parent rather than applied globally.
---

Prefer compatible parent upgrades. If the latest parent still requires a vulnerable dependency and a major-version override is necessary, scope it to that parent.

**Why:** Nodemon's latest release still required a vulnerable minimatch major when remediation was performed. A global override would also change unrelated glob consumers and increase compatibility risk.

**How to apply:** Check the latest parent's dependency range before retaining an override. Remove it when upstream supports a patched release normally. Verify the parent's watch, ignore, and extension matching when changing minimatch.
