# MotionCut Studio Implementation Rules

## The editor must not be rewritten.

The existing frontend architecture is considered stable.

Do not redesign the editor.

Do not replace Zustand.

Do not replace TanStack Router.

Do not change existing editor behaviour.

Extend existing systems instead of replacing them.

---

## The backend must enhance the frontend.

The backend is responsible for:

- persistence
- AI
- exports
- assets
- MCP
- storage

The frontend should require only minimal integration changes.

---

## AI

Move provider-specific implementations to the backend.

The frontend should only call MotionCut Studio APIs.

---

## MCP

Replace Lovable runtime dependencies.

Preserve public MCP functionality.

Implement a MotionCut Studio owned MCP server.

---

## Architecture

Follow ARCHITECTURE.md.

Follow SYSTEM_BOUNDARIES.md.

Do not introduce vendor lock-in.

Design for long-term maintainability.