# Planning — Workspace Index

Planning workspace for Empowr Members. Each concern lives in its own subdirectory.

| Subdirectory | Contains |
|---|---|
| `spec/` | Product spec — what we're building: scope, offering types, business rules, membership model, build phases, open questions |
| `architecture/` | System design — stack, data model, Supabase access patterns, Stripe payment flows, waiver-gate mechanism |
| `decisions/` | ADR log — dated decision records with rationale |

Read `spec/CONTEXT.md` before designing; read `architecture/CONTEXT.md` before writing any schema or integration code.
