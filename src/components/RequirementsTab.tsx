import React, { useState } from 'react';
import { Upload, ArrowRight, FileText, Globe, Volume2, Plus, Sparkles, RefreshCcw, HelpCircle } from 'lucide-react';
import { TestCase, RequirementDoc } from '../types';

interface RequirementsProps {
  requirements: RequirementDoc[];
  testCases: TestCase[];
  onAddRequirement: (
    title: string, 
    content: string, 
    sourceType: 'file' | 'text' | 'url' | 'voice',
    crawlerSettings?: {
      username?: string;
      password?: string;
      sapGuiWeb?: boolean;
      salesforceShadow?: boolean;
    }
  ) => Promise<void>;
  isGenerating: boolean;
  onGenerateTestCaseCode: (testCaseId: string) => void;
}

export default function RequirementsTab({
  requirements,
  testCases,
  onAddRequirement,
  isGenerating,
  onGenerateTestCaseCode,
}: RequirementsProps) {
  const [sourceType, setSourceType] = useState<'file' | 'text' | 'url' | 'voice'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [errorText, setErrorText] = useState('');

  // Crawler parameter states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sapGuiWeb, setSapGuiWeb] = useState(false);
  const [salesforceShadow, setSalesforceShadow] = useState(false);

  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (sourceType === 'url') {
      if (!content.trim() || !content.startsWith('http')) {
        setErrorText('Please specify a valid URL to crawl (starting with http/https).');
        return;
      }
    } else if (sourceType === 'file') {
      const pendingFile = (window as any).__pendingUploadFile as File | undefined;
      if (!pendingFile) {
        setErrorText('Please select a file to upload.');
        return;
      }
      try {
        // Real file upload via multipart form
        const formData = new FormData();
        formData.append('file', pendingFile);
        formData.append('projectId', 'PROJ-WEB');
        const resp = await fetch('/api/quality/requirements/upload-file', { method: 'POST', body: formData });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Upload failed');
        await onAddRequirement(data.requirement.title, data.requirement.content, 'file', {});
        // Reset
        setTitle(''); setContent(''); setUploadedFileName('');
        (window as any).__pendingUploadFile = undefined;
        return;
      } catch (err: any) {
        setErrorText('File upload failed: ' + err.message);
        return;
      }
    } else {
      if (!title.trim() || !content.trim()) {
        setErrorText('Title and requirement description are required.');
        return;
      }
    }

    try {
      await onAddRequirement(title, content, sourceType, {
        username, password, sapGuiWeb, salesforceShadow
      });
      setTitle(''); setContent(''); setUploadedFileName('');
      setUsername(''); setPassword('');
      setSapGuiWeb(false); setSalesforceShadow(false);
      (window as any).__pendingUploadFile = undefined;
    } catch (e: any) {
      setErrorText('Generation process errored: ' + e.message);
    }
  };

  const handleFileUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
      // Store the actual File object in content as a signal to handleSubmit
      setContent(`__FILE__:${file.name}`);
      // Keep the file reference for upload
      (window as any).__pendingUploadFile = file;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* 1. Requirements Input Section */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div>
          <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Requirement Parser Agent
          </h3>
          <p className="text-xs text-slate-500 mt-1">Ingest software requirements to auto-compile detailed QA test cases.</p>
        </div>

        {/* Ingest Methods selectors */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl">
          {(['text', 'file', 'url', 'voice'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setSourceType(mode); setTitle(''); setContent(''); setUploadedFileName(''); }}
              className={`py-2 rounded-lg text-[10px] font-mono font-medium capitalize transition-all ${
                sourceType === mode 
                  ? 'bg-purple-600 text-white' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Requirement Title</label>
            <input
              type="text"
              placeholder="e.g. JWT Auth Expiry handler"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
            />
          </div>

          {sourceType === 'text' && (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">Enter Requirement Text</label>
              <textarea
                placeholder="Secure connection must expire after 15 minutes of user inactivity..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans leading-relaxed"
              />
            </div>
          )}

          {sourceType === 'file' && (
            <div className="border border-dashed border-slate-250 rounded-xl p-6 bg-slate-50 text-center hover:bg-slate-100/60 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".txt,.pdf,.md,.doc,.docx,.csv"
                onChange={handleFileUploadMock}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-700 font-semibold">Drag & drop requirement file here</p>
              <p className="text-[10px] text-slate-500 mt-1">Accepts PDF, Word, TXT, Excel or Markdown</p>
              {uploadedFileName && (
                <div className="mt-4 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700 font-mono">
                  Loaded: {uploadedFileName}
                </div>
              )}
            </div>
          )}

          {sourceType === 'url' && (
            <div className="space-y-4 text-left font-sans animate-fade-in">
              <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-150 text-[11px] text-purple-950 leading-relaxed space-y-1.5">
                <span className="font-bold font-mono flex items-center gap-1 text-purple-705"><Globe className="w-4 h-4 text-purple-600 animate-pulse animate-duration-1000" /> Active UI Discovery Crawler</span>
                <p className="leading-normal text-slate-600">No requirement documents? Enter target URL to browse & map active web views directly! Emits structured, Playwright-automatable test scenarios instantly.</p>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">App under test (URL)</label>
                <input
                  type="text"
                  placeholder="https://sap-gateway.company.com/sap/bc/gui/sap/its/webgui"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-0.5 font-semibold font-mono">Crawl Auth Username</label>
                  <input
                    type="text"
                    placeholder="sap_tester"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-0.5 font-semibold font-mono">Crawl Auth Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2 text-left">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-405 font-bold">COTS / ERP Adapters</span>
                <div className="grid grid-cols-1 gap-2 text-slate-650 text-[11px] font-sans">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sapGuiWeb}
                      onChange={(e) => setSapGuiWeb(e.target.checked)}
                      className="rounded border-slate-300 text-purple-650 focus:ring-purple-500"
                    />
                    <span>SAP Web GUI dynamic adapters (handles Frame mappings & WebGUI controls)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={salesforceShadow}
                      onChange={(e) => setSalesforceShadow(e.target.checked)}
                      className="rounded border-slate-300 text-purple-650 focus:ring-purple-500"
                    />
                    <span>Salesforce LWC/ServiceNow Shadow DOM Penetrating resolver</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {sourceType === 'voice' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-3">
              <Volume2 className="w-8 h-8 text-purple-600 mx-auto animate-pulse" />
              <p className="text-xs text-slate-700 font-semibold">Simulated Speech-To-Text</p>
              <button
                type="button"
                onClick={() => {
                  setTitle('Voice Transcript requirement check');
                  setContent('The payment checkout gateway must auto reject visual submit clicks if user is anonymous or holds negative wallet balance limits.');
                }}
                className="px-3 py-1.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-mono hover:bg-slate-50"
              >
                Insert Sample Speech Transcript
              </button>
            </div>
          )}

          {errorText && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs text-center font-mono">
              {errorText}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              isGenerating
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-sm'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCcw className="w-4 h-4 animate-spin" />
                Agents parsing requirements...
              </>
            ) : (
              <>
                Analyze & Compile Cases
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Existing requirements index log */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Parsed Inventory Logs</span>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {requirements.map((req) => (
              <div key={req.id} className="bg-slate-50 border border-slate-205 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                <FileText className="w-4 h-4 text-purple-600 mt-0.5" />
                <div className="flex-1 text-slate-800">
                  <div className="flex justify-between font-bold">
                    <span>{req.title}</span>
                    <span className="text-slate-400 font-mono text-[9px]">{req.id}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{req.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Structured Test Cases Output */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-sans font-semibold text-lg text-slate-900">Generated Test Suite</h3>
              <p className="text-xs text-slate-500 mt-1">Exhaustive testing coverage compiled via deep AI modeling</p>
            </div>
            <span className="text-xs text-purple-700 font-mono bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              {testCases.length} Compiled Cases
            </span>
          </div>

          {/* Test case dynamic cards list */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {testCases.map((tc) => {
              const isSelected = selectedTestCase?.id === tc.id;
              return (
                <div
                  key={tc.id}
                  onClick={() => setSelectedTestCase(isSelected ? null : tc)}
                  className={`border rounded-xl p-3 select-none cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-purple-50/50 border-purple-400' 
                      : 'bg-slate-50 border-slate-150 hover:border-slate-350 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-purple-700">{tc.id}</span>
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase ${
                          tc.priority === 'P0' ? 'bg-rose-50 text-rose-700 border border-rose-200/50' :
                          tc.priority === 'P1' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' : 'bg-slate-100 border border-slate-205 text-slate-600'
                        }`}>
                          {tc.priority}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                          {tc.type}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900">{tc.title}</h4>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateTestCaseCode(tc.id);
                      }}
                      className="text-[10px] font-mono text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-600 px-2.5 py-1 rounded-lg border border-purple-200 transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" /> Script
                    </button>
                  </div>

                  {/* Expansion info content */}
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-3 text-xs leading-relaxed text-slate-705">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Assertion Target Description</span>
                        <p>{tc.description}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-405 uppercase block font-mono">System Preconditions</span>
                        <p className="font-mono text-[11px] text-slate-600">{tc.preconditions}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-405 uppercase block font-mono mb-1">Execution Steps</span>
                        <ol className="list-decimal list-inside space-y-1 bg-white p-2.5 rounded-lg border border-slate-150 shadow-inner">
                          {tc.steps.map((st, i) => (
                            <li key={i} className="text-[11px] text-slate-700">
                              <span className="font-semibold text-slate-800">{st.action}</span>
                              <p className="text-[10px] text-emerald-600 ml-4 font-mono">→ Expect: {st.expectedResult}</p>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-slate-405 uppercase block font-mono">Test Parameters Data</span>
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 p-1 rounded border border-slate-200 block">{tc.testData}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-405 uppercase block font-mono">Coverage Confidence</span>
                          <span className="text-[11px] font-mono text-emerald-600 font-bold">{tc.confidenceScore}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-205 text-[11px]">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500">
            Expand any suite card above to evaluate preconditions, multi-step actions, expected UI values and launch manual and automatic script builders.
          </span>
        </div>
      </div>
    </div>
  );
}
