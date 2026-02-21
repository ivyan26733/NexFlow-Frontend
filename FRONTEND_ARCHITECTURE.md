# NexFlow Frontend — Architecture & File Guide

This document explains how the frontend works and what each file does.

---

## 1. Application flow (user journey)

1. **Dashboard (`/`)**  
   User sees a list of flows and can create a new flow. Clicking a flow card or creating a flow navigates to `/studio/{flowId}`.

2. **Studio (`/studio/[id]`)**  
   User edits a single flow:
   - **Load**: Flow metadata and canvas (nodes/edges) are fetched from the API.
   - **Edit**: User drags nodes from the left sidebar onto the canvas, connects them, and selects nodes to configure in the right panel.
   - **Save**: Canvas state (nodes + edges) is sent to `POST /api/flows/{flowId}/canvas`.
   - **Trigger**: User clicks Trigger, enters a JSON payload, and the flow is run via `POST /api/pulse/{flowId}`. Optional WebSocket subscription shows live node status (RUNNING / SUCCESS / FAILURE) on the canvas.

3. **Nexus (`/nexus`)**  
   Referenced in the nav for “API connector management”; may be a separate area for managing external APIs.

---

## 2. Route and layout structure

| Path | File | Purpose |
|------|------|--------|
| `/` | `app/page.tsx` | Dashboard: list flows, create flow, open studio |
| `/studio/[id]` | `app/studio/[id]/page.tsx` | Studio: canvas editor for one flow |
| (all) | `app/layout.tsx` | Root layout: nav bar, React Flow CSS, global styles |
| (all) | `app/globals.css` | Tailwind, theme variables, React Flow overrides |

---

## 3. File-by-file explanation

### 3.1 App and layout

- **`app/layout.tsx`**  
  Root layout: HTML shell, nav (brand, Studio, Nexus), and `<main>{children}</main>`. Imports React Flow base CSS and `globals.css`.

- **`app/globals.css`**  
  Tailwind directives, `input-base` component class, CSS variables (fonts, colors), and overrides for React Flow (background, controls, edges, selection). Ensures the canvas matches the app theme.

- **`app/page.tsx`**  
  Dashboard page (client component):
  - Fetches flows with `api.flows.list()`.
  - “New Flow” opens a modal; on create, calls `api.flows.create()` and navigates to `/studio/{flow.id}`.
  - Renders a grid of flow cards; each card navigates to `/studio/{flow.id}`.
  - Uses `FlowCard` and `EmptyState` subcomponents.

- **`app/studio/[id]/page.tsx`**  
  Studio page (client component):
  - Reads `id` from URL via `useParams()`.
  - Loads flow and canvas with `api.flows.get(id)` and `api.canvas.load(id)`; converts backend `FlowNode`/`FlowEdge` to React Flow `Node`/`Edge`.
  - Ensures a START node exists; if the canvas has none, adds one.
  - Renders: `NodeSidebar` (left), `StudioToolbar` (top), React Flow canvas (center), and `NodeConfigPanel` (right when a node is selected).
  - Handles drag-and-drop from sidebar (new nodes), connections (new edges), save (serialize nodes/edges to `CanvasData` and `api.canvas.save`), and trigger (`api.executions.trigger` + optional WebSocket for live status).
  - Uses `useExecutionSocket` to subscribe to execution events and updates node `liveStatus` for visual feedback.

---

### 3.2 API and types

- **`api.ts`**  
  Central API client. Uses `NEXT_PUBLIC_API_URL` (default `http://localhost:8090`). Exposes:
  - **flows**: `list()`, `get(id)`, `create(body)`.
  - **canvas**: `load(flowId)`, `save(flowId, data)`.
  - **executions**: `list(flowId)`, `trigger(flowId, payload)`.

- **`index.ts`**  
  Domain types: `FlowStatus`, `NodeType`, `EdgeCondition`, `ExecStatus`, `NodeStatus`, `Flow`, `FlowNode`, `FlowEdge`, `Execution`, `CanvasData`, `NodeExecutionEvent`. Used by API, studio, and components.

- **`types/index.ts`**  
  Re-exports the same types from `../index` so that `@/types` resolves correctly for components that import from `@/types`.

---

### 3.3 Studio UI components

- **`StudioToolbar.tsx`**  
  Top bar for the studio:
  - Breadcrumb: “Flows” link and current flow name.
  - Save button (calls `onSave`; shows loading when `saving` is true).
  - Trigger button opens a modal for JSON payload; on confirm, calls `onTrigger(payload)`.

- **`NodeSidebar.tsx`**  
  Left panel:
  - Lists draggable node types from `DRAGGABLE_NODES` (PULSE, VARIABLE, MAPPER, DECISION, SUCCESS, FAILURE).
  - START is shown as a non-draggable hint (it is added automatically on the canvas).
  - On drag start, sets `dataTransfer` with `nodeType` so the canvas `onDrop` can create the correct node.

- **`NodeConfigPanel.tsx`**  
  Right panel shown when a node is selected:
  - Header with node type color and label; close button.
  - Editable “Label” field.
  - Type-specific config form (see config components below).
  - Reference syntax hint: `{{variables.key}}`, `{{nodes.nodeId.successOutput.body.field}}`.
  - Calls `onUpdate(nodeData)` and `onClose()`.

- **`FlowNodeCard.tsx`**  
  Single React Flow node component used for all node types:
  - Renders based on `NODE_META[nodeType]` (color, label, terminal vs not).
  - Top handle (target) for non-START nodes; bottom handle(s): one for most types, two (success/failure) for PULSE and DECISION.
  - Shows label and a short config preview; optional `liveStatus` badge (RUNNING / SUCCESS / FAILURE) with matching glow.

---

### 3.4 Node config forms

All config components live under `config/`, receive `config` and `onChange`, and use `Field` from `NodeConfigPanel`.

- **`config/PulseConfig.tsx`**  
  PULSE (HTTP) node: URL, method (GET/POST/PUT/PATCH/DELETE), headers (key/value), body (key/value with optional `{{ref}}`).

- **`config/VariableConfig.tsx`**  
  VARIABLE node: list of variables (name → value or `{{ref}}`), add/remove rows.

- **`config/MapperConfig.tsx`**  
  MAPPER node: output shape (field name → value or `{{ref}}`), add/remove fields.

- **`config/DecisionConfig.tsx`**  
  DECISION node: left value, operator (GT, LT, GTE, LTE, EQ, NEQ, CONTAINS), right value; supports `{{ref}}` in values.

- **`config/TerminalConfig.tsx`**  
  SUCCESS and FAILURE nodes: response body shape (field → value or `{{ref}}`).

---

### 3.5 Configuration and utilities

- **`nodeConfig.ts`**  
  Defines `NODE_META` (label, color, bgColor, description, isTerminal per `NodeType`) and `DRAGGABLE_NODES`. Used by the sidebar, `FlowNodeCard`, and `NodeConfigPanel` to drive appearance and behavior.

- **`lib/nodeConfig.ts`**  
  Re-exports `NODE_META`, `DRAGGABLE_NODES`, and `NodeMeta` from `../nodeConfig` so `@/lib/nodeConfig` works (e.g. in `NodeSidebar`).

- **`useExecutionSocket.ts`**  
  Hook that takes `executionId` and `onEvent`. Connects to the WebSocket (e.g. SockJS + STOMP at `NEXT_PUBLIC_WS_URL`), subscribes to `/topic/execution/{executionId}`, and calls `onEvent` for each `NodeExecutionEvent` (nodeId, status, error). Used by the studio page for live execution feedback.

---

## 4. Data flow (studio)

1. **Load**  
   `GET /api/flows/{id}` → `Flow`; `GET /api/flows/{id}/canvas` → `CanvasData` (nodes, edges).  
   Convert to React Flow format; ensure START node; set `nodes` and `edges` state.

2. **Edit**  
   User changes nodes/edges (drag, connect, config). State is held in React Flow’s `nodes`/`edges` (and selected node for the config panel).

3. **Save**  
   Convert current `nodes`/`edges` back to `FlowNode[]` and `FlowEdge[]` (positions, handles → conditionType), then `POST /api/flows/{id}/canvas` with `CanvasData`.

4. **Trigger**  
   User submits JSON payload → `POST /api/pulse/{id}` → returns `Execution`.  
   Optional: set `liveExecutionId` and subscribe via `useExecutionSocket`; on each event, update `nodeStatuses` and merge into node data so `FlowNodeCard` can show RUNNING/SUCCESS/FAILURE.

---

## 5. Path aliases

`tsconfig.json` has `"@/*": ["./*"]`, so:

- `@/api` → `./api.ts`
- `@/index` → `./index.ts`
- `@/types` → `./types/index.ts`
- `@/nodeConfig` → `./nodeConfig.ts`
- `@/lib/nodeConfig` → `./lib/nodeConfig.ts`
- `@/StudioToolbar` → `./StudioToolbar.tsx`
- etc.

Use these consistently so imports work from both `app/` and root-level components.

---

## 6. Fix applied for “no content” on `/studio/{id}`

The URL `/studio/2df9ce8e-e7e4-465f-a0b6-64a5b1fc92d1` showed no content because **the studio route did not exist**. The dashboard linked to `/studio/{flowId}`, but there was no `app/studio/[id]/page.tsx`.

**Changes made:**

1. **Added `app/studio/[id]/page.tsx`**  
   Full studio page: load flow + canvas, render React Flow with toolbar, sidebar, and config panel; handle save, trigger, and live execution.

2. **Added `lib/nodeConfig.ts`**  
   Re-export of node config so `@/lib/nodeConfig` resolves (used by `NodeSidebar`).

3. **Added `types/index.ts`**  
   Re-export of domain types from `../index` so `@/types` resolves (used by `nodeConfig.ts` and `NodeSidebar`).

4. **Imported React Flow styles in `app/layout.tsx`**  
   `import '@xyflow/react/dist/style.css'` so the canvas and controls render correctly.

With these in place, visiting `/studio/{flowId}` loads the flow and canvas from the API and shows the editor. If the backend is not running or the flow ID is invalid, the page shows an error and a link back to the dashboard.
