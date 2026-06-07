/**
 * Persistent SQLite database layer using better-sqlite3
 * Replaces the in-memory db object — survives server restarts
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Store DB file next to server binary in data/ directory
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "iqstudio.db");
export const sqliteDb = new Database(DB_PATH);

// Enable WAL mode for better concurrency
sqliteDb.pragma("journal_mode = WAL");
sqliteDb.pragma("foreign_keys = ON");

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
sqliteDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'qa_engineer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS requirements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT,
    status TEXT DEFAULT 'Active',
    module TEXT,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    preconditions TEXT,
    priority TEXT DEFAULT 'P1',
    type TEXT DEFAULT 'Functional',
    automation_status TEXT DEFAULT 'Automatable',
    confidence_score INTEGER DEFAULT 0,
    module TEXT,
    requirement_id TEXT,
    steps TEXT,
    test_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_json TEXT,
    FOREIGN KEY(requirement_id) REFERENCES requirements(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS defect_hotspots (
    id TEXT PRIMARY KEY,
    module TEXT NOT NULL,
    risk_score INTEGER DEFAULT 50,
    defect_count INTEGER DEFAULT 0,
    predicted_defects INTEGER DEFAULT 0,
    root_causes TEXT,
    last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS impact_reports (
    id TEXT PRIMARY KEY,
    change_description TEXT,
    affected_modules TEXT,
    impacted_tc_ids TEXT,
    risk_score INTEGER DEFAULT 50,
    recommendations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    test_case_id TEXT,
    framework TEXT DEFAULT 'playwright',
    language TEXT DEFAULT 'typescript',
    code TEXT,
    file_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS performance_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    virtual_users INTEGER DEFAULT 100,
    duration INTEGER DEFAULT 60,
    ramp_up_time INTEGER DEFAULT 10,
    target_rps INTEGER DEFAULT 500,
    think_time INTEGER DEFAULT 1,
    protocol TEXT DEFAULT 'HTTP',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_run DATETIME,
    last_results TEXT,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS security_vulnerabilities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    severity TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    owasp_category TEXT,
    description TEXT,
    affected_file TEXT,
    line_number INTEGER,
    remediation TEXT,
    scan_type TEXT DEFAULT 'SAST',
    compliance_labels TEXT,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    size TEXT,
    type TEXT,
    ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    chunks_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Ingested',
    summary TEXT,
    topics TEXT,
    char_count INTEGER DEFAULT 0,
    content TEXT,
    embeddings TEXT
  );

  CREATE TABLE IF NOT EXISTS execution_runs (
    id TEXT PRIMARY KEY,
    total_tests INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    healed INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    ai_summary TEXT,
    healing_recommendations TEXT,
    results TEXT,
    status TEXT DEFAULT 'completed',
    triggered_by TEXT DEFAULT 'manual',
    branch TEXT DEFAULT 'main',
    environment TEXT DEFAULT 'staging',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_email TEXT DEFAULT 'system@edgeqi.ai',
    action TEXT NOT NULL,
    affected_entity TEXT,
    details TEXT,
    latency_ms INTEGER,
    cost_estimate REAL DEFAULT 0.002
  );

  CREATE TABLE IF NOT EXISTS prompt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_by TEXT DEFAULT 'system@edgeqi.ai',
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS webhook_integrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    url TEXT,
    token TEXT,
    events TEXT DEFAULT '[]',
    active INTEGER DEFAULT 1,
    last_triggered DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feedback_entries (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    comment TEXT,
    user_email TEXT DEFAULT 'user@edgeqi.ai',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_tc_req_id ON test_cases(requirement_id);
  CREATE INDEX IF NOT EXISTS idx_tc_module ON test_cases(module);
  CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_runs_created ON execution_runs(created_at);
  CREATE INDEX IF NOT EXISTS idx_vulns_severity ON security_vulnerabilities(severity);
`);

// ─── EXTENDED SCHEMA (additive migrations — safe to re-run) ──────────────────
sqliteDb.exec(`
  -- Projects table — top-level containers for all STLC artifacts
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    app_url TEXT DEFAULT '',
    tech_stack TEXT DEFAULT '',
    owner_email TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    color TEXT DEFAULT '#1e96df',
    icon TEXT DEFAULT '🚀',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Sprints — time-boxed iterations within a project
  CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    goal TEXT DEFAULT '',
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'planning',
    velocity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Execution run versions — per-project, per-sprint, per-module history
  CREATE TABLE IF NOT EXISTS run_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    sprint_id TEXT,
    run_label TEXT NOT NULL,
    module TEXT DEFAULT 'all',
    run_type TEXT DEFAULT 'regression',
    total_tests INTEGER DEFAULT 0,
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    healed INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    pass_rate REAL DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    environment TEXT DEFAULT 'staging',
    branch TEXT DEFAULT 'main',
    triggered_by TEXT DEFAULT 'manual',
    ai_summary TEXT,
    results TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- RAG documents with project scoping
  CREATE TABLE IF NOT EXISTS rag_docs_v2 (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    file_type TEXT DEFAULT 'text',
    size_bytes INTEGER DEFAULT 0,
    char_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing',
    summary TEXT DEFAULT '',
    topics TEXT DEFAULT '[]',
    content TEXT DEFAULT '',
    llm_provider TEXT DEFAULT 'openai',
    vector_store TEXT DEFAULT 'local',
    embedded INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- LLM configurations per project
  CREATE TABLE IF NOT EXISTS llm_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key_hint TEXT DEFAULT '',
    base_url TEXT DEFAULT '',
    temperature REAL DEFAULT 0.3,
    max_tokens INTEGER DEFAULT 4096,
    is_active INTEGER DEFAULT 0,
    is_internal INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- TMS / Test Management Tool global configuration (one active config per project)
  CREATE TABLE IF NOT EXISTS tms_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'global',
    tool TEXT NOT NULL,            -- jira | xray | zephyr | testrail | azuredevops | qtest | hpalm
    label TEXT DEFAULT '',         -- user-friendly name e.g. "Production Jira"
    base_url TEXT NOT NULL,
    email TEXT DEFAULT '',
    token TEXT NOT NULL,
    project_key TEXT DEFAULT '',
    zephyr_token TEXT DEFAULT '',  -- Zephyr Scale Cloud separate token
    extra_config TEXT DEFAULT '{}',-- JSON for tool-specific extras
    is_active INTEGER DEFAULT 1,
    last_tested_at DATETIME,
    last_tested_ok INTEGER DEFAULT 0,
    last_synced_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- CI/CD provider connection configs (GitHub/Jenkins/GitLab/Azure/CircleCI/TeamCity)
  CREATE TABLE IF NOT EXISTS cicd_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'global',
    provider TEXT NOT NULL,        -- github | jenkins | gitlab | azure | circleci | teamcity | bitbucket
    label TEXT DEFAULT '',         -- user-friendly name e.g. "GitHub Actions – Prod"
    base_url TEXT DEFAULT '',      -- Jenkins/GitLab self-hosted URL
    token TEXT NOT NULL,           -- PAT / API token / service account key
    org TEXT DEFAULT '',           -- GitHub org or Azure org
    repo TEXT DEFAULT '',          -- repo name or project slug
    branch TEXT DEFAULT 'main',    -- default branch to trigger
    pipeline_id TEXT DEFAULT '',   -- Jenkins job name, GitLab project ID, Azure pipeline ID
    extra_config TEXT DEFAULT '{}',-- JSON for provider-specific extras
    is_active INTEGER DEFAULT 1,
    last_tested_at DATETIME,
    last_tested_ok INTEGER DEFAULT 0,
    -- ── Trigger policy (stored as JSON in trigger_policy column) ────────────
    trigger_mode TEXT DEFAULT 'manual',
    -- manual | auto | both
    trigger_on_push INTEGER DEFAULT 0,     -- auto-trigger on any push event
    trigger_on_pr INTEGER DEFAULT 0,       -- auto-trigger on PR/MR open/update
    trigger_on_merge INTEGER DEFAULT 1,    -- auto-trigger on merge to watched branch
    watch_branches TEXT DEFAULT 'main',    -- comma-separated branch filter for auto
    test_suite TEXT DEFAULT 'all',         -- all | smoke | regression | sanity | custom
    custom_test_pattern TEXT DEFAULT '',   -- grep/tag pattern for custom suite
    notify_on_complete INTEGER DEFAULT 1,  -- push result notification back to provider
    notify_on_fail INTEGER DEFAULT 1,      -- send alert webhook on failure
    notify_slack_url TEXT DEFAULT '',      -- optional Slack webhook for trigger alerts
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- CI/CD trigger activity log
  CREATE TABLE IF NOT EXISTS cicd_trigger_log (
    id TEXT PRIMARY KEY,
    cicd_config_id TEXT,
    trigger_source TEXT NOT NULL,  -- manual | webhook | schedule
    trigger_event TEXT DEFAULT '', -- push | pr | merge | manual
    branch TEXT DEFAULT '',
    "commit" TEXT DEFAULT '',
    author TEXT DEFAULT '',
    test_suite TEXT DEFAULT 'all',
    status TEXT DEFAULT 'queued',  -- queued | running | passed | failed | skipped
    passed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    detail TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- TMS sync activity log (per module per operation)
  CREATE TABLE IF NOT EXISTS tms_sync_log (
    id TEXT PRIMARY KEY,
    tms_config_id TEXT,
    module TEXT NOT NULL,          -- requirements | testcases | defects | regression | results
    operation TEXT NOT NULL,       -- pull | push
    status TEXT DEFAULT 'ok',      -- ok | error | partial
    item_count INTEGER DEFAULT 0,
    detail TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Project prompt history (all voice + text prompts per module)
  CREATE TABLE IF NOT EXISTS prompt_history (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    sprint_id TEXT,
    module TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    input_type TEXT DEFAULT 'text',
    response_summary TEXT,
    applied INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Live defects table (raised from test failures or manually)
  CREATE TABLE IF NOT EXISTS defects (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'PROJ-DEFAULT',
    sprint_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    severity TEXT DEFAULT 'Medium',
    priority TEXT DEFAULT 'P2',
    status TEXT DEFAULT 'Open',
    defect_type TEXT DEFAULT 'Functional',
    module TEXT DEFAULT '',
    environment TEXT DEFAULT 'Staging',
    test_case_id TEXT,
    test_case_title TEXT DEFAULT '',
    execution_run_id TEXT,
    failure_log TEXT DEFAULT '',
    failure_screenshot TEXT DEFAULT '',
    root_cause TEXT DEFAULT '',
    ai_analysis TEXT DEFAULT '',
    fix_suggestion TEXT DEFAULT '',
    assigned_to TEXT DEFAULT '',
    tms_issue_key TEXT DEFAULT '',
    tms_url TEXT DEFAULT '',
    raised_by TEXT DEFAULT 'system',
    raised_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_sprints_project ON sprints(project_id);
  CREATE INDEX IF NOT EXISTS idx_run_ver_project ON run_versions(project_id);
  CREATE INDEX IF NOT EXISTS idx_run_ver_sprint ON run_versions(sprint_id);
  CREATE INDEX IF NOT EXISTS idx_rag_v2_project ON rag_docs_v2(project_id);
  CREATE INDEX IF NOT EXISTS idx_prompt_hist_project ON prompt_history(project_id);
  CREATE INDEX IF NOT EXISTS idx_prompt_hist_module ON prompt_history(module);
  CREATE INDEX IF NOT EXISTS idx_defects_project ON defects(project_id);
  CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
  CREATE INDEX IF NOT EXISTS idx_defects_tc ON defects(test_case_id);
`);

// Ensure defects table exists (for DBs created before this migration)
try {
  sqliteDb.exec(`CREATE TABLE IF NOT EXISTS defects (
    id TEXT PRIMARY KEY, project_id TEXT DEFAULT 'PROJ-DEFAULT', sprint_id TEXT,
    title TEXT NOT NULL, description TEXT DEFAULT '', severity TEXT DEFAULT 'Medium',
    priority TEXT DEFAULT 'P2', status TEXT DEFAULT 'Open', defect_type TEXT DEFAULT 'Functional',
    module TEXT DEFAULT '', environment TEXT DEFAULT 'Staging',
    test_case_id TEXT, test_case_title TEXT DEFAULT '', execution_run_id TEXT,
    failure_log TEXT DEFAULT '', failure_screenshot TEXT DEFAULT '',
    root_cause TEXT DEFAULT '', ai_analysis TEXT DEFAULT '', fix_suggestion TEXT DEFAULT '',
    assigned_to TEXT DEFAULT '', tms_issue_key TEXT DEFAULT '', tms_url TEXT DEFAULT '',
    raised_by TEXT DEFAULT 'system', raised_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
} catch {}

// Ignore column-already-exists errors from ALTER TABLE (SQLite quirk)
try { sqliteDb.exec(`ALTER TABLE execution_runs ADD COLUMN project_id TEXT DEFAULT 'DEFAULT'`); } catch {}
try { sqliteDb.exec(`ALTER TABLE execution_runs ADD COLUMN sprint_id TEXT`); } catch {}
try { sqliteDb.exec(`ALTER TABLE execution_runs ADD COLUMN run_label TEXT`); } catch {}
try { sqliteDb.exec(`ALTER TABLE execution_runs ADD COLUMN module TEXT DEFAULT 'all'`); } catch {}
try { sqliteDb.exec(`ALTER TABLE execution_runs ADD COLUMN notes TEXT DEFAULT ''`); } catch {}

// Fix defect_hotspots — if the table was created with module NOT NULL and no default,
// rows inserted without a module field fail. Recreate with a default to make it safe.
try {
  const colInfo = sqliteDb.prepare("PRAGMA table_info(defect_hotspots)").all() as any[];
  const moduleCol = colInfo.find(c => c.name === 'module');
  if (moduleCol && moduleCol.notnull && (moduleCol.dflt_value === null || moduleCol.dflt_value === undefined)) {
    // Migrate: rename old table, create new with DEFAULT, copy data, drop old
    sqliteDb.exec(`
      ALTER TABLE defect_hotspots RENAME TO defect_hotspots_old;
      CREATE TABLE defect_hotspots (
        id TEXT PRIMARY KEY,
        module TEXT NOT NULL DEFAULT 'unknown',
        risk_score INTEGER DEFAULT 50,
        defect_count INTEGER DEFAULT 0,
        predicted_defects INTEGER DEFAULT 0,
        root_causes TEXT,
        last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw_json TEXT
      );
      INSERT INTO defect_hotspots SELECT id, COALESCE(module,'unknown'), risk_score, defect_count, predicted_defects, root_causes, last_analyzed, raw_json FROM defect_hotspots_old;
      DROP TABLE defect_hotspots_old;
    `);
  }
} catch (e: any) { console.warn('[DB] defect_hotspots migration note:', e.message); }

// Seed default project if none exists
const projCount = (sqliteDb.prepare("SELECT COUNT(*) as c FROM projects").get() as any).c;
if (projCount === 0) {
  sqliteDb.prepare(`INSERT INTO projects (id, name, description, app_url, tech_stack, owner_email, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('PROJ-DEFAULT', 'My First Application', 'Default project — rename to your application name', '', 'React / Node.js / REST API', 'team@company.com', '#1e96df', '🚀');
}

// ─── TEST DATA MANAGER TABLES ─────────────────────────────────────────────
sqliteDb.exec(`
  -- Test Data Sets: a named collection of test data records for a specific environment
  CREATE TABLE IF NOT EXISTS test_data_sets (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'global',
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    environment TEXT DEFAULT 'test',   -- dev | test | pre-prod | uat | performance | staging | prod
    strategy TEXT NOT NULL,            -- anonymize | api | synthetic | conditions | rag | scrape | erp
    status TEXT DEFAULT 'draft',       -- draft | pending_approval | approved | rejected | active
    approved_by TEXT DEFAULT '',
    approved_at DATETIME,
    rejection_reason TEXT DEFAULT '',
    linked_test_case_ids TEXT DEFAULT '[]',  -- JSON array of test case IDs
    linked_execution_run_id TEXT DEFAULT '', -- execution run that used this set
    record_count INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    source_config TEXT DEFAULT '{}',   -- JSON: strategy-specific config (url, api spec, conditions, etc.)
    created_by TEXT DEFAULT 'system',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Individual test data records within a set
  CREATE TABLE IF NOT EXISTS test_data_records (
    id TEXT PRIMARY KEY,
    set_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_value TEXT,
    field_type TEXT DEFAULT 'string',  -- string | number | boolean | date | email | phone | uuid | masked
    is_masked INTEGER DEFAULT 0,
    mask_pattern TEXT DEFAULT '',      -- e.g. "***-**-XXXX" for SSN
    is_pii INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(set_id) REFERENCES test_data_sets(id) ON DELETE CASCADE
  );

  -- Approval workflow audit trail
  CREATE TABLE IF NOT EXISTS test_data_approvals (
    id TEXT PRIMARY KEY,
    set_id TEXT NOT NULL,
    action TEXT NOT NULL,              -- submitted | approved | rejected | revoked
    actor_email TEXT NOT NULL,
    comment TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(set_id) REFERENCES test_data_sets(id) ON DELETE CASCADE
  );

  -- ERP connection configs (SAP, Oracle, Dynamics, Salesforce, etc.)
  CREATE TABLE IF NOT EXISTS erp_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT DEFAULT 'global',
    name TEXT NOT NULL,
    erp_type TEXT NOT NULL,            -- sap | oracle | dynamics365 | salesforce | netsuite | custom
    base_url TEXT NOT NULL,
    auth_type TEXT DEFAULT 'basic',    -- basic | oauth2 | apikey | saml
    username TEXT DEFAULT '',
    password_hint TEXT DEFAULT '',     -- never store plaintext; hint only
    api_key TEXT DEFAULT '',
    client_id TEXT DEFAULT '',
    client_secret_hint TEXT DEFAULT '',
    extra_config TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    last_tested_at DATETIME,
    last_tested_ok INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Safe migrations for test_data tables
try { sqliteDb.exec(`ALTER TABLE test_data_sets ADD COLUMN sprint_id TEXT DEFAULT ''`); } catch {}
try { sqliteDb.exec(`ALTER TABLE test_data_sets ADD COLUMN version INTEGER DEFAULT 1`); } catch {}

// ─── SEED DEFAULT PROMPT TEMPLATES ─────────────────────────────────────────
const templateCount = (sqliteDb.prepare("SELECT COUNT(*) as c FROM prompt_templates").get() as any).c;
if (templateCount === 0) {
  const insertTpl = sqliteDb.prepare(`INSERT INTO prompt_templates (id, name, prompt, category) VALUES (?, ?, ?, ?)`);
  const templates = [
    ["TPL-001", "Generate Tests from Requirement", "Generate comprehensive test cases for the following requirement: {{requirement}}. Include positive, negative, boundary, and edge cases.", "test-generation"],
    ["TPL-002", "Analyze Security Vulnerabilities", "Perform OWASP Top 10 security analysis on: {{target}}. List all vulnerabilities with severity and remediation steps.", "security"],
    ["TPL-003", "Run Regression Impact Analysis", "Analyze impact of this change: {{change}}. Identify affected test cases and modules.", "impact"],
    ["TPL-004", "Performance Bottleneck Analysis", "Analyze performance test results and identify bottlenecks. Results: {{results}}", "performance"],
    ["TPL-005", "Self-Healing Recommendation", "A test failed with locator error: {{error}}. Suggest 3 alternative selectors and healing strategy.", "healing"],
  ];
  for (const t of templates) insertTpl.run(...t);
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
export function dbAddAudit(action: string, entity: string, details: string, latencyMs?: number, cost?: number) {
  const id = `AUD-${Date.now().toString(36).toUpperCase()}`;
  sqliteDb.prepare(`
    INSERT INTO audit_logs (id, action, affected_entity, details, latency_ms, cost_estimate)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, action, entity, details, latencyMs || 0, cost || 0.002);
}

export function dbGetAll<T = any>(table: string, limit = 200, orderBy = "rowid DESC"): T[] {
  return sqliteDb.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT ?`).all(limit) as T[];
}

export function dbInsert(table: string, obj: Record<string, any>): void {
  const keys = Object.keys(obj);
  const vals = Object.values(obj);
  const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`;
  sqliteDb.prepare(sql).run(...vals);
}

export function dbCount(table: string): number {
  return ((sqliteDb.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as any) || { c: 0 }).c;
}

export function parseJsonField(val: any): any {
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return val; } }
  return val;
}

// Helper to hydrate a DB row's raw_json back to full object
export function hydrateRow(row: any): any {
  if (!row) return null;
  if (row.raw_json) {
    try { return { ...JSON.parse(row.raw_json), id: row.id }; } catch {}
  }
  return row;
}

console.log(`[DB] SQLite connected: ${DB_PATH}`);

// ─── SAAS LICENSING SCHEMA ────────────────────────────────────────────────────
sqliteDb.exec(`

  -- Tenants (organisations that buy licenses)
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    country TEXT DEFAULT 'US',
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'active',         -- active | suspended | trial | cancelled
    plan_tier TEXT DEFAULT 'starter',     -- starter | professional | enterprise | custom
    max_users INTEGER DEFAULT 5,
    max_concurrent INTEGER DEFAULT 2,
    trial_ends_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    billing_email TEXT,
    billing_address TEXT,
    tax_id TEXT,
    notes TEXT
  );

  -- License packs (super admin defines these)
  CREATE TABLE IF NOT EXISTS license_packs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL,                   -- starter | professional | enterprise | custom
    max_users INTEGER NOT NULL,
    max_concurrent INTEGER NOT NULL,
    price_usd REAL NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly', -- monthly | annual | perpetual
    currency_prices TEXT DEFAULT '{}',    -- JSON: {"EUR":90,"GBP":80,"INR":8500,...}
    features TEXT DEFAULT '[]',           -- JSON array of feature flags
    is_active INTEGER DEFAULT 1,
    is_popular INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Tenant subscriptions (which pack a tenant is on)
  CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    pack_id TEXT NOT NULL REFERENCES license_packs(id),
    status TEXT DEFAULT 'active',         -- active | expired | cancelled | pending
    seats_used INTEGER DEFAULT 0,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME,
    auto_renew INTEGER DEFAULT 1,
    activated_by TEXT,                    -- super admin user id
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users extended with tenant linkage
  CREATE TABLE IF NOT EXISTS tenant_users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'qa_engineer',      -- tenant_admin | qa_engineer | viewer | manager
    status TEXT DEFAULT 'active',         -- active | suspended | invited
    invite_token TEXT,
    last_active DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Concurrent session tracking
  CREATE TABLE IF NOT EXISTS active_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );

  -- SSO configurations per tenant
  CREATE TABLE IF NOT EXISTS sso_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT UNIQUE NOT NULL REFERENCES tenants(id),
    protocol TEXT DEFAULT 'oidc',         -- oidc | saml
    provider TEXT,                        -- azure_ad | okta | google | ping | custom
    client_id TEXT,
    client_secret TEXT,
    issuer_url TEXT,
    saml_metadata_url TEXT,
    saml_cert TEXT,
    callback_url TEXT,
    attribute_mapping TEXT DEFAULT '{}',  -- JSON: {"email":"email","name":"displayName",...}
    is_active INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Invoices
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    subscription_id TEXT REFERENCES tenant_subscriptions(id),
    status TEXT DEFAULT 'draft',          -- draft | sent | paid | overdue | void
    currency TEXT DEFAULT 'USD',
    subtotal REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    line_items TEXT DEFAULT '[]',         -- JSON array of {description, qty, unit_price, amount}
    due_date DATETIME,
    paid_at DATETIME,
    payment_method TEXT,
    payment_reference TEXT,
    notes TEXT,
    pdf_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Receipts
  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    invoice_id TEXT NOT NULL REFERENCES invoices(id),
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    payment_method TEXT,
    payment_reference TEXT,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pdf_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Support tickets
  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    category TEXT DEFAULT 'billing',      -- billing | license | technical | general
    priority TEXT DEFAULT 'medium',       -- low | medium | high | critical
    status TEXT DEFAULT 'open',           -- open | in_progress | resolved | closed
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    ai_suggested_response TEXT,
    assigned_to TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Support ticket messages (thread)
  CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id),
    sender_id INTEGER REFERENCES users(id),
    sender_role TEXT DEFAULT 'user',      -- user | support | ai
    message TEXT NOT NULL,
    attachments TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Usage metrics (for billing and analytics)
  CREATE TABLE IF NOT EXISTS usage_metrics (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    metric_date TEXT NOT NULL,            -- YYYY-MM-DD
    peak_concurrent INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    ai_tokens_used INTEGER DEFAULT 0,
    test_runs INTEGER DEFAULT 0,
    storage_mb REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, metric_date)
  );

  -- Currency exchange rates cache
  CREATE TABLE IF NOT EXISTS currency_rates (
    currency TEXT PRIMARY KEY,
    rate_vs_usd REAL NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Super admin activity log
  CREATE TABLE IF NOT EXISTS superadmin_audit (
    id TEXT PRIMARY KEY,
    admin_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default currency rates
const rateCount = (sqliteDb.prepare("SELECT COUNT(*) as c FROM currency_rates").get() as any).c;
if (rateCount === 0) {
  const defaultRates = [
    { currency: 'USD', rate: 1.0,    symbol: '$',  name: 'US Dollar' },
    { currency: 'EUR', rate: 0.92,   symbol: '€',  name: 'Euro' },
    { currency: 'GBP', rate: 0.79,   symbol: '£',  name: 'British Pound' },
    { currency: 'INR', rate: 83.5,   symbol: '₹',  name: 'Indian Rupee' },
    { currency: 'AUD', rate: 1.53,   symbol: 'A$', name: 'Australian Dollar' },
    { currency: 'CAD', rate: 1.36,   symbol: 'C$', name: 'Canadian Dollar' },
    { currency: 'SGD', rate: 1.34,   symbol: 'S$', name: 'Singapore Dollar' },
    { currency: 'AED', rate: 3.67,   symbol: 'د.إ', name: 'UAE Dirham' },
    { currency: 'JPY', rate: 149.5,  symbol: '¥',  name: 'Japanese Yen' },
    { currency: 'BRL', rate: 4.97,   symbol: 'R$', name: 'Brazilian Real' },
    { currency: 'MXN', rate: 17.15,  symbol: 'MX$', name: 'Mexican Peso' },
    { currency: 'ZAR', rate: 18.6,   symbol: 'R',  name: 'South African Rand' },
  ];
  const ins = sqliteDb.prepare("INSERT OR IGNORE INTO currency_rates (currency, rate_vs_usd, symbol, name) VALUES (?,?,?,?)");
  for (const r of defaultRates) ins.run(r.currency, r.rate, r.symbol, r.name);
}

// Seed default license packs
const packCount = (sqliteDb.prepare("SELECT COUNT(*) as c FROM license_packs").get() as any).c;
if (packCount === 0) {
  const { v4: uuidv4 } = require('crypto');
  const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const packs = [
    {
      id: genId(), name: 'Starter', tier: 'starter',
      description: 'Perfect for small QA teams getting started with intelligent testing.',
      max_users: 5, max_concurrent: 2, price_usd: 49,
      billing_cycle: 'monthly', is_popular: 0, sort_order: 1,
      features: JSON.stringify(['Requirements AI','Test Case Generator','Manual Testing','Basic Reports']),
      currency_prices: JSON.stringify({ EUR: 45, GBP: 39, INR: 4099, AUD: 75, CAD: 67, SGD: 66 }),
    },
    {
      id: genId(), name: 'Professional', tier: 'professional',
      description: 'Full QA automation suite for growing engineering teams.',
      max_users: 25, max_concurrent: 10, price_usd: 199,
      billing_cycle: 'monthly', is_popular: 1, sort_order: 2,
      features: JSON.stringify(['All Starter features','Test Automation','Performance Testing','Security Scan','TMS Integration','Test Data Manager','AI Copilot','SSO']),
      currency_prices: JSON.stringify({ EUR: 183, GBP: 157, INR: 16599, AUD: 305, CAD: 271, SGD: 267 }),
    },
    {
      id: genId(), name: 'Enterprise', tier: 'enterprise',
      description: 'Unlimited scale for large organisations with custom SLAs.',
      max_users: 100, max_concurrent: 50, price_usd: 799,
      billing_cycle: 'monthly', is_popular: 0, sort_order: 3,
      features: JSON.stringify(['All Professional features','Unlimited Projects','Custom Integrations','ERP Connectors','Dedicated Support','Custom SLA','On-premise Option','Audit Logs','SAML SSO']),
      currency_prices: JSON.stringify({ EUR: 735, GBP: 631, INR: 66699, AUD: 1223, CAD: 1087, SGD: 1071 }),
    },
    {
      id: genId(), name: 'Enterprise Annual', tier: 'enterprise',
      description: 'Enterprise plan billed annually — 2 months free.',
      max_users: 100, max_concurrent: 50, price_usd: 7990,
      billing_cycle: 'annual', is_popular: 0, sort_order: 4,
      features: JSON.stringify(['All Enterprise features','Annual billing discount','Priority onboarding']),
      currency_prices: JSON.stringify({ EUR: 7350, GBP: 6310, INR: 666990, AUD: 12230, CAD: 10870, SGD: 10710 }),
    },
  ];
  const ins2 = sqliteDb.prepare(`INSERT OR IGNORE INTO license_packs
    (id,name,tier,description,max_users,max_concurrent,price_usd,billing_cycle,is_popular,sort_order,features,currency_prices)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const p of packs) ins2.run(p.id,p.name,p.tier,p.description,p.max_users,p.max_concurrent,p.price_usd,p.billing_cycle,p.is_popular,p.sort_order,p.features,p.currency_prices);
}

// Ensure super_admin role exists for the first admin user
try {
  sqliteDb.prepare("UPDATE users SET role = 'super_admin' WHERE id = 1 AND role = 'admin'").run();
} catch {}
