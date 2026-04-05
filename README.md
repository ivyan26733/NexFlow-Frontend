# NexFlow Frontend

Frontend for **NexFlow** — a no-code workflow automation platform. Built with Next.js 14 App Router, React, and React Flow for visual flow design and live execution monitoring.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Canvas | [@xyflow/react](https://xyflow.dev/) (React Flow) |
| Styling | CSS variables (`app/globals.css`) |
| Icons | Lucide React |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Realtime | STOMP over SockJS — live node status during execution |

---

## Prerequisites

- Node.js 18+
- npm / pnpm / yarn

---

## Setup

```bash
npm install
```

### Environment

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8090
NEXT_PUBLIC_WS_URL=http://localhost:8090
```

If not set, both default to `http://localhost:8090`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm run start` | Start production server |

---

## Project Structure

```
Frontend/
│
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout + navbar
│   ├── page.tsx                  # Dashboard — list flows, create, delete
│   ├── globals.css               # Global styles, CSS variables, shared components
│   ├── login/                    # Login page
│   ├── signup/                   # Signup page
│   ├── verify-otp/               # OTP verification
│   ├── forgot-password/          # Forgot password
│   ├── reset-password/           # Password reset
│   ├── studio/[id]/              # Flow editor canvas (Studio)
│   ├── transactions/             # All executions list + detail
│   │   └── [id]/                 # Execution detail (node logs, timeline)
│   ├── nexus/                    # Nexus connector management
│   ├── pulses/                   # Pulse (trigger) endpoints list
│   ├── groups/                   # User groups + sharing
│   ├── admin/                    # Admin panel
│   ├── settings/                 # User settings
│   ├── architecture/             # Architecture overview page
│   ├── templates/                # Flow templates
│   └── about/                    # About page
│
├── api.ts                        # Typed API client
├── types/index.ts                # Domain types (Flow, FlowNode, Execution, etc.)
├── middleware.ts                 # Auth redirect middleware
│
├── NodeSidebar.tsx               # Left sidebar — draggable node palette
├── NodeConfigPanel.tsx           # Right panel — node config form + delete
├── StudioToolbar.tsx             # Top bar — Save, Trigger, flow name
├── FlowNodeCard.tsx              # React Flow node renderer (standard nodes)
├── ForkJoinNodeCard.tsx          # React Flow node renderer (FORK / JOIN)
├── CardMenu.tsx                  # Node context menu (3-dot menu)
├── BranchTimeline.tsx            # Fork/join branch execution timeline
├── Pagination.tsx                # Shared pagination hook + controls
├── MillennialLoader.tsx          # Shared loading component
│
├── useExecutionSocket.ts         # WebSocket hook — execution status updates
├── useBranchSocket.ts            # WebSocket hook — branch status updates
│
├── config/                       # Per-node config panel components
│   ├── ScriptConfig.tsx          # Monaco editor + language selector + timeout
│   ├── NexusConfig.tsx
│   ├── DecisionConfig.tsx
│   ├── MapperConfig.tsx
│   ├── VariableConfig.tsx
│   ├── AiConfig.tsx
│   ├── SubFlowConfig.tsx
│   ├── ForkConfig.tsx
│   ├── RetryConfig.tsx
│   └── ...
│
├── lib/
│   └── nodeConfig.ts             # NODE_META, DRAGGABLE_NODES definitions
│
└── services/                     # Auth helpers, token storage
```

Path alias: `@/` → project root (see `tsconfig.json`).

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — all flows, create new, delete, open in Studio |
| `/studio/[id]` | Visual flow editor canvas |
| `/transactions` | All executions across all flows (searchable, filterable by status) |
| `/transactions/[id]` | Execution detail — per-node logs, duration, status |
| `/nexus` | Nexus connectors CRUD |
| `/pulses` | All pulse (HTTP trigger) endpoints |
| `/groups` | User groups + flow sharing |
| `/login` `/signup` | Auth pages |
| `/verify-otp` | Email OTP verification |
| `/forgot-password` `/reset-password` | Password recovery |
| `/settings` | Account settings |
| `/admin` | Admin panel |
| `/templates` | Flow templates |

---

## Node Types

| Node | What it does |
|------|-------------|
| `START` | Entry point. Receives the Pulse trigger payload |
| `NEXUS` | Fires a saved API connector. Outputs SUCCESS or FAILURE |
| `VARIABLE` | Sets variables available to all downstream nodes |
| `MAPPER` | Reshapes a payload — pick and rename fields |
| `DECISION` | Evaluates a condition, routes SUCCESS or FAILURE edge |
| `SCRIPT` | Runs JavaScript or Python in a sandboxed subprocess |
| `FORK` | Splits into parallel branches |
| `JOIN` | Waits for all branches, merges outputs |
| `AI` | Sends a prompt to a configured LLM |
| `SUB_FLOW` | Runs another saved flow as a nested step |
| `SUCCESS` | Terminal — flow succeeds, returns response |
| `FAILURE` | Terminal — flow fails, returns error |

---

## Reference Syntax

Use `{{...}}` in any node config field to pull data from the execution context:

| Syntax | Meaning |
|--------|---------|
| `{{nodes.start.output.body.name}}` | Trigger payload field |
| `{{nodes.fetchUser.successOutput.body.plan}}` | Output of a previous node |
| `{{variables.userId}}` | Variable set by a VARIABLE node |
| `{{meta.executionId}}` | Execution metadata |

### `nex` unified context (SCRIPT nodes)

```js
nex.userId           // trigger field or variable named userId
nex.fetchOrders      // full output of node labelled "Fetch Orders"
nex.fetchOrders.body.items  // nested field
nex.start            // full trigger payload
```

---

## Authentication

Auth is handled via JWT stored in:
- **Production:** HttpOnly cookie (`nexflow-auth`) — sent automatically on every request
- **Local dev:** `localStorage` via the `nexflow-auth-change` custom event

`middleware.ts` redirects unauthenticated users to `/login` for protected routes.

---

## Pagination

Shared client-side pagination — all list views use the same hook:

```ts
import { usePagination, PaginationControls } from '@/Pagination'

const { pageItems, page, totalPages, totalItems, pageSize, setPage, setPageSize } =
  usePagination(items, 15)
```

Render `pageItems` and drop `<PaginationControls ... />` below the list.

Applied in: Dashboard (9/page), Transactions (15/page), Nexus (10/page), Pulses (8/page).

---

## SCRIPT Node Editor

- Monaco Editor (VS Code engine) with JavaScript and Python syntax highlighting
- Wrapper UI shows `function(nex, input) {` / `}` around user code to make the context clear
- `onKeyDown stopPropagation` prevents React Flow canvas from intercepting spacebar
- Client-side JS syntax check via `new Function()` — no server round-trip
- Configurable timeout (1–300s) sent to backend with node config

---

## WebSocket (Live Execution Updates)

`useExecutionSocket` subscribes to `/topic/execution/{executionId}` over STOMP/SockJS.  
`useBranchSocket` subscribes to `/topic/branch/{branchExecutionId}` for fork/join branches.

Each message updates the node colour on the canvas in real time:
- `RUNNING` → blue pulse
- `SUCCESS` → green
- `FAILURE` → red

---

## Loading Screen

```tsx
import { MillennialLoader } from '@/MillennialLoader'

{loading ? <MillennialLoader label="Loading flows…" /> : <Content />}
// Full-screen version:
<MillennialLoader label="Loading studio…" fullScreen />
```

---

## API Client (`api.ts`)

All backend calls go through the typed `api` object:

```ts
api.flows.list()
api.flows.create({ name, description })
api.flows.canvas.load(flowId)
api.flows.canvas.save(flowId, { nodes, edges })
api.executions.listAll()
api.executions.get(executionId)
api.nexus.list()
api.nexus.create(connector)
api.auth.login({ email, password })
api.auth.logout()
```

---

## CI/CD

Pipeline: GitHub Actions → Vercel

| Event | Result |
|-------|--------|
| Push to `main` | CI runs → deploys to production on Vercel |
| PR to `main` | CI runs as check → Vercel preview URL created |
| Other branches | No trigger |

**GitHub Secrets required:**

| Secret | How to get |
|--------|-----------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `npx vercel link` → `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same file |

**Vercel Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Backend URL e.g. `https://nexflow-backend.example.com` |
| `NEXT_PUBLIC_WS_URL` | Same URL (WebSocket upgrade handled by nginx) |

---

## License

Private / as per project.
