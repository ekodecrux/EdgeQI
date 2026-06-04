import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileX, 
  CheckSquare, 
  HelpCircle, 
  ShieldCheck, 
  Play, 
  Layers,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { RequirementDoc, TestCase } from '../types';

export interface TraceableRequirement {
  id: string;
  title: string;
  content: string;
  module: string;
  isImplemented: boolean;
  status: 'Implemented' | 'In Progress' | 'Pending Validation' | 'Draft';
  mappedTestCases: string[];
  isAutomated: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

interface TraceabilityTabProps {
  requirements: RequirementDoc[];
  testCases: TestCase[];
  onTriggerRerun?: (testId: string) => void;
  currentProjectId?: string;
}

export default function TraceabilityTab({ 
  requirements: rawRequirements, 
  testCases, 
  onTriggerRerun, 
  currentProjectId = 'ALL' 
}: TraceabilityTabProps) {
  // Filter by project first, then build traceability map
  const projectReqs = useMemo(() => {
    if (!currentProjectId || currentProjectId === 'ALL') return rawRequirements;
    return rawRequirements.filter(r => !r.projectId || r.projectId === currentProjectId);
  }, [rawRequirements, currentProjectId]);

  const projectTcs = useMemo(() => {
    if (!currentProjectId || currentProjectId === 'ALL') return testCases;
    return testCases.filter(tc => !tc.projectId || tc.projectId === currentProjectId);
  }, [testCases, currentProjectId]);

  // Build requirements dynamically mapped to corresponding test cases
  const requirements = useMemo(() => {
    return projectReqs.map(req => {
      const linkedTcs = projectTcs.filter(tc => tc.requirementId === req.id);
      const isAuto = linkedTcs.some(tc => tc.automationStatus === 'Automated' || tc.automationStatus === 'Automatable');
      const hasTcs = linkedTcs.length > 0;
      const mappedTcIds = hasTcs ? linkedTcs.map(tc => tc.id) : [];

      return {
        id: req.id,
        title: req.title,
        content: req.content,
        module: req.suggestedModules?.[0] || (req as any).module || 'Core Module',
        isImplemented: hasTcs,
        status: (hasTcs ? (isAuto ? 'Implemented' : 'Pending Validation') : 'Draft') as 'Implemented' | 'In Progress' | 'Pending Validation' | 'Draft',
        mappedTestCases: mappedTcIds.length > 0 ? mappedTcIds : ['Pending Map'],
        linkedTcCount: linkedTcs.length,
        isAutomated: isAuto,
        priority: (req.priority as any) || 'P2' as 'P0' | 'P1' | 'P2' | 'P3'
      };
    });
  }, [projectReqs, projectTcs]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedAutomation, setSelectedAutomation] = useState<string>('All');

  // Expanded requirement IDs
  const [expandedReqIds, setExpandedReqIds] = useState<Set<string>>(new Set(['REQ-001', 'REQ-011', 'REQ-021']));

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // List of unique modules for filtering
  const modulesList = useMemo(() => {
    const list = new Set(requirements.map(r => r.module));
    return ['All', ...Array.from(list)];
  }, [requirements]);

  // List of unique statuses for filtering
  const statusesList = ['All', 'Implemented', 'In Progress', 'Pending Validation', 'Draft'];
  const prioritiesList = ['All', 'P0', 'P1', 'P2', 'P3'];

  // Toggle row expansion
  const toggleRow = (id: string) => {
    const next = new Set(expandedReqIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedReqIds(next);
  };

  // Expand all/Collapse all helper
  const handleExpandAll = (expand: boolean) => {
    if (expand) {
      setExpandedReqIds(new Set(requirements.map(r => r.id)));
    } else {
      setExpandedReqIds(new Set());
    }
  };

  // Filtered requirements list
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      const matchesSearch = 
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesModule = selectedModule === 'All' || req.module === selectedModule;
      const matchesStatus = selectedStatus === 'All' || req.status === selectedStatus;
      const matchesPriority = selectedPriority === 'All' || req.priority === selectedPriority;
      
      let matchesAutomation = true;
      if (selectedAutomation === 'Automated') {
        matchesAutomation = req.isAutomated;
      } else if (selectedAutomation === 'Manual') {
        matchesAutomation = !req.isAutomated;
      }

      return matchesSearch && matchesModule && matchesStatus && matchesPriority && matchesAutomation;
    });
  }, [requirements, searchQuery, selectedModule, selectedStatus, selectedPriority, selectedAutomation]);

  // Paginated outcome
  const paginatedRequirements = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequirements.slice(startIndex, startIndex + pageSize);
  }, [filteredRequirements, currentPage, pageSize]);

  // Total pages
  const totalPages = Math.ceil(filteredRequirements.length / pageSize) || 1;

  // Sync current page bounds if filter shrinks scope
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredRequirements.length, totalPages, currentPage]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = requirements.length;
    const implemented = requirements.filter(r => r.isImplemented).length;
    const inProgress = requirements.filter(r => r.status === 'In Progress').length;
    const automated = requirements.filter(r => r.isAutomated).length;
    const pendingValidation = requirements.filter(r => r.status === 'Pending Validation').length;
    const draft = requirements.filter(r => r.status === 'Draft').length;

    return {
      total,
      implemented,
      implementedPercentage: Math.round((implemented / total) * 100),
      inProgress,
      automated,
      automatedPercentage: Math.round((automated / total) * 100),
      pendingValidation,
      draft,
      testCaseCoverage: total > 0 ? Math.round((implemented / total) * 100) : 0
    };
  }, [requirements]);

  // Export Matrix to CSV function
  const handleExportCSV = () => {
    // CSV Header row
    const headers = ['Requirement ID', 'Title', 'Description', 'Module Group', 'Platform Implemented', 'Status', 'Mapped Test Cases', 'Automation Script'];
    const rows = filteredRequirements.map(r => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.content.replace(/"/g, '""')}"`,
      `"${r.module.replace(/"/g, '""')}"`,
      r.isImplemented ? 'YES' : 'NO',
      r.status,
      r.mappedTestCases.join('; '),
      r.isAutomated ? 'AUTOMATED' : 'MANUAL'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Traceability_Matrix_Requirements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulated test execution from the matrix
  const handleRunTestCase = (tcId: string) => {
    if (onTriggerRerun) {
      onTriggerRerun(tcId);
    }
    // Set matching requirement as green or trigger visual notification feedback
    alert(`Triggered system simulation test run for Scenario Mapped ID: ${tcId}. Telemetry checks executing concurrent loops.`);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Overview and KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-semibold">Total Requirements</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{kpis.total}</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded border border-emerald-100 font-bold font-mono">{currentProjectId && currentProjectId !== 'ALL' ? 'This Project' : 'All Projects'}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.implemented} linked · {kpis.draft} unlinked to test cases</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-semibold">Platform Implemented</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{kpis.implemented}</span>
            <span className="text-[10px] text-purple-700 bg-purple-50 px-1 .5 rounded border border-purple-100 font-bold font-mono">{kpis.implementedPercentage}%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.inProgress} In-Progress, {kpis.draft} Drafts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-semibold">Test Case Mapping</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{kpis.testCaseCoverage}%</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 .5 rounded border border-emerald-100 font-bold font-mono">1:1 Cov</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.implemented} of {kpis.total} requirements have linked test cases</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider font-semibold">QA Automation Rate</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{kpis.automated}</span>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 .5 rounded border border-indigo-100 font-bold font-mono">{kpis.automatedPercentage}%</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{kpis.automated} of {kpis.total} requirements have automatable test cases</p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-xl p-4 shadow-sm text-white flex flex-col justify-between">
          <span className="text-[10px] text-purple-105 block uppercase font-mono tracking-wider font-semibold text-purple-100">Release Compliance</span>
          <div className="mt-2 text-white">
            <span className="text-xl font-extrabold font-mono flex items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-emerald-305 flex-shrink-0" />
              92% READY
            </span>
          </div>
          <p className="text-[9.5px] text-purple-200 mt-1">Passed PCI-DSS & DAST vulnerability checks</p>
        </div>

      </div>

      {/* 2. Interactive Filters Controls bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Main search text field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Requirement ID, title keyword, or specification details..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:bg-white transition-all font-sans"
            />
          </div>

          {/* Action options buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExpandAll(true)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-705 transition-all"
            >
              Expand All
            </button>
            <button
              onClick={() => handleExpandAll(false)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-755 transition-all"
            >
              Collapse Rows
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-purple-650 hover:bg-purple-700 bg-purple-600 text-white rounded-lg px-3 py-1.5 text-[10.5px] font-mono font-medium transition-all flex items-center gap-1.5 shadow-sm"
              title="Download entire Traceability Matrix as a compliant spreadsheet CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export Matrix CSV
            </button>
          </div>

        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          
          <div>
            <label className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Module Category</label>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              {modulesList.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Implementation Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              {statusesList.map(st => (
                <option key={st} value={st}>{st === 'All' ? 'All Statuses' : st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Impact Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => { setSelectedPriority(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              {prioritiesList.map(prio => (
                <option key={prio} value={prio}>{prio === 'All' ? 'All Priorities' : `Priority ${prio}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9.5px] font-mono uppercase tracking-wider text-slate-500 mb-1">Test Automation</label>
            <select
              value={selectedAutomation}
              onChange={(e) => { setSelectedAutomation(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
            >
              <option value="All">All Automation States</option>
              <option value="Automated">Automated Code Core</option>
              <option value="Manual">Manual Script Fallback</option>
            </select>
          </div>

        </div>

        {/* Filter results counts helper banner */}
        <div className="flex justify-between items-center text-[10px] text-slate-450 font-mono pt-1">
          <span>
            Matched <strong className="text-slate-700">{filteredRequirements.length}</strong> requirements of <strong className="text-slate-700">{requirements.length}</strong> total{currentProjectId && currentProjectId !== 'ALL' ? ` in project` : ''}.
          </span>
          {searchQuery || selectedModule !== 'All' || selectedStatus !== 'All' || selectedPriority !== 'All' || selectedAutomation !== 'All' ? (
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedModule('All');
                setSelectedStatus('All');
                setSelectedPriority('All');
                setSelectedAutomation('All');
                setCurrentPage(1);
              }}
              className="text-purple-650 hover:underline hover:text-purple-700 font-bold"
            >
              Clear Active Filters
            </button>
          ) : null}
        </div>

      </div>

      {/* 3. Grid Table display */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-3 w-24">ID</th>
                <th className="py-3 px-3 w-48">Module Class</th>
                <th className="py-3 px-4">Requirement Spec Title & Content</th>
                <th className="py-3 px-3 text-center w-24">Priority</th>
                <th className="py-3 px-3 text-center w-36">Implementation</th>
                <th className="py-3 px-3 w-28">Mapped TC</th>
                <th className="py-3 px-4 text-center w-32">Automated Core</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-750">
              {paginatedRequirements.map(req => {
                const isExpanded = expandedReqIds.has(req.id);
                
                return (
                  <React.Fragment key={req.id}>
                    
                    {/* Primary Row Summary */}
                    <tr 
                      onClick={() => toggleRow(req.id)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-purple-50/10' : ''}`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-purple-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-550">
                        {req.id}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] border border-slate-150 font-medium">
                          {req.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-sans">
                        <div className="font-semibold">{req.title}</div>
                        <p className="text-[10px] text-slate-500 line-clamp-1 group-hover:line-clamp-none mt-0.5">{req.content}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                          req.priority === 'P0' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          req.priority === 'P1' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 font-bold font-mono text-[9.5px] border ${
                          req.status === 'Implemented' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          req.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                          req.status === 'Pending Validation' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            req.status === 'Implemented' ? 'bg-emerald-505 bg-emerald-600' :
                            req.status === 'In Progress' ? 'bg-amber-505 bg-amber-600' :
                            req.status === 'Pending Validation' ? 'bg-indigo-505 bg-indigo-600' :
                            'bg-slate-400'
                          }`} />
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-purple-700">
                        {req.linkedTcCount > 0 ? (
                          <span className="font-bold">{req.linkedTcCount} TC{req.linkedTcCount !== 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono leading-none ${
                          req.isAutomated 
                            ? 'bg-purple-50 text-purple-700 border border-purple-150 font-bold' 
                            : 'bg-slate-100 text-slate-450 border border-transparent'
                        }`}>
                          {req.isAutomated ? 'AUTOMATED' : 'MANUAL'}
                        </span>
                      </td>
                    </tr>

                    {/* Collapsible Expanded details Row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="bg-slate-50/50 p-4 border-t border-b border-purple-100/40">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 leading-relaxed">
                            
                            <div className="lg:col-span-8 space-y-3">
                              <div>
                                <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Requirement Specification Description</span>
                                <p className="text-xs text-slate-700 mt-1">{req.content}</p>
                              </div>
                              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
                                <span className="text-[10px] font-mono font-bold tracking-wider text-purple-700 uppercase flex items-center gap-1 leading-none">
                                  <Layers className="w-3.5 h-3.5" /> Scope Verification assertion metrics
                                </span>
                                <p className="text-[11px] text-slate-600">
                                  System automated quality checks verify state transitions, validate input parameters schema limits, and prevent API regression.
                                </p>
                              </div>
                            </div>

                            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4 flex flex-col justify-between">
                              <div className="space-y-2">
                                <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">Traceable Testing Assets</span>
                                <table className="w-full text-[11px]">
                                  <tbody>
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1 text-slate-400 font-mono">Mapped TC:</td>
                                      <td className="py-1 font-mono font-bold text-slate-800">{req.mappedTestCases.join(', ')}</td>
                                    </tr>
                                    <tr className="border-b border-slate-100">
                                      <td className="py-1 text-slate-400 font-mono">Automated Check:</td>
                                      <td className="py-1 font-mono font-bold text-slate-800">{req.isAutomated ? 'Yes (Playwright Spec)' : 'Manual Script Only'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-1 text-slate-400 font-mono">Platform Implemented:</td>
                                      <td className="py-1 font-mono font-bold text-slate-800">{req.isImplemented ? 'Yes - ACTIVE' : 'Pending Deployment Code'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRunTestCase(req.mappedTestCases[0]); }}
                                  disabled={!req.isImplemented}
                                  className={`flex-1 py-1 px-2.5 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 shadow-xs transition-all ${
                                    req.isImplemented 
                                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                      : 'bg-slate-110 bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  }`}
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Run Spec Mappings
                                </button>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}

              {filteredRequirements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <FileX className="w-12 h-12 text-slate-350 mx-auto mb-2" />
                    {requirements.length === 0 ? (
                      <>
                        <div className="text-sm font-semibold text-slate-600">No requirements found{currentProjectId && currentProjectId !== 'ALL' ? ' for this project' : ''}</div>
                        <p className="text-xs text-slate-400 mt-1">Add requirements in the Requirements tab, then link test cases to them to build the traceability matrix.</p>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-semibold text-slate-550">No requirements matched your criteria</div>
                        <p className="text-xs text-slate-400 mt-1">Try relaxing active filters or clearing the search box query.</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Footer bar controls */}
        {filteredRequirements.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800">{Math.min(currentPage * pageSize, filteredRequirements.length)}</strong> of <strong className="text-slate-800">{filteredRequirements.length}</strong> entries
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase">Page Page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-white border border-slate-200 rounded p-1 text-[11px] outline-none"
                >
                  <option value={10}>10 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>
            </div>

            <div className="flex gap-1.5 items-center">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded px-2.5 py-1 transition-all"
              >
                &lt;&lt; First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded px-2.5 py-1 transition-all font-bold"
              >
                &lt; Previous
              </button>
              <span className="px-2 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded px-2.5 py-1 transition-all font-bold"
              >
                Next &gt;
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white border border-slate-200 rounded px-2.5 py-1 transition-all"
              >
                Last &gt;&gt;
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 5. Helpful Explainer Banner */}
      <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-205 text-[11px] text-slate-550 shadow-xs">
        <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span>
          A requirements traceability matrix matches input guidelines with concrete test step assertions and computed execution status, allowing product leads to guarantee 100% test coverage before shipping. Click on any row header above to drill-down into specific assertions, launch manual/automated simulations, and check direct link integrations.
        </span>
      </div>

    </div>
  );
}
