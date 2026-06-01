import { useState } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, RefreshCw, FileCode, CheckCircle2, Search, Globe, Code, X, Zap, Download, Package } from 'lucide-react';

// REQ-83: Security report export
async function exportSecurityReport(format: 'csv' | 'json') {
  const res = await fetch(`/api/quality/security/export?format=${format}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `security-report.${format}`; a.click();
  URL.revokeObjectURL(url);
}
import { SecurityVulnerability } from '../types';

interface SecurityProps {
  vulnerabilities: SecurityVulnerability[];
  onApplyRemediation: (vulnerabilityId: string) => Promise<void>;
  isRemediating: string | null;
}

export default function SecurityTab({
  vulnerabilities,
  onApplyRemediation,
  isRemediating,
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

  // REQ-70: Dependency vulnerability scan state
  const [depScanResults, setDepScanResults] = useState<any>(null);
  const [depScanning, setDepScanning] = useState(false);

  const handleDepScan = async () => {
    setDepScanning(true);
    try {
      const token = localStorage.getItem('iqstudio_token');
      const res = await fetch('/api/quality/security/dependency-scan', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setDepScanResults(data);
    } catch { /* silent */ } finally { setDepScanning(false); }
  };

  // Local vulnerabilities list — merges prop list + newly scanned ones
  const [localVulns, setLocalVulns] = useState<SecurityVulnerability[]>(vulnerabilities);

  // Sync when parent pushes updates
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

      const res = await fetch('/api/quality/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="space-y-6">

      {/* Scan Input Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-sans font-semibold text-base text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-rose-600" />
              New Security Scan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Run AI-powered SAST / DAST / SCA / Container scans against a live URL or code snippet.</p>
          </div>
          {lastScanCount !== null && (
            <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full whitespace-nowrap">
              ✔ {lastScanCount} findings discovered
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scan Type selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Scan Method</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {(['SAST', 'DAST', 'SCA', 'Container'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setScanType(t)}
                  className={`py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                    scanType === t ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
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
            <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setScanMode('url')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  scanMode === 'url' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3 h-3" /> URL Target
              </button>
              <button
                onClick={() => setScanMode('code')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  scanMode === 'code' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
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
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold shadow-sm transition-all ${
                isScanning
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white'
              }`}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning Target...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Launch {scanType} Scan
                </>
              )}
            </button>
          </div>
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
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-400 font-mono shadow-xs"
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
              className="w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>
        )}

        {/* Error banner */}
        {scanError && (
          <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{scanError}</span>
            <button onClick={() => setScanError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main 2-column vulnerability review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 1. Vulnerability logs list */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-sans font-semibold text-base text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Scanned Vulnerability Log
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {mergedVulns.length} finding{mergedVulns.length !== 1 ? 's' : ''} across SAST / DAST / SCA / Container scans.
              </p>
            </div>
            {/* REQ-83: Export buttons */}
            <div className="flex gap-1 flex-shrink-0 ml-2">
              <button onClick={() => exportSecurityReport('csv')} aria-label="Export security report as CSV"
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-rose-200 text-rose-700 hover:bg-rose-50">
                <Download className="w-3 h-3" /> CSV
              </button>
              <button onClick={() => exportSecurityReport('json')} aria-label="Export security report as JSON"
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border border-rose-200 text-rose-700 hover:bg-rose-50">
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
                      ? 'bg-slate-50 border-rose-600 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono font-bold text-slate-400">{vul.id}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          isCrit ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          isHigh ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {vul.severity}
                        </span>
                        <span className="text-[8px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {vul.type}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">{vul.title}</h4>
                    </div>

                    <span className={`text-[9.5px] text-right font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      vul.status === 'Remediated'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                    }`}>
                      {vul.status === 'Remediated' ? 'Fixed' : 'Open'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compliance Tags summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-550 font-bold block">Compliance Requirements Status</span>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
              {[
                { label: 'PCI-DSS', status: mergedVulns.filter(v => v.complianceLabels?.includes('PCI-DSS') && v.status === 'Open').length === 0 ? '✅ Compliant' : '⚠️ Review', ok: mergedVulns.filter(v => v.complianceLabels?.includes('PCI-DSS') && v.status === 'Open').length === 0 },
                { label: 'SOC2 Typ-2', status: mergedVulns.filter(v => v.complianceLabels?.includes('SOC2') && v.status === 'Open').length === 0 ? '✅ Compliant' : '⚠️ Review', ok: mergedVulns.filter(v => v.complianceLabels?.includes('SOC2') && v.status === 'Open').length === 0 },
                { label: 'GDPR Art-32', status: mergedVulns.filter(v => v.complianceLabels?.includes('GDPR') && v.status === 'Open').length === 0 ? '✅ Compliant' : '⚠️ Review', ok: mergedVulns.filter(v => v.complianceLabels?.includes('GDPR') && v.status === 'Open').length === 0 },
                { label: 'HIPAA Rule', status: mergedVulns.filter(v => v.complianceLabels?.includes('HIPAA') && v.status === 'Open').length === 0 ? '✅ Compliant' : '⚠️ Audit block', ok: mergedVulns.filter(v => v.complianceLabels?.includes('HIPAA') && v.status === 'Open').length === 0 },
              ].map(({ label, status, ok }) => (
                <div key={label} className="bg-white p-2 rounded-lg flex items-center justify-between border border-slate-200">
                  <span className="text-slate-500 font-mono text-[11px]">{label}:</span>
                  <span className={`font-bold text-[11px] ${ok ? 'text-emerald-700' : 'text-amber-600'}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. DAST Logs Review & Code Remediation details */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {activeVul ? (
            <div className="bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden flex flex-col h-full min-h-[460px] justify-between shadow-lg">
              {/* Review Title */}
              <div>
                <div className="bg-slate-900 px-5 py-3 border-b border-slate-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Selected Scan Log Review</span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{activeVul.title}</h4>
                  </div>

                  {activeVul.status !== 'Remediated' && (
                    <button
                      onClick={() => onApplyRemediation(activeVul.id)}
                      disabled={isRemediating === activeVul.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-sm shadow-rose-900/20 transition-all flex items-center gap-1.5"
                    >
                      {isRemediating === activeVul.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fixing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Remediate with AI
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Explaining information block */}
                <div className="p-5 space-y-4 text-slate-200">
                  <div className="grid grid-cols-2 gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs text-sans">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">Exposed By Analyzer Tool:</span>
                      <span className="text-slate-300 font-medium">{activeVul.toolExposedBy}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">System Vulnerability Class:</span>
                      <span className="text-slate-300 font-semibold">{activeVul.vulnerabilityClass}</span>
                    </div>
                  </div>

                  {/* Specific code block code fixed */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-300 uppercase block font-mono flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5 text-slate-400" /> Source parameter remediation fixes
                    </span>

                    <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl font-mono text-xs text-slate-200 overflow-y-auto max-h-[220px]">
                      <pre><code>{activeVul.remediationCode}</code></pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance badges footer labels */}
              <div className="bg-slate-900 p-4 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Target compliance standards:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {(activeVul.complianceLabels || []).map(lbl => (
                    <span key={lbl} className="bg-slate-850 border border-slate-800 text-indigo-400 px-2.5 py-0.5 rounded text-[10px] font-bold">
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[460px] rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center text-center p-8 shadow-sm">
              <ShieldCheck className="w-12 h-12 text-slate-300 mb-2" />
              <span className="text-sm font-semibold text-slate-500">No vulnerabilities selected</span>
              <p className="text-xs text-slate-400 mt-1">Run a scan above to discover findings.</p>
            </div>
          )}
        </div>
      </div>
      {/* REQ-70: Dependency Vulnerability Scan Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans font-semibold text-base text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              Dependency Vulnerability Scan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Scan package.json dependencies for known CVE advisories.</p>
          </div>
          <button onClick={handleDepScan} disabled={depScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
            {depScanning ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning...</> : <><Search className="w-3.5 h-3.5" /> Run Dep Scan</>}
          </button>
        </div>
        {depScanResults && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {(['critical','high','medium','low'] as const).map(sev => {
                const count = depScanResults.summary?.[sev] ?? 0;
                const colors: Record<string,string> = { critical:'bg-rose-100 text-rose-700 border-rose-200', high:'bg-orange-50 text-orange-700 border-orange-200', medium:'bg-amber-50 text-amber-700 border-amber-200', low:'bg-slate-50 text-slate-600 border-slate-200' };
                return (
                  <div key={sev} className={`border rounded-xl p-2 text-center ${colors[sev]}`}>
                    <div className="text-lg font-bold">{count}</div>
                    <div className="text-[9px] font-mono uppercase">{sev}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-1.5">
              {depScanResults.vulnerabilities?.map((v: any) => (
                <div key={v.id} className="flex items-start justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-700">{v.pkg}@{v.version}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${v.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' : v.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{v.severity}</span>
                      <span className="text-[9px] font-mono text-slate-400">{v.cve}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{v.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Fix: {v.fixVersion}</span>
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
    </div>
  );
}
