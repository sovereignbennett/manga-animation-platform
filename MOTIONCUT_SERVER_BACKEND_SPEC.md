# MotionCut Server Backend Implementation Specification

Version: 1.0

This document is the sole implementation guide for MotionCut Server. It defines the backend required to support the current MotionCut Studio frontend without rewriting the editor.

MotionCut Studio owns the browser editing experience. MotionCut Server owns persistence, assets, AI, export processing, authentication, MCP, storage, logging, and background processing. The backend must enhance the frontend through stable MotionCut APIs and must not take ownership of editor behavior such as canvas interaction, timeline playback, selection, layer editing, undo, redo, or keyboard shortcuts.

## Required Outcome

Implement a production-ready backend named MotionCut Server with:

- HTTP API for projects, assets, AI segmentation, exports, accounts, and metadata.
- MotionCut-owned MCP server with no Lovable runtime dependency.
- PostgreSQL persistence.
- Cloudflare R2-compatible storage abstraction.
- Background workers and queues for AI, asset processing, autosave, and exports.
- Railway-ready deployment.
- Stable contracts that match the current frontend models.

Do not require the frontend to know which storage provider, AI provider, queue, or export engine is used.

## Technology Recommendation

Use TypeScript on Node.js.

Recommended stack:

- Runtime: Node.js 22 LTS.
- HTTP framework: Fastify.
- Validation: Zod.
- Database: PostgreSQL.
- ORM/query layer: Prisma or Drizzle. Prefer Drizzle if a lightweight SQL-first style is desired.
- Queue: BullMQ with Redis.
- Storage: S3-compatible client targeting Cloudflare R2.
- Auth: Clerk, Auth.js, or custom JWT. The API contract below assumes JWT bearer tokens and can be backed by any auth provider.
- Logging: Pino.
- Metrics: OpenTelemetry with Prometheus-compatible export.
- Export engine: worker process using Playwright/Chromium plus ffmpeg for video formats.
- MCP: Official Model Context Protocol TypeScript SDK, not `@lovable.dev/mcp-js`.

## Folder Structure

```text
motioncut-server/
  package.json
  tsconfig.json
  src/
    app.ts
    server.ts
    config/
      env.ts
      cors.ts
      logger.ts
    auth/
      auth.middleware.ts
      auth.service.ts
      roles.ts
      session.types.ts
    api/
      routes/
        health.routes.ts
        auth.routes.ts
        projects.routes.ts
        assets.routes.ts
        ai.routes.ts
        exports.routes.ts
        mcp.routes.ts
        metadata.routes.ts
      schemas/
        common.schemas.ts
        project.schemas.ts
        asset.schemas.ts
        ai.schemas.ts
        export.schemas.ts
        metadata.schemas.ts
    domain/
      projects/
        project.model.ts
        project.repository.ts
        project.service.ts
        project.validators.ts
      assets/
        asset.model.ts
        asset.repository.ts
        asset.service.ts
        asset.pipeline.ts
        mime.ts
      ai/
        ai-provider.interface.ts
        ai.service.ts
        segmentation.service.ts
        providers/
          openai-vision.provider.ts
          replicate-segmentation.provider.ts
          mock.provider.ts
      exports/
        export.model.ts
        export.service.ts
        render.service.ts
        formats.ts
      metadata/
        animation-presets.ts
        body-parts.ts
        easing.ts
        effects.ts
        keyboard-shortcuts.ts
    mcp/
      mcp.server.ts
      mcp.transport.ts
      tools/
        list-animation-presets.tool.ts
        list-easing-functions.tool.ts
        list-export-formats.tool.ts
        list-effects.tool.ts
        list-keyboard-shortcuts.tool.ts
        list-body-parts.tool.ts
        create-export.tool.ts
        get-project.tool.ts
    storage/
      storage.interface.ts
      r2.storage.ts
      local.storage.ts
      signed-url.service.ts
    queues/
      queue.client.ts
      jobs.ts
      producers.ts
      workers/
        asset.worker.ts
        ai.worker.ts
        export.worker.ts
        autosave.worker.ts
    db/
      client.ts
      schema.ts
      migrations/
    observability/
      request-id.ts
      metrics.ts
      tracing.ts
      audit-log.service.ts
    errors/
      http-error.ts
      error-codes.ts
      error-handler.ts
    utils/
      ids.ts
      clocks.ts
      hashes.ts
      pagination.ts
```

## Core API Principles

Base URL:

```text
/api/v1
```

All JSON responses use:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_...",
    "version": "v1"
  }
}
```

Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {},
    "requestId": "req_..."
  }
}
```

HTTP status guidance:

- `200`: successful read or update.
- `201`: resource created.
- `202`: async job accepted.
- `204`: successful delete with no body.
- `400`: malformed request.
- `401`: missing or invalid authentication.
- `403`: authenticated but not allowed.
- `404`: resource not found or not visible to user.
- `409`: version conflict or duplicate resource.
- `413`: upload too large.
- `415`: unsupported media type.
- `422`: valid JSON but domain validation failed.
- `429`: rate limit exceeded.
- `500`: unhandled server error.
- `503`: provider, queue, database, or storage unavailable.

Every mutating endpoint must accept an optional `Idempotency-Key` header. The server stores the key per user, route, and request hash for at least 24 hours.

## Authentication Strategy

Phase 1 must support anonymous local development and authenticated production.

Production:

- Use `Authorization: Bearer <jwt>`.
- Validate issuer, audience, expiry, and signature.
- Map each JWT subject to a `users` row.
- Create users lazily on first authenticated request.
- All project, asset, export, and job resources are user-scoped.

Development:

- If `AUTH_MODE=dev`, accept `x-dev-user-id`.
- The dev user must still be represented in the database.

Authorization:

- User can access only owned projects and assets.
- Future team access is represented through memberships but not required by the frontend.
- Admin-only endpoints are outside this specification.

## Canonical Frontend Models

The backend must persist these models without changing their behavior.

### Project

```ts
interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  layers: Layer[];
  order: string[];
  canvasWidth: number;
  canvasHeight: number;
}
```

Timestamps in API responses must be epoch milliseconds to match the current frontend. The database may store `timestamptz`.

### Layer

```ts
interface Layer {
  id: string;
  name: string;
  parentId: string | null;
  kind: "image" | "group";
  mediaType?: "image" | "video";
  src?: string;
  videoDurationSec?: number;
  mask?: string;
  bodyPart?: BodyPartKind;
  bodyPartConfidence?: number;
  pivotSuggestion?: { x: number; y: number };
  sourceLayerId?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  anchorX: number;
  anchorY: number;
  opacity: number;
  blendMode: "normal" | "multiply" | "screen" | "overlay" | "add" | "lighten" | "darken";
  visible: boolean;
  locked: boolean;
  keyframes?: Keyframes;
  effects?: LayerEffect[];
}
```

Backend persistence must allow `src` and `mask` to be either legacy data URLs or server asset URLs. New uploads should use asset URLs, not database-stored base64 blobs.

### Segmentation

Use the exact frontend contract:

```ts
type BodyPartKind =
  | "hair_front" | "hair_back" | "head" | "face" | "eyes" | "mouth"
  | "torso"
  | "arm_left_upper" | "arm_left_lower" | "hand_left"
  | "arm_right_upper" | "arm_right_lower" | "hand_right"
  | "leg_left_upper" | "leg_left_lower" | "foot_left"
  | "leg_right_upper" | "leg_right_lower" | "foot_right"
  | "accessory" | "background" | "foreground" | "unknown";

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Mask {
  data: string;
  bounds: BBox;
  width: number;
  height: number;
}

interface SegmentedPart {
  id: string;
  kind: BodyPartKind;
  label: string;
  confidence: number;
  bbox: BBox;
  mask?: Mask;
  suggestedPivot?: { x: number; y: number };
}

interface SegmentationResult {
  sourceWidth: number;
  sourceHeight: number;
  provider: string;
  foreground?: Mask;
  parts: SegmentedPart[];
  modelTag?: string;
  durationMs: number;
}
```

## API Endpoints

### Health

#### `GET /api/v1/health`

Authentication: none.

Response:

```json
{
  "data": {
    "status": "ok",
    "time": 1784280000000,
    "services": {
      "database": "ok",
      "redis": "ok",
      "storage": "ok"
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `503 SERVICE_UNAVAILABLE` if any required dependency is down.

### Current User

#### `GET /api/v1/me`

Authentication: required.

Response:

```json
{
  "data": {
    "id": "usr_123",
    "email": "creator@example.com",
    "displayName": "Creator",
    "createdAt": 1784280000000
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `401 AUTH_REQUIRED`
- `401 AUTH_INVALID`

## Project Persistence

The frontend currently autosaves one project to localStorage. MotionCut Server must support cloud persistence with minimal frontend integration.

### `POST /api/v1/projects`

Create a project.

Authentication: required.

Request:

```json
{
  "name": "Untitled Project",
  "canvasWidth": 1080,
  "canvasHeight": 1920,
  "initialState": {
    "layers": [],
    "order": []
  }
}
```

Validation:

- `name`: string, 1-120 chars after trim.
- `canvasWidth`: integer, 16-8192.
- `canvasHeight`: integer, 16-8192.
- `initialState.layers`: array of valid Layer objects.
- `initialState.order`: array of layer ids. Each id must exist in `layers`.

Response `201`:

```json
{
  "data": {
    "project": {
      "id": "prj_123",
      "name": "Untitled Project",
      "createdAt": 1784280000000,
      "updatedAt": 1784280000000,
      "layers": [],
      "order": [],
      "canvasWidth": 1080,
      "canvasHeight": 1920
    },
    "version": 1
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `413 PROJECT_TOO_LARGE`

Extensibility:

- Add `workspaceId`, `templateId`, and `collaborationMode` later without changing the project shape.

### `GET /api/v1/projects`

List projects for the current user.

Authentication: required.

Query:

- `limit`: integer, default 20, max 100.
- `cursor`: opaque pagination cursor.

Response:

```json
{
  "data": {
    "projects": [
      {
        "id": "prj_123",
        "name": "Untitled Project",
        "createdAt": 1784280000000,
        "updatedAt": 1784280100000,
        "canvasWidth": 1080,
        "canvasHeight": 1920,
        "layerCount": 4,
        "thumbnailUrl": "https://..."
      }
    ],
    "nextCursor": null
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `401 AUTH_REQUIRED`

### `GET /api/v1/projects/:projectId`

Get full project state.

Authentication: required.

Response:

```json
{
  "data": {
    "project": {
      "id": "prj_123",
      "name": "Untitled Project",
      "createdAt": 1784280000000,
      "updatedAt": 1784280100000,
      "layers": [],
      "order": [],
      "canvasWidth": 1080,
      "canvasHeight": 1920
    },
    "version": 7
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`

### `PUT /api/v1/projects/:projectId`

Replace full project state. This is the primary autosave endpoint.

Authentication: required.

Headers:

- `If-Match: <version>` recommended.

Request:

```json
{
  "project": {
    "id": "prj_123",
    "name": "Scene 01",
    "createdAt": 1784280000000,
    "updatedAt": 1784280100000,
    "layers": [],
    "order": [],
    "canvasWidth": 1080,
    "canvasHeight": 1920
  },
  "clientRevision": "rev_abc"
}
```

Validation:

- Project id in body must match path.
- All layers must validate against the canonical Layer contract.
- `order` must contain only existing layer ids.
- Group `parentId` references must point to group layers or `null`.
- `opacity`, `anchorX`, and `anchorY`: 0-1.
- `scaleX` and `scaleY`: finite numbers, -100 to 100.
- `rotation`: finite number.
- `canvasWidth` and `canvasHeight`: integer, 16-8192.
- Reject project JSON over configured size limit.

Response:

```json
{
  "data": {
    "project": { "id": "prj_123", "name": "Scene 01", "createdAt": 1784280000000, "updatedAt": 1784280200000, "layers": [], "order": [], "canvasWidth": 1080, "canvasHeight": 1920 },
    "version": 8,
    "savedAt": 1784280200000
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`
- `409 VERSION_CONFLICT`
- `413 PROJECT_TOO_LARGE`

Extensibility:

- Future collaboration can replace full-state autosave with patch events while keeping this endpoint as a snapshot checkpoint.

### `PATCH /api/v1/projects/:projectId`

Patch project metadata only.

Authentication: required.

Request:

```json
{
  "name": "Scene 02",
  "canvasWidth": 1920,
  "canvasHeight": 1080,
  "thumbnailAssetId": "ast_123"
}
```

Response:

```json
{
  "data": {
    "project": {
      "id": "prj_123",
      "name": "Scene 02",
      "updatedAt": 1784280300000,
      "canvasWidth": 1920,
      "canvasHeight": 1080,
      "thumbnailUrl": "https://..."
    },
    "version": 9
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`

### `POST /api/v1/projects/:projectId/versions`

Create a named project version snapshot.

Authentication: required.

Request:

```json
{
  "label": "Before Magic Cut",
  "project": { "id": "prj_123", "name": "Scene 01", "createdAt": 1784280000000, "updatedAt": 1784280100000, "layers": [], "order": [], "canvasWidth": 1080, "canvasHeight": 1920 }
}
```

Response `201`:

```json
{
  "data": {
    "version": {
      "id": "pver_123",
      "projectId": "prj_123",
      "number": 10,
      "label": "Before Magic Cut",
      "createdAt": 1784280400000
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`
- `413 PROJECT_TOO_LARGE`

### `GET /api/v1/projects/:projectId/versions`

List project versions.

Authentication: required.

Response:

```json
{
  "data": {
    "versions": [
      { "id": "pver_123", "number": 10, "label": "Before Magic Cut", "createdAt": 1784280400000 }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/projects/:projectId/versions/:versionId`

Get one version snapshot.

Authentication: required.

Response:

```json
{
  "data": {
    "project": { "id": "prj_123", "name": "Scene 01", "createdAt": 1784280000000, "updatedAt": 1784280100000, "layers": [], "order": [], "canvasWidth": 1080, "canvasHeight": 1920 },
    "version": { "id": "pver_123", "number": 10, "label": "Before Magic Cut", "createdAt": 1784280400000 }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `DELETE /api/v1/projects/:projectId`

Soft-delete a project.

Authentication: required.

Response: `204`.

Errors:

- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`

## Asset Pipeline

Every imported asset must pass through the central asset pipeline.

Pipeline stages:

1. Validate content type and size.
2. Compute SHA-256 hash.
3. Store original in R2.
4. Extract metadata: width, height, duration, frame rate, alpha support, byte size.
5. Generate preview thumbnail for images and videos.
6. Optionally optimize large images for editor-friendly loading.
7. Persist asset row and processing status.
8. Return asset URLs or signed access URLs.

Supported input:

- Images: PNG, JPEG, WebP.
- Video: MP4, WebM, MOV when ffmpeg can decode.
- Maximum file size configurable. Default image max 50 MB, video max 500 MB.

### `POST /api/v1/assets/uploads`

Create a direct upload session.

Authentication: required.

Request:

```json
{
  "filename": "character.png",
  "contentType": "image/png",
  "byteSize": 2438921,
  "projectId": "prj_123",
  "purpose": "layer-source"
}
```

Validation:

- `contentType` must be allowlisted.
- `byteSize` must be within plan and type limits.
- `purpose`: `"layer-source" | "mask" | "thumbnail" | "export-source" | "temporary"`.
- `projectId` must belong to the current user if provided.

Response `201`:

```json
{
  "data": {
    "upload": {
      "id": "upl_123",
      "assetId": "ast_123",
      "method": "PUT",
      "url": "https://r2-upload-url",
      "headers": {
        "content-type": "image/png"
      },
      "expiresAt": 1784280900000
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `413 ASSET_TOO_LARGE`
- `415 UNSUPPORTED_MEDIA_TYPE`

### `POST /api/v1/assets/uploads/:uploadId/complete`

Finalize an upload and enqueue asset processing.

Authentication: required.

Request:

```json
{
  "etag": "abc123",
  "sha256": "optional-client-hash"
}
```

Response `202`:

```json
{
  "data": {
    "asset": {
      "id": "ast_123",
      "projectId": "prj_123",
      "filename": "character.png",
      "contentType": "image/png",
      "byteSize": 2438921,
      "status": "processing",
      "url": "https://...",
      "previewUrl": null,
      "width": null,
      "height": null,
      "durationSec": null,
      "createdAt": 1784280900000
    },
    "jobId": "job_123"
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `401 AUTH_REQUIRED`
- `404 UPLOAD_NOT_FOUND`
- `409 UPLOAD_ALREADY_COMPLETED`
- `503 STORAGE_UNAVAILABLE`

### `POST /api/v1/assets`

Server-side multipart upload alternative.

Authentication: required.

Request: multipart form data:

- `file`: binary.
- `projectId`: optional string.
- `purpose`: asset purpose.

Response `201` or `202`:

```json
{
  "data": {
    "asset": {
      "id": "ast_123",
      "projectId": "prj_123",
      "filename": "character.png",
      "contentType": "image/png",
      "byteSize": 2438921,
      "status": "ready",
      "url": "https://...",
      "previewUrl": "https://...",
      "width": 1024,
      "height": 1024,
      "durationSec": null,
      "createdAt": 1784280900000
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/assets`

List assets.

Authentication: required.

Query:

- `projectId`: optional.
- `purpose`: optional.
- `status`: optional.
- `limit`: default 50, max 100.
- `cursor`: optional.

Response:

```json
{
  "data": {
    "assets": [
      {
        "id": "ast_123",
        "projectId": "prj_123",
        "filename": "character.png",
        "contentType": "image/png",
        "byteSize": 2438921,
        "status": "ready",
        "url": "https://...",
        "previewUrl": "https://...",
        "width": 1024,
        "height": 1024,
        "durationSec": null,
        "createdAt": 1784280900000
      }
    ],
    "nextCursor": null
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/assets/:assetId`

Authentication: required.

Response:

```json
{
  "data": {
    "asset": {
      "id": "ast_123",
      "projectId": "prj_123",
      "filename": "character.png",
      "contentType": "image/png",
      "byteSize": 2438921,
      "status": "ready",
      "url": "https://...",
      "previewUrl": "https://...",
      "width": 1024,
      "height": 1024,
      "durationSec": null,
      "metadata": {
        "sha256": "..."
      },
      "createdAt": 1784280900000
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `POST /api/v1/assets/:assetId/signed-url`

Create a short-lived read URL.

Authentication: required.

Request:

```json
{
  "operation": "read",
  "expiresInSeconds": 900
}
```

Response:

```json
{
  "data": {
    "url": "https://signed-r2-url",
    "expiresAt": 1784281800000
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `DELETE /api/v1/assets/:assetId`

Soft-delete an asset.

Authentication: required.

Response: `204`.

Rules:

- Do not physically delete immediately if project snapshots or exports still reference the asset.
- Mark as deleted and let retention cleanup purge unreferenced objects later.

## AI Service Architecture

The frontend must never call AI providers directly. The backend exposes MotionCut APIs only.

Use this interface internally:

```ts
interface AiProvider {
  id: string;
  detectBodyParts(input: DetectBodyPartsInput): Promise<DetectBodyPartsOutput>;
  segmentForeground?(input: SegmentForegroundInput): Promise<Mask>;
  segmentParts?(input: SegmentPartsInput): Promise<SegmentedPart[]>;
}
```

Provider configuration is environment-driven. The response contract must remain stable if OpenAI, Replicate, local models, or another provider is swapped in.

### `GET /api/v1/ai/capabilities`

Authentication: required.

Response:

```json
{
  "data": {
    "providers": [
      {
        "id": "motioncut-ai",
        "displayName": "MotionCut AI",
        "clientSide": false,
        "producesPartMasks": false,
        "costTier": "cheap",
        "strategies": ["parts", "hybrid"]
      }
    ],
    "bodyPartKinds": ["hair_front", "hair_back", "head", "face", "eyes", "mouth", "torso", "arm_left_upper", "arm_left_lower", "hand_left", "arm_right_upper", "arm_right_lower", "hand_right", "leg_left_upper", "leg_left_lower", "foot_left", "leg_right_upper", "leg_right_lower", "foot_right", "accessory", "background", "foreground", "unknown"]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `POST /api/v1/ai/body-parts/detect`

Replacement for the removed `segmentation.functions.ts` server function.

Authentication: required.

Request:

```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "imageAssetId": "ast_123",
  "imageWidth": 1024,
  "imageHeight": 1024,
  "restrictTo": ["head", "torso"],
  "options": {
    "includeMasks": false,
    "confidenceThreshold": 0.35
  }
}
```

Rules:

- Accept exactly one image source: `imageDataUrl` or `imageAssetId`.
- `imageDataUrl` exists for current frontend compatibility.
- New frontend integrations should prefer `imageAssetId`.
- `imageWidth` and `imageHeight` are required when `imageDataUrl` is used.
- Server must independently validate and decode image data.

Validation:

- `imageDataUrl`: PNG, JPEG, or WebP data URL. Max decoded bytes configurable. Default 15 MB for direct AI body-part calls.
- `imageAssetId`: must belong to user.
- `imageWidth` and `imageHeight`: integers, 16-8192.
- `restrictTo`: known BodyPartKind values only.
- `confidenceThreshold`: number 0-1.

Response:

```json
{
  "data": {
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "provider": "motioncut-ai",
    "parts": [
      {
        "id": "part_m9wv_0",
        "kind": "head",
        "label": "Head",
        "confidence": 0.93,
        "bbox": { "x": 401, "y": 96, "width": 220, "height": 240 },
        "suggestedPivot": { "x": 511, "y": 336 }
      }
    ],
    "modelTag": "motioncut-ai/body-parts@2026-07-17",
    "durationMs": 1380
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `413 IMAGE_TOO_LARGE`
- `415 UNSUPPORTED_MEDIA_TYPE`
- `422 AI_NO_CHARACTER_FOUND`
- `429 AI_RATE_LIMITED`
- `503 AI_PROVIDER_UNAVAILABLE`

Extensibility:

- When true part masks are available, populate `mask` on each `SegmentedPart`.
- The frontend can keep using the same `SegmentationResult` contract.

### `POST /api/v1/ai/segmentation`

Full server-side segmentation endpoint. This supports future movement of the hybrid pipeline entirely to the backend.

Authentication: required.

Request:

```json
{
  "strategy": "hybrid",
  "imageDataUrl": "data:image/png;base64,...",
  "imageAssetId": "ast_123",
  "foregroundOnly": false,
  "restrictTo": [],
  "options": {
    "includeForeground": true,
    "includePartMasks": false,
    "confidenceThreshold": 0.35
  }
}
```

Validation:

- `strategy`: `"foreground" | "parts" | "hybrid"`.
- Exactly one image source.
- `restrictTo`: known body parts.

Response:

```json
{
  "data": {
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "provider": "hybrid",
    "foreground": {
      "data": "data:image/png;base64,...",
      "bounds": { "x": 112, "y": 40, "width": 790, "height": 940 },
      "width": 1024,
      "height": 1024
    },
    "parts": [],
    "modelTag": "hybrid(motioncut-fg@1+motioncut-ai/body-parts@2026-07-17)",
    "durationMs": 2600
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- Same as body-part detection plus `503 SEGMENTATION_PROVIDER_UNAVAILABLE`.

### `POST /api/v1/ai/segmentation/jobs`

Create async segmentation job for large images or slow providers.

Authentication: required.

Request: same as `/api/v1/ai/segmentation`.

Response `202`:

```json
{
  "data": {
    "job": {
      "id": "job_seg_123",
      "type": "ai.segmentation",
      "status": "queued",
      "progress": 0,
      "createdAt": 1784281000000
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/jobs/:jobId`

Get any async job.

Authentication: required.

Response:

```json
{
  "data": {
    "job": {
      "id": "job_seg_123",
      "type": "ai.segmentation",
      "status": "succeeded",
      "progress": 1,
      "stage": "Done",
      "result": {},
      "error": null,
      "createdAt": 1784281000000,
      "updatedAt": 1784281020000
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Job statuses:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

### `POST /api/v1/jobs/:jobId/cancel`

Authentication: required.

Response:

```json
{
  "data": {
    "job": {
      "id": "job_seg_123",
      "status": "cancelled",
      "progress": 0.42
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

## Export Pipeline

The frontend currently renders exports client-side from Pixi. MotionCut Server must support background cloud export while leaving client-side export available.

Server export inputs:

- Project snapshot.
- Format.
- Frame range or single frame.
- Output size.
- FPS.
- Transparency flag.

Important rule:

The backend export engine must reproduce frontend rendering semantics. It must not redefine animation, sampling, effects, blend modes, order, anchors, or layer transforms. Prefer using the same TypeScript sampling/easing/effects logic in a shared package when the backend is implemented.

### `POST /api/v1/exports`

Create an export job.

Authentication: required.

Request:

```json
{
  "projectId": "prj_123",
  "projectSnapshot": {
    "id": "prj_123",
    "name": "Scene 01",
    "createdAt": 1784280000000,
    "updatedAt": 1784280100000,
    "layers": [],
    "order": [],
    "canvasWidth": 1080,
    "canvasHeight": 1920
  },
  "format": "mp4",
  "frame": 0,
  "from": 0,
  "to": 90,
  "step": 1,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "transparent": false,
  "filename": "scene-01"
}
```

Validation:

- `format`: `"png" | "pngTransparent" | "mp4" | "gif" | "spritesheet"`.
- `projectId` is required.
- `projectSnapshot` is optional; if omitted, use latest saved project.
- For PNG formats, `frame` is required.
- For animated formats, `from`, `to`, `fps`, and `step` are required.
- `from >= 0`.
- `to >= from`.
- `step >= 1`.
- `fps`: 1-120.
- `width` and `height`: 16-8192.
- Max frames and max pixels configurable by plan.

Response `202`:

```json
{
  "data": {
    "export": {
      "id": "exp_123",
      "projectId": "prj_123",
      "format": "mp4",
      "status": "queued",
      "progress": 0,
      "stage": "Queued",
      "createdAt": 1784281000000,
      "outputAssetId": null,
      "downloadUrl": null
    },
    "jobId": "job_exp_123"
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Errors:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`
- `422 EXPORT_RANGE_INVALID`
- `429 EXPORT_RATE_LIMITED`

Extensibility:

- Add render profiles, GPU rendering, distributed rendering, team quotas, and watermark policies without changing the frontend export model.

### `GET /api/v1/exports`

List exports.

Authentication: required.

Query:

- `projectId`: optional.
- `limit`: default 20, max 100.
- `cursor`: optional.

Response:

```json
{
  "data": {
    "exports": [
      {
        "id": "exp_123",
        "projectId": "prj_123",
        "format": "mp4",
        "status": "succeeded",
        "progress": 1,
        "stage": "Done",
        "createdAt": 1784281000000,
        "completedAt": 1784281120000,
        "outputAssetId": "ast_export_123",
        "downloadUrl": "https://..."
      }
    ],
    "nextCursor": null
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/exports/:exportId`

Authentication: required.

Response:

```json
{
  "data": {
    "export": {
      "id": "exp_123",
      "projectId": "prj_123",
      "format": "mp4",
      "status": "succeeded",
      "progress": 1,
      "stage": "Done",
      "createdAt": 1784281000000,
      "completedAt": 1784281120000,
      "outputAssetId": "ast_export_123",
      "downloadUrl": "https://...",
      "error": null
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `POST /api/v1/exports/:exportId/cancel`

Authentication: required.

Response:

```json
{
  "data": {
    "export": {
      "id": "exp_123",
      "status": "cancelled",
      "progress": 0.5
    }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/exports/:exportId/download`

Authentication: required.

Response:

- `302` redirect to signed R2 URL, or
- `200` JSON with signed URL:

```json
{
  "data": {
    "url": "https://signed-r2-url",
    "expiresAt": 1784281800000
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

## Metadata Endpoints

These endpoints mirror local frontend constants and MCP reference tools.

### `GET /api/v1/metadata/animation-presets`

Authentication: optional.

Response:

```json
{
  "data": {
    "presets": [
      {
        "id": "pop-in",
        "name": "Pop In",
        "description": "One-click animation preset.",
        "durationFrames": 20,
        "animatedProps": ["scaleX", "scaleY", "opacity"]
      }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

The backend may include the full preset tracks when requested with `?includeTracks=true`. The default response should stay compact for MCP and reference UI usage.

### `GET /api/v1/metadata/body-parts`

Authentication: optional.

Response:

```json
{
  "data": {
    "parts": [
      { "id": "hair_front", "label": "Hair (Front)" },
      { "id": "hair_back", "label": "Hair (Back)" },
      { "id": "head", "label": "Head" },
      { "id": "face", "label": "Face" },
      { "id": "eyes", "label": "Eyes" },
      { "id": "mouth", "label": "Mouth" },
      { "id": "torso", "label": "Torso" },
      { "id": "arm_left_upper", "label": "L Upper Arm" },
      { "id": "arm_left_lower", "label": "L Forearm" },
      { "id": "hand_left", "label": "L Hand" },
      { "id": "arm_right_upper", "label": "R Upper Arm" },
      { "id": "arm_right_lower", "label": "R Forearm" },
      { "id": "hand_right", "label": "R Hand" },
      { "id": "leg_left_upper", "label": "L Thigh" },
      { "id": "leg_left_lower", "label": "L Shin" },
      { "id": "foot_left", "label": "L Foot" },
      { "id": "leg_right_upper", "label": "R Thigh" },
      { "id": "leg_right_lower", "label": "R Shin" },
      { "id": "foot_right", "label": "R Foot" },
      { "id": "accessory", "label": "Accessory" },
      { "id": "background", "label": "Background" },
      { "id": "foreground", "label": "Foreground" },
      { "id": "unknown", "label": "Unknown" }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/metadata/easing-functions`

Response:

```json
{
  "data": {
    "easings": ["linear", "easeInQuad", "easeOutQuad", "easeInOutQuad", "easeInCubic", "easeOutCubic", "easeInOutCubic", "easeInBack", "easeOutBack", "easeInOutBack", "easeOutElastic", "easeOutBounce", "hold"]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/metadata/effects`

Response:

```json
{
  "data": {
    "effects": [
      { "id": "glow", "name": "Glow", "description": "Outer glow with configurable color and strength." },
      { "id": "motionBlur", "name": "Motion Blur", "description": "Directional blur to sell fast movement." },
      { "id": "chromatic", "name": "Chromatic Aberration", "description": "RGB channel split for cinematic edge fringing." },
      { "id": "shake", "name": "Shake", "description": "Layer shake modulation for impact frames." },
      { "id": "impact", "name": "Impact Frame", "description": "High-contrast flash used at hit moments." }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/metadata/export-formats`

Response:

```json
{
  "data": {
    "formats": [
      { "id": "png", "name": "PNG", "description": "Single frame PNG at the current playhead." },
      { "id": "pngTransparent", "name": "Transparent PNG", "description": "Single frame with alpha channel preserved." },
      { "id": "mp4", "name": "MP4", "description": "Full animation encoded as video." },
      { "id": "gif", "name": "GIF", "description": "Animated GIF." },
      { "id": "spritesheet", "name": "Sprite Sheet", "description": "Grid of frames as a PNG plus JSON metadata." }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

### `GET /api/v1/metadata/keyboard-shortcuts`

Response:

```json
{
  "data": {
    "shortcuts": [
      { "id": "select", "keys": ["V"], "description": "Select tool" },
      { "id": "move", "keys": ["M"], "description": "Move tool" },
      { "id": "rotate", "keys": ["R"], "description": "Rotate tool" },
      { "id": "scale", "keys": ["S"], "description": "Scale tool" },
      { "id": "brush", "keys": ["B"], "description": "Brush tool" },
      { "id": "eraser", "keys": ["E"], "description": "Eraser tool" },
      { "id": "play-pause", "keys": ["Space"], "description": "Toggle playback" },
      { "id": "undo", "keys": ["Meta+Z", "Ctrl+Z"], "description": "Undo" },
      { "id": "redo", "keys": ["Meta+Shift+Z", "Ctrl+Shift+Z"], "description": "Redo" },
      { "id": "delete", "keys": ["Backspace", "Delete"], "description": "Delete selected layers" }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

## MCP Implementation

MotionCut Server must implement MCP as a first-party backend feature using the official MCP protocol. Do not depend on Lovable runtime packages.

Server identity:

```json
{
  "name": "motioncut-studio-mcp",
  "title": "MotionCut Studio",
  "version": "1.0.0"
}
```

Instructions:

```text
Reference and workflow tools for MotionCut Studio, an AI-assisted animation editor for anime, manga, and illustration creators. Use these tools to look up available animation presets, easing curves, export formats, effect filters, keyboard shortcuts, Magic Cut body-part kinds, and authorized user project/export workflows.
```

Transport:

- Support HTTP streamable transport at `/mcp`.
- Support SSE only if required by target clients.
- Authenticate protected tools with the same bearer JWT strategy as the REST API.

Required read-only tools:

1. `list_animation_presets`
2. `list_easing_functions`
3. `list_export_formats`
4. `list_effects`
5. `list_keyboard_shortcuts`
6. `list_body_part_kinds`

Required authenticated workflow tools:

1. `get_project`
2. `list_projects`
3. `create_export`
4. `get_export_status`

Tool response shape:

- Return human-readable text content.
- Return structured content matching the metadata or resource response.

Annotations:

- Read-only tools: read-only and idempotent.
- `create_export`: not read-only, idempotent only when an idempotency key is supplied.

`list_body_part_kinds` must use the canonical BodyPartKind values from the frontend segmentation type, not simplified names.

## Database Schema Recommendations

Use PostgreSQL.

### `users`

- `id text primary key`
- `auth_subject text unique not null`
- `email text`
- `display_name text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

### `projects`

- `id text primary key`
- `owner_user_id text not null references users(id)`
- `name text not null`
- `canvas_width integer not null`
- `canvas_height integer not null`
- `state_json jsonb not null`
- `version integer not null default 1`
- `thumbnail_asset_id text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(owner_user_id, updated_at desc)`
- `(owner_user_id, deleted_at)`

### `project_versions`

- `id text primary key`
- `project_id text not null references projects(id)`
- `owner_user_id text not null references users(id)`
- `number integer not null`
- `label text`
- `state_json jsonb not null`
- `created_at timestamptz not null default now()`

Indexes:

- `(project_id, number desc)`
- unique `(project_id, number)`

### `assets`

- `id text primary key`
- `owner_user_id text not null references users(id)`
- `project_id text references projects(id)`
- `purpose text not null`
- `filename text not null`
- `content_type text not null`
- `byte_size bigint not null`
- `sha256 text`
- `storage_bucket text not null`
- `storage_key text not null`
- `preview_storage_key text`
- `status text not null`
- `width integer`
- `height integer`
- `duration_sec numeric`
- `metadata_json jsonb not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `deleted_at timestamptz`

Indexes:

- `(owner_user_id, project_id, created_at desc)`
- `(sha256)`
- `(status)`

### `uploads`

- `id text primary key`
- `asset_id text not null references assets(id)`
- `owner_user_id text not null references users(id)`
- `status text not null`
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `completed_at timestamptz`
- `metadata_json jsonb not null default '{}'`

### `jobs`

- `id text primary key`
- `owner_user_id text not null references users(id)`
- `type text not null`
- `status text not null`
- `progress numeric not null default 0`
- `stage text`
- `input_json jsonb not null`
- `result_json jsonb`
- `error_json jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `started_at timestamptz`
- `completed_at timestamptz`

Indexes:

- `(owner_user_id, created_at desc)`
- `(type, status)`

### `exports`

- `id text primary key`
- `owner_user_id text not null references users(id)`
- `project_id text not null references projects(id)`
- `job_id text references jobs(id)`
- `format text not null`
- `status text not null`
- `progress numeric not null default 0`
- `stage text`
- `request_json jsonb not null`
- `output_asset_id text references assets(id)`
- `error_json jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `completed_at timestamptz`

### `idempotency_keys`

- `id text primary key`
- `owner_user_id text not null references users(id)`
- `route text not null`
- `key text not null`
- `request_hash text not null`
- `response_json jsonb`
- `status_code integer`
- `created_at timestamptz not null default now()`
- `expires_at timestamptz not null`

Unique index:

- `(owner_user_id, route, key)`

### `audit_logs`

- `id text primary key`
- `owner_user_id text references users(id)`
- `action text not null`
- `resource_type text not null`
- `resource_id text`
- `ip text`
- `user_agent text`
- `metadata_json jsonb not null default '{}'`
- `created_at timestamptz not null default now()`

## Storage Abstraction

Define:

```ts
interface StorageService {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getObject(input: GetObjectInput): Promise<ReadableStream>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
  createSignedReadUrl(input: SignedUrlInput): Promise<SignedUrl>;
  createSignedUploadUrl(input: SignedUploadInput): Promise<SignedUpload>;
}
```

Implement:

- `R2StorageService` for production.
- `LocalStorageService` for local development.

Object key convention:

```text
users/{userId}/projects/{projectId}/assets/{assetId}/original/{filename}
users/{userId}/projects/{projectId}/assets/{assetId}/preview/preview.webp
users/{userId}/projects/{projectId}/exports/{exportId}/{filename}
users/{userId}/temp/{jobId}/{filename}
```

Never expose raw bucket names or permanent credentials to the frontend.

## Cloudflare R2 Integration

Environment variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`
- `R2_ENDPOINT`

Requirements:

- Use S3-compatible API.
- Generate signed upload URLs for direct upload.
- Generate short-lived signed read URLs for private assets.
- Support a public CDN base URL only for assets that are explicitly public.
- Set correct content type and cache control.
- Use lifecycle cleanup for temporary objects.

Recommended cache:

- Original private assets: no public cache.
- Previews: CDN cache 1 day.
- Exports: signed private by default; optionally public if user requests sharing.

## Background Workers

Run workers as separate Railway services.

### Asset Worker

Consumes `asset.process`.

Responsibilities:

- Verify uploaded object exists.
- Compute server-side SHA-256.
- Extract dimensions and duration.
- Generate preview.
- Optimize derivative if useful.
- Update asset status.

### AI Worker

Consumes `ai.segmentation`.

Responsibilities:

- Download image from R2 or decode data URL.
- Run configured AI provider.
- Normalize labels and body-part taxonomy.
- Clamp bounding boxes to image dimensions.
- Add suggested pivots.
- Persist job result.

### Export Worker

Consumes `export.render`.

Responsibilities:

- Load project snapshot.
- Resolve asset URLs.
- Render frames.
- Encode requested format.
- Upload output to R2.
- Create output asset.
- Update export and job progress.

### Autosave Worker

Consumes optional `project.snapshot`.

Responsibilities:

- Create periodic project version snapshots.
- Generate project thumbnails.
- Compact old autosave versions according to retention.

## Queue Architecture

Use Redis-backed BullMQ queues:

- `asset`
- `ai`
- `export`
- `autosave`

Job options:

- Attempts: asset 3, AI 2, export 2.
- Backoff: exponential with jitter.
- Timeout: asset 2 minutes, AI 5 minutes, export configurable by frame count.
- Remove completed: keep last 1000 or 7 days.
- Remove failed: keep 30 days.

Progress events:

- Store progress in `jobs`.
- Optional SSE endpoint: `GET /api/v1/jobs/:jobId/events`.
- Polling through `GET /api/v1/jobs/:jobId` must be fully supported.

## Error Handling

Use typed application errors.

Required error codes:

- `AUTH_REQUIRED`
- `AUTH_INVALID`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `PROJECT_NOT_FOUND`
- `PROJECT_TOO_LARGE`
- `VERSION_CONFLICT`
- `ASSET_NOT_FOUND`
- `ASSET_TOO_LARGE`
- `UPLOAD_NOT_FOUND`
- `UPLOAD_ALREADY_COMPLETED`
- `UNSUPPORTED_MEDIA_TYPE`
- `IMAGE_TOO_LARGE`
- `AI_NO_CHARACTER_FOUND`
- `AI_PROVIDER_UNAVAILABLE`
- `AI_RATE_LIMITED`
- `SEGMENTATION_PROVIDER_UNAVAILABLE`
- `EXPORT_NOT_FOUND`
- `EXPORT_RANGE_INVALID`
- `EXPORT_RATE_LIMITED`
- `JOB_NOT_FOUND`
- `JOB_NOT_CANCELLABLE`
- `STORAGE_UNAVAILABLE`
- `QUEUE_UNAVAILABLE`
- `DATABASE_UNAVAILABLE`
- `INTERNAL_ERROR`

Never leak provider API errors, stack traces, database errors, bucket names, signed credentials, or raw SQL in responses.

## Environment Variables

Required:

```text
NODE_ENV
PORT
PUBLIC_API_BASE_URL
CORS_ORIGINS
DATABASE_URL
REDIS_URL
AUTH_MODE
JWT_ISSUER
JWT_AUDIENCE
JWT_JWKS_URL
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT
R2_PUBLIC_BASE_URL
AI_PROVIDER
AI_REQUEST_TIMEOUT_MS
MAX_IMAGE_UPLOAD_BYTES
MAX_VIDEO_UPLOAD_BYTES
MAX_PROJECT_JSON_BYTES
MAX_DIRECT_AI_IMAGE_BYTES
EXPORT_MAX_FRAMES
EXPORT_MAX_PIXELS
LOG_LEVEL
SENTRY_DSN
OTEL_EXPORTER_OTLP_ENDPOINT
```

Provider-specific examples:

```text
OPENAI_API_KEY
OPENAI_VISION_MODEL
REPLICATE_API_TOKEN
REPLICATE_SEGMENTATION_MODEL
```

Development-only:

```text
DEV_AUTH_USER_ID
LOCAL_STORAGE_PATH
```

## Railway Deployment Requirements

Railway services:

1. `api`: Fastify REST API and MCP HTTP transport.
2. `worker-asset`: asset processing.
3. `worker-ai`: AI jobs.
4. `worker-export`: export rendering.
5. `worker-autosave`: optional snapshots/thumbnails.
6. `postgres`: Railway PostgreSQL.
7. `redis`: Railway Redis.

Build:

- `npm ci`
- `npm run build`
- `npm run db:migrate`

Start commands:

- API: `node dist/server.js`
- Asset worker: `node dist/queues/workers/asset.worker.js`
- AI worker: `node dist/queues/workers/ai.worker.js`
- Export worker: `node dist/queues/workers/export.worker.js`

Health checks:

- API health path: `/api/v1/health`
- Worker health can be a small HTTP server or Railway process-level health with queue heartbeat logging.

Export worker requirements:

- Chromium dependencies.
- ffmpeg available in image.
- Writable temp directory.
- Concurrency default 1 per worker instance.

## Logging and Monitoring

Logging:

- Use structured JSON logs.
- Include `requestId`, `userId`, `route`, `statusCode`, `durationMs`.
- For jobs include `jobId`, `jobType`, `status`, `attempt`, `durationMs`.
- Redact auth headers, cookies, provider keys, signed URLs, data URLs, and large project JSON.

Metrics:

- HTTP request count, latency, error rate.
- Queue depth by queue.
- Job duration and failure count by type.
- AI provider latency and failure count.
- Export duration by format and frame count.
- Storage operation latency.
- Database query latency.

Tracing:

- Add OpenTelemetry spans around API requests, storage calls, queue jobs, AI provider calls, and export render stages.

Alerts:

- API 5xx rate above threshold.
- Queue backlog above threshold.
- AI provider failure spike.
- Export failure spike.
- Storage errors.
- Database connection exhaustion.

## Security Considerations

Required:

- Enforce CORS allowlist.
- Require auth for user data.
- Validate all request bodies with Zod.
- Rate limit auth-sensitive, AI, upload, and export routes.
- Virus/malware scanning hook for uploads if available.
- Content-type sniffing; do not trust client-provided MIME alone.
- Clamp image dimensions and decoded byte size.
- Strip EXIF metadata from optimized previews unless needed.
- Use signed URLs with short expirations.
- Never store provider keys in frontend.
- Never log data URLs, signed URLs, bearer tokens, or raw binary.
- Use database transactions for project update/version creation.
- Use row-level ownership checks in every repository method.
- Use idempotency keys for mutating operations.
- Use CSP and upload restrictions for any asset preview routes.

## Frontend Service Mapping

### `src/services/segmentation/aiProvider.ts`

Backend endpoint:

- `POST /api/v1/ai/body-parts/detect`

HTTP method:

- `POST`

Request body:

```json
{
  "imageDataUrl": "data:image/png;base64,...",
  "imageWidth": 1024,
  "imageHeight": 1024,
  "restrictTo": [],
  "options": {
    "includeMasks": false,
    "confidenceThreshold": 0.35
  }
}
```

Response body:

```json
{
  "data": {
    "sourceWidth": 1024,
    "sourceHeight": 1024,
    "provider": "motioncut-ai",
    "parts": [],
    "modelTag": "motioncut-ai/body-parts@2026-07-17",
    "durationMs": 1000
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Error responses:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `413 IMAGE_TOO_LARGE`
- `415 UNSUPPORTED_MEDIA_TYPE`
- `422 AI_NO_CHARACTER_FOUND`
- `429 AI_RATE_LIMITED`
- `503 AI_PROVIDER_UNAVAILABLE`

Validation requirements:

- Require image dimensions for data URL requests.
- Validate data URL MIME and decoded size.
- Clamp bbox output to image bounds.
- Normalize body part labels to canonical BodyPartKind.

Authentication requirements:

- Required in production.
- Dev mode may use `x-dev-user-id`.

Future extensibility:

- Add `imageAssetId`.
- Add per-part masks without changing `SegmentedPart`.
- Add async job endpoint for slow segmentation.

### `src/services/segmentation/imglyProvider.ts`

Backend endpoint:

- No backend endpoint is required for current behavior because this provider runs in-browser.
- Future equivalent: `POST /api/v1/ai/segmentation` with `strategy: "foreground"`.

HTTP method:

- Current: none.
- Future: `POST`.

Request body for future server-side foreground:

```json
{
  "strategy": "foreground",
  "imageAssetId": "ast_123",
  "foregroundOnly": true,
  "options": {
    "includeForeground": true
  }
}
```

Response body:

- `SegmentationResult` with `foreground` populated and `parts: []`.

Error responses:

- `401 AUTH_REQUIRED`
- `413 IMAGE_TOO_LARGE`
- `415 UNSUPPORTED_MEDIA_TYPE`
- `503 SEGMENTATION_PROVIDER_UNAVAILABLE`

Validation requirements:

- Validate image source and output mask dimensions.

Authentication requirements:

- Required for server-side future endpoint.

Future extensibility:

- Move the full hybrid segmentation pipeline server-side when desired.

### `src/services/segmentation/registry.ts`

Backend endpoint:

- `GET /api/v1/ai/capabilities`
- `POST /api/v1/ai/segmentation`

HTTP method:

- `GET` for capability discovery.
- `POST` for full segmentation.

Request body:

```json
{
  "strategy": "hybrid",
  "imageDataUrl": "data:image/png;base64,...",
  "restrictTo": [],
  "options": {
    "includeForeground": true,
    "includePartMasks": false
  }
}
```

Response body:

- Full `SegmentationResult`.

Error responses:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `503 SEGMENTATION_PROVIDER_UNAVAILABLE`

Validation requirements:

- Strategy must be `"foreground"`, `"parts"`, or `"hybrid"`.

Authentication requirements:

- Required for segmentation.
- Optional for capabilities if no account-specific quota is exposed.

Future extensibility:

- Add feature flags, provider versions, and cost estimates without changing provider registry concepts.

### `src/services/masking/maskOps.ts`

Backend endpoint:

- Current behavior remains frontend-only.
- Future batch endpoint: `POST /api/v1/assets/masks/operations`.

HTTP method:

- Future: `POST`.

Request body:

```json
{
  "operation": "cropToBounds",
  "sourceAssetId": "ast_123",
  "bbox": { "x": 0, "y": 0, "width": 200, "height": 300 },
  "outputPurpose": "mask"
}
```

Response body:

```json
{
  "data": {
    "asset": {
      "id": "ast_mask_123",
      "url": "https://...",
      "width": 200,
      "height": 300,
      "contentType": "image/png"
    },
    "bounds": { "x": 0, "y": 0, "width": 200, "height": 300 }
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Error responses:

- `401 AUTH_REQUIRED`
- `404 ASSET_NOT_FOUND`
- `422 MASK_OPERATION_INVALID`

Validation requirements:

- BBox must be finite and inside source bounds after clamping.

Authentication requirements:

- Required for future server-side operation.

Future extensibility:

- Add brush stroke replay, mask compositing, and worker-backed heavy mask operations.

### `src/services/rigging/pivotSuggester.ts`

Backend endpoint:

- Included inside `POST /api/v1/ai/body-parts/detect` and `POST /api/v1/ai/segmentation`.
- Optional standalone endpoint: `POST /api/v1/ai/rigging/pivots`.

HTTP method:

- `POST`.

Request body:

```json
{
  "parts": [
    { "kind": "head", "bbox": { "x": 0, "y": 0, "width": 200, "height": 200 } }
  ]
}
```

Response body:

```json
{
  "data": {
    "parts": [
      {
        "kind": "head",
        "bbox": { "x": 0, "y": 0, "width": 200, "height": 200 },
        "suggestedPivot": { "x": 100, "y": 200 }
      }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Error responses:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`

Validation requirements:

- Known BodyPartKind.
- Valid positive bbox.

Authentication requirements:

- Required.

Future extensibility:

- Replace heuristic pivots with pose-estimation keypoints while keeping the same `suggestedPivot` field.

### `src/services/export/exporters.ts`

Backend endpoint:

- `POST /api/v1/exports`
- `GET /api/v1/exports/:exportId`
- `GET /api/v1/exports/:exportId/download`

HTTP method:

- `POST`, `GET`.

Request body:

```json
{
  "projectId": "prj_123",
  "projectSnapshot": {},
  "format": "mp4",
  "from": 0,
  "to": 90,
  "step": 1,
  "fps": 30,
  "width": 1080,
  "height": 1920,
  "transparent": false,
  "filename": "motioncut"
}
```

Response body:

```json
{
  "data": {
    "export": {
      "id": "exp_123",
      "projectId": "prj_123",
      "format": "mp4",
      "status": "queued",
      "progress": 0,
      "stage": "Queued",
      "outputAssetId": null,
      "downloadUrl": null
    },
    "jobId": "job_exp_123"
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Error responses:

- `400 VALIDATION_ERROR`
- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`
- `422 EXPORT_RANGE_INVALID`
- `429 EXPORT_RATE_LIMITED`

Validation requirements:

- Match current frontend formats: `png`, `pngTransparent`, `mp4`, `gif`, `spritesheet`.
- For sprite sheets, generate PNG and JSON metadata.
- For MP4, use H.264 when available and WebM only if explicitly requested later.

Authentication requirements:

- Required.

Future extensibility:

- Add cloud render profiles and sharing links.

### `src/services/export/exportBridge.ts`

Backend endpoint:

- None directly.

Reason:

- This service registers the browser Pixi frame renderer. The backend export engine must have its own renderer but must match the same project sampling semantics.

Future extensibility:

- Create shared render/sampling package used by frontend and backend to avoid drift.

### `src/services/animation/presets.ts`

Backend endpoint:

- `GET /api/v1/metadata/animation-presets`
- MCP `list_animation_presets`

HTTP method:

- `GET`.

Response body:

```json
{
  "data": {
    "presets": [
      {
        "id": "pop-in",
        "name": "Pop In",
        "description": "One-click animation preset.",
        "durationFrames": 20,
        "animatedProps": ["scaleX", "scaleY", "opacity"]
      }
    ]
  },
  "meta": { "requestId": "req_...", "version": "v1" }
}
```

Authentication requirements:

- Optional.

Future extensibility:

- Add user-defined presets and marketplace presets under separate authenticated endpoints.

### `src/services/animation/easing.ts`

Backend endpoint:

- `GET /api/v1/metadata/easing-functions`
- MCP `list_easing_functions`

HTTP method:

- `GET`.

Authentication requirements:

- Optional.

Future extensibility:

- Shared easing implementation for backend exports.

### `src/services/animation/sampling.ts`

Backend endpoint:

- None.

Reason:

- Sampling is editor and render-engine behavior. The backend must reuse equivalent logic internally for export rendering but must not expose it as a business API.

Future extensibility:

- Promote sampling/easing code into a shared package consumed by frontend and export worker.

### `src/lib/mcp/*`

Backend endpoint:

- `/mcp`
- Metadata REST endpoints listed above.

HTTP method:

- MCP protocol transport.

Request body:

- MCP JSON-RPC messages per official protocol.

Response body:

- MCP JSON-RPC responses with `content` and `structuredContent`.

Error responses:

- MCP protocol errors for invalid tools.
- HTTP `401` for protected tools without auth.

Validation requirements:

- Tool schemas must be explicit.
- Read-only tools must not mutate state.

Authentication requirements:

- Public metadata tools can be unauthenticated.
- Project/export workflow tools require bearer auth.

Future extensibility:

- Add create-project, upload-asset, run-magic-cut, and collaboration tools after stable auth and permission scopes exist.

### `src/store/editorStore.ts`

Backend endpoint:

- `POST /api/v1/projects`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:projectId`
- `PUT /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- `DELETE /api/v1/projects/:projectId`

HTTP methods:

- `POST`, `GET`, `PUT`, `PATCH`, `DELETE`.

Request body:

- Full `Project` for autosave.
- Metadata patch for name/canvas updates.

Response body:

- Full `Project` plus server `version`.

Error responses:

- `401 AUTH_REQUIRED`
- `404 PROJECT_NOT_FOUND`
- `409 VERSION_CONFLICT`
- `413 PROJECT_TOO_LARGE`
- `422 PROJECT_INVALID`

Validation requirements:

- Validate canonical project/layer/effects/keyframes model.
- Preserve unknown forward-compatible fields only under `metadata` objects; reject unknown top-level project fields unless a compatibility policy is established.

Authentication requirements:

- Required.

Future extensibility:

- Add team workspaces and real-time collaboration while keeping snapshot autosave.

## Implementation Acceptance Criteria

MotionCut Server is complete when:

1. REST API implements all required endpoints above.
2. Project JSON round-trips without changing frontend editor behavior.
3. Direct asset upload to R2 works and assets return usable URLs.
4. AI body-part detection replaces the removed `segmentation.functions.ts` behavior.
5. Segmentation responses exactly match `SegmentationResult`.
6. Export jobs can be created, polled, cancelled, and downloaded.
7. MCP server exposes all required tools without Lovable dependencies.
8. Authentication protects user-owned resources.
9. PostgreSQL migrations create the recommended schema.
10. Workers process asset, AI, and export queues.
11. Errors use the standard error envelope.
12. Logs and metrics include request and job identifiers.
13. Railway deployment runs API and workers as separate services.
14. No frontend secrets, provider keys, storage credentials, or database credentials are required.
