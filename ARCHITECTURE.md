```markdown
# MotionCut Studio Architecture Principles (v1.0)

## Vision

MotionCut Studio is a browser-based animation editor for anime, manga and illustration creators.

The frontend owns the editing experience.

The backend provides services that enhance the editor without changing how it behaves.

The editor experience should remain consistent regardless of how backend services evolve.

---

## Frontend Responsibilities

The frontend is responsible for:

- Editor UI
- Canvas rendering
- Timeline
- Layers
- Animation system
- Playback
- Zustand state management
- Toolbars
- Keyboard shortcuts
- Property panels
- Export user interface
- Project interaction
- Client-side rendering
- Real-time editing

The frontend must never contain:

- API keys
- Secrets
- Provider-specific logic
- Database credentials
- Storage credentials

The frontend must remain responsive and continue to function independently of backend implementation details.

---

## Backend Responsibilities

The backend is responsible for:

- Project persistence
- Autosave
- Project versioning
- Asset management
- Export processing
- AI services
- MCP server
- Authentication (future)
- User accounts (future)
- Collaboration (future)
- Logging
- Database
- File storage
- Background workers
- Job queues
- Monitoring

The backend exists to enhance the frontend without requiring editor rewrites.

---

## AI Principles

The frontend never communicates directly with AI providers.

All AI requests pass through the MotionCut Studio backend.

The backend owns all API keys and provider configuration.

AI providers must be interchangeable behind a common service interface.

The frontend should never know which AI provider is being used.

---

## MCP Principles

MotionCut Studio exposes a public MCP server.

The MCP server is a MotionCut Studio feature.

It must not depend on Lovable runtime packages.

Its implementation should remain provider-independent.

The MCP implementation should be owned entirely by MotionCut Studio.

---

## Technology Decisions

### Core Technologies

- React
- TypeScript
- TanStack
- Zustand
- PixiJS
- Framer Motion
- Railway

These technologies are considered core platform dependencies.

---

## De-Lovable Strategy

### Remove

- Lovable runtime dependencies
- Lovable AI Gateway
- Lovable-specific runtime helpers
- Lovable platform lock-in

### Replace

- Lovable MCP runtime → MotionCut Studio MCP implementation
- Lovable AI integration → MotionCut Studio AI Service

### Retain

- Useful workflows that improve MotionCut Studio
- Open standards such as MCP
- Framework-agnostic implementations
- Good engineering patterns regardless of origin

---

## Architecture Goals

MotionCut Studio should be:

- Production-ready
- Framework-independent where practical
- AI-provider independent
- Cloud-ready
- Offline-capable where practical
- Modular
- Extensible
- Maintainable
- Replaceable
- Scalable

Every subsystem should be replaceable without requiring major changes elsewhere in the application.

---

## Project Ownership

MotionCut Studio owns its architecture.

Third-party libraries are implementation details, not platform dependencies.

External services may be replaced without affecting the editor experience.

No single vendor should be required for MotionCut Studio to operate.

MotionCut Studio should always be deployable independently of any proprietary development platform.

---

## Engineering Principles

- Extend the editor rather than rewrite it.
- Preserve existing frontend behaviour.
- Separate UI from services.
- Prefer composition over duplication.
- Keep systems modular and replaceable.
- Design for future cloud scaling.
- Prefer interfaces over concrete implementations.
- Isolate third-party dependencies behind service abstractions.
- Keep business logic independent from UI components.
- Design APIs that remain stable as implementations evolve.

---

## Product Vision

MotionCut Studio is not just an animation editor.

It is a platform for creating, editing and exporting anime, manga and illustration-based animations.

Future capabilities may include:

- AI-assisted rigging
- AI-assisted animation
- Character templates
- Cloud rendering
- Collaboration
- Asset marketplace
- Plugin ecosystem
- Mobile companion applications
- Public API
- Team workspaces
- Creator cloud storage

These capabilities should be added through modular services without requiring major architectural changes.

---

## Core Principle

Every architectural decision should preserve the editor experience while improving the platform underneath it.

The frontend owns the creative workflow.

The backend provides capabilities.

Both should evolve independently through well-defined interfaces.
```
