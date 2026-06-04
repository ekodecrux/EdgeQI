import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, BookOpen, Plus, Trash2, Copy, Search, Tag } from 'lucide-react';
import { apiUrl } from '@/src/config/api';

interface Template {
  id: string;
  name: string;
  prompt: string;
  category: string;
  use_count: number;
  created_at: string;
}

interface FeedbackEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  vote: string;
  comment: string;
  user_email: string;
  created_at: string;
}

export default function FeedbackTemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'templates' | 'feedback'>('templates');
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadFeedback();
  }, []);

  const loadTemplates = () => {
    fetch(apiUrl('/api/quality/prompt-templates')).then(r => r.json()).then(d => setTemplates(d.templates || []));
  };

  const loadFeedback = () => {
    fetch(apiUrl('/api/quality/feedback')).then(r => r.json()).then(d => setFeedback(d.entries || []));
  };

  const addTemplate = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    setSaving(true);
    try {
      await fetch(apiUrl('/api/quality/prompt-templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, prompt: newPrompt, category: newCategory }),
      });
      setNewName(''); setNewPrompt(''); loadTemplates();
    } finally { setSaving(false); }
  };

  const deleteTemplate = async (id: string) => {
    await fetch(apiUrl(`/api/quality/prompt-templates/${id}`), { method: 'DELETE' });
    loadTemplates();
  };

  const useTemplate = async (tpl: Template) => {
    await fetch(apiUrl(`/api/quality/prompt-templates/${tpl.id}/use`), { method: 'POST' });
    navigator.clipboard.writeText(tpl.prompt);
    setCopied(tpl.id);
    setTimeout(() => setCopied(null), 2000);
    loadTemplates();
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase()) ||
    t.prompt.toLowerCase().includes(search.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    'test-generation': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'security': 'bg-red-500/15 text-red-400 border-red-500/30',
    'impact': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'performance': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'healing': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'general': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };

  const feedbackStats = {
    up: feedback.filter(f => f.vote === 'up').length,
    down: feedback.filter(f => f.vote === 'down').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Prompts & Feedback</h2>
          <p className="text-slate-400 text-xs">Save prompt templates and collect feedback for continuous improvement (REQ-97/98)</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex bg-slate-800 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveSection('templates')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeSection === 'templates' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
          Prompt Templates ({templates.length})
        </button>
        <button onClick={() => setActiveSection('feedback')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeSection === 'feedback' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
          Feedback Log ({feedback.length})
        </button>
      </div>

      {activeSection === 'templates' && (
        <>
          {/* Add Template Form */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" /> Create New Template
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Template Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Login Test Generator" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500">
                  <option value="test-generation">Test Generation</option>
                  <option value="security">Security</option>
                  <option value="impact">Impact Analysis</option>
                  <option value="performance">Performance</option>
                  <option value="healing">Self-Healing</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-slate-400 mb-1">Prompt (use {'{{variable}}'} for placeholders)</label>
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} rows={4}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 resize-none font-mono"
                placeholder="Generate 5 test cases for {{feature}}. Include positive, negative and edge cases..." />
            </div>
            <button onClick={addTemplate} disabled={saving || !newName || !newPrompt}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> Save Template
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 placeholder-slate-500"
              placeholder="Search templates..." />
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 gap-3">
            {filteredTemplates.map(tpl => (
              <div key={tpl.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-semibold text-sm">{tpl.name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryColors[tpl.category] || categoryColors['general']}`}>
                        <Tag className="w-2.5 h-2.5 inline mr-1" />{tpl.category}
                      </span>
                      {tpl.use_count > 0 && (
                        <span className="text-[10px] text-slate-500">Used {tpl.use_count}×</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs font-mono leading-relaxed line-clamp-2">{tpl.prompt}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => useTemplate(tpl)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                        copied === tpl.id
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      }`}>
                      <Copy className="w-3 h-3" />
                      {copied === tpl.id ? 'Copied!' : 'Use'}
                    </button>
                    <button onClick={() => deleteTemplate(tpl.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeSection === 'feedback' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <ThumbsUp className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-black text-emerald-400">{feedbackStats.up}</p>
              <p className="text-xs text-emerald-300/70">Positive</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
              <ThumbsDown className="w-6 h-6 text-red-400 mx-auto mb-1" />
              <p className="text-2xl font-black text-red-400">{feedbackStats.down}</p>
              <p className="text-xs text-red-300/70">Negative</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-white">{feedback.length > 0 ? Math.round((feedbackStats.up / feedback.length) * 100) : 0}%</p>
              <p className="text-xs text-slate-400">Satisfaction</p>
            </div>
          </div>

          {/* Feedback List */}
          {feedback.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <ThumbsUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No feedback yet</p>
              <p className="text-xs mt-1">Use 👍/👎 buttons throughout the app to rate AI outputs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {feedback.map(f => (
                <div key={f.id} className="flex items-start gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
                  {f.vote === 'up'
                    ? <ThumbsUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    : <ThumbsDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-slate-300">{f.entity_type}</span>
                      <span className="text-xs font-mono text-slate-500">{f.entity_id}</span>
                      <span className="text-xs text-slate-500 ml-auto">{new Date(f.created_at).toLocaleDateString()}</span>
                    </div>
                    {f.comment && <p className="text-xs text-slate-400 mt-0.5">{f.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
