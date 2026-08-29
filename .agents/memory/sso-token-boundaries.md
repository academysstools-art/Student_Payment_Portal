---
name: SSO token boundaries
description: Security invariants for student authentication and payment-data access.
---

Production student access must follow one path: a protected server-to-server request issues a five-minute handoff JWT, PostgreSQL stores and atomically consumes it once, and the exchange issues a typed 24-hour student session JWT. Only the typed student session may authorize payment APIs. Direct user-ID login must remain disabled unless an explicit development-only flag is set.

**Why:** A public user-ID login and middleware that accepted every valid JWT allowed student impersonation and let handoff tokens bypass one-time database consumption.

**How to apply:** Keep production direct-login flags unset, require the session token type on payment routes, fail closed when token storage is unavailable, and never mint a handoff token from a public callback containing only a user ID.