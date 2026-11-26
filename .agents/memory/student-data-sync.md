---
name: Student data sync scope
description: User-selected direction, frequency, and read source for student-data synchronization.
---

Copy student fee and payment data from BigQuery to Neon every day. Keep the portal reading BigQuery.

**Why:** The user explicitly selected student fee/payment data, daily synchronization, and “Keep reading BigQuery.”

**How to apply:** Treat this as a one-way data mirror, not a switch of the application's read source. Keep it separate from the previously completed analytics-history migration and do not rerun that migration.
