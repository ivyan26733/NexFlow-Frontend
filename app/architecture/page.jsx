"use client";

import { useState } from "react";

const flows = {
  pulse: {
    id: "pulse",
    label: "🔁 Pulse Trigger",
    color: "#00D4FF",
    desc: "What happens when a Pulse (scheduled/manual trigger) fires",
    steps: [
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "User clicks ▶ Run or Pulse fires on schedule",
        detail: "POST /api/executions/trigger/{flowId}\nBody: { triggerType: 'PULSE', payload: {} }",
        file: "studio/[id]/page.tsx → triggerExecution()",
        color: "#3B82F6",
      },
      {
        layer: "BACKEND",
        actor: "ExecutionController",
        action: "Receives trigger request, validates flowId exists",
        detail: "@PostMapping('/api/executions/trigger/{flowId}')\nLoads Flow entity from DB",
        file: "ExecutionController.java → triggerExecution()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Creates a new Transaction record in DB with status RUNNING",
        detail: "Transaction { id, flowId, status: RUNNING, startedAt }\nSaved to transactions table",
        file: "FlowExecutionEngine.java → execute()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Builds execution graph from flow nodes + edges",
        detail: "Loads all FlowNode + FlowEdge from DB\nBuilds adjacency map: nodeId → [nextNodeId]",
        file: "FlowExecutionEngine.java → buildGraph()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Finds START node, initialises NexflowContextObject (NCO)",
        detail: "NCO holds: variables, nodes map, trigger payload\nSTART node output = trigger body\nnco.nodes['start'] = { output: triggerBody }",
        file: "FlowExecutionEngine.java → initNCO()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "NodeExecutor loop",
        action: "Walks graph node by node, picks correct executor per NodeType",
        detail: "SCRIPT → ScriptExecutor\nDECISION → DecisionExecutor\nHTTP → HttpExecutor\netc.",
        file: "NodeExecutorFactory.java → getExecutor(nodeType)",
        color: "#EC4899",
      },
      {
        layer: "BACKEND",
        actor: "ScriptExecutor (example)",
        action: "Builds input JSON from NCO, calls ScriptRunner subprocess",
        detail: "input = { variables, nodes, trigger }\nWrites to temp file → runs node script.js input.json\nCaptures stdout as result",
        file: "ScriptExecutor.java + ScriptRunner.java",
        color: "#EC4899",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "After each node: stores result in NCO under UUID + camelCase label",
        detail: "nco.nodes[uuid] = result\nnco.nodeAliases[camelCaseLabel] = result\ne.g. nodes['calculateDiscount'] = { successOutput: {...} }",
        file: "FlowExecutionEngine.java → toLabelKey()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Follows SUCCESS or FAILURE edge to next node",
        detail: "Each executor returns EdgeType.SUCCESS or FAILURE\nEngine looks up edge in graph → moves to next node",
        file: "FlowExecutionEngine.java → getNextNode()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Hits terminal node (SUCCESS/FAILURE) → execution ends",
        detail: "Transaction status updated: RUNNING → SUCCESS or FAILED\nncoSnapshot serialised to JSON and saved in transaction row",
        file: "FlowExecutionEngine.java → finalise()",
        color: "#8B5CF6",
      },
      {
        layer: "WEBSOCKET",
        actor: "WebSocketEventPublisher",
        action: "Broadcasts execution completion event to all subscribers",
        detail: "Sends to /topic/executions/{flowId}\nPayload: { executionId, status, ncoSnapshot }",
        file: "WebSocketEventPublisher.java → publishExecutionComplete()",
        color: "#10B981",
      },
      {
        layer: "FRONTEND",
        actor: "Studio UI WebSocket listener",
        action: "Receives event, updates UI with execution result",
        detail: "Highlights nodes green/red based on status\nShows output values next to each node",
        file: "studio/[id]/page.tsx → useEffect WebSocket subscriber",
        color: "#3B82F6",
      },
    ],
  },
  save: {
    id: "save",
    label: "💾 Save Flow",
    color: "#10B981",
    desc: "What happens when user clicks Save in Studio",
    steps: [
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "User clicks Save button or Ctrl+S",
        detail: "Reads current nodes + edges from ReactFlow state\nSerialises positions, configs, labels",
        file: "studio/[id]/page.tsx → handleSave()",
        color: "#3B82F6",
      },
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "Builds SaveFlowRequest payload",
        detail: "{ nodes: [{ id, type, label, position, config }], edges: [{ id, source, target, edgeType }] }",
        file: "studio/[id]/page.tsx → buildSavePayload()",
        color: "#3B82F6",
      },
      {
        layer: "FRONTEND",
        actor: "API Client",
        action: "PUT /api/flows/{flowId}",
        detail: "Sends full flow graph as JSON body\nIncludes all node positions and configs",
        file: "lib/api.ts → updateFlow()",
        color: "#3B82F6",
      },
      {
        layer: "BACKEND",
        actor: "FlowController",
        action: "Receives update request, loads existing Flow from DB",
        detail: "@PutMapping('/api/flows/{id}')\nValidates flowId exists",
        file: "FlowController.java → updateFlow()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowService",
        action: "Deletes all existing nodes + edges for this flow",
        detail: "flowNodeRepository.deleteByFlowId(flowId)\nflowEdgeRepository.deleteByFlowId(flowId)\nClean slate approach — avoids diff complexity",
        file: "FlowService.java → updateFlow()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowService",
        action: "Re-inserts all nodes + edges from request payload",
        detail: "Each node saved as FlowNode entity\nEach edge saved as FlowEdge entity\nPositions and configs persisted as JSON",
        file: "FlowService.java → saveNodes() + saveEdges()",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowController",
        action: "Returns updated Flow object",
        detail: "HTTP 200 with full flow JSON",
        file: "FlowController.java",
        color: "#8B5CF6",
      },
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "Shows save confirmation toast",
        detail: "No page reload — ReactFlow state stays intact\nDB is now in sync with canvas",
        file: "studio/[id]/page.tsx",
        color: "#3B82F6",
      },
    ],
  },
  transaction: {
    id: "transaction",
    label: "📋 Transaction Created",
    color: "#F59E0B",
    desc: "Lifecycle of a Transaction from creation to Transactions page",
    steps: [
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Creates Transaction record at the START of execution",
        detail: "Transaction { id: UUID, flowId, status: RUNNING,\ntriggeredBy: PULSE/API,\nstartedAt: now(), ncoSnapshot: null }",
        file: "FlowExecutionEngine.java → createTransaction()",
        color: "#8B5CF6",
      },
      {
        layer: "DATABASE",
        actor: "transactions table",
        action: "Row inserted with status = RUNNING",
        detail: "id | flow_id | status | triggered_by | started_at | completed_at | nco_snapshot\n--- row visible in Transactions page immediately as RUNNING",
        file: "Transaction.java (JPA entity)",
        color: "#64748B",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Execution runs through all nodes (see Pulse flow above)",
        detail: "Each node result stored in NCO in memory\nTransaction row stays RUNNING during this time",
        file: "FlowExecutionEngine.java",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "Execution finishes → updates Transaction row",
        detail: "status: RUNNING → SUCCESS or FAILED\ncompletedAt: now()\nncoSnapshot: full NCO serialised as JSON\n(this is what you see in Transactions detail view)",
        file: "FlowExecutionEngine.java → finaliseTransaction()",
        color: "#8B5CF6",
      },
      {
        layer: "DATABASE",
        actor: "transactions table",
        action: "Row updated with final status + ncoSnapshot",
        detail: "nco_snapshot column holds the entire execution context:\n{ meta, variables, nodes: { uuid: { nodeType, status, output } } }",
        file: "Transaction.java",
        color: "#64748B",
      },
      {
        layer: "FRONTEND",
        actor: "Transactions page",
        action: "GET /api/transactions?flowId={id} — lists all transactions",
        detail: "Polls or loads on page visit\nShows: id, status, triggeredBy, startedAt, duration",
        file: "app/transactions/page.tsx",
        color: "#3B82F6",
      },
      {
        layer: "FRONTEND",
        actor: "Transaction detail view",
        action: "User clicks a transaction → loads ncoSnapshot",
        detail: "GET /api/transactions/{id}\nRenders each node's status + input/output from ncoSnapshot\nThis is where the duplicate node bug was (UUID + label both in nodes map)",
        file: "app/transactions/[id]/page.tsx",
        color: "#3B82F6",
      },
    ],
  },
  websocket: {
    id: "websocket",
    label: "⚡ WebSocket Events",
    color: "#A78BFA",
    desc: "How live updates flow from backend to Studio UI",
    steps: [
      {
        layer: "FRONTEND",
        actor: "Studio page on load",
        action: "Opens WebSocket connection to backend",
        detail: "new SockJS('/ws') → Stomp client\nSubscribes to /topic/executions/{flowId}",
        file: "studio/[id]/page.tsx → useEffect → connectWebSocket()",
        color: "#3B82F6",
      },
      {
        layer: "BACKEND",
        actor: "WebSocket config",
        action: "Accepts connection, registers /ws endpoint",
        detail: "@EnableWebSocketMessageBroker\nregistry.addEndpoint('/ws').withSockJS()\nenableSimpleBroker('/topic') — in-memory, no Redis needed",
        file: "WebSocketConfig.java",
        color: "#8B5CF6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "After each node executes, publishes a node-complete event",
        detail: "messagingTemplate.convertAndSend(\n  '/topic/executions/{flowId}',\n  { nodeId, status, output }\n)",
        file: "WebSocketEventPublisher.java → publishNodeComplete()",
        color: "#10B981",
      },
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "Receives node event → highlights node in real time",
        detail: "Green border = SUCCESS\nRed border = FAILURE\nShows output preview on node card",
        file: "studio/[id]/page.tsx → onMessage handler",
        color: "#3B82F6",
      },
      {
        layer: "BACKEND",
        actor: "FlowExecutionEngine",
        action: "After full execution completes, publishes execution-complete event",
        detail: "Sends full ncoSnapshot in payload\n{ executionId, status: SUCCESS/FAILED, ncoSnapshot }",
        file: "WebSocketEventPublisher.java → publishExecutionComplete()",
        color: "#10B981",
      },
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "Receives completion → updates transaction list in sidebar",
        detail: "Adds new transaction to recent executions list\nStops the loading spinner",
        file: "studio/[id]/page.tsx",
        color: "#3B82F6",
      },
      {
        layer: "FRONTEND",
        actor: "Studio UI",
        action: "Connection stays open for next execution",
        detail: "Heartbeat kept alive via SockJS\nReconnects automatically if dropped",
        file: "studio/[id]/page.tsx → Stomp heartbeat",
        color: "#3B82F6",
      },
    ],
  },
  reference: {
    id: "reference",
    label: "🔗 Reference Resolution",
    color: "#F97316",
    desc: "How {{nodes.calculateDiscount.successOutput.result}} gets resolved",
    steps: [
      {
        layer: "FRONTEND",
        actor: "Node Config Panel",
        action: "User types {{nodes.calculateDiscount.successOutput.result.eligible}}",
        detail: "Stored as raw string in node config JSON\nNot evaluated at save time — stored literally",
        file: "NodeConfigPanel.tsx → config field",
        color: "#3B82F6",
      },
      {
        layer: "DATABASE",
        actor: "flow_nodes table",
        action: "Config JSON saved with raw reference string",
        detail: "{ 'leftValue': '{{nodes.calculateDiscount.successOutput.result.eligible}}' }",
        file: "FlowNode.java → config column (JSON)",
        color: "#64748B",
      },
      {
        layer: "BACKEND",
        actor: "ReferenceResolver",
        action: "Before each node executes, resolves all {{ }} references in its config",
        detail: "Scans config JSON for {{...}} patterns\nExtracts path: nodes.calculateDiscount.successOutput.result.eligible",
        file: "ReferenceResolver.java → resolve(config, nco)",
        color: "#EC4899",
      },
      {
        layer: "BACKEND",
        actor: "ReferenceResolver",
        action: "Looks up path in NCO — checks nodeAliases first, then nodes map",
        detail: "nco.nodeAliases['calculateDiscount'] → finds the node result\nTraverses: .successOutput → .result → .eligible\nReturns the actual value: true or false",
        file: "ReferenceResolver.java → resolvePath(nco, path)",
        color: "#EC4899",
      },
      {
        layer: "BACKEND",
        actor: "ReferenceResolver",
        action: "Replaces {{ }} string with resolved value in config",
        detail: "'leftValue': '{{...}}' → 'leftValue': true\nResolved config passed to executor",
        file: "ReferenceResolver.java",
        color: "#EC4899",
      },
      {
        layer: "BACKEND",
        actor: "DecisionExecutor (example)",
        action: "Receives fully resolved config, evaluates condition",
        detail: "leftValue: true, operator: EQ, rightValue: true\ntrue EQ true → takes SUCCESS edge",
        file: "DecisionExecutor.java → evaluate()",
        color: "#8B5CF6",
      },
    ],
  },
};

const layerColors = {
  FRONTEND: { bg: "#1E3A5F", border: "#3B82F6", label: "#93C5FD" },
  BACKEND: { bg: "#2D1B69", border: "#8B5CF6", label: "#C4B5FD" },
  WEBSOCKET: { bg: "#064E3B", border: "#10B981", label: "#6EE7B7" },
  DATABASE: { bg: "#1C2333", border: "#64748B", label: "#94A3B8" },
};

export default function NexflowArchitecture() {
  const [activeFlow, setActiveFlow] = useState("pulse");
  const [activeStep, setActiveStep] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);

  const flow = flows[activeFlow];

  return (
    <div style={{
      background: "#0A0E1A",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      color: "#E2E8F0",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0D1117 0%, #161B2E 100%)",
        borderBottom: "1px solid #1E293B",
        padding: "20px 28px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <div style={{
          width: "36px", height: "36px",
          background: "linear-gradient(135deg, #00D4FF, #8B5CF6)",
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", fontWeight: "bold", color: "#fff",
        }}>N</div>
        <div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#F1F5F9", letterSpacing: "0.05em" }}>
            NEXFLOW ARCHITECTURE
          </div>
          <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
            Interactive system flow debugger
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {Object.values(flows).map(f => (
            <button
              key={f.id}
              onClick={() => { setActiveFlow(f.id); setActiveStep(null); setExpandedStep(null); }}
              style={{
                padding: "7px 14px",
                borderRadius: "6px",
                border: `1px solid ${activeFlow === f.id ? f.color : "#1E293B"}`,
                background: activeFlow === f.id ? `${f.color}18` : "transparent",
                color: activeFlow === f.id ? f.color : "#64748B",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.15s",
                letterSpacing: "0.03em",
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Flow description */}
      <div style={{
        padding: "14px 28px",
        background: "#0D1117",
        borderBottom: "1px solid #1E293B",
        fontSize: "12px",
        color: "#94A3B8",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <span style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: flow.color, display: "inline-block",
          boxShadow: `0 0 8px ${flow.color}`,
        }} />
        {flow.desc}
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 120px)" }}>

        {/* Step list */}
        <div style={{
          width: "340px",
          borderRight: "1px solid #1E293B",
          overflowY: "auto",
          background: "#0A0E1A",
          flexShrink: 0,
        }}>
          {flow.steps.map((step, i) => {
            const lc = layerColors[step.layer] || layerColors.BACKEND;
            const isActive = activeStep === i;
            return (
              <div
                key={i}
                onClick={() => { setActiveStep(i); setExpandedStep(expandedStep === i ? null : i); }}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #1E293B",
                  cursor: "pointer",
                  background: isActive ? "#13192B" : "transparent",
                  borderLeft: `3px solid ${isActive ? flow.color : "transparent"}`,
                  transition: "all 0.15s",
                  position: "relative",
                }}
              >
                {/* Step number + layer */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <div style={{
                    width: "22px", height: "22px",
                    borderRadius: "50%",
                    background: isActive ? flow.color : "#1E293B",
                    color: isActive ? "#000" : "#64748B",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "10px", fontWeight: "700",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}>{i + 1}</div>
                  <span style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    color: lc.label,
                    background: lc.bg,
                    border: `1px solid ${lc.border}30`,
                    padding: "2px 7px",
                    borderRadius: "3px",
                  }}>{step.layer}</span>
                  <span style={{ fontSize: "10px", color: "#475569", marginLeft: "auto" }}>{step.actor}</span>
                </div>

                {/* Action */}
                <div style={{
                  fontSize: "12px",
                  color: isActive ? "#F1F5F9" : "#94A3B8",
                  lineHeight: "1.4",
                  fontWeight: isActive ? "500" : "400",
                }}>
                  {step.action}
                </div>

                {/* File */}
                <div style={{
                  marginTop: "6px",
                  fontSize: "10px",
                  color: "#3B82F6",
                  opacity: 0.7,
                }}>
                  📄 {step.file}
                </div>

                {/* Connector line */}
                {i < flow.steps.length - 1 && (
                  <div style={{
                    position: "absolute",
                    bottom: "-1px",
                    left: "25px",
                    width: "1px",
                    height: "1px",
                    background: flow.color,
                    opacity: 0.3,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Main detail panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {activeStep === null ? (
            /* Overview diagram */
            <div>
              <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px", letterSpacing: "0.05em" }}>
                CLICK A STEP ON THE LEFT TO SEE DETAILS  ·  OR BROWSE THE OVERVIEW BELOW
              </div>

              {/* Full flow diagram */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {flow.steps.map((step, i) => {
                  const lc = layerColors[step.layer] || layerColors.BACKEND;
                  return (
                    <div key={i} style={{ display: "flex", gap: "0", alignItems: "stretch" }}>
                      {/* Layer badge column */}
                      <div style={{
                        width: "90px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px 4px",
                        borderRight: `1px solid ${lc.border}30`,
                        background: `${lc.bg}80`,
                      }}>
                        <span style={{
                          fontSize: "8px",
                          fontWeight: "700",
                          letterSpacing: "0.1em",
                          color: lc.label,
                          writingMode: "horizontal-tb",
                          textAlign: "center",
                        }}>{step.layer}</span>
                      </div>

                      {/* Arrow + connector */}
                      <div style={{
                        width: "40px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}>
                        <div style={{
                          width: "28px", height: "28px",
                          borderRadius: "50%",
                          background: step.color + "22",
                          border: `2px solid ${step.color}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          fontWeight: "700",
                          color: step.color,
                          zIndex: 1,
                          flexShrink: 0,
                        }}>{i + 1}</div>
                        {i < flow.steps.length - 1 && (
                          <div style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "2px",
                            height: "100%",
                            background: `linear-gradient(${flow.color}80, ${flow.color}20)`,
                          }} />
                        )}
                      </div>

                      {/* Content */}
                      <div
                        onClick={() => setActiveStep(i)}
                        style={{
                          flex: 1,
                          padding: "12px 16px",
                          margin: "4px 0",
                          background: "#0D1117",
                          border: "1px solid #1E293B",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = flow.color + "60"; e.currentTarget.style.background = "#13192B"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#1E293B"; e.currentTarget.style.background = "#0D1117"; }}
                      >
                        <div style={{ fontSize: "11px", color: "#64748B", marginBottom: "4px" }}>
                          {step.actor}
                        </div>
                        <div style={{ fontSize: "13px", color: "#E2E8F0", fontWeight: "500" }}>
                          {step.action}
                        </div>
                        <div style={{ fontSize: "10px", color: "#3B82F6", marginTop: "4px", opacity: 0.8 }}>
                          {step.file}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Step detail */
            <div>
              {/* Navigation */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <button
                  onClick={() => setActiveStep(null)}
                  style={{
                    padding: "6px 12px", borderRadius: "5px",
                    border: "1px solid #1E293B", background: "transparent",
                    color: "#64748B", fontSize: "11px", cursor: "pointer",
                  }}
                >← Overview</button>
                {activeStep > 0 && (
                  <button
                    onClick={() => setActiveStep(activeStep - 1)}
                    style={{
                      padding: "6px 12px", borderRadius: "5px",
                      border: "1px solid #1E293B", background: "transparent",
                      color: "#94A3B8", fontSize: "11px", cursor: "pointer",
                    }}
                  >← Prev</button>
                )}
                {activeStep < flow.steps.length - 1 && (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    style={{
                      padding: "6px 12px", borderRadius: "5px",
                      border: `1px solid ${flow.color}60`,
                      background: `${flow.color}10`,
                      color: flow.color, fontSize: "11px", cursor: "pointer",
                    }}
                  >Next →</button>
                )}
                <span style={{ marginLeft: "auto", fontSize: "11px", color: "#475569" }}>
                  Step {activeStep + 1} of {flow.steps.length}
                </span>
              </div>

              {(() => {
                const step = flow.steps[activeStep];
                const lc = layerColors[step.layer] || layerColors.BACKEND;
                return (
                  <div>
                    {/* Header card */}
                    <div style={{
                      background: "linear-gradient(135deg, #0D1117, #13192B)",
                      border: `1px solid ${step.color}40`,
                      borderRadius: "12px",
                      padding: "24px",
                      marginBottom: "16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <div style={{
                          width: "40px", height: "40px",
                          borderRadius: "50%",
                          background: step.color + "20",
                          border: `2px solid ${step.color}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "16px", fontWeight: "700", color: step.color,
                        }}>{activeStep + 1}</div>
                        <div>
                          <div style={{
                            fontSize: "9px", fontWeight: "700", letterSpacing: "0.12em",
                            color: lc.label, marginBottom: "4px",
                          }}>{step.layer} LAYER  ·  {step.actor}</div>
                          <div style={{ fontSize: "16px", fontWeight: "600", color: "#F1F5F9", lineHeight: "1.3" }}>
                            {step.action}
                          </div>
                        </div>
                      </div>

                      {/* File reference */}
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        padding: "6px 12px",
                        background: "#0A0E1A",
                        border: "1px solid #1E293B",
                        borderRadius: "6px",
                        fontSize: "11px", color: "#3B82F6",
                      }}>
                        📄 {step.file}
                      </div>
                    </div>

                    {/* Detail / code block */}
                    <div style={{
                      background: "#0D1117",
                      border: "1px solid #1E293B",
                      borderRadius: "12px",
                      overflow: "hidden",
                      marginBottom: "16px",
                    }}>
                      <div style={{
                        padding: "10px 16px",
                        borderBottom: "1px solid #1E293B",
                        fontSize: "10px", fontWeight: "700",
                        color: "#475569", letterSpacing: "0.1em",
                        background: "#080B14",
                        display: "flex", alignItems: "center", gap: "8px",
                      }}>
                        <span style={{ color: "#F59E0B" }}>◆</span> WHAT HAPPENS INSIDE
                      </div>
                      <div style={{ padding: "20px" }}>
                        {step.detail.split("\n").map((line, li) => (
                          <div key={li} style={{
                            fontSize: "12px",
                            lineHeight: "1.8",
                            color: line.startsWith("//") || line.startsWith("#") ? "#475569" :
                                   line.includes("→") ? "#10B981" :
                                   line.includes(".java") || line.includes(".tsx") ? "#3B82F6" :
                                   "#D1D5DB",
                            paddingLeft: line.startsWith(" ") ? "16px" : "0",
                          }}>
                            {line || "\u00A0"}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prev/Next node context */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {activeStep > 0 && (
                        <div
                          onClick={() => setActiveStep(activeStep - 1)}
                          style={{
                            padding: "14px",
                            background: "#0D1117",
                            border: "1px solid #1E293B",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: "9px", color: "#475569", marginBottom: "6px", letterSpacing: "0.1em" }}>
                            ← PREVIOUS STEP
                          </div>
                          <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                            {flow.steps[activeStep - 1].action}
                          </div>
                        </div>
                      )}
                      {activeStep < flow.steps.length - 1 && (
                        <div
                          onClick={() => setActiveStep(activeStep + 1)}
                          style={{
                            padding: "14px",
                            background: "#0D1117",
                            border: `1px solid ${flow.color}30`,
                            borderRadius: "8px",
                            cursor: "pointer",
                            gridColumn: activeStep === 0 ? "1 / -1" : "auto",
                          }}
                        >
                          <div style={{ fontSize: "9px", color: flow.color, marginBottom: "6px", opacity: 0.7, letterSpacing: "0.1em" }}>
                            NEXT STEP →
                          </div>
                          <div style={{ fontSize: "11px", color: "#94A3B8" }}>
                            {flow.steps[activeStep + 1].action}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Debug tip */}
                    <div style={{
                      marginTop: "16px",
                      padding: "14px 16px",
                      background: "#0A0E1A",
                      border: "1px solid #F59E0B20",
                      borderLeft: "3px solid #F59E0B",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#94A3B8",
                      lineHeight: "1.6",
                    }}>
                      <span style={{ color: "#F59E0B", fontWeight: "700" }}>🔍 DEBUG TIP  </span>
                      {activeStep === 0 && "Check browser Network tab → look for the POST /api/executions/trigger call. If 404, flowId is wrong. If 401, auth token missing."}
                      {activeStep === 1 && "Add a breakpoint in ExecutionController.java → triggerExecution(). Check the flowId resolves to a real Flow in DB."}
                      {activeStep === 2 && "Query: SELECT * FROM transactions ORDER BY started_at DESC LIMIT 5 — you should see a RUNNING row appear immediately."}
                      {activeStep === 3 && "If graph build fails, a node has no edges. Every non-terminal node needs at least one outgoing edge in the canvas."}
                      {activeStep === 4 && "Log NCO after init: System.out.println(nco.getNodes()) — should show start node with trigger body."}
                      {activeStep === 5 && "If executor is null, NodeType enum value doesn't match what's stored in flow_nodes.node_type column. Check DB."}
                      {activeStep === 6 && "Script fails? Check Railway logs — 'Cannot run program node' means Node.js not in Docker image. Use the Dockerfile fix."}
                      {activeStep === 7 && "Reference not resolving? Log nco.nodeAliases — check camelCase conversion. 'My Node' → 'myNode'. Spaces matter."}
                      {activeStep === 8 && "Wrong edge taken? Log executor return value (EdgeType). DecisionExecutor condition evaluation is the usual suspect."}
                      {activeStep === 9 && "Transaction stuck as RUNNING? Execution threw an uncaught exception. Check Railway logs for stack trace."}
                      {activeStep === 10 && "UI not updating? Open browser console — check WebSocket connection is open. Should see CONNECTED in logs."}
                      {activeStep === 11 && "Node not highlighting? Check the topic path matches: /topic/executions/{flowId}. FlowId must match current flow."}
                      {activeStep > 11 && "Add console.log in the relevant handler and check browser DevTools → Console tab."}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right: layer legend */}
        <div style={{
          width: "160px",
          borderLeft: "1px solid #1E293B",
          background: "#0A0E1A",
          padding: "20px 14px",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: "9px", color: "#475569", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "16px" }}>
            LAYERS
          </div>
          {Object.entries(layerColors).map(([layer, c]) => (
            <div key={layer} style={{ marginBottom: "14px" }}>
              <div style={{
                padding: "8px 10px",
                background: c.bg,
                border: `1px solid ${c.border}40`,
                borderRadius: "6px",
              }}>
                <div style={{ fontSize: "9px", fontWeight: "700", color: c.label, letterSpacing: "0.1em" }}>
                  {layer}
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "4px", lineHeight: "1.4" }}>
                  {layer === "FRONTEND" && "Next.js\nReact components"}
                  {layer === "BACKEND" && "Spring Boot\nJava services"}
                  {layer === "WEBSOCKET" && "STOMP\nReal-time events"}
                  {layer === "DATABASE" && "PostgreSQL\nJPA entities"}
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "20px", borderTop: "1px solid #1E293B", paddingTop: "16px" }}>
            <div style={{ fontSize: "9px", color: "#475569", fontWeight: "700", letterSpacing: "0.12em", marginBottom: "12px" }}>
              FLOWS
            </div>
            {Object.values(flows).map(f => (
              <div
                key={f.id}
                onClick={() => { setActiveFlow(f.id); setActiveStep(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  marginBottom: "8px", cursor: "pointer",
                  opacity: activeFlow === f.id ? 1 : 0.5,
                }}
              >
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: f.color,
                  boxShadow: activeFlow === f.id ? `0 0 6px ${f.color}` : "none",
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: "10px", color: activeFlow === f.id ? "#E2E8F0" : "#475569" }}>
                  {f.label.split(" ").slice(1).join(" ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
