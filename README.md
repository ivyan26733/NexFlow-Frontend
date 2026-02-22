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
│   ├── page.tsx            # Dashboard (list flows)
│   ├── globals.css         # Global + studio styles
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

## License

Private / as per project.
