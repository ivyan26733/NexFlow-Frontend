# NexFlow Frontend

Frontend for **NexFlow** — a no-code workflow automation platform. Built with Next.js, React, and React Flow for visual flow design and execution.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, TypeScript
- **Canvas:** [@xyflow/react](https://xyflow.dev/) (React Flow)
- **Styling:** Tailwind CSS, CSS variables (see `app/globals.css`)
- **Icons:** Lucide React
- **Realtime:** STOMP over SockJS (WebSocket) for live execution status

## Prerequisites

- Node.js 18+
- pnpm (or npm / yarn)

## Setup

```bash
# Install dependencies
pnpm install
# or: npm install
```

## Environment

Create `.env.local` (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:8090
```

If not set, the app uses `http://localhost:8090` as the API base URL.

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `pnpm dev`     | Start dev server (default: http://localhost:3000) |
| `pnpm build`   | Production build         |
| `pnpm start`   | Start production server  |

## Project Structure

```
Frontend/
├── app/
│   ├── layout.tsx          # Root layout + nav
│   ├── page.tsx            # Dashboard (list flows, with pagination + delete)
│   ├── globals.css         # Global + studio styles, pagination bar, loader
│   └── studio/
│       └── [id]/
│           └── page.tsx    # Flow editor (canvas)
├── api.ts                  # API client (flows, canvas, executions)
├── index.ts                # Domain types (Flow, FlowNode, FlowEdge, etc.)
├── types/
│   └── index.ts            # Re-exports for @/types
├── useExecutionSocket.ts   # WebSocket hook for execution status
├── NodeSidebar.tsx         # Left sidebar (draggable nodes)
├── NodeConfigPanel.tsx     # Right panel (node config + delete)
├── StudioToolbar.tsx       # Top bar (Save, Trigger)
├── FlowNodeCard.tsx        # React Flow node component
├── Pagination.tsx          # Reusable pagination hook + controls
├── MillennialLoader.tsx    # Reusable millennial-style loading screen
├── lib/
│   └── nodeConfig.ts      # NODE_META, DRAGGABLE_NODES
└── config/                 # Node-type config components (e.g. PulseConfig)
```

Path alias: `@/` → project root (see `tsconfig.json`).

## Features

- **Dashboard:** List flows, create new flow, open in Studio
- **Studio:** Visual flow editor with drag-and-drop nodes (START, PULSE, VARIABLE, MAPPER, DECISION, SUCCESS, FAILURE)
- **Canvas:** Connect nodes, save/load canvas, delete nodes and edges (panel or Backspace)
- **Execution:** Trigger flow with JSON payload; live node status over WebSocket

---

## Pagination

The app uses a **shared, client-side pagination helper** so every list view behaves consistently without adding extra complexity to the backend.

- **Why client-side?**
  - Existing backend endpoints already return full arrays (`/api/flows`, `/api/executions`, `/api/nexus/connectors`).
  - For typical NexFlow usage these lists are modest in size; fetching once and slicing on the client is simpler and avoids changing API contracts.
  - The logic is centralized in a small hook + UI component, so pages don’t re‑implement pagination.

- **Core pieces**
  - `Pagination.tsx`
    - `usePagination<T>(items, initialPageSize)` – computes `pageItems`, `page`, `pageSize`, `totalItems`, `totalPages`, and helpers to change page/size.
    - `PaginationControls` – pill‑style control bar with:
      - “Showing X–Y of N”
      - Rows-per-page selector (10/20/50)
      - Prev / Next buttons with disabled states.
  - Styling lives in `app/globals.css`:
    - `.pagination-bar`, `.pagination-btn`, `.pagination-summary`, etc. – shared millennial‑style pill UI.

- **Where pagination is applied**
  - `app/page.tsx` (Dashboard / “Your Flows”)  
    - Paginates flows (`usePagination(flows, 9)`) and renders `PaginationControls` under the grid.
    - Each flow card also has a **Delete studio** button; deleting a studio removes that flow plus its executions and canvas data on the backend.
  - `app/transactions/page.tsx` (Transactions list)  
    - Paginates **after filtering** by status: `usePagination(filtered, 15)`.
    - `PaginationControls` is shown below the table when there are results.
  - `app/pulses/page.tsx` (Pulses / HTTP triggers)  
    - Paginates flows when listing their pulse endpoints: `usePagination(flows, 8)`.
  - `app/nexus/page.tsx` (Nexus connectors)  
    - Paginates connectors: `usePagination(connectors, 10)`.

If you want to add pagination to a new list:

1. Import from the shared helper:

   ```ts
   import { usePagination, PaginationControls } from '@/Pagination'
   ```

2. Wrap your data with the hook:

   ```ts
   const {
     pageItems,
     page,
     totalPages,
     totalItems,
     pageSize,
     setPage,
     setPageSize,
   } = usePagination(items, 10)
   ```

3. Render `pageItems` instead of the full array, and drop `PaginationControls` under the list:

   ```tsx
   {pageItems.map(item => /* ... */)}

   <PaginationControls
     page={page}
     totalPages={totalPages}
     totalItems={totalItems}
     pageSize={pageSize}
     onPageChange={setPage}
     onPageSizeChange={setPageSize}
   />
   ```

---

## Loading screen (“millennial” style)

To avoid boring spinners and only show a loader when data is genuinely taking a moment, there is a shared **Millennial loader** component:

- **Component**
  - `MillennialLoader` in `MillennialLoader.tsx`.
  - Props:
    - `label?: string` – short text like “Loading transactions…”.
    - `fullScreen?: boolean` – when `true`, covers the full viewport.
  - Uses Lucide’s `Loader2` plus gradient “orb” styling.

- **Styling**
  - In `app/globals.css`:
    - `.millennial-loader-fullscreen`, `.millennial-loader`, `.millennial-loader-orb`, `.millennial-loader-icon`, etc.
    - Reuses the global `spin` keyframe and gradients, so it feels cohesive with pagination and Studio chrome.

- **Where it is used**
  - `app/page.tsx` – while loading flows.
  - `app/studio/[id]/page.tsx` – full-screen while loading flow + canvas (“Loading studio…”).
  - `app/transactions/page.tsx` – while loading executions.
  - `app/transactions/[id]/page.tsx` – while loading execution detail (“Loading execution…”).
  - `app/pulses/page.tsx` – while loading flows for pulse endpoints.
  - `app/nexus/page.tsx` – while loading connectors.

You can drop it into any other page:

```tsx
import { MillennialLoader } from '@/MillennialLoader'

return loading ? <MillennialLoader label="Loading something cool…" /> : <ActualContent />
```

---

## Studio: How to run a flow (“run a program”)

In the Studio, **the flow you draw is the program**. There is no separate code file; you build the program by adding nodes and connecting them.

1. **Create or open a flow** from the dashboard.
2. **Build the flow:** drag nodes from the left (Start is always there; add e.g. Variable → Success).
3. **Save** (toolbar **Save**).
4. **Run it:** click **Trigger** in the toolbar. Optionally enter a JSON payload (e.g. `{"name": "World"}`). Click **Run**. The flow executes on the backend; you’ll see node status on the canvas if the execution WebSocket is connected.

**Simple “program” example:** Start → **Variable** (add a variable, e.g. `greeting` = `Hello {{nodes.start.output.body.name}}`) → **Success**. Trigger with payload `{"name": "World"}`. The Variable node resolves the reference and the flow ends at Success.

---

## Studio: Which “language” and how to “code”

You don’t write code in a traditional language inside the Studio. You configure nodes; the only “language” is:

- **Reference expressions** in node config (Variable, Mapper, Decision, HTTP body, etc.): `{{ ... }}`  
  These pull data from the execution context.

**Reference syntax:**

| Reference | Meaning |
|-----------|--------|
| `{{nodes.start.output.body}}` | Trigger payload (request body). Use `{{nodes.start.output.body.fieldName}}` for a field. |
| `{{nodes.<nodeId>.successOutput.body}}` | Success output of a node (e.g. HTTP response body). Replace `<nodeId>` with the node’s ID. |
| `{{nodes.<nodeId>.failureOutput.body}}` | Failure output of a node. |
| `{{variables.<name>}}` | A variable set by a Variable node earlier in the flow. |

**Where you use it:**

- **Variable node:** value = `{{nodes.start.output.body.name}}` or a literal like `"hello"`.
- **Mapper node:** each output field can be a literal or `{{...}}` (e.g. `{{variables.userId}}`).
- **Decision node:** left/right operands can be refs (e.g. `{{variables.amount}}` > `500`).
- **HTTP Call / Nexus:** URL, headers, body can use `{{...}}` for dynamic values.

So “coding” in the Studio = **building the graph** + **filling node config with values and `{{...}}` references**. No JavaScript/Java/Python inside the canvas; the backend runs the flow and resolves refs.

## API Usage

The app talks to the NexFlow backend:

- `GET /api/flows` — list flows  
- `GET/POST /api/flows` — get / create flow  
- `GET/POST /api/flows/{flowId}/canvas` — load / save canvas (nodes + edges)  
- `POST /api/pulse/{flowId}` — trigger execution  
- `GET /api/flows/{flowId}/executions` — list executions  

See `api.ts` for the client implementation.

## CI/CD

Pipeline: GitHub Actions → Vercel

| Branch event | What happens |
|---|---|
| Push to `main` | CI runs → if it passes → deploys to production on Vercel |
| Pull request to `main` | CI runs as a check → Vercel creates a preview URL |
| Push to any other branch | Nothing (pipeline does not trigger) |

**GitHub Secrets required** (Settings → Secrets and variables → Actions):

| Secret | How to get it |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Run `npx vercel link` → open `.vercel/project.json` → copy `orgId` |
| `VERCEL_PROJECT_ID` | Same file → copy `projectId` |

**Vercel Environment Variables** (set in Vercel dashboard, not GitHub):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL e.g. `https://nexflow-backend.railway.app` |
| `NEXT_PUBLIC_WS_URL` | Same URL with `/ws` appended |

## License

Private / as per project.
