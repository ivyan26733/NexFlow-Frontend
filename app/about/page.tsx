'use client'

import { useState, useEffect, useRef } from "react";

// ── DATA ──────────────────────────────────────────────────────────────────────

const milestones = [
  { phase: "01", title: "The Frustration", date: "Where it began", description: "Every developer has lived this: you need to automate something — fetch data from an API, transform it, store it, notify someone. You write the same boilerplate again and again. HTTP clients, error handling, retry logic, scheduling. The code exists. The problem is the time it costs to wire it all together every single time.", status: "origin" },
  { phase: "02", title: "The Observation", date: "What we noticed", description: "Tools like n8n and Zapier solved this for non-developers. But they made a trade — they hid the power to make it accessible. You couldn't write real logic. You couldn't compose flows from other flows. You couldn't understand what was actually happening inside an execution. They were black boxes with pretty UIs.", status: "origin" },
  { phase: "03", title: "The Decision", date: "Why we built Nexflow", description: "We wanted a tool built for developers first. Where you can write real JavaScript or Python mid-flow. Where every execution is fully transparent — every node, every output, every path taken. Where flows can call other flows. Where your data has a name you chose, not a UUID you have to remember. Where automation is understandable, not magical.", status: "built" },
  { phase: "04", title: "The Engine", date: "Core execution layer", description: "A full flow execution engine with 12 node types: HTTP, Script (JavaScript + Python), AI (multi-provider: Anthropic, OpenAI, Gemini, Groq, Mistral), Sub-Flows (sync + async), Variables, Mappers, Decisions, Loops, and terminal Success/Failure nodes. A universal nex container so every node output is named, not nested — nex.yourName.field, not nodes[uuid].result.body.", status: "built" },
  { phase: "05", title: "Real-Time Canvas", date: "Studio + live execution", description: "ReactFlow-based Studio canvas with live WebSocket node updates over STOMP. Two-phase trigger pattern: execution prepares first, browser subscribes to its queue, then starts — so no event is ever dropped. RabbitMQ StompBrokerRelay for multi-instance production deployments. Dedicated thread pool (core 20, max 50) with explicit transaction boundary commits so background threads always see committed state.", status: "built" },
  { phase: "06", title: "Parallel Execution", date: "Fork-Join branches", description: "FORK and JOIN nodes that run multiple branches simultaneously on separate threads using CompletableFuture.allOf(). Three merge strategies: WAIT_ALL (every branch must finish), WAIT_FIRST (race mode — fastest wins), WAIT_N (quorum — continue when N branches complete). Branch results land in nex under their branch name. Live per-branch status dots on the canvas. BranchTimeline in transaction detail shows each branch duration and time saved vs sequential.", status: "built" },
  { phase: "07", title: "Production Hardening", date: "Bugs that taught us", description: "Three production bugs diagnosed and fixed under load: WebSocket race condition where messages were dropped before subscription existed (fixed with /queue/ destinations and two-phase trigger). Multi-instance broker isolation where events published on Instance A never reached browsers on Instance B (fixed with RabbitMQ relay). Thread pool exhaustion under 25+ concurrent requests (fixed with dedicated executor and split @Transactional boundary). Each bug produced an engineering principle that is now part of how we build.", status: "built" },
  { phase: "08", title: "The Nex Standard", date: "Unified data layer", description: "Replaced the scattered nodes[uuid].successOutput.body pattern with a single flat object: nex. Every trigger field, variable, and node output is auto-spread into nex under the name you chose. nex.fetchUser.body.email instead of nodes['ca250f8e'].successOutput.body.email. Scripts receive both nex and a legacy input object for backward compatibility. All config panels updated with {{nex.x}} syntax.", status: "built" },
  { phase: "09", title: "Auth + RBAC", date: "Identity & access control", description: "Full authentication system: email/password with OTP verification, Google OAuth2 login, and JWT-based sessions. Three-tier role model: Admin, Sub-Admin, and Member. Admins manage user roles, create groups, and grant flow-level access. Groups can be all-access or selective. The first registered account is automatically promoted to Admin.", status: "built" },
  { phase: "10", title: "Production Deploy", date: "EC2 + Cloudflare", description: "Solved a hard Docker problem: Maven downloading 400+ JARs on an 8GB gp2 EBS volume saturated the 24 baseline IOPS ceiling. Solution: pre-built JAR pattern — Maven runs locally, only the JRE runtime image and a single JAR ship to EC2. Build time dropped from 20+ minutes to under 2 minutes. nginx reverse proxy routes traffic across backend (8090) and AI agent (3001). Cloudflare quick tunnel provides HTTPS without SSL cert setup.", status: "built" },
  { phase: "11", title: "The Near Horizon", date: "Next 3 months", description: "CRON scheduling so flows run on time without external callers. Retry logic with configurable backoff on any node. MCP server so AI tools like Claude and Cursor can build and run flows through conversation. Nested fork-join support — a branch can contain its own parallel split. Secrets manager so credentials never touch the canvas. Flow templates marketplace.", status: "building" },
  { phase: "12", title: "The Vision", date: "Where this is going", description: "Nexflow becomes the automation layer that developers actually want to use — not because they have no choice, but because it respects their craft. Multi-tenant organisations with SSO. A marketplace of connectors. An AI node that reasons about data and routes decisions. Flows described in plain language, built in minutes, fully inspectable. Eventually: the platform where any integration is 20 minutes, not 2 days.", status: "future" },
];

const principles = [
  { icon: "◎", title: "Transparency over magic", body: "Every execution is fully visible. Every node shows its input, output, and status. No hidden transformations. You should always know exactly what happened and why." },
  { icon: "⌥", title: "Developer-first, always", body: "Real code runs inside flows. JavaScript, Python — not expression builders with 12 nested dropdowns. If you can write it in code, you can run it in a node." },
  { icon: "◈", title: "Composability", body: "Flows call other flows. Nodes are reusable. Connectors are saved once and used everywhere. Nothing should be rebuilt twice." },
  { icon: "⬡", title: "Named, not nested", body: "Your data has a name you chose. nex.userData, not nodes['ca250f8e'].successOutput.result.body. The machine should adapt to you, not the other way around." },
  { icon: "⌗", title: "Access by design", body: "Every flow belongs to someone. Roles, groups, and per-flow permissions ensure the right people see the right automations — without locking everyone out by default." },
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

// ── DESIGN TOKENS — "Cognac & Navy" warm editorial palette ───────────────────
const T = {
  bg:          '#F2E9DC',   // warm sand — rich base, never cold
  bgAlt:       '#E8DCCF',   // toasted cream — alternate sections
  bgDeep:      '#DDD0BF',   // deep tan — hero accents
  surface:     '#F9F3EC',   // warm card surface
  surfaceHigh: '#FDF8F3',   // lightest warm — elevated cards

  border:      '#C8B9A5',   // warm tan border
  borderLight: '#D8CBBA',   // softer warm border

  accent:      '#9A3412',   // deep terracotta / brick-red — bold, warm, unique
  accentAlt:   '#C2410C',   // brighter terracotta for hover
  accentBg:    '#FEF0E7',   // very soft warm orange bg
  accentLight: '#FDCFB4',   // light terracotta tint

  navy:        '#1E3A5F',   // deep navy — contrast anchor
  navyMid:     '#2563EB',   // medium blue accent
  navyBg:      '#EFF6FF',   // light navy bg

  text:        '#1A1008',   // warm near-black — rich, not harsh
  textMid:     '#3D3020',   // warm dark brown
  textMuted:   '#6B5A45',   // warm mid-brown
  textLight:   '#A8927A',   // warm light tan text

  success:     '#14532D',
  successBg:   '#DCFCE7',
  warning:     '#78350F',
  warningBg:   '#FEF3C7',
  error:       '#7F1D1D',
  errorBg:     '#FEE2E2',

  shadow:      '0 1px 4px rgba(26,16,8,0.08), 0 4px 20px rgba(26,16,8,0.06)',
  shadowMd:    '0 4px 16px rgba(26,16,8,0.12), 0 1px 4px rgba(26,16,8,0.07)',

  grad:        'linear-gradient(135deg, #9A3412 0%, #1E3A5F 100%)',  // terracotta → navy
  gradWarm:    'linear-gradient(135deg, #78350F 0%, #9A3412 100%)',
  gradHero:    'linear-gradient(160deg, #F2E9DC 0%, #E8DCCF 55%, #DDD0BF 100%)',
};

const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
  origin:   { color: T.textMuted, bg: T.bgAlt,      label: 'Origin'      },
  built:    { color: T.success,   bg: T.successBg,   label: 'Shipped'     },
  building: { color: T.warning,   bg: T.warningBg,   label: 'In Progress' },
  future:   { color: T.navy,      bg: T.navyBg,      label: 'Vision'      },
};

// ── FORK/JOIN DEMO ────────────────────────────────────────────────────────────

const BRANCH_STAGES = [
  { label: "branchA", ms: 200,  color: "#14532D", nodes: ["API Call", "Transform"] },
  { label: "branchB", ms: 580,  color: "#9A3412", nodes: ["AI Node", "Extract"]   },
  { label: "branchC", ms: 150,  color: "#1E3A5F", nodes: ["DB Query"]              },
];
const TOTAL_PARALLEL_MS   = 580;
const TOTAL_SEQUENTIAL_MS = BRANCH_STAGES.reduce((s, b) => s + b.ms, 0);
type BranchState = "idle" | "running" | "done";

function LiveBranchDemo() {
  const [states,   setStates]   = useState<BranchState[]>(["idle","idle","idle"]);
  const [forkDone, setForkDone] = useState(false);
  const [joinDone, setJoinDone] = useState(false);
  const [running,  setRunning]  = useState(false);
  const [elapsed,  setElapsed]  = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reset() {
    setStates(["idle","idle","idle"]); setForkDone(false);
    setJoinDone(false); setRunning(false); setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }
  function run() {
    if (running) { reset(); return; }
    reset(); setRunning(true);
    const SPEED = 2.2;
    setTimeout(() => setForkDone(true), 10);
    setStates(["running","running","running"]);
    BRANCH_STAGES.forEach((b, i) => setTimeout(() => setStates(prev => { const n=[...prev] as BranchState[]; n[i]="done"; return n; }), b.ms/SPEED));
    setTimeout(() => { setJoinDone(true); setRunning(false); }, TOTAL_PARALLEL_MS/SPEED+60);
    let t=0;
    timerRef.current = setInterval(() => { t+=40; setElapsed(t); if(t>=TOTAL_PARALLEL_MS/SPEED+100) clearInterval(timerRef.current!); }, 40);
  }
  useEffect(() => () => { if(timerRef.current) clearInterval(timerRef.current); }, []);
  const saving  = Math.round((1-TOTAL_PARALLEL_MS/TOTAL_SEQUENTIAL_MS)*100);
  const allDone = states.every(s=>s==="done");

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", minWidth: 0 }}>
      <div style={{
        background: T.surfaceHigh, border: `1px solid ${T.border}`,
        borderRadius: '14px', padding: '28px', position: 'relative',
        overflowX: 'auto', boxShadow: T.shadow,
      }}>
        <div style={{ position:'absolute', top:12, left:16, fontSize:'9px', color: T.textLight, letterSpacing:'0.15em' }}>STUDIO CANVAS — LIVE</div>
        {running && <div style={{ position:'absolute', top:12, right:16, fontSize:'10px', color: T.accent, letterSpacing:'0.1em' }}>{Math.round(elapsed*2.2)}ms</div>}
        {allDone && joinDone && <div style={{ position:'absolute', top:12, right:16, fontSize:'10px', color: T.success, letterSpacing:'0.1em' }}>✓ {TOTAL_PARALLEL_MS}ms</div>}

        <div style={{ overflowX:'auto', marginTop:'16px', position:'relative', zIndex:1, WebkitOverflowScrolling:'touch' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', width:'max-content', paddingBottom:'4px' }}>
          <LDemoNode label="TRIGGER" active={forkDone||running} done={forkDone} />
          <LDemoArrow />
          <LDemoDiamond label="FORK" symbol="⑃" color="#D97706" active={running&&!forkDone} done={forkDone} />
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {BRANCH_STAGES.map((b,i)=>(
              <div key={b.label} style={{ display:'flex', alignItems:'center' }}>
                <LDemoArrow />
                <LDemoBranchLane label={b.label} nodes={b.nodes} color={b.color} state={states[i]} ms={b.ms} />
                <LDemoArrow />
              </div>
            ))}
          </div>
          <LDemoDiamond label="JOIN" symbol="⑄" color="#059669" active={states.some(s=>s==="done")&&!joinDone} done={joinDone} />
          <LDemoArrow />
          <LDemoNode label="PROCESS" active={joinDone} done={joinDone} />
        </div>
        </div>

        {allDone && joinDone && (
          <div style={{ marginTop:'20px', borderTop:`1px solid ${T.borderLight}`, paddingTop:'14px' }}>
            <div style={{ fontSize:'9px', color: T.textLight, marginBottom:'10px', letterSpacing:'0.1em' }}>BRANCH TIMELINE</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
              {BRANCH_STAGES.map(b=>(
                <div key={b.label} style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'9px', color:b.color, minWidth:'52px', letterSpacing:'0.06em' }}>{b.label}</span>
                  <div style={{ flex:1, height:'4px', background: T.bgAlt, borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ width:`${(b.ms/TOTAL_PARALLEL_MS)*100}%`, height:'100%', background:b.color, borderRadius:'3px' }} />
                  </div>
                  <span style={{ fontSize:'9px', color: T.textMuted, minWidth:'36px', textAlign:'right' }}>{b.ms}ms</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:'16px', marginTop:'12px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'10px', color: T.textMuted }}>Parallel: <span style={{ color: T.success }}>{TOTAL_PARALLEL_MS}ms</span></span>
              <span style={{ fontSize:'10px', color: T.textMuted }}>Sequential: <span style={{ color: T.textLight }}>{TOTAL_SEQUENTIAL_MS}ms</span></span>
              <span style={{ fontSize:'10px', color: T.warning, fontWeight:700 }}>⚡ {saving}% faster</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ display:'flex', justifyContent:'center', marginTop:'16px' }}>
        <button onClick={run} style={{
          background: running ? T.errorBg : T.accentBg,
          border: `1px solid ${running ? T.accent : T.border}`,
          borderRadius:'7px', color: running ? T.error : T.accent,
          fontFamily:"'DM Mono', monospace", fontSize:'11px', letterSpacing:'0.1em',
          padding:'9px 24px', cursor:'pointer', transition:'all 0.15s',
        }}>
          {running ? '◼ STOP' : allDone ? '↺ RUN AGAIN' : '▶ RUN FLOW'}
        </button>
      </div>
    </div>
  );
}

function LDemoNode({ label, active, done }: { label:string; active:boolean; done:boolean }) {
  const c = done ? T.success : active ? T.accent : T.border;
  return (
    <div style={{
      background: done ? T.successBg : active ? T.accentBg : T.bg,
      border:`1.5px solid ${c}`, borderRadius:'7px',
      padding:'8px 12px', minWidth:'60px', textAlign:'center', flexShrink:0, transition:'all 0.3s',
    }}>
      <div style={{ fontSize:'8px', color: T.textLight, letterSpacing:'0.1em', marginBottom:'2px' }}>NODE</div>
      <div style={{ fontSize:'9px', color:c, fontWeight:700 }}>{label}</div>
    </div>
  );
}
function LDemoDiamond({ label, symbol, color, active, done }: { label:string; symbol:string; color:string; active:boolean; done:boolean }) {
  const c = done||active ? color : T.border;
  return (
    <div style={{
      width:'52px', height:'52px', background: done||active ? `${color}14` : T.bg,
      border:`1.5px solid ${c}`, transform:'rotate(45deg)',
      display:'flex', alignItems:'center', justifyContent:'center',
      flexShrink:0, margin:'0 4px', transition:'all 0.3s',
      boxShadow: done||active ? `0 0 12px ${color}30` : 'none',
    }}>
      <div style={{ transform:'rotate(-45deg)', textAlign:'center' }}>
        <div style={{ fontSize:'15px', color:c, lineHeight:1 }}>{symbol}</div>
        <div style={{ fontSize:'7px', color:c, letterSpacing:'0.05em', marginTop:'1px' }}>{label}</div>
      </div>
    </div>
  );
}
function LDemoBranchLane({ label, nodes, color, state, ms }: { label:string; nodes:string[]; color:string; state:BranchState; ms:number }) {
  const isR=state==="running", isD=state==="done";
  const c = isD||isR ? color : T.textLight;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:'4px',
      background: isD ? `${color}0A` : isR ? `${color}06` : T.bgAlt,
      border:`1px solid ${isD||isR ? `${color}30` : T.borderLight}`,
      borderRadius:'6px', padding:'6px 10px', minWidth:'180px', transition:'all 0.3s',
    }}>
      <span style={{ fontSize:'8px', color:c, minWidth:'44px', letterSpacing:'0.06em' }}>{label}</span>
      {nodes.map(n=>(
        <div key={n} style={{
          background: isD ? `${color}15` : isR ? `${color}0A` : T.surface,
          border:`1px solid ${isD||isR ? `${color}35` : T.border}`,
          borderRadius:'4px', padding:'3px 6px', fontSize:'8px',
          color: isD||isR ? color : T.textLight, transition:'all 0.3s',
        }}>
          {isD ? '✓ ' : isR ? '↻ ' : ''}{n}
        </div>
      ))}
      {isD && <span style={{ fontSize:'8px', color: T.textMuted, marginLeft:'4px' }}>{ms}ms</span>}
    </div>
  );
}
function LDemoArrow() { return <div style={{ width:'14px', height:'1.5px', background: T.border, flexShrink:0 }} />; }

// ── NEX COMPARISON ────────────────────────────────────────────────────────────

function NexComparison() {
  const [active, setActive] = useState<'them'|'us'>('them');
  const them = `// n8n\n$node["HTTP Request"]\n  .json["data"][0]\n  ["user"]["email"]\n\n// Make\n{{1.data[].user.email}}\n\n// Zapier\n{{153892.Body.data\n  .0.user.email}}`;
  const us   = `// Nexflow — you named it\nnex.fetchUser.email\n\n// In a Script node\nvar email = nex.fetchUser.email;\nvar name  = nex.fetchUser.name;\n\n// In an HTTP node body\n{ "to": "{{nex.fetchUser.email}}" }`;

  return (
    <div style={{ fontFamily:"'DM Mono', monospace" }}>
      <div style={{ display:'flex', marginBottom:'14px', border:`1px solid ${T.border}`, borderRadius:'8px', overflow:'hidden', width:'fit-content' }}>
        {(['them','us'] as const).map(t=>(
          <button key={t} onClick={()=>setActive(t)} style={{
            background: active===t ? (t==='us' ? T.accentBg : 'rgba(220,38,38,0.07)') : T.surface,
            border:'none', borderRight: t==='them'?`1px solid ${T.border}`:'none',
            color: active===t ? (t==='us' ? T.accent : T.error) : T.textMuted,
            fontFamily:"'DM Mono', monospace", fontSize:'10px', letterSpacing:'0.1em',
            padding:'8px 18px', cursor:'pointer', transition:'all 0.15s', fontWeight: active===t ? 700 : 400,
          }}>
            {t==='them' ? 'n8n / Make / Zapier' : 'Nexflow'}
          </button>
        ))}
      </div>
      <div style={{
        background: T.surfaceHigh, border:`1.5px solid ${active==='us' ? T.border : 'rgba(154,52,18,0.25)'}`,
        borderRadius:'10px', padding:'22px', transition:'border-color 0.3s', position:'relative',
        boxShadow: T.shadow,
      }}>
        <div style={{
          position:'absolute', top:'10px', right:'12px', fontSize:'9px', letterSpacing:'0.1em',
          color: active==='us' ? T.accent : T.error,
          background: active==='us' ? T.accentBg : T.errorBg,
          border:`1px solid ${active==='us' ? T.border : 'rgba(154,52,18,0.2)'}`,
          borderRadius:'4px', padding:'2px 8px',
        }}>
          {active==='us' ? 'NEXFLOW' : 'THEIR WAY'}
        </div>
        <pre style={{ margin:0, fontSize:'12px', lineHeight:'1.9', color: active==='us' ? T.textMid : T.textMuted, whiteSpace:'pre-wrap' }}>
          {active==='them' ? them : us}
        </pre>
      </div>
    </div>
  );
}

// ── COMPARE TABLE ─────────────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { feature:"Live parallel execution on canvas",  nexflow:true,  n8n:false, zapier:false, make:false },
  { feature:"Per-branch real-time status dots",   nexflow:true,  n8n:false, zapier:false, make:false },
  { feature:"Named data access (nex.name.field)", nexflow:true,  n8n:false, zapier:false, make:false },
  { feature:"Real JavaScript / Python in flows",  nexflow:true,  n8n:true,  zapier:false, make:false },
  { feature:"Merge strategies (ALL / FIRST / N)", nexflow:true,  n8n:false, zapier:false, make:false },
  { feature:"Branch timing + savings visible",    nexflow:true,  n8n:false, zapier:false, make:false },
  { feature:"Flows calling other flows",          nexflow:true,  n8n:true,  zapier:false, make:true  },
  { feature:"Full execution JSON per node",       nexflow:true,  n8n:true,  zapier:false, make:false },
  { feature:"Multi-instance WebSocket delivery",  nexflow:true,  n8n:false, zapier:false, make:false },
  { feature:"Script reads nex directly",          nexflow:true,  n8n:false, zapier:false, make:false },
];

function CompareTable() {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:"'DM Mono', monospace" }}>
        <thead>
          <tr>
            {[
              { label:'FEATURE',  key:'feature', accent: T.text },
              { label:'NEXFLOW',  key:'nexflow', accent: T.accentAlt },
              { label:'N8N',      key:'n8n',     accent: T.textMuted },
              { label:'ZAPIER',   key:'zapier',  accent: T.textMuted },
              { label:'MAKE',     key:'make',    accent: T.textMuted },
            ].map(c=>(
              <th key={c.key} style={{
                padding:'12px 16px', textAlign:c.key==='feature'?'left':'center',
                fontSize:'9px', letterSpacing:'0.15em', color:c.accent,
                borderBottom:`2px solid ${T.border}`,
                background: c.key==='nexflow' ? T.accentBg : 'transparent',
                whiteSpace:'nowrap',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row,ri)=>(
            <tr key={row.feature} style={{ background: ri%2===0 ? T.surface : T.bg }}>
              <td style={{ padding:'11px 16px', fontSize:'12px', color: T.textMid, borderBottom:`1px solid ${T.borderLight}` }}>{row.feature}</td>
              {(['nexflow','n8n','zapier','make'] as const).map(tool=>(
                <td key={tool} style={{
                  padding:'11px 16px', textAlign:'center',
                  background: tool==='nexflow' ? T.accentBg : 'transparent',
                  borderBottom:`1px solid ${T.borderLight}`,
                }}>
                  {row[tool]
                    ? <span style={{ color: tool==='nexflow' ? T.success : T.textLight, fontSize:'13px' }}>✓</span>
                    : <span style={{ color: T.borderLight, fontSize:'11px' }}>—</span>
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

// ── ANIMATED COUNTER ──────────────────────────────────────────────────────────

function AnimatedCounter({ target, duration=1500 }: { target:number; duration?:number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start=0;
        const step=target/(duration/16);
        const timer=setInterval(()=>{ start+=step; if(start>=target){setCount(target);clearInterval(timer);}else{setCount(Math.floor(start));} },16);
      }
    },{ threshold:0.5 });
    if (ref.current) observer.observe(ref.current);
    return ()=>observer.disconnect();
  },[target,duration]);
  return <span ref={ref}>{count}</span>;
}

// ── PAGE ──────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(()=>{
    const h=()=>setScrollY(window.scrollY);
    window.addEventListener('scroll',h);
    return ()=>window.removeEventListener('scroll',h);
  },[]);

  return (
    <div style={{ background: T.bg, minHeight:'100vh', color: T.text, fontFamily:"'DM Sans', sans-serif", overflowX:'hidden', backgroundImage:'radial-gradient(ellipse at 80% 0%, rgba(154,52,18,0.06) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(30,58,95,0.05) 0%, transparent 50%)' }}>

      {/* Warm background glow orbs */}
      <div style={{ position:'fixed', top:'10%', right:'5%', width:'min(600px, 80vw)', height:'min(600px, 80vw)', background:'radial-gradient(circle, rgba(154,52,18,0.07) 0%, transparent 70%)', pointerEvents:'none', zIndex:0, transform:`translateY(${scrollY*0.08}px)` }} />
      <div style={{ position:'fixed', bottom:'15%', left:'-10%', width:'min(500px, 70vw)', height:'min(500px, 70vw)', background:'radial-gradient(circle, rgba(30,58,95,0.05) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(1.3)} }
        @keyframes fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width:768px){
          .about-2col{grid-template-columns:1fr!important;gap:32px!important}
          .about-3col{grid-template-columns:1fr 1fr!important}
          .about-section{padding:64px 5vw!important}
          .about-footer{flex-direction:column!important;gap:8px!important;text-align:center!important}
        }
        @media (max-width:480px){
          .about-3col{grid-template-columns:1fr!important}
          .about-section{padding:48px 4vw!important}
        }
      `}</style>

      <div style={{ position:'relative', zIndex:1 }}>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section className="about-section" style={{
          minHeight:'100vh', display:'flex', flexDirection:'column', justifyContent:'center',
          padding:'64px 8vw 80px', borderBottom:`1px solid ${T.border}`,
          background: T.gradHero,
        }}>
          <div style={{ maxWidth:'920px', animation:'fade-up 0.7s ease both' }}>

            {/* Eyebrow tag */}
            <div style={{
              display:'inline-flex', alignItems:'center', gap:'8px',
              padding:'5px 14px', border:`1px solid ${T.border}`,
              borderRadius:'100px', marginBottom:'44px',
              fontSize:'11px', color: T.accent, letterSpacing:'0.15em',
              background: T.accentBg, fontFamily:"'DM Mono', monospace", fontWeight:600,
            }}>
              <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: T.accent, display:'inline-block', animation:'pulse-dot 2s ease-in-out infinite' }} />
              OPEN SOURCE · DEVELOPER FIRST · IN ACTIVE DEVELOPMENT
            </div>

            {/* Headline */}
            <h1 style={{ fontSize:'clamp(44px, 7vw, 92px)', fontWeight:800, lineHeight:0.95, letterSpacing:'-0.035em', margin:'0 0 32px', fontFamily:"'DM Mono', monospace" }}>
              <span style={{ color: T.text }}>We got tired</span><br />
              <span style={{ background: T.grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>of wiring</span><br />
              <span style={{ color: T.text }}>things together.</span>
            </h1>

            <p style={{ fontSize:'clamp(15px, 1.8vw, 20px)', color: T.textMid, lineHeight:1.75, maxWidth:'600px', margin:'0 0 52px' }}>
              So we built Nexflow — a workflow automation engine for developers who want real control over what runs, when it runs, and exactly what comes out of it.
            </p>

            {/* Stats */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              {[
                { n:12, label:'node types' },
                { n:5,  label:'AI providers' },
                { n:3,  label:'merge strategies' },
                { n:6,  label:'prod bugs fixed' },
              ].map(s=>(
                <div key={s.label} style={{
                  background: T.surface, border:`1px solid ${T.border}`,
                  borderRadius:'12px', padding:'18px 24px', boxShadow: T.shadow,
                }}>
                  <div style={{ fontSize:'clamp(28px, 3.5vw, 42px)', fontWeight:800, color: T.accent, lineHeight:1, letterSpacing:'-0.02em' }}>
                    <AnimatedCounter target={s.n} />
                  </div>
                  <div style={{ fontSize:'10px', color: T.textMuted, letterSpacing:'0.1em', marginTop:'5px', fontFamily:"'DM Mono', monospace" }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY NEXFLOW ────────────────────────────────────────────────────── */}
        <section className="about-section" style={{ padding:'100px 8vw', borderBottom:`1px solid ${T.border}`, background: T.surface, overflowX: 'hidden' }}>
          <div style={{ maxWidth:'1200px', minWidth: 0 }}>

            {/* Header */}
            <div style={{ marginBottom:'64px' }}>
              <div style={{ fontSize:'10px', color: T.accent, letterSpacing:'0.2em', marginBottom:'12px', fontFamily:"'DM Mono', monospace" }}>WHY NEXFLOW</div>
              <div style={{ width:'36px', height:'3px', background: T.grad, borderRadius:'2px', marginBottom:'20px' }} />
              <h2 style={{ fontSize:'clamp(24px, 3.5vw, 44px)', fontWeight:800, letterSpacing:'-0.025em', color: T.text, lineHeight:1.15, margin:'0 0 14px', fontFamily:"'DM Mono', monospace' " }}>
                Two things no other tool does.
              </h2>
              <p style={{ fontSize:'15px', color: T.textMuted, maxWidth:'480px', lineHeight:1.75, margin:0 }}>
                Not better versions of what exists. Genuinely absent features that change how you think about workflow automation.
              </p>
            </div>

            {/* Feature 1 */}
            <div style={{ marginBottom:'88px' }}>
              <div className="about-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'64px', alignItems:'start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:'7px',
                    fontSize:'9px', letterSpacing:'0.15em', color: T.warning,
                    background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.2)',
                    borderRadius:'4px', padding:'4px 10px', marginBottom:'18px', fontFamily:"'DM Mono', monospace",
                  }}>⑃ STANDOUT FEATURE 01</div>
                  <h3 style={{ fontSize:'clamp(18px, 2vw, 26px)', fontWeight:800, color: T.text, lineHeight:1.25, letterSpacing:'-0.015em', margin:'0 0 14px', fontFamily:"'DM Mono', monospace" }}>
                    Live parallel execution,<br />visible on the canvas.
                  </h3>
                  <p style={{ fontSize:'14px', color: T.textMid, lineHeight:1.8, margin:'0 0 14px' }}>
                    n8n, Zapier, and Make show you execution results <em>after</em> they finish. Nexflow shows you execution <em>as it happens</em> — each branch turns live the instant it starts.
                  </p>
                  <p style={{ fontSize:'14px', color: T.textMid, lineHeight:1.8, margin:'0 0 24px' }}>
                    When it's done, BranchTimeline tells you exactly how much time parallel execution saved vs running sequentially. Not estimated — measured.
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                    {[
                      { tool:'n8n',    note:'Has parallel execution — canvas shows nothing until done' },
                      { tool:'Zapier', note:'Sequential only — no parallel execution concept'          },
                      { tool:'Make',   note:'Sequential only — parallel requires workarounds'          },
                    ].map(c=>(
                      <div key={c.tool} style={{
                        display:'flex', gap:'12px', alignItems:'flex-start',
                        padding:'9px 12px', background:'rgba(220,38,38,0.04)',
                        border:'1px solid rgba(220,38,38,0.1)', borderRadius:'7px',
                      }}>
                        <span style={{ fontSize:'10px', color: T.textMuted, minWidth:'48px', paddingTop:'1px', fontFamily:"'DM Mono', monospace" }}>{c.tool}</span>
                        <span style={{ fontSize:'12px', color: T.textMuted, lineHeight:1.6 }}>{c.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}><LiveBranchDemo /></div>
              </div>
            </div>

            {/* Feature 2 */}
            <div style={{ marginBottom:'80px' }}>
              <div className="about-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'64px', alignItems:'start' }}>
                <div style={{ minWidth: 0 }}><NexComparison /></div>
                <div>
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:'7px',
                    fontSize:'9px', letterSpacing:'0.15em', color: T.accent,
                    background: T.accentBg, border:`1px solid ${T.border}`,
                    borderRadius:'4px', padding:'4px 10px', marginBottom:'18px', fontFamily:"'DM Mono', monospace",
                  }}>◈ STANDOUT FEATURE 02</div>
                  <h3 style={{ fontSize:'clamp(18px, 2vw, 26px)', fontWeight:800, color: T.text, lineHeight:1.25, letterSpacing:'-0.015em', margin:'0 0 14px', fontFamily:"'DM Mono', monospace" }}>
                    Your data has a name.<br />One you chose.
                  </h3>
                  <p style={{ fontSize:'14px', color: T.textMid, lineHeight:1.8, margin:'0 0 14px' }}>
                    Every other tool forces you to navigate its internal data structure — position-based indexes, UUID node references, nested dot-paths that break the moment you reorder a step.
                  </p>
                  <p style={{ fontSize:'14px', color: T.textMid, lineHeight:1.8, margin:'0 0 14px' }}>
                    In Nexflow, you name a node's output once — say, <code style={{ color: T.accent, background: T.accentBg, padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>fetchUser</code> — and every downstream node accesses it as <code style={{ color: T.navy, background: T.navyBg, padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>nex.fetchUser.field</code>.
                  </p>
                  <p style={{ fontSize:'14px', color: T.textMid, lineHeight:1.8, margin:0 }}>
                    Scripts read it natively: <code style={{ color: T.success, background: T.successBg, padding:'1px 5px', borderRadius:'3px', fontSize:'12px' }}>var email = nex.fetchUser.email</code>. No binding helpers. No adapter layers.
                  </p>
                </div>
              </div>
            </div>

            {/* Comparison table */}
            <div>
              <div style={{ fontSize:'10px', color: T.textMuted, letterSpacing:'0.15em', marginBottom:'16px', fontFamily:"'DM Mono', monospace" }}>FULL COMPARISON</div>
              <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:'12px', overflow:'hidden', boxShadow: T.shadow }}>
                <CompareTable />
              </div>
              <p style={{ fontSize:'11px', color: T.textLight, marginTop:'10px', textAlign:'right', fontFamily:"'DM Mono', monospace" }}>
                ✓ = supported natively — as of March 2026
              </p>
            </div>
          </div>
        </section>

        {/* ── THE STORY ──────────────────────────────────────────────────────── */}
        <section className="about-section" style={{ padding:'100px 8vw', borderBottom:`1px solid ${T.border}`, background: T.bg }}>
          <div style={{ maxWidth:'1000px' }}>
            <div style={{ marginBottom:'60px' }}>
              <div style={{ fontSize:'10px', color: T.accent, letterSpacing:'0.2em', marginBottom:'12px', fontFamily:"'DM Mono', monospace" }}>THE STORY</div>
              <div style={{ width:'36px', height:'3px', background: T.grad, borderRadius:'2px', marginBottom:'20px' }} />
              <h2 style={{ fontSize:'clamp(22px, 3vw, 38px)', fontWeight:800, color: T.text, letterSpacing:'-0.02em', margin:0, fontFamily:"'DM Mono', monospace" }}>
                How we got here.
              </h2>
            </div>

            {/* Timeline */}
            <div style={{ position:'relative' }}>
              {/* Vertical line */}
              <div style={{ position:'absolute', left:'28px', top:'40px', bottom:'40px', width:'2px', background: T.grad, opacity:0.25, borderRadius:'2px' }} />

              <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
                {milestones.map((m, i) => {
                  const meta = statusMeta[m.status];
                  return (
                    <div key={i} style={{ display:'flex', gap:'24px', alignItems:'flex-start' }}>
                      {/* Number bubble */}
                      <div style={{
                        width:'58px', height:'58px', borderRadius:'50%', flexShrink:0,
                        background: T.surface, border:`2px solid ${meta.color}`,
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        boxShadow:`0 0 0 4px ${meta.bg}, 0 2px 8px rgba(0,0,0,0.06)`,
                        position:'relative', zIndex:1,
                      }}>
                        <div style={{ fontSize:'11px', fontWeight:800, color: meta.color, fontFamily:"'DM Mono', monospace", letterSpacing:'-0.01em' }}>{m.phase}</div>
                      </div>

                      {/* Card */}
                      <div style={{
                        flex:1, background: T.surface, border:`1px solid ${T.border}`,
                        borderRadius:'12px', padding:'22px 24px',
                        boxShadow: T.shadow, marginBottom:'4px',
                      }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', marginBottom:'10px' }}>
                          <div>
                            <h3 style={{ fontSize:'15px', fontWeight:700, color: T.text, margin:0, letterSpacing:'-0.01em' }}>{m.title}</h3>
                            <div style={{ fontSize:'11px', color: T.textLight, marginTop:'2px', fontFamily:"'DM Mono', monospace" }}>{m.date}</div>
                          </div>
                          <span style={{
                            display:'inline-flex', alignItems:'center', padding:'3px 10px',
                            borderRadius:'100px', fontSize:'10px', fontWeight:600,
                            color: meta.color, background: meta.bg,
                            border:`1px solid ${meta.color}30`, fontFamily:"'DM Mono', monospace",
                            letterSpacing:'0.05em',
                          }}>{meta.label}</span>
                        </div>
                        <p style={{ fontSize:'13px', color: T.textMid, lineHeight:1.8, margin:0 }}>{m.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── PRINCIPLES ─────────────────────────────────────────────────────── */}
        <section className="about-section" style={{ padding:'100px 8vw', borderBottom:`1px solid ${T.border}`, background: T.surface }}>
          <div style={{ maxWidth:'1100px' }}>
            <div style={{ marginBottom:'56px' }}>
              <div style={{ fontSize:'10px', color: T.accent, letterSpacing:'0.2em', marginBottom:'12px', fontFamily:"'DM Mono', monospace" }}>PRINCIPLES</div>
              <div style={{ width:'36px', height:'3px', background: T.grad, borderRadius:'2px', marginBottom:'20px' }} />
              <h2 style={{ fontSize:'clamp(22px, 3vw, 38px)', fontWeight:800, color: T.text, letterSpacing:'-0.02em', margin:0, fontFamily:"'DM Mono', monospace" }}>
                What guides every decision.
              </h2>
            </div>
            <div className="about-3col" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'16px' }}>
              {principles.map((p, i) => (
                <div key={i} style={{
                  background: T.bg, border:`1px solid ${T.border}`,
                  borderRadius:'14px', padding:'26px',
                  boxShadow: T.shadow, transition:'box-shadow 0.2s',
                }}>
                  <div style={{
                    width:'40px', height:'40px', borderRadius:'10px',
                    background: T.bgDeep, border:`1px solid ${T.border}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'18px', color: T.accent, marginBottom:'16px',
                  }}>{p.icon}</div>
                  <h3 style={{ fontSize:'14px', fontWeight:700, color: T.text, margin:'0 0 10px', letterSpacing:'-0.01em' }}>{p.title}</h3>
                  <p style={{ fontSize:'13px', color: T.textMid, lineHeight:1.75, margin:0 }}>{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STACK + SHIPPED ────────────────────────────────────────────────── */}
        <section className="about-section" style={{ padding:'100px 8vw', borderBottom:`1px solid ${T.border}`, background: T.bg }}>
          <div style={{ maxWidth:'1100px' }}>
            <div className="about-2col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'64px' }}>

              {/* Tech stack */}
              <div>
                <div style={{ fontSize:'10px', color: T.accent, letterSpacing:'0.2em', marginBottom:'12px', fontFamily:"'DM Mono', monospace" }}>UNDER THE HOOD</div>
                <div style={{ width:'36px', height:'3px', background: T.grad, borderRadius:'2px', marginBottom:'24px' }} />
                <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                  {stack.map((s, i) => (
                    <div key={i} style={{
                      display:'flex', alignItems:'center', gap:'16px',
                      padding:'13px 16px',
                      background: i%2===0 ? T.surface : 'transparent',
                      borderRadius:'8px',
                    }}>
                      <span style={{ fontSize:'10px', color: T.accent, minWidth:'72px', letterSpacing:'0.06em', fontFamily:"'DM Mono', monospace", fontWeight:700 }}>{s.label}</span>
                      <span style={{ fontSize:'13px', color: T.textMid }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipped numbers */}
              <div>
                <div style={{ fontSize:'10px', color: T.accent, letterSpacing:'0.2em', marginBottom:'12px', fontFamily:"'DM Mono', monospace" }}>WHAT SHIPPED</div>
                <div style={{ width:'36px', height:'3px', background: T.grad, borderRadius:'2px', marginBottom:'24px' }} />
                <div className="about-3col" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  {shipped.map((s, i) => (
                    <div key={i} style={{
                      background: T.surface, border:`1px solid ${T.border}`,
                      borderRadius:'12px', padding:'18px',
                      boxShadow: T.shadow,
                    }}>
                      <div style={{ fontSize:'clamp(26px, 3vw, 36px)', fontWeight:800, color: T.accent, lineHeight:1, letterSpacing:'-0.02em', fontFamily:"'DM Mono', monospace" }}>{s.value}</div>
                      <div style={{ fontSize:'11px', color: T.textMuted, marginTop:'6px', letterSpacing:'0.04em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <section style={{ padding:'48px 8vw', background: T.surface, borderTop:`1px solid ${T.border}` }}>
          <div className="about-footer" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:'1100px', gap:'16px', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'28px', height:'28px', borderRadius:'7px', background: T.grad, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:'13px', fontWeight:800, color:'#fff', fontFamily:"'DM Mono', monospace" }}>N</span>
              </div>
              <span style={{ fontSize:'13px', fontWeight:700, color: T.text, fontFamily:"'DM Mono', monospace", letterSpacing:'0.04em' }}>NEXFLOW</span>
            </div>
            <div style={{ fontSize:'12px', color: T.textMuted }}>
              Built by developers who got tired of wiring things together.
            </div>
            <div style={{ fontSize:'11px', color: T.textLight, fontFamily:"'DM Mono', monospace" }}>
              v1.0 · April 2026
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
