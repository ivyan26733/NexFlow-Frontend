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
