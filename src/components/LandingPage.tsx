import {
  Zap, ShieldCheck, GitBranch, BarChart3, Cpu, FileText,
  ChevronRight, CheckCircle2, Sparkles, FlaskConical,
  Bug, Timer, Lock, Bot, TableProperties, Activity,
  ArrowRight, Play, Star
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ── Teachmint Design Tokens ──────────────────────────────────────────────
   --tm-bl-1: #1f3965  headings
   --tm-bl-5: #1e96df  CTA blue
   --tm-gy-1: #6b82ab  body text
   --tm-gy-2: #dbe2ea  borders
   --tm-gy-3: #f2f4f8  page bg
   Font: Lato  |  Heading: 600 weight, 110% lh  |  Body: 400, 150% lh
   ─────────────────────────────────────────────────────────────────────── */

const TM = {
  heading: '#1f3965',
  body:    '#6b82ab',
  cta:     '#1e96df',
  ctaHov:  '#1782c4',
  accent:  '#1da1f2',
  navy:    '#093158',
  navyDk:  '#072745',
  pageBg:  '#f2f4f8',
  border:  '#dbe2ea',
  cardBg:  '#ffffff',
  faint:   '#a6b4cd',
  green:   '#36b37e',
  greenBg: '#ebf7f2',
  orange:  '#ea8804',
  red:     '#ff5e5e',
};

/* ── Nav ──────────────────────────────────────────────────────────────── */
function Nav({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: '#ffffff',
      borderBottom: `1px solid ${TM.border}`,
      boxShadow: '0 1px 3px rgba(31,57,101,0.06)'
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${TM.navy} 0%, ${TM.cta} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <div style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontWeight: 900, fontSize: 17,
              color: TM.heading, letterSpacing: '0.12em'
            }}>
              EDGE<span style={{ color: TM.cta }}>QI</span>
            </div>
            <div style={{
              fontFamily: 'monospace', fontSize: 9,
              color: TM.faint, letterSpacing: '0.1em',
              textTransform: 'uppercase', marginTop: -2
            }}>
              Edge Quality Intelligence
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {['Features', 'Modules', 'Integrations', 'Pricing'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 14, fontWeight: 600,
              color: TM.body, textDecoration: 'none',
              transition: 'color 0.15s'
            }}
              onMouseEnter={e => (e.currentTarget.style.color = TM.cta)}
              onMouseLeave={e => (e.currentTarget.style.color = TM.body)}>
              {item}
            </a>
          ))}
        </nav>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onGetStarted} style={{
            fontFamily: 'Lato, Arial, sans-serif',
            fontSize: 14, fontWeight: 600,
            color: TM.heading, background: 'none',
            border: 'none', cursor: 'pointer', padding: '0 8px'
          }}>Sign In</button>
          <button onClick={onGetStarted} style={{
            fontFamily: 'Lato, Arial, sans-serif',
            fontSize: 14, fontWeight: 700,
            color: '#ffffff', background: TM.cta,
            border: 'none', borderRadius: 8,
            padding: '9px 20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(30,150,223,0.3)',
            transition: 'background 0.15s'
          }}
            onMouseEnter={e => (e.currentTarget.style.background = TM.ctaHov)}
            onMouseLeave={e => (e.currentTarget.style.background = TM.cta)}>
            Get Started <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ── Section pill label ──────────────────────────────────────────────── */
function SectionPill({ text }: { text: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#eaf5fd', border: `1px solid #b0d9f5`,
        borderRadius: 99, padding: '4px 14px'
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: TM.cta, display: 'inline-block'
        }} />
        <span style={{
          fontFamily: 'monospace', fontSize: 11,
          fontWeight: 700, color: TM.cta,
          letterSpacing: '0.12em', textTransform: 'uppercase'
        }}>{text}</span>
      </div>
    </div>
  );
}

/* ── Modules data ────────────────────────────────────────────────────── */
const MODULES = [
  { icon: Bot,            color: TM.cta,      title: 'Agentic AI Engine',        desc: 'Autonomous end-to-end QA orchestration. One click runs requirements → test cases → execution → report.', chips: ['Zero-touch pipeline', 'Multi-LLM routing', 'Self-healing'] },
  { icon: FileText,       color: TM.navy,     title: 'Requirements Intelligence', desc: 'Parse PRDs and user stories into structured, traceable requirements with AI gap detection.',              chips: ['Auto-parse PRDs', 'Gap analysis', 'REQ traceability'] },
  { icon: TableProperties,color: '#5a6fcf',   title: 'Test Case Generator',       desc: 'Generate comprehensive test matrices from requirements. Edit priorities, add steps, bulk approve.',          chips: ['AI generation', 'Bulk operations', 'Step editor'] },
  { icon: Cpu,            color: '#1da1f2',   title: 'Execution Engine',          desc: 'Run suites across browsers in parallel. AI heals broken locators automatically during runs.',               chips: ['Parallel runs', 'AI healing', 'Live telemetry'] },
  { icon: BarChart3,      color: '#0891b2',   title: 'Analytics & KPI',           desc: 'Real-time dashboards with pass/fail trends, SLA thresholds, and historical regression ledgers.',            chips: ['KPI thresholds', 'SLA tracking', 'CSV/JSON export'] },
  { icon: Bug,            color: '#e02424',   title: 'Defect Prediction',         desc: 'ML-powered hotspot detection predicts where defects will emerge before they reach production.',             chips: ['Risk scoring', 'Impact analysis', 'Module heatmap'] },
  { icon: Timer,          color: TM.orange,   title: 'Performance Testing',       desc: 'Load testing with configurable users and duration. Real-time p95/p99 latency and throughput graphs.',       chips: ['Load profiles', 'Latency metrics', 'Flamegraph'] },
  { icon: Lock,           color: '#dc2626',   title: 'Security Testing',          desc: 'OWASP-mapped vulnerability scanner with severity scoring and auto-generated remediation guides.',           chips: ['OWASP mapped', 'CVE scoring', 'Remediation'] },
  { icon: GitBranch,      color: TM.green,    title: 'CI/CD Integration',         desc: 'Native hooks for GitHub Actions, Jenkins, and GitLab. Quality gates block bad builds automatically.',      chips: ['GitHub Actions', 'Quality gates', 'Webhooks'] },
];

const STATS = [
  { value: '10×',  label: 'Faster test generation vs manual' },
  { value: '94%',  label: 'Defect prediction accuracy' },
  { value: '60%',  label: 'Reduction in flaky test failures' },
  { value: '3min', label: 'From requirement to running test' },
];

const INTEGRATIONS = [
  'Jira', 'GitHub', 'Jenkins', 'GitLab', 'Selenium', 'Playwright',
  'Cypress', 'TestRail', 'Slack', 'PagerDuty', 'Azure DevOps', 'Bitbucket',
];

const HOW_IT_WORKS = [
  { num: '01', title: 'Connect Requirements', desc: 'Upload PRDs, user stories, or Jira epics. AI structures and links them instantly.' },
  { num: '02', title: 'Generate Test Cases',  desc: 'AI builds full test matrices — edge cases, negative scenarios, regression suites included.' },
  { num: '03', title: 'Execute & Heal',       desc: 'Run across browsers in parallel. AI heals broken locators automatically.' },
  { num: '04', title: 'Ship with Confidence', desc: 'Quality gate blocks bad builds. Detailed reports and KPI dashboards track progress.' },
];

/* ── Main export ─────────────────────────────────────────────────────── */
export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div style={{ fontFamily: 'Lato, Arial, sans-serif', background: TM.pageBg, minHeight: '100vh' }}>
      <Nav onGetStarted={onGetStarted} />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HERO SECTION
          Background: white → f2f4f8 gradient
          Heading: #1f3965, 600 weight, 110% lh
          Body: #6b82ab, 400 weight
          CTA button: #1e96df
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        paddingTop: 120, paddingBottom: 80,
        background: `linear-gradient(180deg, #ffffff 0%, ${TM.pageBg} 100%)`,
        textAlign: 'center',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
          backgroundImage: `radial-gradient(${TM.cta} 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px', position: 'relative' }}>
          <SectionPill text="AI-Powered QA Platform" />

          <h1 style={{
            fontFamily: 'Lato, Arial, sans-serif',
            fontSize: 52, fontWeight: 700,
            color: TM.heading, lineHeight: '1.1',
            marginBottom: 20, letterSpacing: '-0.5px'
          }}>
            Quality Engineering,<br />
            <span style={{ color: TM.cta }}>Automated End-to-End</span>
          </h1>

          <p style={{
            fontFamily: 'Lato, Arial, sans-serif',
            fontSize: 18, fontWeight: 400,
            color: TM.body, lineHeight: '1.6',
            marginBottom: 40, maxWidth: 560, margin: '0 auto 40px'
          }}>
            EDGE QI turns requirements into running tests in minutes.
            AI orchestrates your entire QA pipeline — from PRD to production confidence.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 56 }}>
            <button onClick={onGetStarted} style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 16, fontWeight: 700,
              color: '#ffffff', background: TM.cta,
              border: 'none', borderRadius: 10,
              padding: '14px 32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(30,150,223,0.35)'
            }}>
              Get Started Free <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
            <button onClick={onGetStarted} style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 16, fontWeight: 600,
              color: TM.heading, background: '#ffffff',
              border: `1px solid ${TM.border}`, borderRadius: 10,
              padding: '14px 28px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <Play style={{ width: 16, height: 16, color: TM.cta }} />
              Watch Demo
            </button>
          </div>

          {/* Trust bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 24, color: TM.faint, fontSize: 13
          }}>
            {['No credit card required', '14-day free trial', 'SOC2 Type II certified'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: TM.green }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          STATS STRIP
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        background: TM.navyDk,
        padding: '40px 32px'
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32, textAlign: 'center'
        }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{
                fontFamily: 'Lato, Arial, sans-serif',
                fontSize: 40, fontWeight: 700,
                color: TM.accent, lineHeight: 1.1, marginBottom: 8
              }}>{s.value}</div>
              <div style={{
                fontFamily: 'Lato, Arial, sans-serif',
                fontSize: 13, color: '#90aed4', lineHeight: '1.5'
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          HOW IT WORKS
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" style={{
        background: '#ffffff',
        padding: '80px 32px'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionPill text="How It Works" />
            <h2 style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 36, fontWeight: 600,
              color: TM.heading, lineHeight: '1.1'
            }}>From requirement to production<br />in 4 steps</h2>
            <p style={{
              fontSize: 16, color: TM.body,
              marginTop: 16, lineHeight: '1.6'
            }}>EDGE QI eliminates the 80% of QA work that is manual and repetitive.</p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24
          }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.num} style={{ position: 'relative' }}>
                {/* Connector line */}
                {i < 3 && (
                  <div style={{
                    position: 'absolute', top: 28, left: '60%', right: '-10%',
                    height: 1, background: TM.border, zIndex: 0
                  }} />
                )}
                <div style={{
                  background: TM.pageBg, border: `1px solid ${TM.border}`,
                  borderRadius: 12, padding: '24px 20px', position: 'relative', zIndex: 1
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: TM.cta, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Lato, Arial, sans-serif', fontSize: 14, fontWeight: 700,
                    color: '#fff', marginBottom: 16
                  }}>{step.num}</div>
                  <h3 style={{
                    fontFamily: 'Lato, Arial, sans-serif',
                    fontSize: 15, fontWeight: 600, color: TM.heading,
                    marginBottom: 8, lineHeight: '1.2'
                  }}>{step.title}</h3>
                  <p style={{
                    fontSize: 13, color: TM.body, lineHeight: '1.5'
                  }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODULES GRID
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="modules" style={{
        background: TM.pageBg,
        padding: '80px 32px'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionPill text="Platform Modules" />
            <h2 style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 36, fontWeight: 600,
              color: TM.heading, lineHeight: '1.1'
            }}>Everything QA needs,<br />in one unified platform</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20
          }}>
            {MODULES.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.title} style={{
                  background: '#ffffff',
                  border: `1px solid ${TM.border}`,
                  borderRadius: 12, padding: '24px',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  cursor: 'default'
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(30,150,223,0.12)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#90c4e8';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = TM.border;
                  }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: m.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16
                  }}>
                    <Icon style={{ width: 22, height: 22, color: '#ffffff' }} />
                  </div>

                  <h3 style={{
                    fontFamily: 'Lato, Arial, sans-serif',
                    fontSize: 15, fontWeight: 600,
                    color: TM.heading, marginBottom: 8, lineHeight: '1.2'
                  }}>{m.title}</h3>

                  <p style={{
                    fontSize: 13, color: TM.body,
                    lineHeight: '1.5', marginBottom: 16
                  }}>{m.desc}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.chips.map(c => (
                      <span key={c} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
                        color: TM.cta, background: '#eaf5fd',
                        border: `1px solid #b0d9f5`,
                        borderRadius: 6, padding: '2px 8px'
                      }}>
                        <CheckCircle2 style={{ width: 10, height: 10 }} />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          AI SELF-HEALING HIGHLIGHT
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        background: '#ffffff',
        padding: '80px 32px'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 64, alignItems: 'center'
          }}>
            {/* Left text */}
            <div>
              <SectionPill text="AI Self-Healing" />
              <h2 style={{
                fontFamily: 'Lato, Arial, sans-serif',
                fontSize: 34, fontWeight: 600,
                color: TM.heading, lineHeight: '1.15', marginBottom: 20
              }}>
                Tests that fix themselves —<br />
                <span style={{ color: TM.cta }}>automatically</span>
              </h2>
              <p style={{
                fontSize: 15, color: TM.body, lineHeight: '1.6', marginBottom: 28
              }}>
                When a UI change breaks a locator, EDGE QI's AI engine detects the failure,
                analyses the DOM, finds the correct element, and updates the selector — all
                before the next test run.
              </p>
              {[
                'Detects broken XPath / CSS selectors in real time',
                'AI proposes and applies the correct fix automatically',
                'Reduces flaky test maintenance by up to 60%',
                'Full audit trail of every self-healing action taken',
              ].map(t => (
                <div key={t} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12
                }}>
                  <CheckCircle2 style={{ width: 18, height: 18, color: TM.green, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 14, color: TM.body, lineHeight: '1.5' }}>{t}</span>
                </div>
              ))}
              <button onClick={onGetStarted} style={{
                marginTop: 16,
                fontFamily: 'Lato, Arial, sans-serif',
                fontSize: 14, fontWeight: 700,
                color: '#ffffff', background: TM.cta,
                border: 'none', borderRadius: 8,
                padding: '11px 24px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(30,150,223,0.3)'
              }}>
                See It In Action <ArrowRight style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Right terminal mockup */}
            <div style={{
              background: TM.navyDk, borderRadius: 14,
              padding: '24px', fontFamily: 'monospace', fontSize: 12,
              boxShadow: '0 8px 40px rgba(7,39,69,0.35)'
            }}>
              {/* Traffic lights */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                ))}
              </div>
              {[
                { t: 'EDGE QI Execution Engine v3.1', c: '#a6b4cd' },
                { t: '> Running suite: checkout-flow (18 tests)', c: '#dbe2ea' },
                { t: '', c: '' },
                { t: '✓ TC-001  Login flow                [PASS]', c: '#36b37e' },
                { t: '✓ TC-002  Add to cart               [PASS]', c: '#36b37e' },
                { t: '⚠ TC-007  Payment form              [HEALING]', c: '#ea8804' },
                { t: '  Locator stale: #pay-btn → .payment-submit', c: '#a6b4cd' },
                { t: '  AI fix applied in 340ms ✓', c: '#1da1f2' },
                { t: '✓ TC-007  Payment form              [PASS]', c: '#36b37e' },
                { t: '', c: '' },
                { t: '✓ TC-018  Order confirmation        [PASS]', c: '#36b37e' },
                { t: '', c: '' },
                { t: '18/18 passed  •  1 self-healed  •  12.4s', c: '#dbe2ea' },
              ].map((line, i) => (
                <div key={i} style={{ color: line.c, marginBottom: 3, lineHeight: '1.5' }}>
                  {line.t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          INTEGRATIONS
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="integrations" style={{
        background: TM.pageBg,
        padding: '72px 32px', textAlign: 'center'
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionPill text="Integrations" />
          <h2 style={{
            fontFamily: 'Lato, Arial, sans-serif',
            fontSize: 32, fontWeight: 600,
            color: TM.heading, lineHeight: '1.1', marginBottom: 12
          }}>Plugs into your existing stack</h2>
          <p style={{ fontSize: 15, color: TM.body, marginBottom: 44 }}>
            Native integrations with every major DevOps and QA tool — zero configuration.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {INTEGRATIONS.map(name => (
              <div key={name} style={{
                background: '#ffffff', border: `1px solid ${TM.border}`,
                borderRadius: 10, padding: '10px 20px',
                fontFamily: 'Lato, Arial, sans-serif',
                fontSize: 14, fontWeight: 600, color: TM.heading
              }}>{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SECURITY STRIP
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        background: '#ffffff',
        padding: '56px 32px', textAlign: 'center',
        borderTop: `1px solid ${TM.border}`
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{
            fontFamily: 'monospace', fontSize: 11,
            fontWeight: 700, color: TM.faint,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 32
          }}>ENTERPRISE-GRADE SECURITY</p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'center'
          }}>
            {[
              { icon: ShieldCheck, label: 'SOC 2 Type II' },
              { icon: Lock,        label: 'AES-256 Encryption' },
              { icon: Activity,    label: '99.99% Uptime SLA' },
              { icon: ShieldCheck, label: 'GDPR Compliant' },
              { icon: GitBranch,   label: 'On-premise Option' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Icon style={{ width: 18, height: 18, color: TM.cta }} />
                <span style={{
                  fontFamily: 'Lato, Arial, sans-serif',
                  fontSize: 14, fontWeight: 600, color: TM.heading
                }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FINAL CTA
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{
        background: `linear-gradient(135deg, ${TM.navyDk} 0%, ${TM.navy} 60%, #0d4d8a 100%)`,
        padding: '88px 32px', textAlign: 'center'
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(30,150,223,0.2)', border: `1px solid rgba(30,150,223,0.4)`,
            borderRadius: 99, padding: '5px 16px', marginBottom: 24
          }}>
            <Sparkles style={{ width: 14, height: 14, color: TM.accent }} />
            <span style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
              color: TM.accent, letterSpacing: '0.12em', textTransform: 'uppercase'
            }}>Ready to automate QA?</span>
          </div>

          <h2 style={{
            fontFamily: 'Lato, Arial, sans-serif',
            fontSize: 40, fontWeight: 700,
            color: '#ffffff', lineHeight: '1.1', marginBottom: 20
          }}>Start testing smarter today</h2>

          <p style={{
            fontSize: 16, color: '#90aed4',
            lineHeight: '1.6', marginBottom: 40
          }}>
            Join hundreds of QA teams shipping faster and with more confidence.
            Set up in minutes — no DevOps expertise required.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={onGetStarted} style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 16, fontWeight: 700,
              color: '#ffffff', background: TM.cta,
              border: 'none', borderRadius: 10,
              padding: '15px 36px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(30,150,223,0.5)'
            }}>
              Get Started Free <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
            <button onClick={onGetStarted} style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontSize: 16, fontWeight: 600,
              color: '#ffffff', background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, padding: '15px 28px', cursor: 'pointer'
            }}>
              Sign In
            </button>
          </div>

          <p style={{
            marginTop: 24, fontSize: 13, color: '#6b82ab'
          }}>
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          FOOTER
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{
        background: TM.navyDk,
        borderTop: '1px solid rgba(219,226,234,0.08)',
        padding: '40px 32px'
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: `linear-gradient(135deg, ${TM.navy} 0%, ${TM.cta} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <span style={{
              fontFamily: 'Lato, Arial, sans-serif',
              fontWeight: 700, fontSize: 14,
              color: '#ffffff', letterSpacing: '0.1em'
            }}>
              EDGE<span style={{ color: TM.accent }}>QI</span>
            </span>
          </div>

          <p style={{ fontSize: 13, color: '#6b82ab' }}>
            © 2026 EDGE QI — Edge Quality Intelligence
          </p>

          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'Security', 'Status'].map(l => (
              <a key={l} href="#" style={{
                fontFamily: 'Lato, Arial, sans-serif',
                fontSize: 13, color: '#6b82ab',
                textDecoration: 'none'
              }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
