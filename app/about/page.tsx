'use client'

import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA — unchanged from your version
// ───────────────────────────────────────────────────────────────────────────--

const milestones = [
  {
    phase: "01",
    title: "The Frustration",
    date: "Where it began",
    description:
      "Every developer has lived this: you need to automate something — fetch data from an API, transform it, store it, notify someone. You write the same boilerplate again and again. HTTP clients, error handling, retry logic, scheduling. The code exists. The problem is the time it costs to wire it all together every single time.",
    status: "origin",
  },
  {
    phase: "02",
    title: "The Observation",
    date: "What we noticed",
    description:
      "Tools like n8n and Zapier solved this for non-developers. But they made a trade — they hid the power to make it accessible. You couldn't write real logic. You couldn't compose flows from other flows. You couldn't understand what was actually happening inside an execution. They were black boxes with pretty UIs.",
    status: "origin",
  },
  {
    phase: "03",
    title: "The Decision",
    date: "Why we built Nexflow",
    description:
      "We wanted a tool built for developers first. Where you can write real JavaScript or Python mid-flow. Where every execution is fully transparent — every node, every output, every path taken. Where flows can call other flows. Where your data has a name you chose, not a UUID you have to remember. Where automation is understandable, not magical.",
    status: "built",
  },
  {
    phase: "04",
    title: "The Engine",
    date: "Core execution layer",
    description:
      "A full flow execution engine with 12 node types: HTTP, Script (JavaScript + Python), AI (multi-provider: Anthropic, OpenAI, Gemini, Groq, Mistral), Sub-Flows (sync + async), Variables, Mappers, Decisions, Loops, and terminal Success/Failure nodes. A universal nex container so every node output is named, not nested — nex.yourName.field, not nodes[uuid].result.body.",
    status: "built",
  },
  {
    phase: "05",
    title: "Real-Time Canvas",
    date: "Studio + live execution",
    description:
      "ReactFlow-based Studio canvas with live WebSocket node updates over STOMP. Two-phase trigger pattern: execution prepares first, browser subscribes to its queue, then starts — so no event is ever dropped. RabbitMQ StompBrokerRelay for multi-instance production deployments. Dedicated thread pool (core 20, max 50) with explicit transaction boundary commits so background threads always see committed state.",
    status: "built",
  },
  {
    phase: "06",
    title: "Parallel Execution",
    date: "Fork-Join branches",
    description:
      "FORK and JOIN nodes that run multiple branches simultaneously on separate threads using CompletableFuture.allOf(). Three merge strategies: WAIT_ALL (every branch must finish), WAIT_FIRST (race mode — fastest wins), WAIT_N (quorum — continue when N branches complete). Branch results land in nex under their branch name. Live per-branch status dots on the canvas. BranchTimeline in transaction detail shows each branch duration and time saved vs sequential.",
    status: "built",
  },
  {
    phase: "07",
    title: "Production Hardening",
    date: "Bugs that taught us",
    description:
      "Three production bugs diagnosed and fixed under load: WebSocket race condition where messages were dropped before subscription existed (fixed with /queue/ destinations and two-phase trigger). Multi-instance broker isolation where events published on Instance A never reached browsers on Instance B (fixed with RabbitMQ relay). Thread pool exhaustion under 25+ concurrent requests (fixed with dedicated executor and split @Transactional boundary). Each bug produced an engineering principle that is now part of how we build.",
    status: "built",
  },
  {
    phase: "08",
    title: "The Nex Standard",
    date: "Unified data layer",
    description:
      "Replaced the scattered nodes[uuid].successOutput.body pattern with a single flat object: nex. Every trigger field, variable, and node output is auto-spread into nex under the name you chose. nex.fetchUser.body.email instead of nodes['ca250f8e'].successOutput.body.email. Scripts receive both nex and a legacy input object for backward compatibility. All config panels updated with {{nex.x}} syntax. A full reference doc (NEX-STANDARD.md) shipped alongside the engine changes.",
    status: "built",
  },
  {
    phase: "09",
    title: "Auth + RBAC",
    date: "Identity & access control",
    description:
      "Full authentication system: email/password with OTP verification, Google OAuth2 login, and JWT-based sessions. Three-tier role model: Admin, Sub-Admin, and Member. Admins manage user roles, create groups, and grant flow-level access. Groups can be all-access (every member sees every flow) or selective (admin picks which flows each group can access). The first registered account is automatically promoted to Admin. Flows are scoped to their owner; existing flows remain accessible to all for backward compatibility.",
    status: "built",
  },
  {
    phase: "10",
    title: "Production Deploy",
    date: "EC2 + Cloudflare",
    description:
      "Solved a hard Docker problem: Maven downloading 400+ JARs on an 8GB gp2 EBS volume saturated the 24 baseline IOPS ceiling, locking all processes including SSH in kernel D-state. Solution: pre-built JAR pattern — Maven runs locally, only the JRE runtime image and a single JAR ship to EC2. Build time dropped from 20+ minutes (hanging) to under 2 minutes. nginx reverse proxy routes traffic across backend (8090) and AI agent (3001). Cloudflare quick tunnel provides HTTPS without SSL cert setup.",
    status: "built",
  },
  {
    phase: "11",
    title: "The Near Horizon",
    date: "Next 3 months",
    description:
      "CRON scheduling so flows run on time without external callers. Retry logic with configurable backoff on any node. MCP server so AI tools like Claude and Cursor can build and run flows through conversation. Nested fork-join support — a branch can contain its own parallel split. Secrets manager so credentials never touch the canvas. Flow templates marketplace. Audit log for all admin actions.",
    status: "building",
  },
  {
    phase: "12",
    title: "The Vision",
    date: "Where this is going",
    description:
      "Nexflow becomes the automation layer that developers actually want to use — not because they have no choice, but because it respects their craft. Multi-tenant organisations with SSO. A marketplace of connectors. An AI node that reasons about data and routes decisions. Flows described in plain language, built in minutes, fully inspectable. Eventually: the platform where any integration is 20 minutes, not 2 days.",
    status: "future",
  },
];

const principles = [
  {
    icon: "◎",
    title: "Transparency over magic",
    body: "Every execution is fully visible. Every node shows its input, output, and status. No hidden transformations. You should always know exactly what happened and why.",
  },
  {
    icon: "⌥",
    title: "Developer-first, always",
    body: "Real code runs inside flows. JavaScript, Python — not expression builders with 12 nested dropdowns. If you can write it in code, you can run it in a node.",
  },
  {
    icon: "◈",
    title: "Composability",
    body: "Flows call other flows. Nodes are reusable. Connectors are saved once and used everywhere. Nothing should be rebuilt twice.",
  },
  {
    icon: "⬡",
    title: "Named, not nested",
    body: "Your data has a name you chose. nex.userData, not nodes['ca250f8e'].successOutput.result.body. The machine should adapt to you, not the other way around.",
  },
  {
    icon: "⌗",
    title: "Access by design",
    body: "Every flow belongs to someone. Roles, groups, and per-flow permissions ensure the right people see the right automations — without locking everyone out by default.",
  },
];

const stack = [
  { label: "Engine",   value: "Spring Boot + Java 17" },
  { label: "Canvas",   value: "Next.js + ReactFlow" },
  { label: "Database", value: "PostgreSQL + Hibernate" },
  { label: "Realtime", value: "RabbitMQ + STOMP (nodes + branches)" },
  { label: "Scripts",  value: "Nashorn / GraalVM JS + Python3" },
  { label: "Threads",  value: "Dedicated pool — core 20, max 50" },
  { label: "Auth",     value: "JWT + BCrypt + Google OAuth2" },
  { label: "Deploy",   value: "EC2 + Docker + nginx + Cloudflare" },
  { label: "Parallel", value: "Fork-Join — CompletableFuture.allOf()" },
];

const shipped = [
  { label: "Node types",            value: "12" },
  { label: "AI providers",          value: "5"  },
  { label: "Merge strategies",      value: "3"  },
  { label: "User roles",            value: "3"  },
  { label: "Production bugs fixed", value: "6"  },
  { label: "Exec thread pool",      value: "50" },
  { label: "WebSocket queues",      value: "2"  },
  { label: "Auth methods",          value: "2"  },
];

// ─────────────────────────────────────────────────────────────────────────────
// WHY NEXFLOW — Live branch demo
// ─────────────────────────────────────────────────────────────────────────────

const BRANCH_STAGES = [
  { label: "branchA", ms: 200,  color: "#10B981", nodes: ["API Call", "Transform"] },
  { label: "branchB", ms: 580,  color: "#6366F1", nodes: ["AI Node", "Extract"]   },
  { label: "branchC", ms: 150,  color: "#F59E0B", nodes: ["DB Query"]              },
];
const TOTAL_PARALLEL_MS   = 580;
const TOTAL_SEQUENTIAL_MS = BRANCH_STAGES.reduce((s, b) => s + b.ms, 0);

type BranchState = "idle" | "running" | "done";

function LiveBranchDemo() {
  const [states,   setStates]   = useState<BranchState[]>(["idle", "idle", "idle"]);
  const [forkDone, setForkDone] = useState(false);
  const [joinDone, setJoinDone] = useState(false);
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reset() {
    setStates(["idle", "idle", "idle"]);
    setForkDone(false);
    setJoinDone(false);
    setRunning(false);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function run() {
    if (running) { reset(); return; }
    reset();
    setRunning(true);
    const SPEED = 2.2;
    setTimeout(() => setForkDone(true), 10);
    setStates(["running", "running", "running"]);
    BRANCH_STAGES.forEach((b, i) => {
      setTimeout(() => {
        setStates(prev => {
          const next = [...prev] as BranchState[];
          next[i] = "done";
          return next;
        });
      }, b.ms / SPEED);
    });
    setTimeout(() => { setJoinDone(true); setRunning(false); }, (TOTAL_PARALLEL_MS / SPEED) + 60);
    let t = 0;
    timerRef.current = setInterval(() => {
      t += 40;
      setElapsed(t);
      if (t >= TOTAL_PARALLEL_MS / SPEED + 100) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 40);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const saving  = Math.round((1 - TOTAL_PARALLEL_MS / TOTAL_SEQUENTIAL_MS) * 100);
  const allDone = states.every(s => s === "done");

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }}>
      <div style={{
        background: "#030712", border: "1px solid #0F172A",
        borderRadius: "12px", padding: "32px", position: "relative", overflow: "hidden",
      }}>
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

        <div style={{ position: "absolute", top: 12, left: 16, fontSize: "9px", color: "#1E293B", letterSpacing: "0.15em" }}>
          STUDIO CANVAS — LIVE
        </div>
        {running && (
          <div style={{ position: "absolute", top: 12, right: 16, fontSize: "10px", color: "#00D4FF", letterSpacing: "0.1em" }}>
            {Math.round(elapsed * 2.2)}ms
          </div>
        )}
        {allDone && joinDone && (
          <div style={{ position: "absolute", top: 12, right: 16, fontSize: "10px", color: "#10B981", letterSpacing: "0.1em" }}>
            ✓ {TOTAL_PARALLEL_MS}ms
          </div>
        )}

        {/* Flow row */}
        <div style={{ display: "flex", alignItems: "center", position: "relative", zIndex: 1, marginTop: "16px", overflowX: "auto" }}>
          <DemoFlowNode label="TRIGGER" sub="trigger" active={forkDone || running} done={forkDone} />
          <DemoArrow />
          <DemoDiamond label="FORK" symbol="⑃" color="#F59E0B" active={running && !forkDone} done={forkDone} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {BRANCH_STAGES.map((b, i) => (
              <div key={b.label} style={{ display: "flex", alignItems: "center" }}>
                <DemoBranchArrow />
                <DemoBranchLane label={b.label} nodes={b.nodes} color={b.color} state={states[i]} ms={b.ms} />
                <DemoBranchArrow />
              </div>
            ))}
          </div>
          <DemoDiamond label="JOIN" symbol="⑄" color="#10B981" active={states.some(s => s === "done") && !joinDone} done={joinDone} />
          <DemoArrow />
          <DemoFlowNode label="PROCESS" sub="process" active={joinDone} done={joinDone} />
        </div>

        {/* Timeline after completion */}
        {allDone && joinDone && (
          <div style={{ marginTop: "24px", borderTop: "1px solid #0F172A", paddingTop: "16px" }}>
            <div style={{ fontSize: "10px", color: "#64748B", marginBottom: "12px", letterSpacing: "0.1em" }}>BRANCH TIMELINE</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {BRANCH_STAGES.map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "9px", color: b.color, minWidth: "56px", letterSpacing: "0.08em" }}>{b.label}</span>
                  <div style={{ flex: 1, height: "5px", background: "#0F172A", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${(b.ms / TOTAL_PARALLEL_MS) * 100}%`, height: "100%", background: b.color, borderRadius: "3px", transition: "width 0.6s ease" }} />
                  </div>
                  <span style={{ fontSize: "9px", color: "#64748B", minWidth: "36px", textAlign: "right" }}>{b.ms}ms</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "20px", marginTop: "14px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", color: "#64748B" }}>Parallel: <span style={{ color: "#10B981" }}>{TOTAL_PARALLEL_MS}ms</span></span>
              <span style={{ fontSize: "10px", color: "#64748B" }}>Sequential equiv: <span style={{ color: "#475569" }}>{TOTAL_SEQUENTIAL_MS}ms</span></span>
              <span style={{ fontSize: "10px", color: "#F59E0B", fontWeight: "600" }}>⚡ {saving}% faster</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
        <button onClick={run} style={{
          background: running ? "rgba(239,68,68,0.1)" : "rgba(0,212,255,0.08)",
          border: `1px solid ${running ? "rgba(239,68,68,0.3)" : "rgba(0,212,255,0.25)"}`,
          borderRadius: "6px", color: running ? "#ef4444" : "#00D4FF",
          fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.12em",
          padding: "10px 28px", cursor: "pointer", transition: "all 0.15s",
        }}>
          {running ? "◼ STOP" : allDone ? "↺ RUN AGAIN" : "▶ RUN FLOW"}
        </button>
      </div>
    </div>
  );
}

function DemoFlowNode({ label, sub, active, done }: { label: string; sub: string; active: boolean; done: boolean }) {
  const color = done ? "#10B981" : active ? "#00D4FF" : "#1E293B";
  return (
    <div style={{
      background: "#0a0f1e", border: `1px solid ${color}`, borderRadius: "6px",
      padding: "8px 12px", minWidth: "64px", textAlign: "center", flexShrink: 0,
      transition: "border-color 0.3s, box-shadow 0.3s",
      boxShadow: active || done ? `0 0 10px ${color}30` : "none",
    }}>
      <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "0.1em", marginBottom: "2px" }}>{sub.toUpperCase()}</div>
      <div style={{ fontSize: "10px", color: done ? "#10B981" : active ? "#00D4FF" : "#475569", fontWeight: "600" }}>{label}</div>
    </div>
  );
}

function DemoDiamond({ label, symbol, color, active, done }: { label: string; symbol: string; color: string; active: boolean; done: boolean }) {
  const c = done ? color : active ? color : "#1E293B";
  return (
    <div style={{
      width: "56px", height: "56px", background: "#0a0f1e", border: `1.5px solid ${c}`,
      transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, margin: "0 4px",
      transition: "border-color 0.3s, box-shadow 0.3s",
      boxShadow: active || done ? `0 0 14px ${c}40` : "none",
    }}>
      <div style={{ transform: "rotate(-45deg)", textAlign: "center" }}>
        <div style={{ fontSize: "16px", color: c, lineHeight: 1 }}>{symbol}</div>
        <div style={{ fontSize: "7px", color: c, letterSpacing: "0.05em", marginTop: "1px" }}>{label}</div>
      </div>
    </div>
  );
}

function DemoBranchLane({ label, nodes, color, state, ms }: { label: string; nodes: string[]; color: string; state: BranchState; ms: number }) {
  const isRunning = state === "running";
  const isDone    = state === "done";
  const c = isDone ? color : isRunning ? color : "#1E293B";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "4px",
      background: isDone ? `${color}08` : isRunning ? `${color}05` : "transparent",
      border: `1px solid ${c}30`, borderRadius: "6px",
      padding: "6px 10px", minWidth: "180px", transition: "all 0.3s",
    }}>
      <span style={{ fontSize: "8px", color: c, minWidth: "44px", letterSpacing: "0.06em" }}>{label}</span>
      {nodes.map(n => (
        <div key={n} style={{
          background: isDone ? `${color}20` : isRunning ? `${color}12` : "#0F172A",
          border: `1px solid ${c}40`, borderRadius: "4px",
          padding: "3px 6px", fontSize: "8px",
          color: isDone ? color : isRunning ? color : "#334155",
          transition: "all 0.3s",
        }}>
          {isDone ? "✓ " : isRunning ? "↻ " : ""}{n}
        </div>
      ))}
      {isDone && <span style={{ fontSize: "8px", color: "#475569", marginLeft: "4px" }}>{ms}ms</span>}
    </div>
  );
}

function DemoArrow()       { return <div style={{ width: "16px", height: "1px", background: "#1E293B", flexShrink: 0 }} />; }
function DemoBranchArrow() { return <div style={{ width: "12px", height: "1px", background: "#1E293B", flexShrink: 0 }} />; }

// ─────────────────────────────────────────────────────────────────────────────
// WHY NEXFLOW — nex comparison toggle
// ─────────────────────────────────────────────────────────────────────────────

function NexComparison() {
  const [active, setActive] = useState<"them" | "us">("them");

  const them = `// n8n
$node["HTTP Request"]
  .json["data"][0]
  ["user"]["email"]

// Make
{{1.data[].user.email}}

// Zapier
{{153892.Body.data
  .0.user.email}}`;

  const us = `// Nexflow — you named it
nex.fetchUser.email

// In a Script node
var email = nex.fetchUser.email;
var name  = nex.fetchUser.name;

// In an HTTP node body
{ "to": "{{nex.fetchUser.email}}" }`;

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }}>
      <div style={{ display: "flex", marginBottom: "16px", border: "1px solid #0F172A", borderRadius: "6px", overflow: "hidden", width: "fit-content" }}>
        {(["them", "us"] as const).map(t => (
          <button key={t} onClick={() => setActive(t)} style={{
            background: active === t ? (t === "us" ? "rgba(0,212,255,0.1)" : "rgba(239,68,68,0.1)") : "#050810",
            border: "none", borderRight: t === "them" ? "1px solid #0F172A" : "none",
            color: active === t ? (t === "us" ? "#00D4FF" : "#ef4444") : "#475569",
            fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.12em",
            padding: "8px 20px", cursor: "pointer", transition: "all 0.15s",
          }}>
            {t === "them" ? "n8n / Make / Zapier" : "Nexflow"}
          </button>
        ))}
      </div>
      <div style={{
        background: "#030712",
        border: `1px solid ${active === "us" ? "rgba(0,212,255,0.15)" : "rgba(239,68,68,0.12)"}`,
        borderRadius: "8px", padding: "24px",
        transition: "border-color 0.3s", position: "relative",
      }}>
        <div style={{
          position: "absolute", top: "10px", right: "12px",
          fontSize: "9px", letterSpacing: "0.1em",
          color: active === "us" ? "#00D4FF" : "#ef4444",
          background: active === "us" ? "rgba(0,212,255,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${active === "us" ? "rgba(0,212,255,0.15)" : "rgba(239,68,68,0.15)"}`,
          borderRadius: "3px", padding: "2px 7px",
        }}>
          {active === "us" ? "NEXFLOW" : "THEIR WAY"}
        </div>
        <pre style={{ margin: 0, fontSize: "12px", lineHeight: "1.9", color: active === "us" ? "#94A3B8" : "#64748B", whiteSpace: "pre-wrap" }}>
          {active === "them" ? them : us}
        </pre>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY NEXFLOW — comparison table
// ─────────────────────────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { feature: "Live parallel execution on canvas",  nexflow: true,  n8n: false, zapier: false, make: false },
  { feature: "Per-branch real-time status dots",   nexflow: true,  n8n: false, zapier: false, make: false },
  { feature: "Named data access (nex.name.field)", nexflow: true,  n8n: false, zapier: false, make: false },
  { feature: "Real JavaScript / Python in flows",  nexflow: true,  n8n: true,  zapier: false, make: false },
  { feature: "Merge strategies (ALL / FIRST / N)", nexflow: true,  n8n: false, zapier: false, make: false },
  { feature: "Branch timing + savings visible",    nexflow: true,  n8n: false, zapier: false, make: false },
  { feature: "Flows calling other flows",          nexflow: true,  n8n: true,  zapier: false, make: true  },
  { feature: "Full execution JSON per node",       nexflow: true,  n8n: true,  zapier: false, make: false },
  { feature: "Multi-instance WebSocket delivery",  nexflow: true,  n8n: false, zapier: false, make: false },
  { feature: "Script reads nex directly",          nexflow: true,  n8n: false, zapier: false, make: false },
];

function CompareTable() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono', monospace" }}>
        <thead>
          <tr>
            {[
              { label: "FEATURE",  key: "feature", accent: "#94A3B8" },
              { label: "NEXFLOW",  key: "nexflow", accent: "#00D4FF" },
              { label: "N8N",      key: "n8n",     accent: "#64748B" },
              { label: "ZAPIER",   key: "zapier",  accent: "#64748B" },
              { label: "MAKE",     key: "make",    accent: "#64748B" },
            ].map(c => (
              <th key={c.key} style={{
                padding: "12px 16px", textAlign: c.key === "feature" ? "left" : "center",
                fontSize: "9px", letterSpacing: "0.15em", color: c.accent,
                borderBottom: "1px solid #0F172A",
                background: c.key === "nexflow" ? "rgba(0,212,255,0.03)" : "transparent",
                whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map(row => (
            <tr key={row.feature} style={{ borderBottom: "1px solid #0A0F1E" }}>
              <td style={{ padding: "11px 16px", fontSize: "12px", color: "#94A3B8" }}>{row.feature}</td>
              {(["nexflow", "n8n", "zapier", "make"] as const).map(tool => (
                <td key={tool} style={{
                  padding: "11px 16px", textAlign: "center",
                  background: tool === "nexflow" ? "rgba(0,212,255,0.02)" : "transparent",
                }}>
                  {row[tool]
                    ? <span style={{ color: tool === "nexflow" ? "#10B981" : "#334155", fontSize: "14px" }}>✓</span>
                    : <span style={{ color: "#1E293B", fontSize: "12px" }}>—</span>
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WHY NEXFLOW — full section
// ─────────────────────────────────────────────────────────────────────────────

function WhyNexflow() {
  return (
    <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
      <div style={{ maxWidth: "1200px" }}>

        {/* Header */}
        <div style={{ marginBottom: "72px" }}>
          <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "16px" }}>WHY NEXFLOW</div>
          <div style={{ width: "40px", height: "2px", background: "#00D4FF", marginBottom: "24px" }} />
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: "700",
            letterSpacing: "-0.02em", color: "#F1F5F9", lineHeight: "1.2",
            margin: "0 0 16px", fontFamily: "'DM Mono', monospace",
          }}>
            Two things no other tool does.
          </h2>
          <p style={{ fontSize: "14px", color: "#64748B", maxWidth: "480px", lineHeight: "1.8", margin: 0 }}>
            Not better versions of what exists. Genuinely absent features
            that change how you think about workflow automation.
          </p>
        </div>

        {/* Standout 1 — live parallel canvas */}
        <div style={{ marginBottom: "96px" }}>
          <div className="about-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "start" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                fontSize: "9px", letterSpacing: "0.15em", color: "#F59E0B",
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "3px", padding: "4px 10px", marginBottom: "20px",
              }}>
                <span>⑃</span> STANDOUT FEATURE 01
              </div>
              <h3 style={{
                fontSize: "clamp(18px, 2vw, 26px)", fontWeight: "700",
                color: "#F1F5F9", lineHeight: "1.3", letterSpacing: "-0.01em",
                margin: "0 0 16px", fontFamily: "'DM Mono', monospace",
              }}>
                Live parallel execution,<br />visible on the canvas.
              </h3>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.9", margin: "0 0 20px" }}>
                n8n, Zapier, and Make show you execution results <em>after</em> they finish.
                Nexflow shows you execution <em>as it happens</em> — each branch turns blue
                the instant it starts, green when it completes, and the JOIN counts down live.
              </p>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.9", margin: "0 0 28px" }}>
                When it's done, BranchTimeline tells you exactly how much time parallel
                execution saved vs running sequentially. Not estimated — measured, from
                actual thread timestamps.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[
                  { tool: "n8n",    note: "Has parallel execution — canvas shows nothing until done" },
                  { tool: "Zapier", note: "Sequential only — no parallel execution concept"          },
                  { tool: "Make",   note: "Sequential only — parallel requires workarounds"          },
                ].map(c => (
                  <div key={c.tool} style={{
                    display: "flex", gap: "12px", alignItems: "flex-start",
                    padding: "8px 12px",
                    background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.08)",
                    borderRadius: "5px",
                  }}>
                    <span style={{ fontSize: "10px", color: "#334155", minWidth: "48px", paddingTop: "1px" }}>{c.tool}</span>
                    <span style={{ fontSize: "11px", color: "#475569", lineHeight: "1.6" }}>{c.note}</span>
                  </div>
                ))}
              </div>
            </div>
            <div><LiveBranchDemo /></div>
          </div>
        </div>

        {/* Standout 2 — nex */}
        <div style={{ marginBottom: "96px" }}>
          <div className="about-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "start" }}>
            <div><NexComparison /></div>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                fontSize: "9px", letterSpacing: "0.15em", color: "#6366F1",
                background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "3px", padding: "4px 10px", marginBottom: "20px",
              }}>
                <span>◈</span> STANDOUT FEATURE 02
              </div>
              <h3 style={{
                fontSize: "clamp(18px, 2vw, 26px)", fontWeight: "700",
                color: "#F1F5F9", lineHeight: "1.3", letterSpacing: "-0.01em",
                margin: "0 0 16px", fontFamily: "'DM Mono', monospace",
              }}>
                Your data has a name.<br />One you chose.
              </h3>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.9", margin: "0 0 20px" }}>
                Every other tool forces you to navigate its internal data structure —
                position-based indexes, UUID node references, nested dot-paths that
                break the moment you reorder a step.
              </p>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.9", margin: "0 0 20px" }}>
                In Nexflow, you name a node's output once — say,{" "}
                <code style={{ color: "#6366F1", fontSize: "12px" }}>fetchUser</code> — and from
                that point every downstream node, every script, every HTTP body template
                accesses it as <code style={{ color: "#00D4FF", fontSize: "12px" }}>nex.fetchUser.field</code>.
              </p>
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.9", margin: 0 }}>
                Scripts read it natively:{" "}
                <code style={{ color: "#10B981", fontSize: "12px" }}>var email = nex.fetchUser.email</code>.
                No binding helpers. No adapter layers. The JavaScript engine receives
                the live nex object before your script runs.
              </p>
            </div>
          </div>
        </div>

        {/* Full comparison table */}
        <div>
          <div style={{ fontSize: "10px", color: "#64748B", letterSpacing: "0.15em", marginBottom: "20px" }}>FULL COMPARISON</div>
          <div style={{ background: "#050810", border: "1px solid #0F172A", borderRadius: "8px", overflow: "hidden" }}>
            <CompareTable />
          </div>
          <p style={{ fontSize: "11px", color: "#334155", marginTop: "12px", textAlign: "right" }}>
            ✓ = supported natively — as of March 2026
          </p>
        </div>

      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED COUNTER — unchanged from your version
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          let start = 0;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE — your exact code, with <WhyNexflow /> injected after THE PROBLEM
// ─────────────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [hoveredMilestone, setHoveredMilestone] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const statusColor: Record<string, string> = {
    origin:   "#64748B",
    built:    "#10B981",
    building: "#F59E0B",
    future:   "#6366F1",
  };

  const statusLabel: Record<string, string> = {
    origin:   "Origin",
    built:    "Shipped",
    building: "In Progress",
    future:   "Vision",
  };

  return (
    <div
      style={{
        background: "#050810",
        minHeight: "100vh",
        color: "#E2E8F0",
        fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
        overflowX: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Glow orbs */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
          transform: `translateY(${scrollY * 0.1}px)`,
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "20%",
          right: "5%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <style>{`
          @media (max-width: 768px) {
            .about-2col { grid-template-columns: 1fr !important; gap: 32px !important; }
            .about-3col { grid-template-columns: 1fr 1fr !important; }
            .about-eng-row { grid-template-columns: 1fr !important; gap: 8px !important; padding: 20px 16px !important; }
            .about-milestone { gap: 20px !important; }
            .about-section { padding: 60px 5vw !important; min-height: unset !important; }
            .about-footer { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
          }
          @media (max-width: 480px) {
            .about-3col { grid-template-columns: 1fr !important; }
            .about-section { padding: 48px 4vw !important; }
            .about-eng-row { grid-template-columns: 1fr !important; }
            .about-milestone { gap: 12px !important; margin-bottom: 40px !important; }
          }
        `}</style>

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section
          className="about-section"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px 8vw 64px",
            borderBottom: "1px solid #0F172A",
            boxSizing: "border-box",
          }}
        >
          <div style={{ maxWidth: "900px" }}>
            {/* Eyebrow */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 12px",
                border: "1px solid #1E293B",
                borderRadius: "4px",
                marginBottom: "40px",
                fontSize: "11px",
                color: "#00D4FF",
                letterSpacing: "0.2em",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#00D4FF",
                  boxShadow: "0 0 8px #00D4FF",
                  display: "inline-block",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              OPEN SOURCE · DEVELOPER FIRST · IN ACTIVE DEVELOPMENT
            </div>

            {/* Main headline */}
            <h1
              style={{
                fontSize: "clamp(42px, 7vw, 90px)",
                fontWeight: "800",
                lineHeight: "0.95",
                letterSpacing: "-0.03em",
                margin: "0 0 32px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <span style={{ color: "#F1F5F9" }}>We got tired</span>
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #00D4FF 0%, #6366F1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                of wiring
              </span>
              <br />
              <span style={{ color: "#F1F5F9" }}>things together.</span>
            </h1>

            <p
              style={{
                fontSize: "clamp(14px, 1.8vw, 20px)",
                color: "#94A3B8",
                lineHeight: "1.7",
                maxWidth: "620px",
                margin: "0 0 48px",
              }}
            >
              So we built Nexflow — a workflow automation engine for
              developers who want real control over what runs, when it
              runs, and exactly what comes out of it.
            </p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "48px", flexWrap: "wrap" }}>
              {[
                { n: 12,  label: "node types",       suffix: "" },
                { n: 5,   label: "AI providers",      suffix: "" },
                { n: 3,   label: "merge strategies",  suffix: "" },
                { n: 6,   label: "prod bugs fixed",   suffix: "" },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    style={{
                      fontSize: "clamp(28px, 4vw, 48px)",
                      fontWeight: "800",
                      color: "#00D4FF",
                      lineHeight: "1",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    <AnimatedCounter target={s.n} />
                    {s.suffix}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#94A3B8",
                      letterSpacing: "0.1em",
                      marginTop: "4px",
                    }}
                  >
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll hint */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              left: "8vw",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "10px",
              color: "#64748B",
              letterSpacing: "0.2em",
            }}
          >
            <div
              style={{
                width: "1px",
                height: "40px",
                background: "linear-gradient(to bottom, transparent, #334155)",
              }}
            />
            SCROLL
          </div>
        </section>

        {/* ── THE PROBLEM ──────────────────────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div
            className="about-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "80px",
              alignItems: "start",
              maxWidth: "1200px",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "16px" }}>
                THE PROBLEM
              </div>
              <div style={{ width: "40px", height: "2px", background: "#00D4FF", marginBottom: "24px" }} />
              <div style={{ fontSize: "13px", color: "#CBD5E1", letterSpacing: "0.1em", lineHeight: "2" }}>
                WHY THIS<br />EXISTS
              </div>
            </div>

            <div>
              <p style={{ fontSize: "clamp(18px, 2.5vw, 28px)", lineHeight: "1.6", color: "#CBD5E1", margin: "0 0 32px", fontWeight: "300", letterSpacing: "-0.01em" }}>
                Existing tools made a bad trade. They gave non-developers
                access to automation by hiding the engine entirely. Developers
                got beautiful drag-and-drop interfaces that couldn't run
                real code, couldn't show what was actually happening, and
                couldn't compose well.
              </p>

              <p style={{ fontSize: "clamp(14px, 1.6vw, 18px)", lineHeight: "1.8", color: "#94A3B8", margin: "0 0 32px" }}>
                n8n is powerful but opaque. Zapier is accessible but limited.
                Building custom integrations in code is flexible but costs
                days per connection. There was no tool that gave developers
                the visual canvas AND the real power underneath.
              </p>

              <p style={{ fontSize: "clamp(14px, 1.6vw, 18px)", lineHeight: "1.8", color: "#94A3B8", margin: "0" }}>
                Nexflow is that tool. Every node is transparent. Every
                execution is logged, inspectable, and debuggable. Real
                JavaScript and Python run inside flows. Flows call other
                flows. Your data has names you chose, not UUIDs you have
                to memorise.
              </p>
            </div>
          </div>
        </section>

        {/* ── WHY NEXFLOW ──────────────────────────────────────── */}
        <WhyNexflow />

        {/* ── WHAT WE'VE SHIPPED ───────────────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div style={{ maxWidth: "1200px" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "16px" }}>
              WHAT SHIPS TODAY
            </div>
            <div style={{ width: "40px", height: "2px", background: "#10B981", marginBottom: "56px" }} />

            <div
              className="about-3col"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1px",
                background: "#0F172A",
                border: "1px solid #0F172A",
                marginBottom: "64px",
              }}
            >
              {shipped.map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "#050810",
                    padding: "32px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#080D18")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#050810")}
                >
                  <div style={{ fontSize: "clamp(28px, 3vw, 42px)", fontWeight: "800", color: "#10B981", letterSpacing: "-0.02em", lineHeight: "1", marginBottom: "8px" }}>
                    <AnimatedCounter target={parseInt(s.value)} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748B", letterSpacing: "0.1em" }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>

            {/* Feature highlight cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1px", background: "#0F172A", border: "1px solid #0F172A" }}>
              {[
                {
                  icon: "⑃",
                  color: "#F59E0B",
                  title: "Fork-Join Parallel Execution",
                  body: "Run branches simultaneously. WAIT_ALL, WAIT_FIRST, or WAIT_N merge strategies. Per-branch live status dots. BranchTimeline shows exactly how much time parallel execution saved vs sequential.",
                },
                {
                  icon: "◎",
                  color: "#00D4FF",
                  title: "Two-Phase WebSocket Trigger",
                  body: "Prepare → Subscribe → Start. The execution never begins until the canvas is listening. No events dropped. Works across multiple backend instances via RabbitMQ StompBrokerRelay.",
                },
                {
                  icon: "◈",
                  color: "#6366F1",
                  title: "Universal nex Container",
                  body: "Every node output is stored under a name you chose. nex.userData.email, not nodes['ca250f8e'].successOutput[0]. Scripts read nex directly: var x = nex.myNode.field.",
                },
                {
                  icon: "⚡",
                  color: "#10B981",
                  title: "Dedicated Thread Pool",
                  body: "Core 20, max 50 threads — never the JVM's shared ForkJoinPool. Split @Transactional boundary: DB commits before background threads launch. No stuck-in-RUNNING executions.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{ background: "#050810", padding: "36px", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#080D18")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#050810")}
                >
                  <div style={{ fontSize: "24px", color: card.color, marginBottom: "16px", opacity: 0.8 }}>{card.icon}</div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#F1F5F9", marginBottom: "10px", letterSpacing: "0.02em" }}>{card.title}</div>
                  <div style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.8" }}>{card.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRINCIPLES ───────────────────────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "64px" }}>
            DESIGN PRINCIPLES
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1px",
              background: "#0F172A",
              border: "1px solid #0F172A",
            }}
          >
            {principles.map((p, i) => (
              <div
                key={p.title}
                style={{ background: "#050810", padding: "48px 32px", transition: "background 0.2s", cursor: "default" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#080D18")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#050810")}
              >
                <div style={{ fontSize: "28px", color: "#00D4FF", marginBottom: "20px", opacity: 0.7 }}>{p.icon}</div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "#F1F5F9", marginBottom: "14px", letterSpacing: "0.02em" }}>{p.title}</div>
                <div style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.8" }}>{p.body}</div>
                <div style={{ marginTop: "24px", fontSize: "10px", color: "#64748B", letterSpacing: "0.1em" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TIMELINE ─────────────────────────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "64px" }}>
            STORY + ROADMAP
          </div>

          <div style={{ position: "relative", maxWidth: "900px" }}>
            {/* Vertical line */}
            <div
              style={{
                position: "absolute",
                left: "32px",
                top: "0",
                bottom: "0",
                width: "1px",
                background:
                  "linear-gradient(to bottom, #0F172A, #1E293B 30%, #1E293B 70%, #0F172A)",
              }}
            />

            {milestones.map((m, i) => (
              <div
                key={m.phase}
                className="about-milestone"
                style={{ display: "flex", gap: "48px", marginBottom: "64px", cursor: "default" }}
                onMouseEnter={() => setHoveredMilestone(i)}
                onMouseLeave={() => setHoveredMilestone(null)}
              >
                {/* Phase dot */}
                <div style={{ flexShrink: 0, width: "64px", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "4px" }}>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: hoveredMilestone === i ? statusColor[m.status] : "#0F172A",
                      border: `2px solid ${statusColor[m.status]}`,
                      boxShadow: hoveredMilestone === i ? `0 0 12px ${statusColor[m.status]}` : "none",
                      transition: "all 0.2s",
                      zIndex: 1,
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", color: "#64748B", letterSpacing: "0.15em" }}>{m.phase}</span>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: hoveredMilestone === i ? "#F1F5F9" : "#94A3B8", transition: "color 0.2s", letterSpacing: "-0.01em" }}>
                      {m.title}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        padding: "2px 8px",
                        borderRadius: "3px",
                        background: `${statusColor[m.status]}15`,
                        color: statusColor[m.status],
                        border: `1px solid ${statusColor[m.status]}30`,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {statusLabel[m.status].toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.1em", marginBottom: "10px" }}>
                    {m.date.toUpperCase()}
                  </div>

                  <p style={{ fontSize: "13px", color: "#CBD5E1", lineHeight: "1.8", margin: "0", maxWidth: "640px" }}>
                    {m.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STACK ────────────────────────────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div
            className="about-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: "80px",
              alignItems: "center",
              maxWidth: "1200px",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "16px" }}>UNDER THE HOOD</div>
              <div style={{ width: "40px", height: "2px", background: "#6366F1", marginBottom: "24px" }} />
              <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: "1.8" }}>
                Built entirely from scratch. No off-the-shelf execution
                engines. Every piece chosen for a reason.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1px",
                background: "#0F172A",
                border: "1px solid #0F172A",
              }}
            >
              {stack.map((s) => (
                <div
                  key={s.label}
                  style={{ background: "#050810", padding: "28px 32px", display: "flex", flexDirection: "column", gap: "6px", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#080D18")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#050810")}
                >
                  <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontSize: "13px", color: "#CBD5E1", fontWeight: "500" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ENGINEERING PRINCIPLES EARNED ────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div style={{ maxWidth: "1200px" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "16px" }}>EARNED IN PRODUCTION</div>
            <div style={{ width: "40px", height: "2px", background: "#F59E0B", marginBottom: "16px" }} />
            <p style={{ fontSize: "13px", color: "#64748B", marginBottom: "56px", maxWidth: "480px", lineHeight: "1.8" }}>
              These aren't best practices we read. They're rules we wrote after things broke in production.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0px", border: "1px solid #0F172A" }}>
              {[
                {
                  rule: "01",
                  title: "Never use time-based synchronisation",
                  body: "Thread.sleep() for coordination is always wrong. Replace every sleep with event-driven equivalents: callbacks, futures with completion signals, or protocol-level acknowledgements.",
                },
                {
                  rule: "02",
                  title: "In-memory state does not survive multi-instance",
                  body: "Any data stored in JVM memory — broker state, caches, session state, counters — is invisible to other instances. Use external shared stores for anything that must be visible across instances.",
                },
                {
                  rule: "03",
                  title: "Always provide dedicated thread pools for business logic",
                  body: "JVM common ForkJoinPool is shared by everything. Never use it for business-critical work. Create named, explicitly-sized ThreadPoolTaskExecutor beans for each distinct concern.",
                },
                {
                  rule: "04",
                  title: "Transaction boundaries must be explicit",
                  body: "@Transactional commits when the method returns, not when you expect. Any async task launched inside a transaction must be invoked by the caller after the @Transactional method completes.",
                },
                {
                  rule: "05",
                  title: "Background threads must never fail silently",
                  body: "CompletableFuture.runAsync() swallows all unchecked exceptions. Always catch Exception, log it, and transition the entity to a FAILURE state with an error message.",
                },
                {
                  rule: "06",
                  title: "Inject context — don't assume it",
                  body: "JavaScript engines don't inherit Java scope. If your script needs nex, you must bind it explicitly before eval(). The engine only knows what you give it.",
                },
              ].map((r, i) => (
                <div
                  key={r.rule}
                  className="about-eng-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 2fr",
                    gap: "32px",
                    padding: "28px 32px",
                    borderBottom: i < 5 ? "1px solid #0F172A" : "none",
                    background: "#050810",
                    transition: "background 0.15s",
                    alignItems: "start",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#080D18")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#050810")}
                >
                  <div style={{ fontSize: "10px", color: "#F59E0B", letterSpacing: "0.1em", paddingTop: "2px" }}>RULE {r.rule}</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#CBD5E1", lineHeight: "1.5" }}>{r.title}</div>
                  <div style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.8" }}>{r.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMMITMENT ───────────────────────────────────────── */}
        <section className="about-section" style={{ padding: "120px 8vw 80px" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "40px" }}>
              THE COMMITMENT
            </div>

            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 52px)",
                fontWeight: "700",
                lineHeight: "1.2",
                letterSpacing: "-0.02em",
                margin: "0 0 32px",
                color: "#F1F5F9",
              }}
            >
              We will not stop until automation
              <span
                style={{
                  background: "linear-gradient(135deg, #00D4FF, #6366F1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {" "}feels like thinking.
              </span>
            </h2>

            <p style={{ fontSize: "15px", color: "#94A3B8", lineHeight: "1.9", margin: "0 0 24px" }}>
              The endgame is simple: any integration, any logic, any
              schedule — built in 20 minutes, not 2 days. A developer
              should be able to describe a workflow in plain language
              and have it running. Not because AI does the thinking,
              but because the tool is transparent enough that you always
              know what it built and why.
            </p>

            <p style={{ fontSize: "15px", color: "#94A3B8", lineHeight: "1.9", margin: "0 0 64px" }}>
              Nexflow is not trying to replace code. It is trying to
              eliminate the code that was never interesting in the first
              place — the plumbing, the boilerplate, the retry logic,
              the cron expressions, the HTTP client setup. Keep the
              creative parts. Automate the rest.
            </p>

            {/* Bottom signature */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "16px",
                padding: "16px 28px",
                border: "1px solid #0F172A",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "linear-gradient(135deg, #00D4FF, #6366F1)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#000",
                }}
              >
                N
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "13px", color: "#F1F5F9", fontWeight: "600" }}>Nexflow</div>
                <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.1em" }}>ACTIVELY IN DEVELOPMENT</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div
          className="about-footer"
          style={{
            borderTop: "1px solid #0F172A",
            padding: "24px 8vw",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "10px", color: "#64748B", letterSpacing: "0.1em" }}>NEXFLOW © 2026</span>
          <span style={{ fontSize: "10px", color: "#64748B", letterSpacing: "0.1em" }}>BUILT WITH PURPOSE</span>
        </div>
      </div>
    </div>
  );
}
