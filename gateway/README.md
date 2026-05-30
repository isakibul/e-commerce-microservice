# Legacy Express Gateway

This folder is archived reference material from the earlier custom gateway
implementation. It is not part of the active runtime, CI verify command, or
Docker Compose stack.

The active public edge gateway is Kong, configured from `infra/kong/` and
documented in `docs/KONG.md`.

Keep this folder only for migration/history context. New gateway behavior should
be implemented through Kong configuration or active service code.
