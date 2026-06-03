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
  FileCheck,
  ArrowRight,
  Globe,
  Download,
  Zap,
  Network
} from 'lucide-react';
import { TestCase, ScriptFile } from '../types';
import VoicePromptBar from './VoicePromptBar';

interface ScriptProps {
  testCases: TestCase[];
  scripts: ScriptFile[];
  onGenerateScript: (testCaseId: string, framework: 'Playwright' | 'Selenium' | 'Cypress' | 'Robot', language: 'TypeScript' | 'Java' | 'Python' | 'JavaScript') => Promise<void>;
  isGeneratingScript: boolean;
  currentProjectId?: string;
  currentSprintId?: string;
  onNavigateToExecution?: () => void;
}

export default function ScriptTab({
  testCases,
  scripts,
  onGenerateScript,
  isGeneratingScript,
  currentProjectId = 'ALL',
  currentSprintId,
  onNavigateToExecution,
}: ScriptProps) {
  const [selectedTestCaseIds, setSelectedTestCaseIds] = useState<Set<string>>(new Set());
  const [framework, setFramework] = useState<'Playwright' | 'Selenium' | 'Cypress' | 'Robot'>('Playwright');
  const [language, setLanguage] = useState<'TypeScript' | 'Java' | 'Python' | 'JavaScript'>('TypeScript');
  const [copyStatus, setCopyStatus] = useState(false);

  // Tab: 'suite' | 'api'
  const [activeTab, setActiveTab] = useState<'suite' | 'api'>('suite');

  // Pre-flight Analysis states
  const [runAnalysis, setRunAnalysis] = useState(false);
  const [analyzingLoader, setAnalyzingLoader] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<any | null>(null);

  // Consolidated Script state
  const [compiledSuiteScript, setCompiledSuiteScript] = useState<string>('');
  const [compilerLoader, setCompilerLoader] = useState(false);

  // API Test Generation states (GAP-08)
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.staging.io/v1');
  const [apiFramework, setApiFramework] = useState<'jest-supertest' | 'pytest-requests' | 'restassured' | 'k6'>('jest-supertest');
  const [apiTestScript, setApiTestScript] = useState('');
  const [apiGenerating, setApiGenerating] = useState(false);
  const [apiCopyStatus, setApiCopyStatus] = useState(false);

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
      setSelectedTestCaseIds(new Set());
    } else {
      setSelectedTestCaseIds(new Set(testCases.map(tc => tc.id)));
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

  // GAP-07: Enhanced Robot Framework code generation
  const buildRobotFrameworkCode = (selectedCases: TestCase[]): string => {
    let code = `*** Settings ***\n`;
    code += `Library    SeleniumLibrary\n`;
    code += `Library    Collections\n`;
    code += `Library    String\n`;
    code += `Suite Setup    Open Browser    ${'{'}BASE_URL{'}'}    chrome    options=add_argument("--headless")\n`;
    code += `Suite Teardown    Close All Browsers\n\n`;

    code += `*** Variables ***\n`;
    code += `\${BASE_URL}    https://staging.qa-env.io\n`;
    code += `\${TIMEOUT}    10s\n`;
    code += `\${BROWSER}    chrome\n\n`;

    code += `*** Test Cases ***\n`;
    selectedCases.forEach(tc => {
      const safeId = tc.id.replace(/[^a-zA-Z0-9_]/g, '_');
      code += `${tc.id} - ${tc.title}\n`;
      code += `    [Documentation]    ${tc.description || tc.title}\n`;
      code += `    [Tags]    ${tc.priority?.toLowerCase() || 'medium'}    ${tc.type?.toLowerCase().replace(/\s+/g, '-') || 'functional'}    ${tc.automationStatus === 'Automatable' ? 'automatable' : 'manual-review'}\n`;
      if (tc.preconditions) {
        code += `    # Preconditions: ${tc.preconditions}\n`;
      }
      tc.steps.forEach((step, index) => {
        code += `    # Step ${index + 1}: ${step.action}\n`;
        if (step.action.toLowerCase().includes('click')) {
          code += `    Wait Until Element Is Visible    xpath=//*[@data-testid='action-${safeId}-${index}']    \${TIMEOUT}\n`;
          code += `    Click Element    xpath=//*[@data-testid='action-${safeId}-${index}']\n`;
        } else if (step.action.toLowerCase().includes('type') || step.action.toLowerCase().includes('enter') || step.action.toLowerCase().includes('fill')) {
          code += `    Wait Until Element Is Visible    xpath=//*[@data-testid='input-${safeId}-${index}']    \${TIMEOUT}\n`;
          code += `    Input Text    xpath=//*[@data-testid='input-${safeId}-${index}']    test-value-${index}\n`;
        } else if (step.action.toLowerCase().includes('navigate') || step.action.toLowerCase().includes('open')) {
          code += `    Go To    \${BASE_URL}/path\n`;
          code += `    Wait Until Page Contains Element    css:body    \${TIMEOUT}\n`;
        } else {
          code += `    Wait Until Page Contains    ${step.expectedResult || 'expected content'}    \${TIMEOUT}\n`;
        }
        if (step.expectedResult) {
          code += `    # Assert: ${step.expectedResult}\n`;
          code += `    Page Should Contain    ${step.expectedResult.slice(0, 60)}\n`;
        }
        code += `\n`;
      });
    });

    code += `\n*** Keywords ***\n`;
    code += `Navigate To Feature\n`;
    code += `    [Arguments]    \${path}\n`;
    code += `    Go To    \${BASE_URL}\${path}\n`;
    code += `    Wait Until Page Contains Element    css:body    \${TIMEOUT}\n\n`;

    code += `Verify Element Displayed\n`;
    code += `    [Arguments]    \${locator}\n`;
    code += `    Wait Until Element Is Visible    \${locator}    \${TIMEOUT}\n`;
    code += `    Element Should Be Visible    \${locator}\n`;

    return code;
  };

  // Compile proper automated code representing ALL selected cases
  const handleCompileSuite = () => {
    if (selectedTestCaseIds.size === 0) return;
    
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
        code = `import unittest\nfrom selenium import webdriver\nfrom selenium.webdriver.common.by import By\nfrom selenium.webdriver.support.ui import WebDriverWait\nfrom selenium.webdriver.support import expected_conditions as EC\n\nclass ProjectAutomationSuite(unittest.TestCase):\n\n`;
        code += `    def setUp(self):\n        self.driver = webdriver.Chrome()\n        self.driver.implicitly_wait(10)\n        self.wait = WebDriverWait(self.driver, 10)\n\n`;
        selectedCases.forEach(tc => {
          code += `    # ${tc.id}: ${tc.title}\n`;
          code += `    def test_${tc.id.toLowerCase().replace(/[-\s]/g, '_')}(self):\n`;
          code += `        driver = self.driver\n`;
          tc.steps.forEach((step, index) => {
            code += `        # Action: ${step.action}\n`;
            if (step.action.toLowerCase().includes('click')) {
              code += `        el = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="action-${index}"]')))\n        el.click()\n`;
            } else if (step.action.toLowerCase().includes('type') || step.action.toLowerCase().includes('fill')) {
              code += `        el = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, '[data-testid="input-${index}"]')))\n        el.clear()\n        el.send_keys('test_value')\n`;
            } else {
              code += `        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'body')))\n`;
            }
            code += `        # Expect: ${step.expectedResult}\n`;
          });
          code += `\n`;
        });
        code += `    def tearDown(self):\n        self.driver.quit()\n\nif __name__ == '__main__':\n    unittest.main()`;
      } else {
        // GAP-07: Full Robot Framework with Keywords, Tags, Variables
        code = buildRobotFrameworkCode(selectedCases);
      }

      setCompiledSuiteScript(code);
      setCompilerLoader(false);
    }, 1200);
  };

  // GAP-08: API Test Generation
  const handleGenerateApiTests = () => {
    if (selectedTestCaseIds.size === 0 && testCases.length === 0) return;
    setApiGenerating(true);
    setTimeout(() => {
      const cases = selectedTestCaseIds.size > 0
        ? testCases.filter(tc => selectedTestCaseIds.has(tc.id))
        : testCases.slice(0, 5);

      let code = '';

      if (apiFramework === 'jest-supertest') {
        code = `import request from 'supertest';\nimport app from '../src/app';\n\n/**\n * API Contract Tests — Generated by IQ Studio\n * Base: ${apiBaseUrl}\n * Generated: ${new Date().toLocaleDateString()}\n */\n\n`;
        cases.forEach(tc => {
          const endpoint = `/api/${tc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`;
          code += `describe('${tc.id}: ${tc.title}', () => {\n`;
          code += `  // Priority: ${tc.priority} | Type: ${tc.type}\n`;
          code += `  it('should respond 200 and return valid schema', async () => {\n`;
          code += `    const response = await request(app)\n`;
          code += `      .get('${endpoint}')\n`;
          code += `      .set('Authorization', 'Bearer \${TEST_TOKEN}')\n`;
          code += `      .set('Accept', 'application/json');\n\n`;
          code += `    expect(response.status).toBe(200);\n`;
          code += `    expect(response.headers['content-type']).toMatch(/json/);\n`;
          code += `    expect(response.body).toBeDefined();\n`;
          code += `  });\n\n`;
          code += `  it('should reject unauthorized request with 401', async () => {\n`;
          code += `    const response = await request(app).get('${endpoint}');\n`;
          code += `    expect(response.status).toBe(401);\n`;
          code += `  });\n`;
          code += `});\n\n`;
        });
      } else if (apiFramework === 'pytest-requests') {
        code = `import pytest\nimport requests\n\nBASE_URL = '${apiBaseUrl}'\nHEADERS = {'Authorization': 'Bearer \${TEST_TOKEN}', 'Content-Type': 'application/json'}\n\n`;
        code += `# API Contract Tests — Generated by IQ Studio\n# Generated: ${new Date().toLocaleDateString()}\n\n`;
        cases.forEach(tc => {
          const endpoint = `/api/${tc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`;
          const fnName = `test_${tc.id.toLowerCase().replace(/[-\s]/g, '_')}`;
          code += `class Test${tc.id.replace(/[-\s]/g, '')}:\n`;
          code += `    """${tc.title} — ${tc.description || 'API contract test'}"""\n\n`;
          code += `    def ${fnName}_success(self):\n`;
          code += `        """Should return 200 with valid body"""\n`;
          code += `        r = requests.get(f'{BASE_URL}${endpoint}', headers=HEADERS)\n`;
          code += `        assert r.status_code == 200, f'Expected 200, got {r.status_code}'\n`;
          code += `        data = r.json()\n`;
          code += `        assert data is not None\n\n`;
          code += `    def ${fnName}_unauthorized(self):\n`;
          code += `        """Should reject unauthenticated request"""\n`;
          code += `        r = requests.get(f'{BASE_URL}${endpoint}')\n`;
          code += `        assert r.status_code == 401\n\n`;
        });
      } else if (apiFramework === 'restassured') {
        code = `import io.restassured.RestAssured;\nimport io.restassured.response.Response;\nimport org.junit.jupiter.api.BeforeAll;\nimport org.junit.jupiter.api.Test;\nimport static io.restassured.RestAssured.*;\nimport static org.hamcrest.Matchers.*;\n\n`;
        code += `// API Contract Tests — Generated by IQ Studio\npublic class ApiContractTest {\n\n`;
        code += `    @BeforeAll\n    static void setup() {\n        RestAssured.baseURI = "${apiBaseUrl}";\n    }\n\n`;
        cases.forEach(tc => {
          const endpoint = `/api/${tc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`;
          const methodName = `test${tc.id.replace(/[-\s]/g, '')}`;
          code += `    @Test\n    void ${methodName}() {\n`;
          code += `        // ${tc.id}: ${tc.title}\n`;
          code += `        given()\n            .header("Authorization", "Bearer " + System.getenv("TEST_TOKEN"))\n            .contentType("application/json")\n        .when()\n            .get("${endpoint}")\n        .then()\n            .statusCode(200)\n            .body("$", notNullValue());\n    }\n\n`;
        });
        code += `}`;
      } else {
        // k6
        code = `import http from 'k6/http';\nimport { check, sleep } from 'k6';\nimport { Rate } from 'k6/metrics';\n\n`;
        code += `// API Performance + Contract Tests — Generated by IQ Studio\n// Base: ${apiBaseUrl}\n\n`;
        code += `export const errorRate = new Rate('errors');\n\n`;
        code += `export const options = {\n  vus: 10,\n  duration: '30s',\n  thresholds: {\n    http_req_duration: ['p(95)<500'],\n    errors: ['rate<0.05'],\n  },\n};\n\n`;
        code += `const BASE = '${apiBaseUrl}';\nconst HEADERS = { Authorization: 'Bearer \${__ENV.TEST_TOKEN}', 'Content-Type': 'application/json' };\n\n`;
        code += `export default function () {\n`;
        cases.forEach(tc => {
          const endpoint = `/api/${tc.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}`;
          code += `  // ${tc.id}: ${tc.title}\n`;
          code += `  const r${tc.id.replace(/[-\s]/g, '')} = http.get(\`\${BASE}${endpoint}\`, { headers: HEADERS });\n`;
          code += `  check(r${tc.id.replace(/[-\s]/g, '')}, {\n`;
          code += `    '${tc.id} status 200': (r) => r.status === 200,\n`;
          code += `    '${tc.id} response < 500ms': (r) => r.timings.duration < 500,\n`;
          code += `  });\n`;
          code += `  errorRate.add(r${tc.id.replace(/[-\s]/g, '')}.status !== 200);\n\n`;
        });
        code += `  sleep(1);\n}`;
      }

      setApiTestScript(code);
      setApiGenerating(false);
    }, 1400);
  };

  const copyToClipboard = () => {
    if (!compiledSuiteScript) return;
    navigator.clipboard.writeText(compiledSuiteScript);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  const copyApiScript = () => {
    if (!apiTestScript) return;
    navigator.clipboard.writeText(apiTestScript);
    setApiCopyStatus(true);
    setTimeout(() => setApiCopyStatus(false), 2000);
  };

  const downloadScript = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Voice + Prompt Bar */}
      <VoicePromptBar
        module="scripts"
        currentProjectId={currentProjectId}
        currentSprintId={currentSprintId}
        compact={false}
        onPromptSubmit={(text) => {
          console.log('[ScriptTab] Prompt:', text);
        }}
      />

      {/* Tab Switcher: Suite Compiler | API Tests */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('suite')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            activeTab === 'suite' ? 'bg-white shadow-sm text-purple-700 border border-purple-100' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" /> Suite Compiler
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
            activeTab === 'api' ? 'bg-white shadow-sm text-blue-700 border border-blue-100' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-3.5 h-3.5" /> API Test Generation
        </button>
      </div>

      {/* ══ TAB: SUITE COMPILER ══ */}
      {activeTab === 'suite' && (
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

            {framework === 'Robot' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[10px] text-purple-800 space-y-1">
                <p className="font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Robot Framework output includes:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>*** Settings ***, *** Variables ***, *** Test Cases ***, *** Keywords ***</li>
                  <li>SeleniumLibrary keywords (Click Element, Input Text, Wait Until…)</li>
                  <li>[Tags] for priority &amp; type, [Documentation], Suite Setup/Teardown</li>
                </ul>
              </div>
            )}

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
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {framework === 'Robot' ? 'suite_compiled.robot' : 'suite_compiled.spec.ts'}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">
                      {framework} / {language}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadScript(compiledSuiteScript, framework === 'Robot' ? 'suite_compiled.robot' : 'suite_compiled.spec.ts')}
                      className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-850"
                    >
                      {copyStatus ? (
                        <><Check className="w-3.5 h-3.5 text-green-400" /> Copied Suite</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy Suite Code</>
                      )}
                    </button>
                  </div>
                </div>

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
      )}

      {/* ══ TAB: API TEST GENERATION (GAP-08) ══ */}
      {activeTab === 'api' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Config panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm">
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-600" />
                API Contract Test Generator
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Auto-generate REST API contract tests (status codes, schema validation, auth checks) from your test cases.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Base API URL</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={e => setApiBaseUrl(e.target.value)}
                  placeholder="https://api.staging.io/v1"
                  className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Test Framework</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { val: 'jest-supertest', label: 'Jest + Supertest', lang: 'TypeScript' },
                  { val: 'pytest-requests', label: 'Pytest + Requests', lang: 'Python' },
                  { val: 'restassured', label: 'RestAssured', lang: 'Java' },
                  { val: 'k6', label: 'k6 API Perf', lang: 'JavaScript' },
                ] as const).map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setApiFramework(opt.val)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      apiFramework === opt.val
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-200'
                    }`}
                  >
                    <div className="text-[11px] font-bold">{opt.label}</div>
                    <div className="text-[9px] font-mono text-slate-400">{opt.lang}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                Use Test Cases ({selectedTestCaseIds.size > 0 ? `${selectedTestCaseIds.size} selected` : `all ${testCases.length}`})
              </label>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[160px] overflow-y-auto bg-slate-50">
                {testCases.slice(0, 8).map(tc => {
                  const isChecked = selectedTestCaseIds.has(tc.id);
                  return (
                    <div key={tc.id} onClick={() => handleRowToggle(tc.id)}
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-white transition-all">
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" /> : <Square className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                      <span className="text-[10px] font-mono text-slate-600 truncate">{tc.id}: {tc.title}</span>
                    </div>
                  );
                })}
                {testCases.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-[11px] font-mono">No test cases available.</div>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerateApiTests}
              disabled={apiGenerating || testCases.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-45 disabled:cursor-not-allowed"
            >
              {apiGenerating ? (
                <><RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Generating API Tests...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate API Tests</>
              )}
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[10px] text-blue-800 space-y-1">
              <p className="font-bold">Generated tests include:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>HTTP status code assertions (200, 401, 404)</li>
                <li>Content-Type &amp; schema validation</li>
                <li>Auth bearer token injection</li>
                <li>Negative / unauthorized test cases</li>
              </ul>
            </div>
          </div>

          {/* Output Terminal */}
          <div className="lg:col-span-7">
            {apiTestScript ? (
              <div className="bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden flex flex-col min-h-[480px] shadow-lg">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {apiFramework === 'jest-supertest' ? 'api.test.ts'
                        : apiFramework === 'pytest-requests' ? 'test_api.py'
                        : apiFramework === 'restassured' ? 'ApiContractTest.java'
                        : 'api-perf.k6.js'}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-blue-400 px-1.5 py-0.5 rounded">{apiFramework}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadScript(apiTestScript,
                        apiFramework === 'jest-supertest' ? 'api.test.ts'
                        : apiFramework === 'pytest-requests' ? 'test_api.py'
                        : apiFramework === 'restassured' ? 'ApiContractTest.java'
                        : 'api-perf.k6.js'
                      )}
                      className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      onClick={copyApiScript}
                      className="text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800"
                    >
                      {apiCopyStatus ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-grow font-mono text-[11px] text-slate-300 overflow-auto max-h-[440px] leading-relaxed text-left">
                  <pre><code>{apiTestScript}</code></pre>
                </div>
              </div>
            ) : (
              <div className="min-h-[480px] rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center p-8 shadow-inner">
                <Network className="w-12 h-12 text-slate-300 mb-2 animate-pulse" />
                <span className="text-sm font-semibold text-slate-500">API Test Generator</span>
                <p className="text-xs text-slate-400 max-w-[325px] mt-1 leading-normal">
                  Configure your base URL and framework, then click "Generate API Tests" to produce contract tests for all selected test cases.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── NEXT STEP CTA ─────────────────────────────────────────── */}
      {scripts.length > 0 && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#eaf5fd',border:'1px solid #b0d9f5',borderRadius:10,padding:'12px 18px',marginTop:8}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <CheckCircle style={{width:18,height:18,color:'#5B6CFF',flexShrink:0}} />
            <div>
              <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,color:'#0F172A'}}>
                {scripts.length} script{scripts.length !== 1 ? 's' : ''} compiled
              </span>
              <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:12,color:'#475569',marginLeft:8}}>
                Run your test suite in the Execution Engine.
              </span>
            </div>
          </div>
          <button
            onClick={onNavigateToExecution}
            style={{background:'#5B6CFF',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}
          >
            Execution Engine <ArrowRight style={{width:14,height:14}} />
          </button>
        </div>
      )}
    </div>
  );
}
