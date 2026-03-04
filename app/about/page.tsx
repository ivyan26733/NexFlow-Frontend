'use client'

import { useState, useEffect, useRef } from "react";

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
    title: "The Near Horizon",
    date: "Next 3 months",
    description:
      "CRON scheduling so flows run on time without external callers. Retry logic with configurable backoff on any node. MCP server so AI tools like Claude and Cursor can build and run flows through conversation. Nested fork-join support — a branch can contain its own parallel split. Secrets manager so credentials never touch the canvas. Removing redundancy — merging HTTP Call into NEXUS with inline connector creation.",
    status: "building",
  },
  {
    phase: "09",
    title: "The Vision",
    date: "Where this is going",
    description:
      "Nexflow becomes the automation layer that developers actually want to use — not because they have no choice, but because it respects their craft. A marketplace of connectors. Multi-tenant team workspaces. An AI node that reasons about data and routes decisions. Flows described in plain language, built in minutes, fully inspectable. Eventually: the platform where any integration is 20 minutes, not 2 days.",
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
];

const stack = [
  { label: "Engine",    value: "Spring Boot + Java 17" },
  { label: "Canvas",    value: "Next.js + ReactFlow" },
  { label: "Database",  value: "PostgreSQL + Flyway" },
  { label: "Realtime",  value: "RabbitMQ + STOMP (nodes + branches)" },
  { label: "Scripts",   value: "Nashorn / GraalVM JS + Python3" },
  { label: "Threads",   value: "Dedicated pool — core 20, max 50" },
  { label: "Deploy",    value: "Railway + Vercel" },
  { label: "Parallel",  value: "Fork-Join — CompletableFuture.allOf()" },
];

const shipped = [
  { label: "Node types",          value: "12" },
  { label: "AI providers",        value: "5" },
  { label: "Merge strategies",    value: "3" },
  { label: "Production bugs fixed", value: "6" },
  { label: "Exec thread pool",    value: "50" },
  { label: "WebSocket queues",    value: "2" },
];

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

        {/* ── HERO ──────────────────────────────────────────────── */}
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px 8vw 64px",
            borderBottom: "1px solid #0F172A",
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
        <section style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div
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

        {/* ── WHAT WE'VE SHIPPED ───────────────────────────────── */}
        <section style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div style={{ maxWidth: "1200px" }}>
            <div style={{ fontSize: "10px", color: "#94A3B8", letterSpacing: "0.2em", marginBottom: "16px" }}>
              WHAT SHIPS TODAY
            </div>
            <div style={{ width: "40px", height: "2px", background: "#10B981", marginBottom: "56px" }} />

            <div
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
        <section style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
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
        <section style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
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
                background: "linear-gradient(to bottom, #0F172A, #1E293B 30%, #1E293B 70%, #0F172A)",
              }}
            />

            {milestones.map((m, i) => (
              <div
                key={m.phase}
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
        <section style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
          <div
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
        <section style={{ padding: "120px 8vw", borderBottom: "1px solid #0F172A" }}>
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
        <section style={{ padding: "120px 8vw 80px" }}>
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