import { useState, useRef, useCallback } from 'react';
import { 
  Plus, X, Play, Save, RefreshCw, Trash2, ChevronDown, ChevronUp,
  GitBranch, Zap, FileText, TestTube2, Bug, BarChart3, ShieldCheck,
  Bot, ArrowRight, GripVertical, Settings2, CheckCircle, Circle,
  Copy, Download, Upload, Eye
} from 'lucide-react';

// ── GAP-26: Drag-and-drop Agentic Workflow Builder ──────────────────────────

type NodeType = 
  | 'trigger'
  | 'requirements'
  | 'testgen'
  | 'feasibility'
  | 'scriptgen'
  | 'execute'
  | 'defect'
  | 'performance'
  | 'security'
  | 'report'
  | 'notify'
  | 'ai-review'
  | 'condition';

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, any>;
  status?: 'idle' | 'running' | 'done' | 'error' | 'skipped';
  output?: string;
}

interface Connection {
  from: string;
  to: string;
  label?: string;
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: string;
}

const NODE_CATALOG: { type: NodeType; label: string; icon: any; color: string; desc: string; category: string }[] = [
  { type: 'trigger',      label: 'Trigger',            icon: Zap,          color: '#7c3aed', desc: 'Start workflow on schedule or event',        category: 'Control' },
  { type: 'condition',    label: 'Condition / Branch',  icon: GitBranch,    color: '#0891b2', desc: 'Branch workflow based on a condition',         category: 'Control' },
  { type: 'requirements', label: 'Parse Requirements',  icon: FileText,     color: '#1d4ed8', desc: 'Extract & analyze requirement documents',      category: 'STLC' },
  { type: 'testgen',      label: 'Generate Test Cases', icon: TestTube2,    color: '#059669', desc: 'AI-powered test case generation from reqs',    category: 'STLC' },
  { type: 'feasibility',  label: 'Feasibility Check',   icon: CheckCircle,  color: '#0d9488', desc: 'Assess automation feasibility of test cases',  category: 'STLC' },
  { type: 'scriptgen',    label: 'Generate Scripts',    icon: Settings2,    color: '#9333ea', desc: 'Generate Robot/Playwright/k6 test scripts',    category: 'STLC' },
  { type: 'execute',      label: 'Run Tests',           icon: Play,         color: '#2563eb', desc: 'Execute test suite in target environment',     category: 'STLC' },
  { type: 'defect',       label: 'Defect Analysis',     icon: Bug,          color: '#dc2626', desc: 'Analyze failures and raise defects via AI',    category: 'STLC' },
  { type: 'performance',  label: 'Load Test',           icon: BarChart3,    color: '#d97706', desc: 'Run JMeter/k6 load test on endpoint',          category: 'Testing' },
  { type: 'security',     label: 'Security Scan',       icon: ShieldCheck,  color: '#7c3aed', desc: 'DAST/SAST/SCA vulnerability scan',            category: 'Testing' },
  { type: 'ai-review',    label: 'AI Review Gate',      icon: Bot,          color: '#0891b2', desc: 'AI-powered quality gate with pass/fail output', category: 'AI' },
  { type: 'report',       label: 'Generate Report',     icon: BarChart3,    color: '#16a34a', desc: 'Create compliance or executive report',        category: 'Output' },
  { type: 'notify',       label: 'Send Notification',   icon: Zap,          color: '#f59e0b', desc: 'Email / Slack / webhook notification',         category: 'Output' },
];

const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-full-stlc',
    name: 'Full STLC Pipeline',
    createdAt: new Date().toISOString(),
    nodes: [
      { id: 'n1', type: 'trigger',      label: 'Sprint Start Trigger',    config: { schedule: 'sprint_start' }, status: 'idle' },
      { id: 'n2', type: 'requirements', label: 'Parse Requirement Docs',  config: { source: 'jira' }, status: 'idle' },
      { id: 'n3', type: 'testgen',      label: 'AI Test Generation',      config: { ai: true, count: 20 }, status: 'idle' },
      { id: 'n4', type: 'feasibility',  label: 'Feasibility Gate',        config: { threshold: 70 }, status: 'idle' },
      { id: 'n5', type: 'scriptgen',    label: 'Generate Robot Scripts',  config: { framework: 'Robot' }, status: 'idle' },
      { id: 'n6', type: 'execute',      label: 'Run Test Suite',          config: { env: 'staging' }, status: 'idle' },
      { id: 'n7', type: 'defect',       label: 'AI Defect Analysis',      config: { auto_raise: true }, status: 'idle' },
      { id: 'n8', type: 'report',       label: 'Sprint Quality Report',   config: { format: 'html' }, status: 'idle' },
    ],
    connections: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
      { from: 'n5', to: 'n6' },
      { from: 'n6', to: 'n7' },
      { from: 'n7', to: 'n8' },
    ]
  },
  {
    id: 'wf-security',
    name: 'Security + Compliance Workflow',
    createdAt: new Date().toISOString(),
    nodes: [
      { id: 'n1', type: 'trigger',     label: 'Pre-Release Trigger',  config: { schedule: 'on_demand' }, status: 'idle' },
      { id: 'n2', type: 'security',    label: 'DAST Scan',            config: { type: 'DAST', authenticated: true }, status: 'idle' },
      { id: 'n3', type: 'security',    label: 'SAST Code Scan',       config: { type: 'SAST' }, status: 'idle' },
      { id: 'n4', type: 'condition',   label: 'Critical Issues?',     config: { condition: 'criticals > 0' }, status: 'idle' },
      { id: 'n5', type: 'defect',      label: 'Raise Security Bugs',  config: { severity: 'Critical' }, status: 'idle' },
      { id: 'n6', type: 'report',      label: 'Compliance Report',    config: { standards: ['PCI-DSS', 'GDPR'] }, status: 'idle' },
      { id: 'n7', type: 'notify',      label: 'Slack Alert',          config: { channel: '#security-alerts' }, status: 'idle' },
    ],
    connections: [
      { from: 'n1', to: 'n2' },
      { from: 'n1', to: 'n3' },
      { from: 'n2', to: 'n4' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5', label: 'YES' },
      { from: 'n4', to: 'n6', label: 'NO' },
      { from: 'n5', to: 'n7' },
      { from: 'n6', to: 'n7' },
    ]
  }
];

interface WorkflowBuilderProps {
  currentProjectId?: string;
  currentSprintId?: string;
}

export default function WorkflowBuilder({ currentProjectId, currentSprintId }: WorkflowBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>(DEFAULT_WORKFLOWS[0].id);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragNodeType, setDragNodeType] = useState<NodeType | null>(null);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [newWfName, setNewWfName] = useState('');
  const dragNodeIdxRef = useRef<number | null>(null);

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId) || workflows[0];

  const updateWorkflow = (updater: (wf: Workflow) => Workflow) => {
    setWorkflows(prev => prev.map(wf => wf.id === activeWorkflowId ? updater(wf) : wf));
  };

  const addNodeFromCatalog = (type: NodeType) => {
    const template = NODE_CATALOG.find(n => n.type === type)!;
    const newNode: WorkflowNode = {
      id: `n${Date.now()}`,
      type,
      label: template.label,
      config: {},
      status: 'idle',
    };
    updateWorkflow(wf => {
      const lastNode = wf.nodes[wf.nodes.length - 1];
      const newConnection = lastNode ? { from: lastNode.id, to: newNode.id } : null;
      return {
        ...wf,
        nodes: [...wf.nodes, newNode],
        connections: newConnection ? [...wf.connections, newConnection] : wf.connections,
      };
    });
    setShowCatalog(false);
  };

  const removeNode = (nodeId: string) => {
    updateWorkflow(wf => ({
      ...wf,
      nodes: wf.nodes.filter(n => n.id !== nodeId),
      connections: wf.connections.filter(c => c.from !== nodeId && c.to !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const duplicateNode = (node: WorkflowNode) => {
    const newNode: WorkflowNode = {
      ...node,
      id: `n${Date.now()}`,
      label: `${node.label} (copy)`,
      status: 'idle',
      output: undefined,
    };
    updateWorkflow(wf => ({
      ...wf,
      nodes: [...wf.nodes, newNode],
      connections: [...wf.connections, { from: node.id, to: newNode.id }],
    }));
  };

  const updateNodeLabel = (nodeId: string, label: string) => {
    updateWorkflow(wf => ({
      ...wf,
      nodes: wf.nodes.map(n => n.id === nodeId ? { ...n, label } : n),
    }));
  };

  // Drag-and-drop reordering
  const handleDragStart = (idx: number) => { dragNodeIdxRef.current = idx; };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const srcIdx = dragNodeIdxRef.current;
    if (srcIdx === null || srcIdx === targetIdx) { setDragOverIdx(null); return; }
    updateWorkflow(wf => {
      const nodes = [...wf.nodes];
      const [moved] = nodes.splice(srcIdx, 1);
      nodes.splice(targetIdx, 0, moved);
      // Rebuild connections to preserve order
      const connections: Connection[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        const existing = wf.connections.find(c => c.from === nodes[i].id && c.to === nodes[i + 1].id);
        if (existing) connections.push(existing);
        else connections.push({ from: nodes[i].id, to: nodes[i + 1].id });
      }
      return { ...wf, nodes, connections };
    });
    setDragOverIdx(null);
    dragNodeIdxRef.current = null;
  };

  // Simulate workflow execution
  const runWorkflow = async () => {
    setIsRunning(true);
    setRunLog([]);
    const nodes = activeWorkflow.nodes;

    // Reset statuses
    updateWorkflow(wf => ({ ...wf, nodes: wf.nodes.map(n => ({ ...n, status: 'idle', output: undefined })) }));

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      setRunLog(prev => [...prev, `▶ Running: ${node.label}...`]);

      // Set node to running
      updateWorkflow(wf => ({
        ...wf,
        nodes: wf.nodes.map(n => n.id === node.id ? { ...n, status: 'running' } : n),
      }));

      await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

      // Simulate result
      const success = Math.random() > 0.1;
      const outputs: Record<NodeType, string> = {
        trigger: `Triggered at ${new Date().toLocaleTimeString()}`,
        requirements: `Parsed 12 requirements, 3 user stories, 2 epics`,
        testgen: `Generated 18 test cases (14 functional, 4 edge case)`,
        feasibility: `Feasibility score: 84% — 16 automatable, 2 manual`,
        scriptgen: `Generated 3 Robot Framework .robot files (248 lines)`,
        execute: `Executed 18 tests: 15 passed ✓, 2 failed ✗, 1 skipped`,
        defect: `Raised 2 defects: DEF-001 (High), DEF-002 (Medium)`,
        performance: `Avg: 142ms, P95: 298ms, TPS: 84.5, Errors: 0.12%`,
        security: `Found 3 findings: 1 Critical (SQL Injection), 2 Medium`,
        'ai-review': `AI Gate: PASSED — quality score 87/100`,
        report: `Report generated: sprint-quality-report.html (24KB)`,
        notify: `Notification sent to #qa-team via Slack`,
        condition: `Condition evaluated: ${Math.random() > 0.5 ? 'TRUE → path A' : 'FALSE → path B'}`,
      };

      updateWorkflow(wf => ({
        ...wf,
        nodes: wf.nodes.map(n => n.id === node.id
          ? { ...n, status: success ? 'done' : 'error', output: success ? outputs[node.type] : 'Error: Step failed — check configuration' }
          : n),
      }));

      setRunLog(prev => [
        ...prev,
        success
          ? `  ✅ ${node.label}: ${outputs[node.type]}`
          : `  ❌ ${node.label}: FAILED`
      ]);

      if (!success && node.type !== 'condition') {
        setRunLog(prev => [...prev, `⛔ Workflow halted at: ${node.label}`]);
        // Mark remaining as skipped
        updateWorkflow(wf => ({
          ...wf,
          nodes: wf.nodes.map((n, idx) => idx > i ? { ...n, status: 'skipped' } : n),
        }));
        break;
      }
    }

    setRunLog(prev => [...prev, `\n✔ Workflow "${activeWorkflow.name}" completed at ${new Date().toLocaleTimeString()}`]);
    setIsRunning(false);
  };

  const exportWorkflow = () => {
    const blob = new Blob([JSON.stringify(activeWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeWorkflow.name.replace(/\s+/g, '_')}.workflow.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const createNewWorkflow = () => {
    if (!newWfName.trim()) return;
    const wf: Workflow = {
      id: `wf-${Date.now()}`,
      name: newWfName.trim(),
      createdAt: new Date().toISOString(),
      nodes: [
        { id: 'n1', type: 'trigger', label: 'Trigger', config: { schedule: 'on_demand' }, status: 'idle' }
      ],
      connections: [],
    };
    setWorkflows(prev => [...prev, wf]);
    setActiveWorkflowId(wf.id);
    setNewWfName('');
    setShowNewWorkflow(false);
  };

  const selectedNode = activeWorkflow.nodes.find(n => n.id === selectedNodeId);
  const categories = [...new Set(NODE_CATALOG.map(n => n.category))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:16,borderBottom:'1px solid #E2E8F0'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#7c3aed 0%,#2563eb 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <GitBranch style={{width:20,height:20,color:'#ffffff'}} />
          </div>
          <div>
            <h1 style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:20,fontWeight:700,color:'#0F172A',lineHeight:1,margin:0}}>Agentic Workflow Builder</h1>
            <p style={{fontFamily:'"Inter",Arial,sans-serif',fontSize:13,color:'#475569',margin:'3px 0 0'}}>Drag-and-drop pipeline builder for end-to-end QA automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold hover:bg-slate-100 transition-all">
            <Download className="w-3.5 h-3.5" /> Export .json
          </button>
          <button
            onClick={runWorkflow}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono transition-all disabled:opacity-60 shadow-sm"
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Running...' : 'Run Workflow'}
          </button>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {workflows.map(wf => (
          <button
            key={wf.id}
            onClick={() => { setActiveWorkflowId(wf.id); setSelectedNodeId(null); setRunLog([]); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeWorkflowId === wf.id
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-purple-300'
            }`}
          >
            {wf.name}
          </button>
        ))}
        {showNewWorkflow ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newWfName}
              onChange={e => setNewWfName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createNewWorkflow(); if (e.key === 'Escape') setShowNewWorkflow(false); }}
              placeholder="Workflow name..."
              className="px-2 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button onClick={createNewWorkflow} className="p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowNewWorkflow(false)} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewWorkflow(true)}
            className="flex items-center gap-1 px-2 py-1.5 border border-dashed border-slate-300 text-slate-400 hover:text-purple-600 hover:border-purple-300 rounded-lg text-xs font-mono transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Left: Node Catalog */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowCatalog(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-500" />
                Add Step / Node
              </div>
              {showCatalog ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showCatalog && (
              <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat}>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1.5">{cat}</span>
                    <div className="space-y-1">
                      {NODE_CATALOG.filter(n => n.category === cat).map(node => (
                        <button
                          key={node.type}
                          onClick={() => addNodeFromCatalog(node.type)}
                          className="w-full flex items-start gap-2.5 p-2 rounded-xl border border-slate-100 bg-slate-50 hover:border-purple-200 hover:bg-purple-50/50 transition-all text-left"
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: `${node.color}18`, border: `1px solid ${node.color}30` }}>
                            <node.icon className="w-3.5 h-3.5" style={{ color: node.color }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 font-mono">{node.label}</div>
                            <div className="text-[9px] text-slate-400 leading-tight">{node.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected node inspector */}
          {selectedNode && (
            <div className="bg-white border border-purple-200 rounded-2xl shadow-sm p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-purple-600 font-bold">Node Inspector</span>
                <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-0.5">Label</label>
                  <input
                    value={selectedNode.label}
                    onChange={e => updateNodeLabel(selectedNode.id, e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-0.5">Type</label>
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">{selectedNode.type}</span>
                </div>
                {selectedNode.output && (
                  <div>
                    <label className="text-[9px] font-mono uppercase text-slate-400 font-bold block mb-0.5">Last Output</label>
                    <div className="bg-slate-950 text-green-400 text-[10px] font-mono px-2 py-1.5 rounded-lg leading-relaxed">
                      {selectedNode.output}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => duplicateNode(selectedNode)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono font-bold text-slate-600 hover:bg-slate-100 transition-all">
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <button onClick={() => removeNode(selectedNode.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-50 border border-red-200 rounded-lg text-[10px] font-mono font-bold text-red-600 hover:bg-red-100 transition-all">
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: Canvas */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-purple-500" />
                {activeWorkflow.name} · {activeWorkflow.nodes.length} nodes
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                Drag rows to reorder · Click to inspect
              </span>
            </div>

            <div className="p-4 space-y-1 min-h-[400px]">
              {activeWorkflow.nodes.map((node, idx) => {
                const template = NODE_CATALOG.find(n => n.type === node.type)!;
                const isSelected = selectedNodeId === node.id;
                const isDragTarget = dragOverIdx === idx;

                const statusIcon = {
                  idle: <Circle className="w-3.5 h-3.5 text-slate-300" />,
                  running: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
                  done: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
                  error: <X className="w-3.5 h-3.5 text-red-500" />,
                  skipped: <Circle className="w-3.5 h-3.5 text-slate-300 opacity-30" />,
                }[node.status || 'idle'];

                return (
                  <div key={node.id}>
                    {idx > 0 && (
                      <div className="flex items-center justify-center py-0.5">
                        <div className="flex flex-col items-center">
                          <div className="w-px h-3 bg-slate-300" />
                          {activeWorkflow.connections.find(c => c.from === activeWorkflow.nodes[idx - 1].id && c.to === node.id)?.label && (
                            <span className="text-[8px] font-mono bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">
                              {activeWorkflow.connections.find(c => c.from === activeWorkflow.nodes[idx - 1].id && c.to === node.id)?.label}
                            </span>
                          )}
                          <ArrowRight className="w-3 h-3 text-slate-300 rotate-90" />
                        </div>
                      </div>
                    )}
                    <div
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, idx)}
                      onDrop={e => handleDrop(e, idx)}
                      onDragEnd={() => setDragOverIdx(null)}
                      onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isDragTarget ? 'border-purple-400 bg-purple-50 scale-[1.01]' :
                        isSelected ? 'border-purple-400 bg-purple-50/50 shadow-sm' :
                        node.status === 'done' ? 'border-green-200 bg-green-50/50' :
                        node.status === 'error' ? 'border-red-200 bg-red-50/50' :
                        node.status === 'running' ? 'border-blue-300 bg-blue-50/50 animate-pulse' :
                        node.status === 'skipped' ? 'border-slate-100 bg-slate-50 opacity-40' :
                        'border-slate-200 bg-white hover:border-purple-200 hover:bg-purple-50/30'
                      }`}
                    >
                      {/* Drag handle */}
                      <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0 cursor-grab" />

                      {/* Node icon */}
                      {template && (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${template.color}18`, border: `1.5px solid ${template.color}30` }}>
                          <template.icon className="w-4 h-4" style={{ color: template.color }} />
                        </div>
                      )}

                      {/* Label + step number */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Step {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 font-sans truncate">{node.label}</span>
                        </div>
                        {node.output && (
                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{node.output}</div>
                        )}
                      </div>

                      {/* Status icon */}
                      <div className="flex-shrink-0">{statusIcon}</div>
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {activeWorkflow.nodes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <GitBranch className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">Empty workflow</p>
                  <p className="text-xs text-slate-300 mt-1">Add steps from the catalog on the left</p>
                </div>
              )}

              {/* Add step button */}
              <button
                onClick={() => setShowCatalog(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 hover:border-purple-300 rounded-xl text-xs font-mono text-slate-400 hover:text-purple-600 transition-all mt-2"
              >
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>
          </div>
        </div>

        {/* Right: Run Log */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : runLog.length ? 'bg-slate-400' : 'bg-slate-600'}`} />
                <span className="text-[10px] font-mono font-bold text-slate-300">Execution Log</span>
              </div>
              {runLog.length > 0 && (
                <button onClick={() => setRunLog([])} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="p-3 min-h-[200px] max-h-[420px] overflow-y-auto font-mono text-[10px] space-y-0.5">
              {runLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-600">
                  <Play className="w-6 h-6 mb-2" />
                  <span>Click "Run Workflow" to execute</span>
                </div>
              ) : runLog.map((line, i) => (
                <div key={i} className={`leading-relaxed whitespace-pre-wrap ${
                  line.includes('✅') ? 'text-green-400' :
                  line.includes('❌') || line.includes('⛔') ? 'text-red-400' :
                  line.includes('▶') ? 'text-blue-400' :
                  line.includes('✔') ? 'text-emerald-400 font-bold' :
                  'text-slate-400'
                }`}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          {!isRunning && activeWorkflow.nodes.some(n => n.status !== 'idle') && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Run Summary</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Done', count: activeWorkflow.nodes.filter(n => n.status === 'done').length, color: 'text-green-600' },
                  { label: 'Failed', count: activeWorkflow.nodes.filter(n => n.status === 'error').length, color: 'text-red-600' },
                  { label: 'Skipped', count: activeWorkflow.nodes.filter(n => n.status === 'skipped').length, color: 'text-slate-400' },
                  { label: 'Total', count: activeWorkflow.nodes.length, color: 'text-slate-700' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className={`text-lg font-extrabold ${s.color}`}>{s.count}</div>
                    <div className="text-[9px] font-mono text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
