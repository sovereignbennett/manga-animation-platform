# MotionCut Studio System Boundaries (v1.0)

## Purpose

MotionCut Studio is composed of independent systems that communicate through stable interfaces.

Each system owns a specific responsibility.

Responsibilities should not overlap.

---

## Frontend

Responsible for:

- User interface
- Editing experience
- Canvas
- Timeline
- Layers
- Playback
- Animation
- Keyboard shortcuts
- Local state
- User interaction

The frontend must never contain infrastructure concerns.

---

## Backend

Responsible for:

- Project persistence
- Autosave
- AI
- Export processing
- Asset management
- Authentication
- User accounts
- MCP
- Storage
- Logging
- Background processing

The backend must never own editor behaviour.

---

## Database

Responsible only for storing and retrieving data.

Business logic should not live inside the database.

---

## Storage

Responsible for:

- Uploaded assets
- Generated exports
- Project files
- Temporary processing
- Future cloud storage

Storage implementation should be replaceable.

---

## AI Layer

The AI layer provides MotionCut Studio AI capabilities.

Providers are implementation details.

The frontend communicates only with MotionCut Studio APIs.

---

## MCP Layer

The MCP server exposes MotionCut Studio functionality.

The implementation must be owned by MotionCut Studio.

It must not depend on Lovable runtime packages.

---

## Export Engine

The export engine is independent from the editor.

It may support:

- Local rendering
- Background workers
- Cloud rendering
- Distributed rendering
- GPU rendering

without changing frontend behaviour.

---

## Asset Pipeline

Every imported asset passes through a central asset pipeline.

The pipeline manages:

- Metadata
- Validation
- Hashing
- Preview generation
- Optimisation
- Storage

---

## Design Rule

Features communicate through services.

Services communicate through interfaces.

Implementations may change.

Interfaces should remain stable.