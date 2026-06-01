import React, { useState } from 'react';
import { Play, RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, Settings2, UserCheck, Zap } from 'lucide-react';
import { AgentStep } from '../types';

interface VisualizerProps {
  activeSteps: AgentStep[];
  currentRunId: string;
  onOverrideConfirm: (stepId: string) => void;
  isRunning: boolean;
  onTriggerRun: () => void;
}

export default function AgentFlowVisualizer({
  activeSteps,
  currentRunId,
  onOverrideConfirm,
  isRunning,
  onTriggerRun,
}: VisualizerProps) {
  const [selectedStep, setSelectedStep] = useState<string | null>("req-agent");
  const [overrideFlags, setOverrideFlags] = useState<{ [key: string]: boolean }>({});

  const currentStepData = activeSteps.find(s => s.id === selectedStep);

  const toggleOverride = (stepId: string) => {
    setOverrideFlags(prev => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
    onOverrideConfirm(stepId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Step Sequence Flow */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sans font-semibold text-lg text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-650" />
              Agentic Pipeline Orchestrator
            </h3>
            <p className="text-xs text-slate-500 font-mono">Run ID: {currentRunId || "Standby"}</p>
          </div>
          
          <button
            onClick={onTriggerRun}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs font-mono transition-all ${
              isRunning 
                ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/10'
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                Agents Active
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Execute Autonomous Cycle
              </>
            )}
          </button>
        </div>

        {/* Pipeline Map */}
        <div className="flex flex-col md:flex-row gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          {activeSteps.map((step, idx) => {
            const isCurrent = step.status === 'running';
            const isDone = step.status === 'completed';
            const isFailed = step.status === 'failed';
            const isSelected = selectedStep === step.id;

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => setSelectedStep(step.id)}
                  className={`flex-1 min-w-[140px] cursor-pointer rounded-xl p-3 border transition-all duration-200 ${
                    isSelected 
                      ? 'bg-purple-50/70 border-purple-500 shadow-sm' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-slate-400">Node {idx + 1}</span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {isCurrent && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
                      </span>
                    )}
                    {isFailed && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                    {step.status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                    {step.status === 'skipped' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                  </div>

                  <h4 className="text-xs font-semibold text-slate-800 truncate">{step.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{step.agentName}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${
                      isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                      isCurrent ? 'bg-purple-100 text-purple-700 border-purple-200 animate-pulse' :
                      isFailed ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {step.status.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">{step.progress}%</span>
                  </div>
                </div>
                {idx < activeSteps.length - 1 && (
                  <div className="hidden md:flex items-center text-slate-300">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
        {currentStepData ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Agent Diagnostics</h4>
              <span className="text-[10px] text-purple-700 font-mono bg-purple-50 px-20 py-0.5 rounded-full border border-purple-200">
                Active Node
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">{currentStepData.name}</h3>
              <p className="text-xs text-slate-650 mt-1">{currentStepData.description}</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-600">
                <span>Orchestrator Role:</span>
                <span className="text-purple-700 font-semibold">{currentStepData.agentName}</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-600">
                <span>Node Progress:</span>
                <span className="font-semibold text-slate-800">{currentStepData.progress}%</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-600">
                <span>Verification State:</span>
                <span className={currentStepData.status === 'completed' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                  {currentStepData.status === 'completed' ? 'Validated ✔' : 'Observing'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-bold flex items-center justify-between">
                <span>Agent Output Logs:</span>
                <span className="text-[9px] text-slate-400 font-mono">READONLY</span>
              </label>
              <div className="bg-slate-950 border border-slate-850 text-slate-300 text-[10px] font-mono p-2.5 rounded-lg h-28 overflow-y-auto leading-relaxed">
                {currentStepData.output || `[${new Date().toLocaleTimeString()}] Listening for trigger parameters...`}
              </div>
            </div>

            {/* Manual Override Option */}
            <div className="pt-2 border-t border-slate-205">
              <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg shadow-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  <div>
                    <h5 className="text-[11px] font-semibold text-slate-800">Manual Approval Gate</h5>
                    <p className="text-[9px] text-slate-450">Require approval before next step</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={overrideFlags[currentStepData.id] || false}
                  onChange={() => toggleOverride(currentStepData.id)}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 bg-white focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs font-mono">
            Select an Agent node to inspect logs
          </div>
        )}
      </div>
    </div>
  );
}

// Compact helper Button
function Button({ children, className, onClick, disabled }: { children: React.ReactNode; className?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
