import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, FileText, Globe, Volume2, Plus, Sparkles, RefreshCcw, HelpCircle, Square, Download, GitBranch, CheckCircle, Clock, Archive, Eye, Search, Link, History, ChevronDown, ChevronRight, X, MessageSquare, Send, CheckSquare, Image, ScanLine, Zap } from 'lucide-react';
import { TestCase, RequirementDoc } from '../types';
import VoicePromptBar from './VoicePromptBar';
import { apiUrl } from '@/src/config/api';

// REQ-12: Status workflow
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: 'Draft',     color: 'text-slate-600',  bg: 'bg-slate-100',   border: 'border-slate-300' },
  in_review: { label: 'In Review', color: 'text-amber-700',  bg: 'bg-amber-50',    border: 'border-amber-300' },
  approved:  { label: 'Approved',  color: 'text-green-700', bg: 'bg-green-50',    border: 'border-green-300' },
  archived:  { label: 'Archived',  color: 'text-slate-400',  bg: 'bg-slate-50',    border: 'border-slate-200' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:     ['in_review'],
  in_review: ['approved', 'draft'],
  approved:  ['archived', 'in_review'],
  archived:  ['draft'],
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft:     Clock,
  in_review: Eye,
  approved:  CheckCircle,
  archived:  Archive,
};

interface RequirementsProps {
  requirements: RequirementDoc[];
  testCases: TestCase[];
  onAddRequirement: (
    title: string, 
    content: string, 
    sourceType: 'file' | 'text' | 'url' | 'voice',
    crawlerSettings?: { username?: string; password?: string; sapGuiWeb?: boolean; salesforceShadow?: boolean; }
  ) => Promise<void>;
  isGenerating: boolean;
  onGenerateTestCaseCode: (testCaseId: string) => void;
  onNavigateToTestCases?: () => void;
  currentProjectId?: string;
  currentSprintId?: string;
  // Project selection props
  projects?: { id: string; name: string }[];
  onCreateProject?: () => void;
  onSelectProject?: (id: string) => void;
}

export default function RequirementsTab({
  requirements,
  testCases,
  onAddRequirement,
  isGenerating,
  onGenerateTestCaseCode,
  onNavigateToTestCases,
  currentProjectId,
  currentSprintId,
  projects: _projects,
  onCreateProject: _onCreateProject,
  onSelectProject: _onSelectProject,
}: RequirementsProps) {
  const [sourceType, setSourceType] = useState<'file' | 'text' | 'url' | 'voice' | 'image'>('text');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrResult, setOcrResult] = useState<string>('');
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

  // Voice input state (REQ-04)
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // REQ-12: Status workflow
  const [reqStatuses, setReqStatuses] = useState<Record<string, string>>({});
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<Record<string, string>>({});

  // REQ-08: Parent/child linking
  const [showParentModal, setShowParentModal] = useState<string | null>(null); // reqId
  const [parentSearch, setParentSearch] = useState('');
  const [parentLinking, setParentLinking] = useState(false);
  const [reqParents, setReqParents] = useState<Record<string, string | null>>({});

  // REQ-10: Diff viewer
  const [showDiffModal, setShowDiffModal] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [snapshotting, setSnapshotting] = useState<string | null>(null);

  // REQ-15: Export
  const [isExporting, setIsExporting] = useState(false);

  // REQ-85: Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // REQ-27: TC versions
  const [showTcVersions, setShowTcVersions] = useState<string | null>(null);
  const [tcVersions, setTcVersions] = useState<any[]>([]);
  const [tcVersionsLoading, setTcVersionsLoading] = useState(false);

  // REQ-11: Inline comments / annotations
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null); // reqId
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // REQ-11: Load comments for a requirement
  const loadComments = async (reqId: string) => {
    setCommentsLoading(reqId);
    try {
      const res = await fetch(apiUrl(`/api/quality/requirements/${reqId}/comments`));
      const data = await res.json();
      setCommentsMap(prev => ({ ...prev, [reqId]: data.comments || [] }));
    } finally { setCommentsLoading(null); }
  };

  const handleOpenComments = (reqId: string) => {
    setShowCommentsFor(reqId);
    setNewCommentText('');
    if (!commentsMap[reqId]) loadComments(reqId);
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !showCommentsFor) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(apiUrl(`/api/quality/requirements/${showCommentsFor}/comments`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newCommentText.trim() }),
      });
      const data = await res.json();
      if (data.comment) {
        setCommentsMap(prev => ({
          ...prev,
          [showCommentsFor!]: [...(prev[showCommentsFor!] || []), data.comment],
        }));
        setNewCommentText('');
      }
    } finally { setSubmittingComment(false); }
  };

  const handleResolveComment = async (reqId: string, commentId: string, resolved: boolean) => {
    await fetch(apiUrl(`/api/quality/requirements/${reqId}/comments/${commentId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved }),
    });
    setCommentsMap(prev => ({
      ...prev,
      [reqId]: (prev[reqId] || []).map(c => c.id === commentId ? { ...c, resolved } : c),
    }));
  };

  // Load req statuses from existing requirements
  useEffect(() => {
    const s: Record<string, string> = {};
    const p: Record<string, string | null> = {};
    requirements.forEach(r => {
      s[r.id] = (r as any).status || 'draft';
      p[r.id] = (r as any).parentId || null;
    });
    setReqStatuses(s);
    setReqParents(p);
  }, [requirements]);

  // REQ-12: Status transition
  const handleStatusTransition = async (reqId: string, newStatus: string) => {
    setStatusLoading(reqId);
    try {
      const res = await fetch(apiUrl(`/api/quality/requirements/${reqId}/status`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setReqStatuses(prev => ({ ...prev, [reqId]: newStatus }));
        setStatusMsg(prev => ({ ...prev, [reqId]: `✓ ${newStatus}` }));
        setTimeout(() => setStatusMsg(prev => { const n = { ...prev }; delete n[reqId]; return n; }), 2000);
      } else {
        setStatusMsg(prev => ({ ...prev, [reqId]: `Error: ${data.error}` }));
        setTimeout(() => setStatusMsg(prev => { const n = { ...prev }; delete n[reqId]; return n; }), 3000);
      }
    } catch {
      setStatusMsg(prev => ({ ...prev, [reqId]: 'Network error' }));
    } finally { setStatusLoading(null); }
  };

  // REQ-08: Set parent
  const handleSetParent = async (reqId: string, parentId: string | null) => {
    setParentLinking(true);
    try {
      const res = await fetch(apiUrl(`/api/quality/requirements/${reqId}/parent`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId }),
      });
      const data = await res.json();
      if (data.success) {
        setReqParents(prev => ({ ...prev, [reqId]: parentId }));
        setShowParentModal(null);
      }
    } finally { setParentLinking(false); }
  };

  // REQ-10: Create snapshot
  const handleSnapshot = async (reqId: string) => {
    setSnapshotting(reqId);
    try {
      await fetch(apiUrl(`/api/quality/requirements/${reqId}/snapshot`), { method: 'POST' });
      setStatusMsg(prev => ({ ...prev, [reqId]: '📸 Snapshot saved' }));
      setTimeout(() => setStatusMsg(prev => { const n = { ...prev }; delete n[reqId]; return n; }), 2000);
    } finally { setSnapshotting(null); }
  };

  // REQ-10: Show diff
  const handleShowDiff = async (reqId: string) => {
    setShowDiffModal(reqId);
    setDiffLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/quality/requirements/${reqId}/diff`));
      setDiffData(await res.json());
    } finally { setDiffLoading(false); }
  };

  // REQ-15: Export requirements
  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const res = await fetch(apiUrl(`/api/quality/requirements/export?format=${format}`));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `requirements.${format}`; a.click();
      URL.revokeObjectURL(url);
    } finally { setIsExporting(false); }
  };

  // REQ-85: Semantic search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(apiUrl('/api/quality/rag/search-advanced'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, topK: 10 }),
      });
      const data = await res.json();
      // Also filter local requirements for name match
      const localMatches = requirements.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.content || '').toLowerCase().includes(searchQuery.toLowerCase())
      ).map(r => ({ ...r, relevanceScore: 99, source: 'local' }));
      setSearchResults([...localMatches, ...(data.results || [])].slice(0, 15));
    } finally { setSearching(false); }
  };

  // REQ-27: Load TC versions
  const handleLoadTcVersions = async (tcId: string) => {
    setShowTcVersions(tcId);
    setTcVersionsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/quality/testcases/${tcId}/versions`));
      const data = await res.json();
      setTcVersions(data.versions || []);
    } finally { setTcVersionsLoading(false); }
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setVoiceTranscript('Speech recognition not supported in this browser. Try Chrome.'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => { setIsListening(false); setVoiceTranscript('Error: ' + e.error); };
    recognition.onresult = (e: any) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setVoiceTranscript(transcript); setContent(transcript);
      if (!title) setTitle('Voice requirement ' + new Date().toLocaleTimeString());
    };
    recognition.start();
  };

  const stopVoiceInput = () => { recognitionRef.current?.stop(); setIsListening(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    if (sourceType === 'url') {
      if (!content.trim() || !content.startsWith('http')) { setErrorText('Please specify a valid URL to crawl (starting with http/https).'); return; }
    } else if (sourceType === 'file') {
      const pendingFile = (window as any).__pendingUploadFile as File | undefined;
      if (!pendingFile) { setErrorText('Please select a file to upload.'); return; }
      try {
        const formData = new FormData();
        formData.append('file', pendingFile); formData.append('projectId', currentProjectId && currentProjectId !== 'ALL' ? currentProjectId : 'PROJ-DEFAULT');
        const resp = await fetch(apiUrl('/api/quality/requirements/upload-file'), { method: 'POST', body: formData });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Upload failed');
        await onAddRequirement(data.requirement.title, data.requirement.content, 'file', {});
        setTitle(''); setContent(''); setUploadedFileName('');
        (window as any).__pendingUploadFile = undefined; return;
      } catch (err: any) { setErrorText('File upload failed: ' + err.message); return; }
    } else {
      if (!title.trim() || !content.trim()) { setErrorText('Title and requirement description are required.'); return; }
    }
    try {
      await onAddRequirement(title, content, sourceType, { username, password, sapGuiWeb, salesforceShadow });
      setTitle(''); setContent(''); setUploadedFileName('');
      setUsername(''); setPassword(''); setSapGuiWeb(false); setSalesforceShadow(false);
      (window as any).__pendingUploadFile = undefined;
    } catch (e: any) { setErrorText('Generation process errored: ' + e.message); }
  };

  const handleFileUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
      setContent(`__FILE__:${file.name}`);
      (window as any).__pendingUploadFile = file;
    }
  };

  const filteredParentOptions = requirements.filter(r =>
    r.id !== showParentModal &&
    (r.title.toLowerCase().includes(parentSearch.toLowerCase()) || r.id.toLowerCase().includes(parentSearch.toLowerCase()))
  ).slice(0, 10);

  return (
    <div className="space-y-6">
    {/* Page Header */}
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:20,borderBottom:'1px solid #E2E8F0'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#0F172A 0%,#5B6CFF 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <FileText style={{width:20,height:20,color:'#ffffff'}} />
        </div>
        <div>
          <h1 style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#0F172A',lineHeight:1,margin:0}}>Requirements</h1>
          <p style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,color:'#475569',margin:'3px 0 0'}}>Parse and track requirements · auto-generate test cases</p>
        </div>
      </div>
    </div>
    {/* Voice + Prompt Bar */}
    <VoicePromptBar
      module="requirements"
      currentProjectId={currentProjectId}
      currentSprintId={currentSprintId}
      compact={false}
      onPromptSubmit={(text, ragContext) => {
        // Inject prompt text as content for a new requirement
        const enriched = ragContext ? `${text}\n\n--- KB Context ---\n${ragContext}` : text;
        setContent(enriched);
        setTitle(text.slice(0, 80));
        setSourceType('text');
      }}
    />

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* ─── DIFF MODAL (REQ-10) ──────────────────────────────────────────── */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="glass-card-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" /> Requirement Diff Viewer
              </h3>
              <button onClick={() => setShowDiffModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {diffLoading && <p className="text-xs text-slate-500 text-center">Loading diff...</p>}
              {!diffLoading && diffData && (
                <>
                  {!diffData.hasDiff ? (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-slate-600">{diffData.message}</p>
                      <button
                        onClick={() => { handleSnapshot(showDiffModal!); setShowDiffModal(null); }}
                        className="btn-primary text-xs"
                      >
                        📸 Create First Snapshot
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Comparing {diffData.snapshotCount} snapshots for <span className="font-mono font-bold">{showDiffModal}</span></p>
                      <div className="space-y-1">
                        {diffData.diff?.map((d: any) => (
                          <div key={d.field} className={`grid grid-cols-3 gap-2 p-2 rounded-lg text-xs ${d.changed ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                            <span className="font-mono font-bold text-slate-600 uppercase text-[10px]">{d.field}</span>
                            <span className={`font-mono ${d.changed ? 'text-red-600 line-through' : 'text-slate-500'}`}>{d.old}</span>
                            <span className={`font-mono ${d.changed ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>{d.new}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        {diffData.snapshots?.map((s: any, i: number) => (
                          <div key={i} className="text-[10px] text-slate-500 font-mono">{s.timestamp} — {s.details}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PARENT MODAL (REQ-08) ────────────────────────────────────────── */}
      {showParentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Link className="w-4 h-4 text-blue-600" /> Link Parent Requirement
              </h3>
              <button onClick={() => setShowParentModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-500">Select a parent for <span className="font-mono font-bold">{showParentModal}</span></p>
              <input
                type="text"
                placeholder="Search requirements..."
                value={parentSearch}
                onChange={e => setParentSearch(e.target.value)}
                className="input-glass w-full text-xs"
                aria-label="Search parent requirements"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => handleSetParent(showParentModal!, null)}
                  className="w-full text-left p-2 rounded-lg text-xs text-red-600 hover:bg-red-50 border border-red-100"
                >
                  ✕ Remove parent (make top-level)
                </button>
                {filteredParentOptions.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSetParent(showParentModal!, r.id)}
                    className="w-full text-left p-2 rounded-lg text-xs hover:bg-blue-50 border border-slate-100 hover:border-blue-200"
                  >
                    <span className="font-mono text-blue-600 mr-2">{r.id}</span>{r.title}
                  </button>
                ))}
                {filteredParentOptions.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No requirements found</p>}
              </div>
              {parentLinking && <p className="text-xs text-slate-500 text-center">Linking...</p>}
            </div>
          </div>
        </div>
      )}

      {/* ─── COMMENTS MODAL (REQ-11) ──────────────────────────────────────── */}
      {showCommentsFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" /> Annotations — {showCommentsFor}
              </h3>
              <button onClick={() => setShowCommentsFor(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close comments">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {commentsLoading === showCommentsFor && (
                <p className="text-xs text-slate-400 text-center py-4">Loading...</p>
              )}
              {!commentsLoading && (commentsMap[showCommentsFor] || []).length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-200 mx-auto" />
                  <p className="text-xs text-slate-400">No annotations yet. Be the first to comment.</p>
                </div>
              )}
              {(commentsMap[showCommentsFor] || []).map((c: any) => (
                <div key={c.id} className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                  c.resolved ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">{c.author}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                      <button
                        onClick={() => handleResolveComment(showCommentsFor!, c.id, !c.resolved)}
                        aria-label={c.resolved ? 'Reopen comment' : 'Resolve comment'}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                          c.resolved ? 'border-slate-200 text-slate-400 hover:bg-slate-100' : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        <CheckSquare className="w-2.5 h-2.5" />
                        {c.resolved ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                  <p className={`leading-relaxed ${c.resolved ? 'line-through text-slate-400' : 'text-slate-700'}`}>{c.text}</p>
                </div>
              ))}
            </div>

            {/* New comment input */}
            <div className="p-4 border-t border-slate-200 flex gap-2">
              <input
                type="text"
                placeholder="Add annotation or comment..."
                value={newCommentText}
                onChange={e => setNewCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                aria-label="New comment text"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handlePostComment}
                disabled={submittingComment || !newCommentText.trim()}
                aria-label="Post comment"
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TC VERSION MODAL (REQ-27) ────────────────────────────────────── */}
      {showTcVersions && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg max-h-[70vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-500" /> TC Version History — {showTcVersions}
              </h3>
              <button onClick={() => setShowTcVersions(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {tcVersionsLoading && <p className="text-xs text-slate-500 text-center">Loading...</p>}
              {!tcVersionsLoading && tcVersions.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No version history yet. Regenerate or edit this TC to create history.</p>
              )}
              {tcVersions.map((v, i) => (
                <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>{v.action}</span>
                    <span>{new Date(v.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 truncate">{v.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. Requirements Input Section */}
      <div className="lg:col-span-5 glass-card p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:15,fontWeight:700,color:'#0F172A',display:'flex',alignItems:'center',gap:8,margin:0}}><Sparkles style={{width:16,height:16,color:'#5B6CFF'}} />Add Requirement</h3>
            <p className="text-xs text-slate-500 mt-1">Add requirements to auto-generate test cases.</p>
          </div>
          {/* REQ-15: Export buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting || requirements.length === 0}
              title="Export requirements as CSV"
              aria-label="Export requirements as CSV"
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-mono rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={isExporting || requirements.length === 0}
              title="Export requirements as JSON"
              aria-label="Export requirements as JSON"
              className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-mono rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="w-3 h-3" /> JSON
            </button>
          </div>
        </div>

        {/* REQ-85: Semantic search bar */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requirements semantically..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setSearchResults([]); setShowSearch(false); } }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                aria-label="Semantic search requirements"
                className="input-glass w-full pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
            <button
              onClick={() => { handleSearch(); setShowSearch(true); }}
              disabled={searching}
              aria-label="Run semantic search"
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
            >
              {searching ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-mono uppercase text-slate-500">{searchResults.length} results</span>
                <button onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }} className="text-[9px] text-slate-400 hover:text-slate-600">Clear</button>
              </div>
              {searchResults.map((r, i) => (
                <div key={i} className="p-1.5 bg-white rounded border border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="font-mono text-blue-600 text-[10px]">{r.id || 'DOC'}</span>
                    {r.relevanceScore && <span className="text-[9px] text-blue-500 font-mono">score: {r.relevanceScore}</span>}
                  </div>
                  <p className="text-slate-700 truncate">{r.title || r.filename || 'Document'}</p>
                </div>
              ))}
            </div>
          )}
          {showSearch && searchResults.length === 0 && !searching && (
            <p className="text-[10px] text-slate-400 text-center py-1">No results for "{searchQuery}"</p>
          )}
        </div>

        {/* Ingest Methods selectors */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl">
          {([['text','Text'],['file','File'],['url','URL'],['voice','Voice'],['image','Image/OCR']] as [string,string][]).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-label={`Switch to ${mode} input mode`}
              onClick={() => { setSourceType(mode as any); setTitle(''); setContent(''); setUploadedFileName(''); setOcrResult(''); setImagePreview(''); setImageFile(null); }}
              className={`py-2 rounded-lg text-[9px] font-mono font-medium transition-all ${
                sourceType === mode ? 'btn-primary' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
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
              aria-label="Requirement title"
              className="input-glass w-full text-xs font-sans"
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
                aria-label="Requirement description text"
                className="input-glass w-full text-xs font-sans leading-relaxed"
              />
            </div>
          )}

          {sourceType === 'file' && (
            <div className="border border-dashed border-slate-250 rounded-xl p-6 bg-slate-50 text-center hover:bg-slate-100/60 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".txt,.pdf,.md,.doc,.docx,.csv"
                onChange={handleFileUploadMock}
                aria-label="Upload requirement file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-700 font-semibold">Drag & drop requirement file here</p>
              <p className="text-[10px] text-slate-500 mt-1">Accepts PDF, Word, TXT, Excel or Markdown</p>
              {uploadedFileName && (
                <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-mono">Loaded: {uploadedFileName}</div>
              )}
            </div>
          )}

          {sourceType === 'image' && (
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-[11px] text-purple-900">
                <div className="flex items-center gap-1.5 font-bold mb-1"><ScanLine className="w-4 h-4" /> Wireframe / Mockup OCR</div>
                <p className="text-slate-600 leading-relaxed">Upload a screenshot, wireframe, or UI mockup — AI will extract requirements from the visual design automatically.</p>
              </div>
              <div className="border border-dashed border-purple-300 rounded-xl p-5 bg-purple-50/30 text-center relative hover:bg-purple-50 transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setImageFile(f);
                    setOcrResult('');
                    const reader = new FileReader();
                    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                    reader.readAsDataURL(f);
                    setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload wireframe or mockup image"
                />
                <Image className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-semibold">Drop wireframe or UI screenshot here</p>
                <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, WebP — AI extracts requirements via OCR</p>
              </div>
              {imagePreview && (
                <div className="space-y-2">
                  <img src={imagePreview} alt="Preview" className="w-full rounded-xl border border-slate-200 max-h-48 object-contain bg-slate-50" />
                  <button
                    type="button"
                    disabled={ocrRunning}
                    onClick={async () => {
                      if (!imageFile) return;
                      setOcrRunning(true);
                      setOcrResult('');
                      try {
                        const token = localStorage.getItem('iq_token') || '';
                        const fd = new FormData();
                        fd.append('image', imageFile);
                        fd.append('projectId', currentProjectId && currentProjectId !== 'ALL' ? currentProjectId : 'PROJ-DEFAULT');
                        const resp = await fetch(apiUrl('/api/quality/requirements/ocr-image'), {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                          body: fd,
                        });
                        const data = await resp.json();
                        if (data.requirements_text) {
                          setOcrResult(data.requirements_text);
                          setContent(data.requirements_text);
                          if (!title || title === imageFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')) {
                            setTitle(data.title || title);
                          }
                        } else {
                          setOcrResult('⚠️ ' + (data.error || 'OCR extraction failed — try a clearer image'));
                        }
                      } catch (err: any) {
                        setOcrResult('⚠️ Network error: ' + err.message);
                      } finally {
                        setOcrRunning(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    {ocrRunning ? <><RefreshCcw className="w-3.5 h-3.5 animate-spin" /> Extracting requirements…</> : <><Zap className="w-3.5 h-3.5" /> Extract Requirements from Image</>}
                  </button>
                </div>
              )}
              {ocrResult && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">Extracted Requirements (editable)</label>
                  <textarea
                    value={ocrResult.startsWith('⚠️') ? '' : ocrResult}
                    onChange={(e) => { setOcrResult(e.target.value); setContent(e.target.value); }}
                    rows={5}
                    className="input-glass w-full text-xs font-sans leading-relaxed"
                    placeholder="Extracted text will appear here..."
                  />
                  {ocrResult.startsWith('⚠️') && <p className="text-xs text-red-500">{ocrResult}</p>}
                </div>
              )}
            </div>
          )}

          {sourceType === 'url' && (
            <div className="space-y-4 text-left font-sans animate-fade-in">
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 text-[11px] text-blue-900 leading-relaxed space-y-1.5">
                <span className="font-bold font-mono flex items-center gap-1 text-blue-700"><Globe className="w-4 h-4 text-blue-500 animate-pulse" /> Active UI Discovery Crawler</span>
                <p className="leading-normal text-slate-600">No requirement documents? Enter target URL to browse & map active web views directly!</p>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1.5 font-bold">App under test (URL)</label>
                <input
                  type="text"
                  placeholder="https://sap-gateway.company.com/sap/bc/gui/sap/its/webgui"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  aria-label="Target URL for crawling"
                  className="input-glass w-full text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-0.5 font-semibold">Crawl Auth Username</label>
                  <input type="text" placeholder="sap_tester" value={username} onChange={(e) => setUsername(e.target.value)} aria-label="Crawl username" className="input-glass w-full text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-0.5 font-semibold">Crawl Auth Password</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Crawl password" className="input-glass w-full text-xs font-mono" />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-405 font-bold">COTS / ERP Adapters</span>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600">
                  <input type="checkbox" checked={sapGuiWeb} onChange={(e) => setSapGuiWeb(e.target.checked)} aria-label="Enable SAP Web GUI adapter" className="rounded border-slate-300 accent-blue-600" />
                  SAP Web GUI dynamic adapters
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600">
                  <input type="checkbox" checked={salesforceShadow} onChange={(e) => setSalesforceShadow(e.target.checked)} aria-label="Enable Salesforce Shadow DOM resolver" className="rounded border-slate-300 accent-blue-600" />
                  Salesforce LWC/ServiceNow Shadow DOM resolver
                </label>
              </div>
            </div>
          )}

          {sourceType === 'voice' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-3">
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-100'}`}>
                <Volume2 className={`w-6 h-6 ${isListening ? 'text-white' : 'text-blue-600'}`} aria-hidden="true" />
              </div>
              <p className="text-xs text-slate-700 font-semibold" aria-live="polite">
                {isListening ? '🔴 Listening… speak your requirement' : 'Click to start voice input'}
              </p>
              <div className="flex gap-2 justify-center">
                {!isListening ? (
                  <button type="button" onClick={startVoiceInput} aria-label="Start voice recording"
                    className="btn-primary text-xs flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5" /> Start Recording
                  </button>
                ) : (
                  <button type="button" onClick={stopVoiceInput} aria-label="Stop voice recording"
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 flex items-center gap-2">
                    <Square className="w-3.5 h-3.5" /> Stop Recording
                  </button>
                )}
                <button type="button" onClick={() => { setContent('The payment checkout gateway must auto reject visual submit clicks if user is anonymous or holds negative wallet balance limits.'); setTitle('Payment Gateway Voice Requirement'); }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-mono hover:bg-slate-50">
                  Demo Transcript
                </button>
              </div>
              {voiceTranscript && (
                <div className="mt-2 p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 text-left font-mono leading-relaxed max-h-24 overflow-y-auto" aria-live="polite">
                  {voiceTranscript}
                </div>
              )}
              <p className="text-[10px] text-slate-400">Uses browser Web Speech API — works best in Chrome/Edge</p>
            </div>
          )}

          {errorText && (
            <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs text-center font-mono">
              {errorText}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            aria-label="Analyze requirements and generate test cases"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
              isGenerating ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'btn-primary'
            }`}
          >
            {isGenerating ? (<><RefreshCcw className="w-4 h-4 animate-spin" />Agents parsing requirements...</>) : (<>Analyze & Compile Cases<ArrowRight className="w-4 h-4" /></>)}
          </button>
        </form>

        {/* Existing requirements list — with status workflow + parent/diff controls */}
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Parsed Inventory Logs ({requirements.length})</span>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {requirements.map((req) => {
              const status = reqStatuses[req.id] || (req as any).status || 'draft';
              const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.draft;
              const StatusIcon = STATUS_ICONS[status] || Clock;
              const allowedNext = STATUS_TRANSITIONS[status] || [];
              const parentId = reqParents[req.id];
              const parentReq = parentId ? requirements.find(r => r.id === parentId) : null;
              const childCount = requirements.filter(r => reqParents[r.id] === req.id).length;

              return (
                <div key={req.id} className="bg-slate-50 border border-slate-205 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <span className="font-bold text-slate-800 truncate">{req.title}</span>
                        <span className="text-slate-400 font-mono text-[9px] flex-shrink-0">{req.id}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{req.content}</p>

                      {/* Parent info */}
                      {parentReq && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-blue-600 font-mono">
                          <ChevronRight className="w-3 h-3" aria-hidden="true" />child of {parentReq.id}: {parentReq.title.slice(0, 30)}
                        </div>
                      )}
                      {childCount > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-500 font-mono">
                          <ChevronDown className="w-3 h-3" aria-hidden="true" />{childCount} child requirement{childCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* REQ-12: Status workflow bar */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>
                      <StatusIcon className="w-2.5 h-2.5" aria-hidden="true" />
                      {statusInfo.label}
                    </span>
                    {statusMsg[req.id] && (
                      <span className="text-[9px] text-blue-600 font-mono">{statusMsg[req.id]}</span>
                    )}
                    {allowedNext.map(next => (
                      <button
                        key={next}
                        onClick={() => handleStatusTransition(req.id, next)}
                        disabled={statusLoading === req.id}
                        aria-label={`Move requirement ${req.id} to ${next} status`}
                        className={`px-2 py-0.5 text-[9px] font-mono rounded-full border transition-all hover:bg-white ${STATUS_LABELS[next]?.border || 'border-slate-200'} ${STATUS_LABELS[next]?.color || 'text-slate-600'} ${statusLoading === req.id ? 'opacity-50' : ''}`}
                      >
                        → {STATUS_LABELS[next]?.label || next}
                      </button>
                    ))}
                  </div>

                  {/* Action buttons: parent link, snapshot, diff, comments */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => { setShowParentModal(req.id); setParentSearch(''); }}
                      aria-label={`Set parent for requirement ${req.id}`}
                      className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Link className="w-2.5 h-2.5" aria-hidden="true" /> {parentId ? 'Re-link' : 'Link Parent'}
                    </button>
                    <button
                      onClick={() => handleSnapshot(req.id)}
                      disabled={snapshotting === req.id}
                      aria-label={`Create snapshot of requirement ${req.id}`}
                      className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      {snapshotting === req.id ? <RefreshCcw className="w-2.5 h-2.5 animate-spin" /> : '📸'} Snapshot
                    </button>
                    <button
                      onClick={() => handleShowDiff(req.id)}
                      aria-label={`View diff for requirement ${req.id}`}
                      className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded border border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      <GitBranch className="w-2.5 h-2.5" aria-hidden="true" /> Diff
                    </button>
                    {/* REQ-11: Comments / annotations button */}
                    <button
                      onClick={() => handleOpenComments(req.id)}
                      aria-label={`View annotations for requirement ${req.id}`}
                      className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono rounded border border-blue-200 text-blue-700 hover:bg-blue-50 relative"
                    >
                      <MessageSquare className="w-2.5 h-2.5" aria-hidden="true" />
                      Annotate
                      {(commentsMap[req.id] || []).filter((c: any) => !c.resolved).length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 text-white text-[8px] rounded-full flex items-center justify-center font-bold">
                          {(commentsMap[req.id] || []).filter((c: any) => !c.resolved).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Structured Test Cases Output */}
      <div className="lg:col-span-7 glass-card p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-sans font-semibold text-lg text-slate-900">Generated Test Suite</h3>
              <p className="text-xs text-slate-500 mt-1">Exhaustive testing coverage compiled via deep AI modeling</p>
            </div>
            <span className="badge badge-blue text-xs font-mono px-3 py-1">
              {testCases.length} Compiled Cases
            </span>
          </div>

          {/* Test case dynamic cards list */}
          <div role="list" aria-label="Generated test cases" className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {testCases.map((tc) => {
              const isSelected = selectedTestCase?.id === tc.id;
              return (
                <div
                  key={tc.id}
                  role="listitem"
                  onClick={() => setSelectedTestCase(isSelected ? null : tc)}
                  aria-expanded={isSelected}
                  className={`border rounded-xl p-3 select-none cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50/40 border-blue-400' : 'bg-slate-50 border-slate-150 hover:border-blue-200 hover:bg-blue-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-600">{tc.id}</span>
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

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* REQ-27: Version history button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLoadTcVersions(tc.id); }}
                        aria-label={`View version history for test case ${tc.id}`}
                        title="TC version history"
                        className="text-[9px] font-mono text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 p-1 rounded border border-slate-200 transition-all"
                      >
                        <History className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onGenerateTestCaseCode(tc.id); }}
                        aria-label={`Generate script for test case ${tc.id}`}
                        className="text-[10px] font-mono text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-2.5 py-1 rounded-lg border border-blue-200 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3 h-3" aria-hidden="true" /> Script
                      </button>
                    </div>
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
                              <p className="text-[10px] text-blue-500 ml-4 font-mono">→ Expect: {st.expectedResult}</p>
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
                          <span className="text-[11px] font-mono text-blue-600 font-bold">{tc.confidenceScore}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── NEXT STEP CTA ─────────────────────────────────────────── */}
      {requirements.length > 0 && (
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#eaf5fd',border:'1px solid #b0d9f5',borderRadius:10,padding:'12px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <CheckCircle style={{width:18,height:18,color:'#5B6CFF',flexShrink:0}} />
            <div>
              <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,color:'#0F172A'}}>
                {requirements.length} requirement{requirements.length !== 1 ? 's' : ''} parsed · {testCases.length} test case{testCases.length !== 1 ? 's' : ''} generated
              </span>
              <span style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:12,color:'#475569',marginLeft:8}}>
                Review and enrich your test cases next.
              </span>
            </div>
          </div>
          <button
            onClick={onNavigateToTestCases}
            style={{background:'#5B6CFF',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontFamily:'"Inter",Arial,sans-serif',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,whiteSpace:'nowrap'}}
          >
            Test Cases <ArrowRight style={{width:14,height:14}} />
          </button>
        </div>
      )}
    </div>
    </div>
  );
}
