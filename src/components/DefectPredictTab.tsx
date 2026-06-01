import React, { useState } from 'react';
import { 
  Eye, 
  AlertTriangle, 
  Crosshair, 
  Sparkles, 
  TrendingUp, 
  HelpCircle, 
  GitCommit, 
  Play, 
  Upload, 
  FileText, 
  Settings, 
  Download, 
  Cpu, 
  CheckCircle,
  Code,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { DefectHotspot, ImpactReport } from '../types';

interface DefectPredictProps {
  defects: DefectHotspot[];
  impactReports: ImpactReport[];
  onPredictHotspots: (title: string, description: string) => Promise<void>;
  onAnalyzeImpact: (changeTrigger: string, description: string) => Promise<void>;
  isAnalyzing: boolean;
}

export default function DefectPredictTab({
  defects,
  impactReports,
  onPredictHotspots,
  onAnalyzeImpact,
  isAnalyzing,
}: DefectPredictProps) {
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');
  const [changeTrigger, setChangeTrigger] = useState('');
  const [changeDesc, setChangeDesc] = useState('');

  // Drag and drop / file upload states
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileSource, setSelectedFileSource] = useState<'CSV' | 'Zephyr' | 'Eclipse Log' | 'JUnit XML'>('CSV');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; status: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [regressionRecommendation, setRegressionRecommendation] = useState<{
    riskLevel: string;
    targetModules: string[];
    riskPercent: number;
    testCasesToRun: string[];
    eclipseRunConfig: string;
    intelligenceLog: string[];
    rootCauses?: string[];
    recommendations?: string;
  } | null>(null);

  const [activeReportIndex, setActiveReportIndex] = useState<number | null>(0);
  const [showConfigSnippet, setShowConfigSnippet] = useState(false);

  const handlePredictSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    await onPredictHotspots(moduleTitle, moduleDesc);
    setModuleTitle('');
    setModuleDesc('');
  };

  const handleImpactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTrigger.trim()) return;
    await onAnalyzeImpact(changeTrigger, changeDesc);
    setChangeTrigger('');
    setChangeDesc('');
    setActiveReportIndex(0); // View the newly generated one
  };

  // Drag and Drop simulated behavior
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) uploadDefectDump(e.dataTransfer.files[0]);
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) uploadDefectDump(e.target.files[0]);
  };

  const uploadDefectDump = async (file: File) => {
    setIsUploading(true);
    setUploadedFiles([{ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, status: 'AI Analyzing...' }]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceType', selectedFileSource);
      const resp = await fetch('/api/quality/defects/upload-dump', { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.success && data.analysis) {
        const a = data.analysis;
        const xmlConfig = `<?xml version="1.0" encoding="UTF-8"?>
<suite name="AI-Recommended Regression Suite" verbose="1">
    <parameter name="source-file" value="${file.name}"/>
    <test name="High-Risk Regression Targets">
        <classes>
            <class name="com.platform.regression.AISelectedTests">
                <methods>
                    ${(a.regressionTargets || []).map((tc: string) => `<include name="verify_${tc.toLowerCase().replace('-','_')}"/>`).join('\n                    ')}
                </methods>
            </class>
        </classes>
    </test>
</suite>`;
        setRegressionRecommendation({
          riskLevel: a.riskLevel,
          targetModules: a.impactedModules || [],
          riskPercent: a.riskPercent,
          testCasesToRun: a.regressionTargets || [],
          eclipseRunConfig: xmlConfig,
          intelligenceLog: a.intelligenceLogs || [],
          rootCauses: a.rootCauses || [],
          recommendations: a.recommendations
        });
        setUploadedFiles([{ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, status: 'AI Analysis Complete ✓' }]);
      }
    } catch {
      setUploadedFiles([{ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, status: 'Error — retry' }]);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerSampleUpload = () => {
    const sampleCsv = `Test ID,Module,Status,Error\nTC-001,Authentication,FAIL,Timeout on login\nTC-002,Billing,FAIL,Null pointer in charge\nTC-005,API Gateway,PASS,\nTC-008,File Upload,FAIL,413 payload too large\n`;
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    uploadDefectDump(new File([blob], `regression_dump_${selectedFileSource.toLowerCase().replace(' ','_')}.csv`, { type: 'text/csv' }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* LEFT: Heatmap & Predictions Form */}
      <div className="xl:col-span-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-rose-600" />
              AI Defect Hotspot Heatmap
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualize module risk scores compiled from historical defect patterns and time-based developer trends.
            </p>
          </div>

          {/* Graphical Risk Grid / Heatmap representation */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-xl">
            {defects.map((defect, idx) => {
              const isHigh = defect.predictedRiskScore > 75;
              const isMed = defect.predictedRiskScore > 50 && defect.predictedRiskScore <= 75;

              return (
                <div
                  key={idx}
                  className={`relative p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-default flex flex-col justify-between h-28 ${
                    isHigh 
                      ? 'bg-rose-50 border-rose-300 shadow-sm shadow-rose-200/50' 
                      : isMed 
                        ? 'bg-amber-50/70 border-amber-300' 
                        : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        H-{idx + 10}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${
                        isHigh ? 'text-rose-600' : isMed ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {defect.predictedRiskScore}%
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">{defect.moduleName}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 italic leading-relaxed">{defect.recommendation}</p>
                  </div>

                  <div className="flex justify-between text-[8px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                    <span>Defects: {defect.historicalDefectsCount}</span>
                    <span className="truncate max-w-[65px]">{defect.commonFailureType.split(',')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom predictive entry form */}
          <form onSubmit={handlePredictSubmit} className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-1">Forecast New Module Risk</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Module e.g. JWT Token Vault"
                value={moduleTitle}
                onChange={(e) => setModuleTitle(e.target.value)}
                className="bg-white border border-slate-202 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-400 shadow-xs"
              />
              <input
                type="text"
                placeholder="Features/Files touched"
                value={moduleDesc}
                onChange={(e) => setModuleDesc(e.target.value)}
                className="bg-white border border-slate-202 rounded-lg p-2 text-xs text-slate-803 focus:outline-none focus:ring-1 focus:ring-purple-400 shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded-lg text-[11px] font-mono font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-xs text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-200" /> Model Predicted Defect Index
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT: Code Change Impact Tracer & REGRESSION INTEGRATION */}
      <div className="xl:col-span-6 space-y-6">
        {/* Regression suite ingestion */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-650" />
              Regression Suite Dump & IDE Integrations
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Upload existing automated regression reports, JIRA defect sheets, CSV/Excel dumps, or sync direct Eclipse compiler workspace deltas to evaluate what to test.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-450 mb-1">Select Report Framework Source</label>
              <select
                value={selectedFileSource}
                onChange={(e) => setSelectedFileSource(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 font-sans cursor-pointer"
              >
                <option value="CSV">IntelliJ Regression suite CSV dump</option>
                <option value="Zephyr">JIRA/Zephyr suite exports (Excel/CSV)</option>
                <option value="Eclipse Log">Direct Eclipse compilation file warnings link</option>
                <option value="JUnit XML">Standalone JUnit execution logs XML/JSON</option>
              </select>
            </div>
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={triggerSampleUpload}
                disabled={isUploading}
                className="w-full py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-mono font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Analyzing...</> : 'Try Sample Dump'}
              </button>
            </div>
          </div>

          {/* Drag & drop UI block */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-50/50' 
                : 'border-slate-300 bg-slate-50 hover:bg-slate-100/40'
            }`}
          >
            <input
              type="file"
              id="regressionFile"
              onChange={handleManualFileChange}
              className="hidden"
              accept=".csv,.xlsx,.xls,.json,.xml"
            />
            <label htmlFor="regressionFile" className="cursor-pointer flex flex-col items-center space-y-2">
              <FileText className="w-8 h-8 text-indigo-455 animate-bounce-slow" />
              <div className="text-xs text-slate-700">
                <span className="text-indigo-650 font-bold hover:underline">Drag & drop your regression sheet here</span> or browse local system files
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">Supports CSV, Excel spreadsheets, Eclipse output XML</p>
            </label>
          </div>

          {/* Ingested output summary recommendations */}
          {regressionRecommendation && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-mono font-bold text-slate-700">Automated Impact Overlay Results</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-extrabold border ${
                  regressionRecommendation.riskLevel === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-705 border border-amber-200'
                }`}>
                  Risk Alert: {regressionRecommendation.riskPercent}% ({regressionRecommendation.riskLevel})
                </span>
              </div>

              {/* Recommendation parameters */}
              <div className="space-y-3">
                <div className="text-xs">
                  <span className="text-[10px] font-mono text-slate-450 uppercase block font-semibold mb-1">Impacted Modules Highly At Risk:</span>
                  <div className="flex flex-wrap gap-1">
                    {regressionRecommendation.targetModules.map(m => (
                      <span key={m} className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specific test target highlights */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-rose-600 uppercase font-extrabold block">
                      Recommended Suite Targets to Rerun:
                    </span>
                    <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded font-bold border border-indigo-200">
                      Auto-Aligned
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {regressionRecommendation.testCasesToRun.map(tcId => (
                      <span key={tcId} className="bg-rose-50 border border-rose-200 text-rose-705 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-xs">
                        {tcId} Test Target
                      </span>
                    ))}
                  </div>
                </div>

                {/* Root causes */}
                {regressionRecommendation.rootCauses && regressionRecommendation.rootCauses.length > 0 && (
                  <div className="text-xs">
                    <span className="text-[10px] font-mono text-slate-450 uppercase block font-semibold mb-1">Root Causes Identified:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {regressionRecommendation.rootCauses.map((rc, i) => (
                        <li key={i} className="text-[10px] text-slate-700">{rc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Recommendations */}
                {regressionRecommendation.recommendations && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded p-2.5 text-[10px] text-indigo-800">
                    <span className="font-bold block mb-1">AI Recommendation:</span>
                    {regressionRecommendation.recommendations}
                  </div>
                )}

                {/* Inline Parser Logger logs */}
                <div className="bg-slate-900 rounded p-2.5 font-mono text-[9px] text-emerald-400 space-y-1 max-h-24 overflow-y-auto">
                  {regressionRecommendation.intelligenceLog.map((log, idx) => (
                    <p key={idx}>{log}</p>
                  ))}
                </div>

                {/* Code snippets and configuration downloads */}
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigSnippet(!showConfigSnippet)}
                    className="px-2.5 py-1 text-[10px] font-mono bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded flex items-center gap-1.5"
                  >
                    <Code className="w-3.5 h-3.5" />
                    {showConfigSnippet ? 'Hide Config' : 'View XML Suite Config'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([regressionRecommendation.eclipseRunConfig], { type: 'application/xml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'regression-suite.xml';
                      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                    }}
                    className="px-2.5 py-1 text-[10px] font-mono bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center gap-1.5 font-bold shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export XML Config
                  </button>
                </div>

                {showConfigSnippet && (
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 text-slate-300 font-mono text-[10px] overflow-auto">
                    <pre><code>{regressionRecommendation.eclipseRunConfig}</code></pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Existing impact overlay tracing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-indigo-650" />
              Git Source Code Commit Change Impact Analyzer
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Trace dependency overlap of manual developer code deltas, evaluate risk scores, and dynamically select your regression test suites.
            </p>
          </div>

          <form onSubmit={handleImpactSubmit} className="space-y-3 bg-slate-55 border border-slate-202 p-4 rounded-xl bg-slate-50">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-650 font-bold block">
              Inject Code Modification Trigger
            </span>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Update Trigger e.g. Refactor db connection string on line 42"
                value={changeTrigger}
                onChange={(e) => setChangeTrigger(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 shadow-xs"
              />
              <textarea
                placeholder="Description of variables / functions adjusted..."
                value={changeDesc}
                onChange={(e) => setChangeDesc(e.target.value)}
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400 shadow-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className={`w-full py-2 rounded-lg text-xs font-mono font-bold transition-all shadow-xs ${
                isAnalyzing
                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                  : 'bg-indigo-650 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Tracing Dependency Overlays...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Run Impact Analysis
                </>
              )}
            </button>
          </form>

          {/* Render Impact reports stack */}
          {impactReports.length > 0 ? (
            <div className="space-y-4">
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Graphed Overlap Outcomes</span>
              <div className="space-y-2">
                {impactReports.map((rep, idx) => {
                  const isActive = activeReportIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveReportIndex(idx)}
                      className={`border rounded-xl p-3 cursor-pointer transition-all ${
                        isActive 
                          ? 'bg-indigo-50 border-indigo-450' 
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[280px]">{rep.changeTrigger}</span>
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border ${
                          rep.riskScore > 75 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          Risk: {rep.riskScore}%
                        </span>
                      </div>

                      {isActive && (
                        <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-3">
                          <div className="flex justify-between text-[11px] font-mono text-slate-500">
                            <span>Main Impacted Domain:</span>
                            <span className="text-indigo-600 font-bold">{rep.impactedModule}</span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">
                              Selected Optimal Regression Sweep ({rep.impactedTestCaseIds.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {rep.impactedTestCaseIds.map(tcId => (
                                <span key={tcId} className="bg-indigo-50 border border-indigo-200 text-indigo-755 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                                  {tcId}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1 bg-slate-100 p-2.5 rounded border border-slate-200 shadow-inner">
                            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono">Traceability Map Block</span>
                            {Object.entries(rep.traceabilityMatrix).map(([domain, suite]) => (
                              <div key={domain} className="flex justify-between text-[11px] mt-1 font-mono">
                                <span className="text-slate-500">{domain}:</span>
                                <span className="text-slate-700 font-bold">{suite.join(', ')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              No change triggers scanned yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
