import {
  Zap, ShieldCheck, GitBranch, BarChart3, Cpu, FileText,
  Play, ChevronRight, ArrowRight, CheckCircle2, Layers,
  Sparkles, FlaskConical, Bug, Timer, Lock, TrendingUp,
  Bot, RefreshCw, TableProperties, Activity
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ── tiny reusable components ──────────────────────────────────────────── */
function NavCTA({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow shadow-blue-200">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-black text-gray-900 tracking-widest" style={{ letterSpacing: '0.15em' }}>
              EDGE<span className="text-blue-600 ml-1">QI</span>
            </span>
            <p className="text-[9px] text-gray-400 font-mono uppercase tracking-widest leading-none -mt-0.5">
              Edge Quality Intelligence
            </p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {['Features', 'Modules', 'Integrations', 'Security'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              {item}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <button onClick={onGetStarted}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors px-2">
            Sign In
          </button>
          <button onClick={onGetStarted}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow shadow-blue-200">
            Get Started <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">{text}</span>
    </div>
  );
}

function FeatureChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full font-medium">
      <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
      {text}
    </span>
  );
}

/* ── main modules data ─────────────────────────────────────────────────── */
const MODULES = [
  {
    icon: Bot,
    color: 'bg-blue-600',
    title: 'Agentic AI Engine',
    desc: 'Autonomous end-to-end QA orchestration. One click runs requirements → test cases → execution → report.',
    chips: ['Zero-touch pipeline', 'Multi-LLM routing', 'Self-healing'],
  },
  {
    icon: FileText,
    color: 'bg-indigo-600',
    title: 'Requirements Intelligence',
    desc: 'Parse PRDs and user stories into structured, traceable requirements with AI gap detection.',
    chips: ['Auto-parse PRDs', 'Gap analysis', 'REQ traceability'],
  },
  {
    icon: TableProperties,
    color: 'bg-violet-600',
    title: 'Test Case Generator',
    desc: 'Generate comprehensive test matrices from requirements. Edit priorities, add steps, bulk approve.',
    chips: ['AI generation', 'Bulk operations', 'Step editor'],
  },
  {
    icon: Cpu,
    color: 'bg-sky-600',
    title: 'Execution Engine',
    desc: 'Run suites across browsers in parallel. AI heals broken locators automatically during runs.',
    chips: ['Parallel runs', 'AI healing', 'Live telemetry'],
  },
  {
    icon: BarChart3,
    color: 'bg-cyan-600',
    title: 'Analytics & KPI',
    desc: 'Real-time dashboards with pass/fail trends, SLA thresholds, and historical regression ledgers.',
    chips: ['KPI thresholds', 'SLA tracking', 'CSV/JSON export'],
  },
  {
    icon: Bug,
    color: 'bg-rose-600',
    title: 'Defect Prediction',
    desc: 'ML-powered hotspot detection predicts where defects will emerge before they reach production.',
    chips: ['Risk scoring', 'Impact analysis', 'Module heatmap'],
  },
  {
    icon: Timer,
    color: 'bg-amber-600',
    title: 'Performance Testing',
    desc: 'Load testing with configurable users and duration. Real-time p95/p99 latency and throughput graphs.',
    chips: ['Load profiles', 'Latency metrics', 'Flamegraph'],
  },
  {
    icon: Lock,
    color: 'bg-red-600',
    title: 'Security Testing',
    desc: 'OWASP-mapped vulnerability scanner with severity scoring and auto-generated remediation guides.',
    chips: ['OWASP mapped', 'CVE scoring', 'Remediation'],
  },
  {
    icon: GitBranch,
    color: 'bg-green-600',
    title: 'CI/CD Integration',
    desc: 'Native hooks for GitHub Actions, Jenkins, and GitLab. Quality gates block bad builds automatically.',
    chips: ['GitHub Actions', 'Quality gates', 'Webhooks'],
  },
];

const STATS = [
  { value: '10×', label: 'Faster test generation vs manual' },
  { value: '94%', label: 'Defect prediction accuracy' },
  { value: '60%', label: 'Reduction in flaky test failures' },
  { value: '∞', label: 'Parallel browser execution' },
];

const INTEGRATIONS = [
  'Jira', 'GitHub', 'Jenkins', 'GitLab', 'Selenium', 'Playwright',
  'Cypress', 'TestRail', 'Slack', 'PagerDuty', 'Azure DevOps', 'Bitbucket',
];

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <NavCTA onGetStarted={onGetStarted} />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-20 px-6 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%)' }}>

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#1d6ae5 1px, transparent 1px), linear-gradient(90deg, #1d6ae5 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }} />

        <div className="relative max-w-4xl mx-auto">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">AI-Powered QA Platform</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
            Quality Engineering,<br />
            <span className="text-blue-600">Fully Automated.</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            EDGE QI orchestrates your entire QA lifecycle — from requirements to release —
            using AI agents that generate, execute, heal, and report automatically.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5">
              <Play className="w-4 h-4" /> Start Free — No Setup
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3.5 rounded-xl text-base border border-gray-200 transition-all hover:-translate-y-0.5">
              Sign In to Workspace <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Hero stat bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map(s => (
              <div key={s.value} className="text-center">
                <div className="text-3xl font-black text-blue-600 leading-none mb-1">{s.value}</div>
                <div className="text-xs text-gray-500 font-medium leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gray-950 text-white" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/40 border border-blue-700/40 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">How It Works</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              One pipeline. Zero manual work.
            </h2>
            <p className="text-gray-400 text-base max-w-xl mx-auto">
              Paste your requirements. The AI does the rest.
            </p>
          </div>

          {/* Pipeline steps */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 opacity-30" />

            {[
              { step: '01', icon: FileText, label: 'Paste Requirements', desc: 'Upload PRD or paste user stories' },
              { step: '02', icon: Sparkles, label: 'AI Generates Tests', desc: 'Hundreds of test cases in seconds' },
              { step: '03', icon: Cpu, label: 'Execute Automatically', desc: 'Parallel runs across browsers' },
              { step: '04', icon: TrendingUp, label: 'Get Full Report', desc: 'KPIs, defects, heal logs' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4 relative z-10">
                <div className="w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 relative">
                  <s.icon className="w-8 h-8 text-blue-400" />
                  <span className="absolute -top-2 -right-2 text-[10px] font-black text-blue-400 bg-gray-900 border border-blue-600/30 px-1.5 rounded-full font-mono">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">{s.label}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Mid CTA */}
          <div className="text-center mt-14">
            <button onClick={onGetStarted}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/40">
              <Zap className="w-4 h-4" /> Launch the AI Engine
            </button>
          </div>
        </div>
      </section>

      {/* ── MODULES GRID ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white" id="modules">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel text="Full Module Suite" />
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              Everything QA needs, in one platform.
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Nine specialized modules — all wired together, all AI-assisted.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((m, i) => (
              <div key={i}
                className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 cursor-pointer"
                onClick={onGetStarted}>
                <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1.5">{m.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-3">{m.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.chips.map(c => <FeatureChip key={c} text={c} />)}
                </div>
              </div>
            ))}
          </div>

          {/* CTA after modules */}
          <div className="mt-12 text-center">
            <button onClick={onGetStarted}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-200">
              Explore All Modules <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── AI HEALING FEATURE HIGHLIGHT ──────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left text */}
            <div>
              <SectionLabel text="AI Self-Healing" />
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-5 leading-tight">
                Tests that fix themselves. <span className="text-blue-600">Automatically.</span>
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-6">
                When UI changes break your locators, EDGE QI detects the failure in real-time,
                analyses the DOM delta, and generates a healed selector — no human intervention needed.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Real-time DOM snapshot comparison',
                  'Multi-fallback XPath/CSS generation',
                  'Healing audit trail per test run',
                  'Confidence score on every heal',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow shadow-blue-200">
                <RefreshCw className="w-4 h-4" /> See It In Action
              </button>
            </div>

            {/* Right: fake terminal card */}
            <div className="bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-gray-500 font-mono">ai_healing_pipeline.log</span>
              </div>
              <div className="p-4 font-mono text-xs space-y-2 leading-relaxed">
                <p><span className="text-gray-500">[09:14:02]</span> <span className="text-amber-400">⚠ LOCATOR_FAIL</span> <span className="text-gray-300">checkout_btn → xpath stale</span></p>
                <p><span className="text-gray-500">[09:14:02]</span> <span className="text-blue-400">→ SNAPSHOT</span> <span className="text-gray-300">DOM delta captured (3 nodes)</span></p>
                <p><span className="text-gray-500">[09:14:03]</span> <span className="text-blue-400">→ LLM</span> <span className="text-gray-300">Generating fallback selectors...</span></p>
                <p><span className="text-gray-500">[09:14:04]</span> <span className="text-green-400">✓ HEALED</span> <span className="text-gray-300">css=[data-testid="btn-checkout"]</span></p>
                <p><span className="text-gray-500">[09:14:04]</span> <span className="text-green-400">✓ VERIFIED</span> <span className="text-gray-300">confidence 97% — playbook saved</span></p>
                <p><span className="text-gray-500">[09:14:04]</span> <span className="text-blue-300">↺ RETRY</span> <span className="text-gray-300">test_checkout_flow → PASS ✓</span></p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800">
                  <Activity className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-green-400 text-[10px]">Pipeline live — 0 broken tests</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTEGRATIONS ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white" id="integrations">
        <div className="max-w-5xl mx-auto text-center">
          <SectionLabel text="Integrations" />
          <h2 className="text-3xl font-black text-gray-900 mb-4">
            Plugs into your existing stack.
          </h2>
          <p className="text-gray-500 text-base mb-10 max-w-xl mx-auto">
            Native connectors to your CI/CD, test management, and alerting tools. No config hell.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {INTEGRATIONS.map(tool => (
              <div key={tool}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all cursor-pointer"
                onClick={onGetStarted}>
                {tool}
              </div>
            ))}
          </div>

          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold px-7 py-3 rounded-xl text-sm border border-gray-200 transition-all shadow-sm">
            <Layers className="w-4 h-4 text-blue-500" /> View All Integrations
          </button>
        </div>
      </section>

      {/* ── SECURITY STRIP ────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-gray-950" id="security">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'OWASP Coverage', desc: 'All Top 10 vulnerability categories scanned automatically on every run.' },
              { icon: Lock, title: 'Secure by Default', desc: 'All credentials stored as encrypted secrets. No plaintext tokens anywhere.' },
              { icon: FlaskConical, title: 'Isolated Sandboxes', desc: 'Every execution runs in a clean sandboxed environment. Zero cross-contamination.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 rounded-2xl border border-gray-800 bg-gray-900">
                <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA BANNER ──────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #1d4ed8 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Ready to ship quality faster?</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-5 leading-tight">
            Start automating your QA today.
          </h2>
          <p className="text-blue-200 text-base mb-10 max-w-xl mx-auto leading-relaxed">
            No infrastructure to set up. No agents to install. Just sign in and let EDGE QI handle your entire quality pipeline.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-700 font-black px-9 py-4 rounded-xl text-base transition-all shadow-xl hover:-translate-y-0.5">
              <Zap className="w-5 h-5" /> Get Started Free
            </button>
            <button onClick={onGetStarted}
              className="flex items-center gap-2 bg-blue-700/40 hover:bg-blue-700/60 border border-blue-400/40 text-white font-bold px-9 py-4 rounded-xl text-base transition-all hover:-translate-y-0.5">
              Sign In to Dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-white tracking-widest" style={{ letterSpacing: '0.15em' }}>
              EDGE<span className="text-blue-400 ml-1">QI</span>
            </span>
          </div>
          <p className="text-xs text-gray-600 font-mono">© 2026 EDGE QI · Edge Quality Intelligence Platform · All pipelines active</p>
          <button onClick={onGetStarted}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
            Sign In <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </footer>
    </div>
  );
}
