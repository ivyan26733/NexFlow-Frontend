import type { CanvasData } from '@/index'

export type TemplateCategory = 'basic' | 'complex'

export interface Template {
  id:          string
  name:        string
  description: string
  category:    TemplateCategory
  tags:        string[]
  nodeCount:   number
  useCase:     string
  icon:        string
  color:       string
  canvas:      CanvasData
}

// ─── Node/edge helpers ───────────────────────────────────────────────────────
// IDs here are template-local strings. createFlowFromTemplate() remaps them
// to real UUIDs before saving to the backend.

function n(id: string, nodeType: string, label: string, x: number, y: number, config: Record<string, unknown> = {}) {
  return { id, flowId: '', nodeType, label, config, positionX: x, positionY: y } as CanvasData['nodes'][number]
}

function e(id: string, src: string, tgt: string, conditionType = 'SUCCESS', sourceHandle?: string) {
  return { id, flowId: '', sourceNodeId: src, targetNodeId: tgt, conditionType, sourceHandle } as CanvasData['edges'][number]
}

// ─── 10 Templates ────────────────────────────────────────────────────────────

export const TEMPLATES: Template[] = [

  // ── BASIC 1 ─────────────────────────────────────────────────────────────────
  {
    id: 'tpl-api-fetch',
    name: 'API Data Fetch',
    description: 'Fetch data from any REST API, process the response with a script, and store results. The simplest way to pull external data into your workflow.',
    category: 'basic',
    tags: ['HTTP', 'Script', 'REST API'],
    nodeCount: 4,
    useCase: 'Pull data from a public or private API endpoint',
    icon: '⬡',
    color: '#00D4FF',
    canvas: {
      nodes: [
        n('s', 'START',   'Start',           100, 200),
        n('h', 'NEXUS',   'Fetch Data',       350, 200, { requestMode: 'inline', url: 'https://api.example.com/data', method: 'GET' }),
        n('sc','SCRIPT',  'Process Response', 620, 200, { language: 'javascript', code: 'var data = nex.fetchData;\n// Process your data here\nreturn data;' }),
        n('ok','SUCCESS', 'Success',          890, 200),
        n('fl','FAILURE', 'Failure',          620, 380),
      ],
      edges: [
        e('e1','s', 'h',  'SUCCESS'),
        e('e2','h', 'sc', 'SUCCESS'),
        e('e3','h', 'fl', 'FAILURE'),
        e('e4','sc','ok', 'SUCCESS'),
        e('e5','sc','fl', 'FAILURE'),
      ],
    },
  },

  // ── BASIC 2 ─────────────────────────────────────────────────────────────────
  {
    id: 'tpl-ai-processor',
    name: 'AI Text Processor',
    description: 'Send any text input to an AI model and get a structured response back. Perfect for summarization, classification, extraction, or generation tasks.',
    category: 'basic',
    tags: ['AI', 'LLM', 'Text'],
    nodeCount: 3,
    useCase: 'Summarize, classify or transform text with AI',
    icon: '◎',
    color: '#6366F1',
    canvas: {
      nodes: [
        n('s', 'START',   'Start',       100, 200),
        n('ai','AI',      'AI Processor',350, 200, {
          provider: 'GROQ',
          prompt: 'Process the following input: {{nex.start.body.text}}\n\nReturn a JSON object with your analysis.',
          inputBindings: [],
          outputSchema: '{ "result": "string" }',
          maxTokens: 1000,
          temperature: 0.3,
        }),
        n('ok','SUCCESS', 'Success',     620, 200),
        n('fl','FAILURE', 'Failure',     350, 380),
      ],
      edges: [
        e('e1','s', 'ai','SUCCESS'),
        e('e2','ai','ok','SUCCESS'),
        e('e3','ai','fl','FAILURE'),
      ],
    },
  },

  // ── BASIC 3 ─────────────────────────────────────────────────────────────────
  {
    id: 'tpl-db-query',
    name: 'Database Query',
    description: 'Execute a SQL query against your database, format the results with a script, and return structured data. Connect your Nexus DB connector first.',
    category: 'basic',
    tags: ['Database', 'SQL', 'NEXUS'],
    nodeCount: 4,
    useCase: 'Query your database and return formatted results',
    icon: '◈',
    color: '#10B981',
    canvas: {
      nodes: [
        n('s', 'START',  'Start',          100, 200),
        n('db','NEXUS',  'Query Database', 350, 200, { requestMode: 'connector', queryType: 'SELECT', query: 'SELECT * FROM your_table WHERE id = 1' }),
        n('sc','SCRIPT', 'Format Results', 620, 200, { language: 'javascript', code: 'var rows = nex.queryDatabase?.rows ?? [];\nreturn { count: rows.length, data: rows };' }),
        n('ok','SUCCESS','Success',        890, 200),
        n('fl','FAILURE','Failure',        620, 380),
      ],
      edges: [
        e('e1','s', 'db','SUCCESS'),
        e('e2','db','sc','SUCCESS'),
        e('e3','db','fl','FAILURE'),
        e('e4','sc','ok','SUCCESS'),
        e('e5','sc','fl','FAILURE'),
      ],
    },
  },

  // ── BASIC 4 ─────────────────────────────────────────────────────────────────
  {
    id: 'tpl-input-validator',
    name: 'Input Validator',
    description: 'Validate incoming trigger payload fields before processing. Routes to Success if valid, Failure with a descriptive error if not. Protects downstream nodes from bad data.',
    category: 'basic',
    tags: ['Script', 'Validation', 'Routing'],
    nodeCount: 3,
    useCase: 'Validate request payload before running your flow',
    icon: '⌗',
    color: '#F59E0B',
    canvas: {
      nodes: [
        n('s', 'START',  'Start',    100, 200),
        n('sc','SCRIPT', 'Validate', 350, 200, {
          language: 'javascript',
          code: `var email = nex.start?.body?.email;\nvar name  = nex.start?.body?.name;\n\nif (!email) throw new Error('email is required');\nif (!name)  throw new Error('name is required');\nif (!/^[^@]+@[^@]+\\.[^@]+$/.test(email)) throw new Error('invalid email format');\n\nreturn { email, name, valid: true };`,
        }),
        n('ok','SUCCESS','Success',  620, 200),
        n('fl','FAILURE','Failure',  620, 380),
      ],
      edges: [
        e('e1','s', 'sc','SUCCESS'),
        e('e2','sc','ok','SUCCESS'),
        e('e3','sc','fl','FAILURE'),
      ],
    },
  },

  // ── BASIC 5 ─────────────────────────────────────────────────────────────────
  {
    id: 'tpl-variable-pipeline',
    name: 'Variable + Script Pipeline',
    description: 'Set reusable variables at the start of a flow, then use them across multiple script nodes. Ideal for config-driven workflows where values are shared across steps.',
    category: 'basic',
    tags: ['Variable', 'Script', 'Config'],
    nodeCount: 4,
    useCase: 'Config-driven workflow with shared variables',
    icon: '⌥',
    color: '#EC4899',
    canvas: {
      nodes: [
        n('s', 'START',   'Start',         100, 200),
        n('v', 'VARIABLE','Set Variables', 350, 200, {
          variables: [
            { name: 'apiUrl',   value: 'https://api.example.com' },
            { name: 'maxItems', value: '10' },
          ],
        }),
        n('sc','SCRIPT',  'Process',       620, 200, {
          language: 'javascript',
          code: 'var url      = nex.apiUrl;\nvar maxItems = nex.maxItems;\n// Use your variables here\nreturn { url, maxItems, processed: true };',
        }),
        n('ok','SUCCESS', 'Success',       890, 200),
        n('fl','FAILURE', 'Failure',       620, 380),
      ],
      edges: [
        e('e1','s', 'v', 'SUCCESS'),
        e('e2','v', 'sc','SUCCESS'),
        e('e3','sc','ok','SUCCESS'),
        e('e4','sc','fl','FAILURE'),
      ],
    },
  },

  // ── COMPLEX 6 ────────────────────────────────────────────────────────────────
  {
    id: 'tpl-parallel-ai',
    name: 'Parallel AI Comparison',
    description: 'Send the same prompt to two AI providers simultaneously using FORK/JOIN. After both complete, a script compares the responses and picks the best one. Saves time vs sequential calls.',
    category: 'complex',
    tags: ['FORK', 'JOIN', 'AI', 'Parallel'],
    nodeCount: 7,
    useCase: 'Compare AI provider responses in parallel and pick the best',
    icon: '⑃',
    color: '#00D4FF',
    canvas: {
      nodes: [
        n('s',  'START',  'Start',          100, 300),
        n('fk', 'FORK',   'Fork',           320, 300, {
          branches: ['branchA','branchB'],
          strategy: 'WAIT_ALL',
          onBranchFailure: 'CONTINUE',
          timeoutSeconds: 60,
          branchNodeIds: { branchA: ['a1'], branchB: ['b1'] },
        }),
        n('a1', 'AI',     'Groq Response',  560, 160, { provider: 'GROQ',      prompt: 'Answer this: {{nex.start.body.question}}\n\nReturn: { "answer": "string", "confidence": number }', maxTokens: 500, temperature: 0.2 }),
        n('b1', 'AI',     'OpenAI Response',560, 440, { provider: 'OPENAI',    prompt: 'Answer this: {{nex.start.body.question}}\n\nReturn: { "answer": "string", "confidence": number }', maxTokens: 500, temperature: 0.2 }),
        n('jn', 'JOIN',   'Join',           800, 300),
        n('sc', 'SCRIPT', 'Pick Best',      1020,300, {
          language: 'javascript',
          code: `var a = nex.branchA?.groqResponse;\nvar b = nex.branchB?.openaiResponse;\n// Compare confidence scores\nvar best = (a?.confidence >= b?.confidence) ? a : b;\nreturn { best, groq: a, openai: b };`,
        }),
        n('ok', 'SUCCESS','Success',        1260,300),
        n('fl', 'FAILURE','Failure',        1020,480),
      ],
      edges: [
        e('e1','s', 'fk','SUCCESS'),
        e('e2','fk','a1','SUCCESS','branchA'),
        e('e3','fk','b1','SUCCESS','branchB'),
        e('e4','a1','jn','SUCCESS'),
        e('e5','b1','jn','SUCCESS'),
        e('e6','jn','sc','SUCCESS'),
        e('e7','sc','ok','SUCCESS'),
        e('e8','sc','fl','FAILURE'),
      ],
    },
  },

  // ── COMPLEX 7 ────────────────────────────────────────────────────────────────
  {
    id: 'tpl-user-onboarding',
    name: 'User Onboarding Pipeline',
    description: 'Complete user registration flow: validate input, save user to database, generate a personalized AI welcome message, and log the onboarding event. Production-ready template.',
    category: 'complex',
    tags: ['Database', 'AI', 'NEXUS', 'Onboarding'],
    nodeCount: 6,
    useCase: 'Full user signup: validate → save → welcome email → log',
    icon: '◈',
    color: '#10B981',
    canvas: {
      nodes: [
        n('s', 'START',  'Start',             100, 250),
        n('v', 'SCRIPT', 'Validate Input',    340, 250, {
          language: 'javascript',
          code: `var email = nex.start?.body?.email;\nvar name  = nex.start?.body?.name;\nif (!email || !name) throw new Error('email and name are required');\nreturn { email: email.toLowerCase(), name };`,
        }),
        n('db','NEXUS',  'Save User',         580, 250, {
          requestMode: 'connector',
          queryType: 'INSERT',
          query: "INSERT INTO users (email, name, created_at) VALUES ('{{nex.validateInput.email}}', '{{nex.validateInput.name}}', NOW()) RETURNING id",
        }),
        n('ai','AI',     'Welcome Message',   820, 250, {
          provider: 'GROQ',
          prompt: 'Write a warm, professional welcome email for {{nex.validateInput.name}} who just joined our platform. Return: { "subject": "string", "body": "string" }',
          maxTokens: 300,
          temperature: 0.7,
        }),
        n('lg','NEXUS',  'Log Event',         1060,250, {
          requestMode: 'connector',
          queryType: 'INSERT',
          query: "INSERT INTO events (type, user_email, created_at) VALUES ('USER_REGISTERED', '{{nex.validateInput.email}}', NOW())",
        }),
        n('ok','SUCCESS','Success',           1300,250),
        n('fl','FAILURE','Failure',           580, 430),
      ],
      edges: [
        e('e1','s', 'v', 'SUCCESS'),
        e('e2','v', 'db','SUCCESS'),
        e('e3','v', 'fl','FAILURE'),
        e('e4','db','ai','SUCCESS'),
        e('e5','db','fl','FAILURE'),
        e('e6','ai','lg','SUCCESS'),
        e('e7','lg','ok','SUCCESS'),
        e('e8','lg','fl','FAILURE'),
      ],
    },
  },

  // ── COMPLEX 8 ────────────────────────────────────────────────────────────────
  {
    id: 'tpl-multi-source',
    name: 'Multi-Source Data Aggregation',
    description: 'Fetch data from three independent sources in parallel (two APIs and one database query), then merge all results into a single unified response. Cuts total time by ~65% vs sequential.',
    category: 'complex',
    tags: ['FORK', 'JOIN', 'NEXUS', 'Parallel', 'Aggregation'],
    nodeCount: 9,
    useCase: 'Aggregate data from 3 sources simultaneously and merge',
    icon: '⑃',
    color: '#F59E0B',
    canvas: {
      nodes: [
        n('s',  'START',  'Start',          100, 350),
        n('fk', 'FORK',   'Fork',           320, 350, {
          branches: ['branchA','branchB','branchC'],
          strategy: 'WAIT_ALL',
          onBranchFailure: 'CONTINUE',
          timeoutSeconds: 30,
          branchNodeIds: { branchA: ['a1'], branchB: ['b1'], branchC: ['c1'] },
        }),
        n('a1', 'NEXUS',  'Source API 1',   560, 160, { requestMode: 'inline', url: 'https://api.example.com/users/{{nex.start.body.userId}}', method: 'GET' }),
        n('b1', 'NEXUS',  'Source API 2',   560, 350, { requestMode: 'inline', url: 'https://api.example.com/orders/{{nex.start.body.userId}}', method: 'GET' }),
        n('c1', 'NEXUS',  'Database',       560, 540, { requestMode: 'connector', queryType: 'SELECT', query: "SELECT * FROM profiles WHERE user_id = '{{nex.start.body.userId}}'" }),
        n('jn', 'JOIN',   'Join',           800, 350),
        n('sc', 'SCRIPT', 'Merge Results',  1020,350, {
          language: 'javascript',
          code: `var user    = nex.branchA?.sourceApi1;\nvar orders  = nex.branchB?.sourceApi2;\nvar profile = nex.branchC?.database?.rows?.[0];\nreturn { user, orders, profile, mergedAt: new Date().toISOString() };`,
        }),
        n('ok', 'SUCCESS','Success',        1260,350),
        n('fl', 'FAILURE','Failure',        1020,530),
      ],
      edges: [
        e('e1','s', 'fk','SUCCESS'),
        e('e2','fk','a1','SUCCESS','branchA'),
        e('e3','fk','b1','SUCCESS','branchB'),
        e('e4','fk','c1','SUCCESS','branchC'),
        e('e5','a1','jn','SUCCESS'),
        e('e6','b1','jn','SUCCESS'),
        e('e7','c1','jn','SUCCESS'),
        e('e8','jn','sc','SUCCESS'),
        e('e9','sc','ok','SUCCESS'),
        e('ea','sc','fl','FAILURE'),
      ],
    },
  },

  // ── COMPLEX 9 ────────────────────────────────────────────────────────────────
  {
    id: 'tpl-decision-router',
    name: 'Smart Decision Router',
    description: 'Score incoming data with a script, then use a DECISION node to route to different processing paths based on the score. Premium users get AI enrichment; standard users get a basic response.',
    category: 'complex',
    tags: ['DECISION', 'Script', 'AI', 'Routing'],
    nodeCount: 7,
    useCase: 'Route requests to different paths based on computed score',
    icon: '⬡',
    color: '#6366F1',
    canvas: {
      nodes: [
        n('s',  'START',    'Start',            100, 300),
        n('sc', 'SCRIPT',   'Score & Classify', 340, 300, {
          language: 'javascript',
          code: `var plan  = nex.start?.body?.plan ?? 'free';\nvar score = plan === 'premium' ? 100 : plan === 'pro' ? 60 : 20;\nreturn { plan, score, isPremium: score >= 100 };`,
        }),
        n('dc', 'DECISION', 'Route by Plan',    580, 300, {
          conditions: [
            { expression: '{{nex.scoreClassify.isPremium}} == true', targetLabel: 'Premium Path' },
          ],
          defaultLabel: 'Standard Path',
        }),
        n('ai', 'AI',       'AI Enrichment',    820, 160, { provider: 'GROQ', prompt: 'Provide premium insights for: {{nex.start.body.query}}\n\nReturn: { "insights": [], "recommendations": [] }', maxTokens: 800 }),
        n('bs', 'SCRIPT',   'Basic Response',   820, 440, { language: 'javascript', code: 'return { message: "Standard response", data: nex.start?.body };' }),
        n('ok', 'SUCCESS',  'Success',          1060,300),
        n('fl', 'FAILURE',  'Failure',          340, 480),
      ],
      edges: [
        e('e1','s', 'sc','SUCCESS'),
        e('e2','sc','dc','SUCCESS'),
        e('e3','sc','fl','FAILURE'),
        e('e4','dc','ai','CUSTOM', 'Premium Path'),
        e('e5','dc','bs','DEFAULT'),
        e('e6','ai','ok','SUCCESS'),
        e('e7','bs','ok','SUCCESS'),
      ],
    },
  },

  // ── COMPLEX 10 ───────────────────────────────────────────────────────────────
  {
    id: 'tpl-etl-pipeline',
    name: 'ETL Pipeline',
    description: 'Full Extract-Transform-Load pipeline: pull records from a source database, transform and enrich with a script, load into a target table, and generate an AI summary report of what was processed.',
    category: 'complex',
    tags: ['Database', 'Script', 'AI', 'ETL', 'NEXUS'],
    nodeCount: 7,
    useCase: 'Extract from DB → transform → load → AI report',
    icon: '◎',
    color: '#EC4899',
    canvas: {
      nodes: [
        n('s',  'START',  'Start',           100, 250),
        n('ex', 'NEXUS',  'Extract',         340, 250, { requestMode: 'connector', queryType: 'SELECT',  query: 'SELECT * FROM source_table WHERE processed = false LIMIT 100' }),
        n('tr', 'SCRIPT', 'Transform',       580, 250, {
          language: 'javascript',
          code: `var rows = nex.extract?.rows ?? [];\nvar transformed = rows.map(row => ({\n  ...row,\n  processedAt: new Date().toISOString(),\n  status: 'processed',\n}));\nreturn { rows: transformed, count: transformed.length };`,
        }),
        n('ld', 'NEXUS',  'Load',            820, 250, {
          requestMode: 'connector',
          queryType: 'INSERT',
          query: "INSERT INTO target_table SELECT * FROM json_populate_recordset(null::target_table, '{{nex.transform.rows}}')",
        }),
        n('ai', 'AI',     'Generate Report', 1060,250, {
          provider: 'GROQ',
          prompt: 'Generate a brief ETL report. Processed {{nex.transform.count}} records from source_table to target_table. Return: { "summary": "string", "recordsProcessed": number, "status": "string" }',
          maxTokens: 300,
          temperature: 0.3,
        }),
        n('ok', 'SUCCESS','Success',         1300,250),
        n('fl', 'FAILURE','Failure',         580, 430),
      ],
      edges: [
        e('e1','s', 'ex','SUCCESS'),
        e('e2','ex','tr','SUCCESS'),
        e('e3','ex','fl','FAILURE'),
        e('e4','tr','ld','SUCCESS'),
        e('e5','tr','fl','FAILURE'),
        e('e6','ld','ai','SUCCESS'),
        e('e7','ld','fl','FAILURE'),
        e('e8','ai','ok','SUCCESS'),
        e('e9','ai','fl','FAILURE'),
      ],
    },
  },
]
