import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, RefreshCw, FileCode, CheckCircle2, Search, Globe, Code, X, Zap, Download, Package, ArrowRight, CheckCircle, TableProperties, Lock, User, Key, FileText, BarChart2 } from 'lucide-react';

// GAP-15: Fixed token — use iq_token (not iqstudio_token)
// GAP-16: Authenticated DAST fields
// GAP-17: Compliance report PDF/CSV export

// REQ-83: Security report export (basic CSV/JSON)
async function exportSecurityReport(format: 'csv' | 'json', vulns: any[]) {
  const token = localStorage.getItem('iq_token'); // GAP-15 fix
  const res = await fetch(apiUrl(`/api/quality/security/export?format=${format}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (res.ok) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `security-report.${format}`; a.click();
    URL.revokeObjectURL(url);
  } else {
    // Fallback: generate client-side
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(vulns, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'security-report.json'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const rows = ['ID,Title,Severity,Type,Status,Compliance'];
      vulns.forEach(v => rows.push(`"${v.id}","${v.title}","${v.severity}","${v.type}","${v.status}","${(v.complianceLabels || []).join('|')}"`));
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'security-report.csv'; a.click();
      URL.revokeObjectURL(url);
    }
  }
}

// GAP-17: Compliance PDF/CSV export per standard
function exportComplianceReport(standard: string, vulns: any[], format: 'csv' | 'html') {
  const filtered = vulns.filter(v => v.complianceLabels?.includes(standard));
  const now = new Date().toLocaleDateString();

  if (format === 'html') {
    const openCount = filtered.filter(v => v.status === 'Open').length;
    const fixedCount = filtered.filter(v => v.status === 'Remediated').length;
    const isCompliant = openCount === 0;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${standard} Compliance Report</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; color: #0F172A; }
  h1 { color: #0F172A; border-bottom: 2px solid #5B6CFF; padding-bottom: 8px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
  .pass { background: #d1fae5; color: #065f46; }
  .fail { background: #fee2e2; color: #991b1b; }
  .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 20px 0; }
  .card { background: #f8fafc; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; text-align: center; }
  .card .num { font-size: 28px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th { background: #0F172A; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
  tr:nth-child(even) { background: #f8fafc; }
  .open { color: #dc2626; font-weight: bold; }
  .fixed { color: #16a34a; font-weight: bold; }
</style></head><body>
<h1>${standard} Security Compliance Report</h1>
<p>Generated: ${now} | Platform: EDGE QI | Total Findings: ${filtered.length}</p>
<span class="badge ${isCompliant ? 'pass' : 'fail'}">${isCompliant ? '✅ COMPLIANT' : '⚠️ NON-COMPLIANT — Action Required'}</span>

<div class="meta">
  <div class="card"><div class="num">${filtered.length}</div><div>Total Findings</div></div>
  <div class="card"><div class="num" style="color:#dc2626">${openCount}</div><div>Open Issues</div></div>
  <div class="card"><div class="num" style="color:#16a34a">${fixedCount}</div><div>Remediated</div></div>
</div>

<h2>Finding Details</h2>
${filtered.length === 0 ? '<p>No findings related to ' + standard + '. System is compliant.</p>' : `
<table>
  <thead><tr><th>ID</th><th>Title</th><th>Severity</th><th>Type</th><th>Status</th><th>Compliance Tags</th></tr></thead>
  <tbody>
    ${filtered.map(v => `
    <tr>
      <td>${v.id}</td>
      <td>${v.title}</td>
      <td>${v.severity}</td>
      <td>${v.type}</td>
      <td class="${v.status === 'Open' ? 'open' : 'fixed'}">${v.status}</td>
      <td>${(v.complianceLabels || []).join(', ')}</td>
    </tr>`).join('')}
  </tbody>
</table>`}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${standard.toLowerCase()}-compliance-report.html`; a.click();
    URL.revokeObjectURL(url);
  } else {
    const rows = [`${standard} Compliance Report — ${now}`, `Total Findings,${filtered.length}`, `Open Issues,${filtered.filter(v => v.status === 'Open').length}`, `Remediated,${filtered.filter(v => v.status === 'Remediated').length}`, ``, `ID,Title,Severity,Type,Status`];
    filtered.forEach(v => rows.push(`"${v.id}","${v.title}","${v.severity}","${v.type}","${v.status}"`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${standard.toLowerCase()}-compliance.csv`; a.click();
    URL.revokeObjectURL(url);
  }
}

import { SecurityVulnerability, TestCase } from '../types';
import { apiUrl } from '@/src/config/api';

interface SecurityProps {
  vulnerabilities: SecurityVulnerability[];
  testCases?: TestCase[];
  onApplyRemediation: (vulnerabilityId: string) => Promise<void>;
  isRemediating: string | null;
  onNavigateToDashboard?: () => void;
}

export default function SecurityTab({
  vulnerabilities,
  testCases = [],
  onApplyRemediation,
  isRemediating,
  onNavigateToDashboard,
}: SecurityProps) {
  const [selectedVulId, setSelectedVulId] = useState<string | null>(vulnerabilities[0]?.id || null);

  // Scan form state
  const [scanTarget, setScanTarget] = useState<string>('https://staging.qa-env.io');
  const [codeSnippet, setCodeSnippet] = useState<string>('');
  const [scanType, setScanType] = useState<'SAST' | 'DAST' | 'SCA' | 'Container'>('DAST');
  const [scanMode, setScanMode] = useState<'url' | 'code'>('url');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanCount, setLastScanCount] = useState<number | null>(null);
  // Open source security tool selector
  const [secTool, setSecTool] = useState<'semgrep' | 'trivy' | 'nikto' | 'zap'>('semgrep');
  const [secToolRunning, setSecToolRunning] = useState(false);
  const [secToolResult, setSecToolResult] = useState<any>(null);

  // GAP-16: Authenticated DAST fields
  const [showAuthFields, setShowAuthFields] = useState(false);
  const [dastUsername, setDastUsername] = useState('');
  const [dastPassword, setDastPassword] = useState('');
  const [dastCookie, setDastCookie] = useState('');
  const [dastAuthHeader, setDastAuthHeader] = useState('');

  // GAP-17: Compliance report panel
  const [showCompliancePanel, setShowCompliancePanel] = useState(false);
  const [selectedComplianceStd, setSelectedComplianceStd] = useState<string>('PCI-DSS');

  // REQ-84: A11y scan state
  const [a11yResults, setA11yResults] = useState<any[]>([]);
  const [a11yScanning, setA11yScanning] = useState(false);
  const [a11yTarget, setA11yTarget] = useState('https://staging.qa-env.io');
  const [a11yError, setA11yError] = useState<string | null>(null);

  const handleA11yScan = async () => {
    setA11yScanning(true); setA11yError(null); setA11yResults([]);
    try {
      const token = localStorage.getItem('iq_token'); // GAP-15 fix
      const res = await fetch(apiUrl('/api/quality/security/scan/a11y'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url: a11yTarget })
      });
      const data = await res.json();
      if (data.success) setA11yResults(data.issues || []);
      else setA11yError(data.error || 'A11y scan failed');
    } catch (e: any) { setA11yError(e.message); } finally { setA11yScanning(false); }
  };

  // REQ-70: Dependency vulnerability scan state
  const [depScanResults, setDepScanResults] = useState<any>(null);
  const [depScanning, setDepScanning] = useState(false);

  const handleDepScan = async () => {
    setDepScanning(true);
    try {
      const token = localStorage.getItem('iq_token'); // GAP-15 fix
      const res = await fetch(apiUrl('/api/quality/security/dependency-scan'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setDepScanResults(data);
    } catch { } finally { setDepScanning(false); }
  };

  const [localVulns, setLocalVulns] = useState<SecurityVulnerability[]>(vulnerabilities);

  const mergedVulns = [
    ...localVulns,
    ...vulnerabilities.filter(v => !localVulns.some(lv => lv.id === v.id))
  ];

  const activeVul = mergedVulns.find(v => v.id === selectedVulId) || mergedVulns[0];

  const handleRunScan = async () => {
    setScanError(null);
    setIsScanning(true);
    try {
      const body: any = { scanType };
      if (scanMode === 'url') {
        body.targetUrl = scanTarget;
      } else {
        body.codeSnippet = codeSnippet;
      }
      // GAP-16: Include auth credentials for DAST
      if (scanType === 'DAST' && showAuthFields) {
        body.auth = {
          username: dastUsername || undefined,
          password: dastPassword || undefined,
          cookie: dastCookie || undefined,
          authHeader: dastAuthHeader || undefined,
        };
      }

      const token = localStorage.getItem('iq_token'); // GAP-15 fix
      const res = await fetch(apiUrl('/api/quality/security/scan'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success && data.vulnerabilities?.length) {
        setLocalVulns(prev => {
          const incoming: SecurityVulnerability[] = data.vulnerabilities;
          const deduped = incoming.filter(v => !prev.some(p => p.id === v.id));
          return [...deduped, ...prev];
        });
        setLastScanCount(data.vulnerabilities.length);
        setSelectedVulId(data.vulnerabilities[0].id);
      } else {
        setScanError(data.error || 'Scan returned no findings.');
      }
    } catch (err: any) {
      setScanError(`Scan request failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSecToolRun = async () => {
    if (secToolRunning) return;
    setSecToolRunning(true);
    setSecToolResult(null);
    const token = localStorage.getItem('iq_token') || '';
    try {
      const res = await fetch(apiUrl('/api/quality/security/tool-run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          tool: secTool,
          targetUrl: scanMode === 'url' ? scanTarget : '',
          targetPath: '.',
          scanType: secTool === 'semgrep' ? 'SAST' : secTool === 'trivy' ? 'SCA' : 'DAST'
        })
      });
      const data = await res.json();
      setSecToolResult(data);
      if (data.findings?.length > 0) {
        setLocalVulns(prev => {
          const deduped = data.findings.filter((v: any) => !prev.some((p: any) => p.id === v.id));
          return [...deduped, ...prev];
        });
        setLastScanCount(data.totalFindings);
        if (data.findings[0]?.id) setSelectedVulId(data.findings[0].id);
      }
    } catch (err: any) {
      setSecToolResult({ error: err.message });
    } finally {
      setSecToolRunning(false);
    }
  };

  const openVulns = mergedVulns.filter(v => v.status === 'Open').length;
  const fixedVulns = mergedVulns.filter(v => v.status !== 'Open').length;

  const complianceStandards = [
    { id: 'PCI-DSS', label: 'PCI-DSS', desc: 'Payment Card Industry Data Security Standard', color: 'blue' },
    { id: 'SOC2', label: 'SOC2 Typ-2', desc: 'Service Organization Control 2 Type II', color: 'purple' },
    { id: 'GDPR', label: 'GDPR Art-32', desc: 'General Data Protection Regulation Article 32', color: 'green' },
    { id: 'HIPAA', label: 'HIPAA Rule', desc: 'Health Insurance Portability and Accountability Act', color: 'red' },
  ];

  return (
    <div className="space-y-6">

    {/* Page Header */}
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:16,borderBottom:'1px solid #E2E8F0'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0F172A 0%,#5B6CFF 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <ShieldAlert style={{width:20,height:20,color:'#ffffff'}} />
        </div>
        <div>
          <h1 style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#0F172A',lineHeight:1,margin:0}}>Security Testing</h1>
          <p style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,color:'#475569',margin:'3px 0 0'}}>OWASP-mapped vulnerability scanner with severity scoring</p>
        </div>
      </div>
      {/* GAP-17: Compliance report button */}
      <button
        onClick={() => setShowCompliancePanel(v => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-mono font-bold hover:bg-indigo-100 transition-all"
      >
        <BarChart2 className="w-4 h-4" /> Compliance Reports
      </button>
    </div>

    {/* Test case quick-pick */}
    {testCases.length > 0 && (
      <div style={{background:'#f8fafc',border:'1px solid #E2E8F0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <TableProperties style={{width:15,height:15,color:'#5B6CFF',flexShrink:0}} />
        <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:12,fontWeight:700,color:'#0F172A'}}>Scan from test cases:</span>
        {testCases.slice(0, 5).map(tc => (
          <button
            key={tc.id}
            onClick={() => {
              setScanMode('url');
              setScanTarget(`https://staging.qa-env.io/${tc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`);
            }}
            style={{background:'#eaf5fd',border:'1px solid #b0d9f5',borderRadius:6,padding:'3px 10px',fontFamily:'"Inter",Arial,sans-serif',fontSize:11,color:'#5B6CFF',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}
            title={tc.title}
          >
            {tc.id}
          </button>
        ))}
      </div>
    )}

    {/* GAP-17: Compliance Report Panel */}
    {showCompliancePanel && (
      <div className="bg-white border border-indigo-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-800">Compliance Reporting Center</span>
          </div>
          <button onClick={() => setShowCompliancePanel(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-[11px] text-slate-500">Export detailed compliance reports with finding breakdowns per regulatory standard. Reports can be shared with auditors.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {complianceStandards.map(std => {
              const stdVulns = mergedVulns.filter(v => v.complianceLabels?.includes(std.id));
              const openCnt = stdVulns.filter(v => v.status === 'Open').length;
              const isOk = openCnt === 0;
              return (
                <div
                  key={std.id}
                  onClick={() => setSelectedComplianceStd(std.id)}
                  className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${
                    selectedComplianceStd === std.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-slate-800">{std.label}</span>
                    <span className={`text-[10px] font-bold ${isOk ? 'text-green-600' : 'text-amber-600'}`}>
                      {isOk ? '✅' : '⚠️'}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-normal mb-2">{std.desc}</p>
                  <div className="flex gap-2 text-[10px] font-mono">
                    <span className="text-rose-600 font-bold">{openCnt} open</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-green-600">{stdVulns.length - openCnt} fixed</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed breakdown for selected standard */}
          {selectedComplianceStd && (() => {
            const stdInfo = complianceStandards.find(s => s.id === selectedComplianceStd)!;
            const stdVulns = mergedVulns.filter(v => v.complianceLabels?.includes(selectedComplianceStd));
            const openCnt = stdVulns.filter(v => v.status === 'Open').length;
            return (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700">{stdInfo.label} — {stdVulns.length} findings</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportComplianceReport(selectedComplianceStd, mergedVulns, 'html')}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-mono font-bold hover:bg-indigo-700 transition-all"
                    >
                      <FileText className="w-3 h-3" /> Export HTML Report
                    </button>
                    <button
                      onClick={() => exportComplianceReport(selectedComplianceStd, mergedVulns, 'csv')}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 text-white rounded-lg text-[10px] font-mono font-bold hover:bg-slate-800 transition-all"
                    >
                      <Download className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                </div>
                {stdVulns.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-mono">
                    ✅ No findings mapped to {selectedComplianceStd}. System is compliant.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {stdVulns.map(v => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                        <span className="font-mono text-slate-400 text-[10px] w-16 flex-shrink-0">{v.id}</span>
                        <span className="flex-1 text-slate-700 font-medium truncate">{v.title}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          v.severity === 'Critical' ? 'bg-red-50 text-red-700' :
                          v.severity === 'High' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>{v.severity}</span>
                        <span className={`text-[10px] font-bold ${v.status === 'Remediated' ? 'text-green-600' : 'text-rose-600'}`}>
                          {v.status === 'Remediated' ? '✅ Fixed' : '⚠️ Open'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    )}

    {/* Scan Input Panel */}
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="panel-title flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            New Security Scan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Run SAST / DAST / SCA scans against a URL or code.</p>
        </div>
        {lastScanCount !== null && (
          <span className="badge badge-green whitespace-nowrap">
            ✔ {lastScanCount} findings discovered
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scan Type selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Scan Method</label>
          <div className="grid grid-cols-2 gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200">
            {(['SAST', 'DAST', 'SCA', 'Container'] as const).map(t => (
              <button
                key={t}
                onClick={() => setScanType(t)}
                className={`py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  scanType === t ? 'btn-primary' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Input mode toggle */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Input Mode</label>
          <div className="flex gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setScanMode('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                scanMode === 'url' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-3 h-3" /> URL Target
            </button>
            <button
              onClick={() => setScanMode('code')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                scanMode === 'code' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-3 h-3" /> Code Paste
            </button>
          </div>
        </div>

        {/* Run button */}
        <div className="flex flex-col justify-end">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${isScanning ? 'opacity-70' : ''}`}
          >
            {isScanning ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning Target...</>
            ) : (
              <><Zap className="w-4 h-4" /> Launch {scanType} Scan (AI)</>
            )}
          </button>
        </div>
      </div>

      {/* ── Open Source Security Tool Selector ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">Open Source Security Scanners</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { id: 'semgrep', label: 'Semgrep', badge: 'v1.164', desc: 'SAST · Code patterns', color: 'border-blue-500 text-blue-300 bg-blue-950' },
            { id: 'trivy', label: 'Trivy', badge: 'v0.71', desc: 'SCA · CVE scanner', color: 'border-cyan-500 text-cyan-300 bg-cyan-950' },
            { id: 'nikto', label: 'Nikto', badge: 'v2.x', desc: 'DAST · Web server', color: 'border-orange-500 text-orange-300 bg-orange-950' },
            { id: 'zap', label: 'OWASP ZAP', badge: 'sim', desc: 'DAST · Active scan', color: 'border-rose-500 text-rose-300 bg-rose-950' },
          ] as const).map(tool => (
            <button
              key={tool.id}
              onClick={() => setSecTool(tool.id)}
              className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-mono font-bold transition-all ${
                secTool === tool.id ? 'ring-2 ring-offset-1 ring-white/30 opacity-100 ' + tool.color : 'border-slate-600 text-slate-400 bg-slate-800 hover:border-slate-500'
              }`}
            >
              <span className="font-extrabold">{tool.label}</span>
              <span className="text-[9px] opacity-70">{tool.badge}</span>
              <span className="text-[8px] opacity-50 text-center">{tool.desc}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSecToolRun}
            disabled={secToolRunning || isScanning}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-bold transition-all ${secToolRunning ? 'bg-slate-700 text-slate-300 border border-slate-600' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'} disabled:opacity-60`}
          >
            {secToolRunning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running {secTool}...</> : <><ShieldAlert className="w-3.5 h-3.5" /> Run {secTool === 'zap' ? 'OWASP ZAP' : secTool.charAt(0).toUpperCase() + secTool.slice(1)} Scan</>}
          </button>
        </div>
        {secToolResult && !secToolResult.error && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-[10px] font-mono">
              <span className="bg-slate-700 border border-slate-600 text-slate-300 rounded-lg px-2 py-1">🔍 {secToolResult.toolVersion}</span>
              <span className={`rounded-lg px-2 py-1 border ${(secToolResult.totalFindings || 0) > 0 ? 'bg-rose-900 border-rose-700 text-rose-300' : 'bg-green-900 border-green-700 text-green-300'}`}>{secToolResult.totalFindings || 0} findings</span>
              <span className="bg-slate-700 border border-slate-600 text-slate-400 rounded-lg px-2 py-1">{((secToolResult.durationMs || 0)/1000).toFixed(1)}s</span>
            </div>
            <div className="bg-black/50 rounded-lg p-2 max-h-28 overflow-y-auto">
              {(secToolResult.logs || []).slice(-15).map((log: string, i: number) => (
                <div key={i} className="text-[9px] font-mono text-slate-400 leading-relaxed">{log}</div>
              ))}
            </div>
          </div>
        )}
        {secToolResult?.error && <p className="text-xs text-red-400 font-mono bg-red-950 border border-red-800 rounded-lg p-2">Error: {secToolResult.error}</p>}
      </div>

      {/* Target input */}
      {scanMode === 'url' ? (
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Target URL</label>
          <input
            type="text"
            value={scanTarget}
            onChange={e => setScanTarget(e.target.value)}
            placeholder="https://staging.qa-env.io/api/v1/checkout"
            className="input-glass w-full font-mono"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Paste Code Snippet</label>
          <textarea
            value={codeSnippet}
            onChange={e => setCodeSnippet(e.target.value)}
            placeholder={`// Paste your code for SAST analysis\nconst query = "SELECT * FROM users WHERE id = " + userId;`}
            rows={4}
            className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      )}

      {/* GAP-16: Authenticated DAST fields */}
      {scanType === 'DAST' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAuthFields(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-mono font-bold text-slate-700 transition-all"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Authenticated DAST Credentials
              {showAuthFields && (dastUsername || dastCookie || dastAuthHeader) && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Auth configured</span>
              )}
            </div>
            <span className="text-slate-400 text-[10px]">{showAuthFields ? '▲ Hide' : '▼ Configure auth for authenticated page scanning'}</span>
          </button>

          {showAuthFields && (
            <div className="p-4 space-y-3 bg-amber-50/30 border-t border-slate-100">
              <p className="text-[11px] text-slate-500">
                Provide credentials to allow the DAST scanner to authenticate and scan pages behind login.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500 font-bold">
                    <User className="w-3 h-3" /> Username / Email
                  </label>
                  <input
                    type="text"
                    value={dastUsername}
                    onChange={e => setDastUsername(e.target.value)}
                    placeholder="testuser@staging.qa-env.io"
                    className="input-glass w-full text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500 font-bold">
                    <Key className="w-3 h-3" /> Password
                  </label>
                  <input
                    type="password"
                    value={dastPassword}
                    onChange={e => setDastPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="input-glass w-full text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500 font-bold">
                    <Key className="w-3 h-3" /> Session Cookie
                  </label>
                  <input
                    type="text"
                    value={dastCookie}
                    onChange={e => setDastCookie(e.target.value)}
                    placeholder="session=abc123; auth_token=xyz"
                    className="input-glass w-full text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-500 font-bold">
                    <Lock className="w-3 h-3" /> Authorization Header
                  </label>
                  <input
                    type="text"
                    value={dastAuthHeader}
                    onChange={e => setDastAuthHeader(e.target.value)}
                    placeholder="Bearer eyJhbGci..."
                    className="input-glass w-full text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Credentials are transmitted only to your scan target. They are not stored on this server.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {scanError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{scanError}</span>
          <button onClick={() => setScanError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>

    {/* Main 2-column vulnerability review */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* 1. Vulnerability logs list */}
      <div className="lg:col-span-5 glass-card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="panel-title flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Scanned Vulnerability Log
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {mergedVulns.length} finding{mergedVulns.length !== 1 ? 's' : ''} across SAST / DAST / SCA / Container scans.
            </p>
          </div>
          {/* REQ-83: Export buttons */}
          <div className="flex gap-1 flex-shrink-0 ml-2">
            <button onClick={() => exportSecurityReport('csv', mergedVulns)} aria-label="Export security report as CSV"
              className="btn-ghost flex items-center gap-1">
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={() => exportSecurityReport('json', mergedVulns)} aria-label="Export security report as JSON"
              className="btn-ghost flex items-center gap-1">
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        </div>

        {/* List of scanned bugs */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {mergedVulns.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No vulnerabilities found. Run a scan above.</p>
            </div>
          ) : mergedVulns.map((vul) => {
            const isSelected = selectedVulId === vul.id;
            const isCrit = vul.severity === 'Critical';
            const isHigh = vul.severity === 'High';

            return (
              <div
                key={vul.id}
                onClick={() => setSelectedVulId(vul.id)}
                className={`border rounded-xl p-3 cursor-pointer select-none transition-all ${
                  isSelected
                    ? 'bg-blue-50/40 border-blue-400 shadow-sm'
                    : 'bg-white/60 border-slate-200 hover:border-blue-200 hover:bg-blue-50/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-mono font-bold text-slate-400">{vul.id}</span>
                      <span className={`badge text-[8px] ${isCrit ? 'badge-red' : isHigh ? 'badge-amber' : 'badge-slate'}`}>
                        {vul.severity}
                      </span>
                      <span className="badge badge-slate text-[8px]">{vul.type}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">{vul.title}</h4>
                  </div>
                  <span className={`badge shrink-0 ${vul.status === 'Remediated' ? 'badge-green' : 'badge-red animate-pulse'}`}>
                    {vul.status === 'Remediated' ? 'Fixed' : 'Open'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compliance Tags summary */}
        <div className="metal-surface p-3.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Compliance Requirements Status</span>
            <button
              onClick={() => setShowCompliancePanel(true)}
              className="text-[9px] font-mono text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded hover:border-indigo-400 transition-all"
            >
              Export Reports →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            {[
              { label: 'PCI-DSS', id: 'PCI-DSS' },
              { label: 'SOC2 Typ-2', id: 'SOC2' },
              { label: 'GDPR Art-32', id: 'GDPR' },
              { label: 'HIPAA Rule', id: 'HIPAA' },
            ].map(({ label, id }) => {
              const cnt = mergedVulns.filter(v => v.complianceLabels?.includes(id) && v.status === 'Open').length;
              const ok = cnt === 0;
              return (
                <button
                  key={label}
                  onClick={() => { setSelectedComplianceStd(id); setShowCompliancePanel(true); }}
                  className="bg-white/70 p-2 rounded-lg flex items-center justify-between border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer"
                >
                  <span className="text-slate-500 font-mono text-[11px]">{label}:</span>
                  <span className={`font-bold text-[11px] ${ok ? 'text-green-700' : 'text-amber-600'}`}>
                    {ok ? '✅ Compliant' : `⚠️ ${cnt} open`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. DAST Logs Review & Code Remediation details */}
      <div className="lg:col-span-7 flex flex-col justify-between">
        {activeVul ? (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-full min-h-[460px] justify-between shadow-lg">
            <div>
              <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Selected Scan Log Review</span>
                  <h4 className="text-xs font-bold text-white mt-0.5">{activeVul.title}</h4>
                </div>
                {activeVul.status !== 'Remediated' && (
                  <button
                    onClick={() => onApplyRemediation(activeVul.id)}
                    disabled={isRemediating === activeVul.id}
                    className="btn-primary flex items-center gap-1.5"
                  >
                    {isRemediating === activeVul.id ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fixing...</>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5" /> Remediate with AI</>
                    )}
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4 text-slate-200">
                <div className="grid grid-cols-2 gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">Exposed By Analyzer Tool:</span>
                    <span className="text-slate-300 font-medium">{activeVul.toolExposedBy}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">System Vulnerability Class:</span>
                    <span className="text-slate-300 font-semibold">{activeVul.vulnerabilityClass}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-300 uppercase block font-mono flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-slate-400" /> Source parameter remediation fixes
                  </span>
                  <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 overflow-y-auto max-h-[220px]">
                    <pre><code>{activeVul.remediationCode}</code></pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance badges footer */}
            <div className="bg-slate-900 p-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Target compliance standards:</span>
              <div className="flex gap-1.5 flex-wrap">
                {(activeVul.complianceLabels || []).map(lbl => (
                  <button
                    key={lbl}
                    onClick={() => { setSelectedComplianceStd(lbl); setShowCompliancePanel(true); }}
                    className="bg-blue-900/40 border border-blue-700/50 text-blue-300 px-2.5 py-0.5 rounded text-[10px] font-bold hover:bg-blue-800/60 transition-all"
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[460px] glass-card flex flex-col items-center justify-center text-center p-8">
            <ShieldCheck className="w-12 h-12 text-slate-300 mb-2" />
            <span className="text-sm font-semibold text-slate-500">No vulnerabilities selected</span>
            <p className="text-xs text-slate-400 mt-1">Run a scan above to discover findings.</p>
          </div>
        )}
      </div>
    </div>

    {/* REQ-84: Accessibility (A11y) Scan Panel */}
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="panel-title flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            Accessibility (A11y) Scan <span className="chip ml-1">REQ-84 / WCAG 2.1</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Detect WCAG 2.1 violations: missing alt text, contrast, keyboard traps, ARIA labels.</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={a11yTarget} onChange={e => setA11yTarget(e.target.value)}
            className="input-glass w-56 font-mono" placeholder="https://..." />
          <button onClick={handleA11yScan} disabled={a11yScanning}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
            {a11yScanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning…</> : <><ShieldCheck className="w-3.5 h-3.5" /> Run A11y Scan</>}
          </button>
        </div>
      </div>
      {a11yError && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 font-mono">{a11yError}</div>}
      {a11yResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono badge badge-blue">
            <ShieldAlert className="w-3.5 h-3.5" />
            {a11yResults.length} WCAG violation{a11yResults.length !== 1 ? 's' : ''} found
          </div>
          {a11yResults.map((issue: any, i: number) => (
            <div key={i} className="metal-surface rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge text-[9px] ${issue.severity === 'Critical' ? 'badge-red' : 'badge-amber'}`}>{issue.severity}</span>
                <span className="text-[10px] font-mono text-slate-500">{issue.wcag}</span>
                <span className="text-xs font-semibold text-slate-800">{issue.rule}</span>
              </div>
              <p className="text-[11px] text-slate-600">{issue.description}</p>
              <code className="code-block text-[10px] block truncate">{issue.element}</code>
            </div>
          ))}
        </div>
      )}
      {!a11yResults.length && !a11yScanning && !a11yError && (
        <p className="text-xs text-slate-400 font-mono text-center py-3">Enter a URL above and run the A11y scan to detect WCAG 2.1 violations.</p>
      )}
    </div>

    {/* REQ-70: Dependency Vulnerability Scan Panel */}
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="panel-title flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Dependency Vulnerability Scan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Scan package.json dependencies for known CVE advisories.</p>
        </div>
        <button onClick={handleDepScan} disabled={depScanning}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50">
          {depScanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning...</> : <><Search className="w-3.5 h-3.5" /> Run Dep Scan</>}
        </button>
      </div>
      {depScanResults && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {(['critical','high','medium','low'] as const).map(sev => {
              const count = depScanResults.summary?.[sev] ?? 0;
              const cls: Record<string,string> = { critical:'badge-red', high:'badge-amber', medium:'badge-amber', low:'badge-slate' };
              return (
                <div key={sev} className="stat-card text-center">
                  <div className={`stat-value text-xl badge ${cls[sev]}`}>{count}</div>
                  <div className="stat-label uppercase">{sev}</div>
                </div>
              );
            })}
          </div>
          <div className="space-y-1.5">
            {depScanResults.vulnerabilities?.map((v: any) => (
              <div key={v.id} className="flex items-start justify-between metal-surface rounded-xl p-3 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold text-slate-700">{v.pkg}@{v.version}</span>
                    <span className={`badge text-[9px] ${v.severity === 'High' ? 'badge-amber' : v.severity === 'Medium' ? 'badge-amber' : 'badge-slate'}`}>{v.severity}</span>
                    <span className="text-[9px] font-mono text-slate-400">{v.cve}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{v.summary}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="badge badge-green text-[9px]">Fix: {v.fixVersion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!depScanResults && !depScanning && (
        <p className="text-xs text-slate-400 font-mono text-center py-4">Click "Run Dep Scan" to check dependencies for known CVEs.</p>
      )}
    </div>

    {/* NEXT STEP CTA */}
    {mergedVulns.length > 0 && (
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#eaf5fd',border:'1px solid #b0d9f5',borderRadius:10,padding:'12px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <CheckCircle style={{width:18,height:18,color:'#5B6CFF',flexShrink:0}} />
          <div>
            <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,color:'#0F172A'}}>
              {openVulns} open · {fixedVulns} remediated
            </span>
            <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:12,color:'#475569',marginLeft:8}}>
              Security findings are reported in the QA Dashboard.
            </span>
          </div>
        </div>
        <button
          onClick={onNavigateToDashboard}
          style={{background:'#5B6CFF',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}
        >
          QA Dashboard <ArrowRight style={{width:14,height:14}} />
        </button>
      </div>
    )}
    </div>
  );
}
