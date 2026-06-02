/**
 * ProjectContextBar — universal sticky top-of-module banner
 * Shows: active project (icon + name + color), sprint badge, inline project switcher
 * Appears in: Requirements, TestCases, Scripts, Execution, Dashboard, Traceability,
 *             Performance, Security, Defects, RAG KB
 *
 * Props:
 *   currentProjectId   — currently selected project id (or 'ALL')
 *   currentSprintId    — currently selected sprint id (or '')
 *   projects           — array of {id, name, icon, color, status} from DB
 *   sprints            — array of {id, project_id, name, status} for current project
 *   onChangeProject    — callback when user picks a different project
 *   onChangeSprint     — callback when user picks a different sprint
 *   onGoToProjectHub   — navigate to Project Hub
 *   moduleName         — e.g. "Requirements" — shown as context label
 *   saving             — optional: show a thin pulsing bar when saving
 */

import React, { useState } from 'react';
import { FolderOpen, ChevronDown, Plus, AlertCircle, CheckCircle } from 'lucide-react';

export interface ProjectMeta {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: string;
}

export interface SprintMeta {
  id: string;
  project_id: string;
  name: string;
  status: string;
}

interface ProjectContextBarProps {
  currentProjectId: string;
  currentSprintId?: string;
  projects: ProjectMeta[];
  sprints?: SprintMeta[];
  onChangeProject: (id: string) => void;
  onChangeSprint?: (id: string) => void;
  onGoToProjectHub?: () => void;
  moduleName: string;
  saving?: boolean;
}

export default function ProjectContextBar({
  currentProjectId,
  currentSprintId = '',
  projects,
  sprints = [],
  onChangeProject,
  onChangeSprint,
  onGoToProjectHub,
  moduleName,
  saving = false,
}: ProjectContextBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const activeProject = projects.find(p => p.id === currentProjectId);
  const activeSprint = sprints.find(s => s.id === currentSprintId);
  const projectSprints = sprints.filter(s => s.project_id === currentProjectId);

  const isAllProjects = currentProjectId === 'ALL' || !currentProjectId;
  const color = activeProject?.color || '#1e96df';

  const sprintStatusIcon = (s: string) => ({ active: '🟢', planning: '📋', completed: '✅', cancelled: '⏸' }[s] || '📋');

  return (
    <div style={{
      fontFamily: '"Lato", Arial, sans-serif',
      marginBottom: 20,
      borderRadius: 12,
      border: `1.5px solid ${isAllProjects ? '#dbe2ea' : color + '40'}`,
      background: isAllProjects ? '#f8fafc' : color + '08',
      overflow: 'visible',
      position: 'relative',
    }}>
      {/* Saving indicator — thin animated top border */}
      {saving && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '12px 12px 0 0', background: `linear-gradient(90deg, transparent, ${color}, transparent)`, animation: 'pulse 1.5s infinite' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', flexWrap: 'wrap', gap: 10 }}>

        {/* Module label */}
        <div style={{ fontSize: 10, fontWeight: 700, color: '#a6b4cd', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
          {moduleName}
        </div>

        <div style={{ width: 1, height: 16, background: '#dbe2ea', flexShrink: 0 }} />

        {/* Project selector */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px 5px 8px',
              borderRadius: 8,
              border: `1px solid ${isAllProjects ? '#dbe2ea' : color + '50'}`,
              background: isAllProjects ? '#fff' : color + '12',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: isAllProjects ? '#6b82ab' : '#1f3965',
              transition: 'all 0.15s',
            }}
          >
            {isAllProjects ? (
              <>
                <FolderOpen style={{ width: 14, height: 14, color: '#6b82ab' }} />
                <span style={{ color: '#6b82ab' }}>All Projects</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{activeProject?.icon || '📁'}</span>
                <span style={{ color: color, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeProject?.name || currentProjectId}
                </span>
              </>
            )}
            <ChevronDown style={{ width: 13, height: 13, color: '#6b82ab', flexShrink: 0 }} />
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4,
              background: '#fff', border: '1px solid #dbe2ea', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(31,57,101,0.14)',
              zIndex: 200, minWidth: 220, overflow: 'hidden',
            }}>
              {/* All projects option */}
              <button
                onClick={() => { onChangeProject('ALL'); setShowDropdown(false); }}
                style={{
                  width: '100%', padding: '9px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  background: isAllProjects ? '#f0f7ff' : '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: isAllProjects ? 700 : 500, color: isAllProjects ? '#1e96df' : '#1f3965',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <FolderOpen style={{ width: 14, height: 14, color: '#6b82ab' }} />
                All Projects
              </button>

              {/* Project list */}
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onChangeProject(p.id); setShowDropdown(false); }}
                  style={{
                    width: '100%', padding: '9px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    background: currentProjectId === p.id ? p.color + '10' : '#fff',
                    border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: currentProjectId === p.id ? 700 : 500,
                    color: currentProjectId === p.id ? p.color : '#1f3965',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.12s',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{p.icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {currentProjectId === p.id && <CheckCircle style={{ width: 13, height: 13, color: p.color, flexShrink: 0 }} />}
                </button>
              ))}

              {/* Create new project */}
              {onGoToProjectHub && (
                <button
                  onClick={() => { setShowDropdown(false); onGoToProjectHub(); }}
                  style={{
                    width: '100%', padding: '9px 14px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    background: '#f8fafc', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: '#1e96df',
                    borderTop: '1px solid #dbe2ea',
                  }}
                >
                  <Plus style={{ width: 13, height: 13 }} />
                  Create New Project…
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sprint selector — only when a specific project is selected */}
        {!isAllProjects && onChangeSprint && (
          <>
            <div style={{ width: 1, height: 16, background: '#dbe2ea', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <select
                value={currentSprintId}
                onChange={e => onChangeSprint(e.target.value)}
                style={{
                  border: `1px solid ${activeSprint ? color + '50' : '#dbe2ea'}`,
                  borderRadius: 7, padding: '4px 10px',
                  fontSize: 12, fontWeight: 600,
                  color: activeSprint ? '#1f3965' : '#6b82ab',
                  background: activeSprint ? color + '08' : '#fff',
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="">No Sprint</option>
                {projectSprints.map(s => (
                  <option key={s.id} value={s.id}>
                    {sprintStatusIcon(s.status)} {s.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Active project status badge */}
        {!isAllProjects && activeProject && (
          <span style={{
            fontSize: 10, padding: '3px 9px', borderRadius: 20,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            background: activeProject.status === 'active' ? '#f0fdf4' : activeProject.status === 'planning' ? '#eff6ff' : '#f8f8f8',
            color: activeProject.status === 'active' ? '#166534' : activeProject.status === 'planning' ? '#1d4ed8' : '#6b7280',
            border: `1px solid ${activeProject.status === 'active' ? '#bbf7d0' : activeProject.status === 'planning' ? '#bfdbfe' : '#e5e7eb'}`,
            flexShrink: 0,
          }}>
            {activeProject.status}
          </span>
        )}

        {/* Warning when ALL projects selected */}
        {isAllProjects && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#f59e0b', flexShrink: 0 }}>
            <AlertCircle style={{ width: 13, height: 13 }} />
            <span>Select a project — new items will be saved under it</span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Go to Project Hub button */}
        {onGoToProjectHub && (
          <button
            onClick={onGoToProjectHub}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 7,
              border: '1px solid #dbe2ea', background: '#f8fafc',
              fontSize: 11, fontWeight: 600, color: '#6b82ab',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.12s',
            }}
          >
            <FolderOpen style={{ width: 12, height: 12 }} />
            Project Hub
          </button>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {showDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
