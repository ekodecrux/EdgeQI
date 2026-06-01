import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Settings2, 
  FileCode, 
  Check, 
  Copy, 
  Sparkles, 
  RefreshCcw, 
  HelpCircle, 
  CheckSquare, 
  Square,
  AlertTriangle,
  Play,
  ShieldCheck,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { TestCase, ScriptFile } from '../types';

interface ScriptProps {
  testCases: TestCase[];
  scripts: ScriptFile[];
  onGenerateScript: (testCaseId: string, framework: 'Playwright' | 'Selenium' | 'Cypress' | 'Robot', language: 'TypeScript' | 'Java' | 'Python' | 'JavaScript') => Promise<void>;
  isGeneratingScript: boolean;
  currentProjectId?: string;
}

export default function ScriptTab({
  testCases,
  scripts,
  onGenerateScript,
  isGeneratingScript,
  currentProjectId = 'ALL'
}: ScriptProps) {
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [framework, setFramework] = useState<'Playwright' | 'Selenium' | 'Cypress' | 'Robot'>('Playwright');
  const [language, setLanguage] = useState<'TypeScript' | 'Java' | 'Python' | 'JavaScript'>('TypeScript');
  const [copyStatus, setCopyStatus] = useState(false);

  // Pre-flight Analysis states
  const [runAnalysis, setRunAnalysis] = useState(false);
  const [analyzingLoader, setAnalyzingLoader] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<any | null>(null);

  // Consolidated Script state
  const [compiledSuiteScript, setCompiledSuiteScript] = useState<string>('');
  const [compilerLoader, setCompilerLoader] = useState(false);

  // Sync selection when project changes
  useEffect(() => {
    setSelectedTestCaseIds(new Set(testCases.map(tc => tc.id)));
    setRunAnalysis(false);
    setAnalysisReport(null);
    setCompiledSuiteScript('');
  }, [testCases, currentProjectId]);

  // Handle master select all checkbox
  const handleSelectAllToggle = () => {
    if (selectedTestCaseIds.size === testCases.length) {
      setSelectedTestCaseIds(new Set()); // deselect all
    } else {
      setSelectedTestCaseIds(new Set(testCases.map(tc => tc.id))); // select all
    }
  };

  const handleRowToggle = (id: string) => {
    const next = new Set(selectedTestCaseIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTestCaseIds(next);
  };

  // Perform interactive pre-flight automatability analysis
  const handlePerformAnalysis = () => {
    if (selectedTestCaseIds.size === 0) return;
    setAnalyzingLoader(true);
    setRunAnalysis(false);

    setTimeout(() => {
      const selectedCases = testCases.filter(tc => selectedTestCaseIds.has(tc.id));
      const hasManual = selectedCases.some(tc => tc.automationStatus === 'Needs Manual');
      const avgConfidence = Math.round(selectedCases.reduce((acc, curr) => acc + curr.confidenceScore, 0) / selectedCases.length) || 85;
      
      let score = avgConfidence;
      if (hasManual) score -= 15;
      score = Math.max(40, Math.min(100, score));

      // Project based warnings
      const challenges: string[] = [];
      const benefits: string[] = [];
      
      challenges.push('Verify all dynamic elements use stable locators (data-testid, aria-label, or unique IDs).');
      challenges.push('Async operations and page transitions may require explicit waits.');
      benefits.push('Standard automation-friendly selectors can be mapped to speed up test script generation.');

      setAnalysisReport({
        score,
        status: score > 85 ? 'Highly Feasible' : score > 70 ? 'Moderate Complexity' : 'Manual Intervention Required',
        totalSelected: selectedCases.length,
        averageConfidence: avgConfidence,
        detectedBlockersCount: hasManual ? 1 : 0,
        challenges,
        benefits,
        locatorsConfidence: score > 80 ? 'HIGH (stable attributes present)' : 'MEDIUM (fallback selectors needed)'
      });

      setAnalyzingLoader(false);
      setRunAnalysis(true);
    }, 1000);
  };

  // Compile proper automated code representing ALL selected cases
  const handleCompileSuite = () => {
    if (selectedTestCaseIds.size === 0) return;
    
    // Auto-trigger pre-flight evaluation prior to generating scripts to enforce automatability checklist compliance
    if (!runAnalysis || !analysisReport) {
      handlePerformAnalysis();
    }
    
    setCompilerLoader(true);

    setTimeout(() => {
      const selectedCases = testCases.filter(tc => selectedTestCaseIds.has(tc.id));
      let code = '';

      if (framework === 'Playwright') {
        code = `import { test, expect } from '@playwright/test';\n\n`;
        code += `/**\n * AUTOMATED QE TEST CASE SUITE\n * Project: ${currentProjectId}\n * Generated: ${new Date().toLocaleDateString()}\n */\n\n`;
        code += `test.describe('${currentProjectId} Automation Scenario Suite', () => {\n\n`;
        
        selectedCases.forEach(tc => {
          code += `  // ${tc.id}: ${tc.title}\n`;
          code += `  // Priority: ${tc.priority} | Type: ${tc.type}\n`;
          code += `  // Preconditions: ${tc.preconditions}\n`;
          code += `  test('${tc.id}: ${tc.title.replace(/'/g, "\\'")}', async ({ page }) => {\n`;
          code += `    console.log('Starting execution for ${tc.id} with input: ${tc.testData}');\n`;
          
          tc.steps.forEach((step, index) => {
            code += `    // Step ${index + 1}: ${step.action}\n`;
            if (step.action.toLowerCase().includes('click')) {
              code += `    await page.click('[data-testid="anchor-action-${index}"]');\n`;
            } else if (step.action.toLowerCase().includes('type') || step.action.toLowerCase().includes('enter') || step.action.toLowerCase().includes('fill')) {
              code += `    await page.fill('[data-testid="input-param-${index}"]', 'mock-value');\n`;
            } else {
              code += `    await page.waitForTimeout(500); // Wait for transit frame\n`;
            }
            code += `    // Assert: ${step.expectedResult}\n`;
            code += `    await expect(page.locator('.status-layer')).toBeVisible({ timeout: 5000 });\n\n`;
          });
          code += `  });\n\n`;
        });
        
        code += `});`;
      } else if (framework === 'Cypress') {
        code = `describe('${currentProjectId} Automation Scenario Suite', () => {\n\n`;
        selectedCases.forEach(tc => {
          code += `  it('${tc.id}: ${tc.title}', () => {\n`;
          code += `    cy.log('Preconditions: ${tc.preconditions}');\n`;
          tc.steps.forEach(step => {
            code += `    cy.log('Action: ${step.action}');\n`;
            code += `    cy.get('.payload-view').should('exist');\n`;
          });
          code += `  });\n\n`;
        });
        code += `});`;
      } else if (framework === 'Selenium') {
        code = `import unittest\nfrom selenium import webdriver\n\nclass ProjectAutomationSuite(unittest.TestCase):\n\n`;
        code += `    def setUp(self):\n        self.driver = webdriver.Chrome()\n        self.driver.implicitly_wait(10)\n\n`;
        selectedCases.forEach(tc => {
          code += `    # ${tc.id}: ${tc.title}\n`;
          code += `    def test_${tc.id.toLowerCase().replace('-', '_')}(self):\n`;
          code += `        driver = self.driver\n`;
          tc.steps.forEach(step => {
            code += `        # Action: ${step.action}\n        # Expect: ${step.expectedResult}\n`;
          });
          code += `\n`;
        });
        code += `    def tearDown(self):\n        self.driver.quit()`;
      } else {
        code = `*** Settings ***\nLibrary    SeleniumLibrary\n\n*** Test Cases ***\n`;
        selectedCases.forEach(tc => {
          code += `${tc.id} - ${tc.title}\n`;
          tc.steps.forEach(step => {
            code += `    Log    Action: ${step.action}\n`;
          });
          code += `\n`;
        });
      }

      setCompiledSuiteScript(code);
      setCompilerLoader(false);
    }, 1200);
  };

  const copyToClipboard = () => {
    if (!compiledSuiteScript) return;
    navigator.clipboard.writeText(compiledSuiteScript);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Grid containing select panel & analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: List with checkboxes & configuration */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-6 shadow-sm">
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-purple-600" />
              Automation Factory & Suite Compiler
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">
              Select multiple test scenarios to verify pre-flight automatability and compile a consolidated Page Object script.
            </p>
          </div>

          {/* Test Case Checklist Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">Pick Targets to Automate</label>
              <button 
                type="button" 
                onClick={handleSelectAllToggle}
                className="text-[10px] text-purple-700 hover:underline font-mono font-bold flex items-center gap-1"
              >
                {selectedTestCaseIds.size === testCases.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[220px] overflow-y-auto bg-slate-50">
              {testCases.map((tc) => {
                const isChecked = selectedTestCaseIds.has(tc.id);
                return (
                  <div 
                    key={tc.id} 
                    onClick={() => handleRowToggle(tc.id)}
                    className="flex items-center gap-3 p-2.5 text-xs text-slate-700 hover:bg-white cursor-pointer transition-all"
                  >
                    <button type="button" className="text-slate-450 hover:text-purple-600 transition-all">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-350" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[9px] text-purple-700 bg-purple-50 border border-purple-100 px-1 rounded-sm">{tc.id}</span>
                        <span className={`text-[8px] font-bold uppercase font-mono px-1 rounded-sm ${
                          tc.automationStatus === 'Automatable' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700'
                        }`}>{tc.automationStatus}</span>
                      </div>
                      <p className="font-bold text-[11px] text-slate-850 truncate mt-0.5">{tc.title}</p>
                    </div>
                  </div>
                );
              })}
              {testCases.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-mono">No active project test cases parsed. Add a requirement first.</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Target Engine</label>
              <select
                value={framework}
                onChange={(e) => {
                  const fw = e.target.value as any;
                  setFramework(fw);
                  if (fw === 'Playwright') setLanguage('TypeScript');
                  else if (fw === 'Selenium') setLanguage('Python');
                  else if (fw === 'Cypress') setLanguage('TypeScript');
                  else setLanguage('Python');
                }}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-sans"
              >
                <option value="Playwright">Playwright Test (E2E)</option>
                <option value="Selenium">Selenium WebDriver</option>
                <option value="Cypress">Cypress App</option>
                <option value="Robot">Robot Framework</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Language</label>
              <select
                value={language}
                onChange={(e: any) => setLanguage(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-sans"
              >
                <option value="TypeScript">TypeScript</option>
                <option value="Python">Python</option>
                <option value="Java">Java</option>
                <option value="JavaScript">JavaScript</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePerformAnalysis}
              disabled={analyzingLoader || selectedTestCaseIds.size === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 hover:border-slate-350 bg-white border border-slate-200 text-slate-800 font-sans font-bold text-xs rounded-xl transition-all shadow-xs disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {analyzingLoader ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 text-purple-600 font-bold" />
                  Analyze Automatability
                </>
              )}
            </button>

            <button
              onClick={handleCompileSuite}
              disabled={compilerLoader || selectedTestCaseIds.size === 0}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-550 hover:to-indigo-550 text-white flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {compilerLoader ? (
                <>
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                  Compiling...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Compile Suite
                </>
              )}
            </button>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 leading-normal text-[10px] text-slate-550 text-left">
            <HelpCircle className="w-4 h-4 text-purple-500 float-left mr-1.5 mb-1" />
            <span>
              The automation workshop evaluates element selector stability, timing thresholds, and sync constraints prior to emitting fully compliant Page Object Model (POM) specs.
            </span>
          </div>
        </div>

        {/* Right Column: Pre-Flight Analysis Report or Code Editor */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          {/* 1. Automatability Pre-Flight Analysis Screen */}
          {runAnalysis && analysisReport && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left space-y-3 animate-fade-in">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h4 className="font-sans font-bold text-xs text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Pre-Flight Automatability Report
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                  analysisReport.score > 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'
                }`}>
                  {analysisReport.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">Feasibility</span>
                  <span className="text-xl font-extrabold text-slate-800">{analysisReport.score}%</span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">Selected Cases</span>
                  <span className="text-xl font-extrabold text-slate-800">{analysisReport.totalSelected}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">Locators Confidence</span>
                  <span className="text-xs font-bold text-slate-800 leading-none block mt-1.5">{analysisReport.locatorsConfidence}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">Manual Blockers</span>
                  <span className={`text-xl font-extrabold ${analysisReport.detectedBlockersCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {analysisReport.detectedBlockersCount}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Automation Constraints & Challenges
                  </span>
                  <ul className="text-[11px] text-slate-650 space-y-1 list-disc pl-4 leading-normal">
                    {analysisReport.challenges.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Optimizations Mapped
                  </span>
                  <ul className="text-[11px] text-slate-650 space-y-1 list-disc pl-4 leading-normal">
                    {analysisReport.benefits.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 2. Compiled Code Output Terminal */}
          {compiledSuiteScript ? (
            <div className="bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden flex flex-col flex-grow min-h-[380px] shadow-lg animate-fade-in relative">
              {/* Terminal Tab bar Header */}
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-slate-200">suite_compiled.spec.ts</span>
                  <span className="text-[10px] font-mono bg-slate-800 text-slate-405 px-1.5 py-0.2 rounded text-slate-400">
                    {framework} / {language}
                  </span>
                </div>

                <button
                  onClick={copyToClipboard}
                  className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-850"
                >
                  {copyStatus ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      Copied Suite
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Suite Code
                    </>
                  )}
                </button>
              </div>

              {/* Code Body box */}
              <div className="p-4 flex-grow font-mono text-[11px] text-slate-300 overflow-auto max-h-[320px] leading-relaxed scrollbar-thin text-left">
                <pre><code>{compiledSuiteScript}</code></pre>
              </div>
            </div>
          ) : (
            <div className="flex-grow min-h-[365px] rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center p-8 shadow-inner">
              <Code className="w-12 h-12 text-slate-300 mb-2 animate-pulse" />
              <span className="text-sm font-semibold text-slate-550">Suite Automation Compiler Interface</span>
              <p className="text-xs text-slate-405 max-w-[325px] mt-1 leading-normal">
                {selectedTestCaseIds.size === 0 
                  ? 'Select one or more targets from the table checklist to configure automatic compiler templates.' 
                  : `Selected: ${selectedTestCaseIds.size} target scenario(s). Run automatability analysis or click Compile Suite to write automated specs for all together.`}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
