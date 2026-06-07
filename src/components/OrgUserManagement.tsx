import React, { useState, useEffect, useCallback } from 'react';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  last_login?: string;
  invite_token?: string;
}

interface LicenseSeat {
  total_seats: number;
  used_seats: number;
  available_seats: number;
  plan_name: string;
  expires_at?: string;
}

const ROLE_OPTIONS = [
  { value: 'org_admin',   label: 'Org Admin',    desc: 'Full org management access',         color: '#6366f1' },
  { value: 'qa_lead',     label: 'QA Lead',      desc: 'Manage test plans and teams',         color: '#f59e0b' },
  { value: 'qa_engineer', label: 'QA Engineer',  desc: 'Create and run tests',                color: '#22c55e' },
  { value: 'viewer',      label: 'Viewer',       desc: 'Read-only access',                    color: '#6b7280' },
];

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e', invited: '#f59e0b', suspended: '#ef4444', inactive: '#6b7280',
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '9px 13px', color: '#e2e8f0', fontSize: 13,
  width: '100%', boxSizing: 'border-box', outline: 'none',
};
const selStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', outline: 'none',
};
const btnStyle = (color: string): React.CSSProperties => ({
  background: color + '22', border: `1px solid ${color}44`, color,
  borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
});

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
    }}>{label}</span>
  );
}

export default function OrgUserManagement({ token }: { token: string }) {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [seats, setSeats] = useState<LicenseSeat | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('qa_engineer');
  const [inviteName, setInviteName] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<OrgUser | null>(null);

  const API = (window as any).__API_BASE__ || '';
  const authH = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usrRes, seatRes] = await Promise.all([
        fetch(`${API}/api/tenant/users`, { headers: authH() }),
        fetch(`${API}/api/tenant/license-seats`, { headers: authH() }),
      ]);
      if (usrRes.ok) setUsers(await usrRes.json());
      if (seatRes.ok) setSeats(await seatRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const inviteUser = async () => {
    if (!inviteEmail) return showToast('Email is required', 'error');
    const r = await fetch(`${API}/api/tenant/users/invite`, {
      method: 'POST', headers: authH(),
      body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
    });
    if (r.ok) {
      showToast(`Invitation sent to ${inviteEmail}`);
      setInviteEmail(''); setInviteName(''); setInviteRole('qa_engineer'); setShowInvite(false);
      fetchData();
    } else {
      const err = await r.json().catch(() => ({}));
      showToast(err.error || 'Failed to invite user', 'error');
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    const r = await fetch(`${API}/api/tenant/users/${userId}/role`, {
      method: 'PATCH', headers: authH(), body: JSON.stringify({ role }),
    });
    if (r.ok) { showToast('Role updated'); fetchData(); } else showToast('Failed to update role', 'error');
  };

  const updateUserStatus = async (userId: string, status: string) => {
    const r = await fetch(`${API}/api/tenant/users/${userId}/status`, {
      method: 'PATCH', headers: authH(), body: JSON.stringify({ status }),
    });
    if (r.ok) { showToast(`User ${status}`); fetchData(); } else showToast('Failed', 'error');
  };

  const removeUser = async (userId: string, email: string) => {
    if (!window.confirm(`Remove ${email} from your organisation?`)) return;
    const r = await fetch(`${API}/api/tenant/users/${userId}`, { method: 'DELETE', headers: authH() });
    if (r.ok) { showToast('User removed'); fetchData(); } else showToast('Failed to remove user', 'error');
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(token);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  const filtered = users.filter(u =>
    (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) &&
    (!roleFilter || u.role === roleFilter) &&
    (!statusFilter || u.status === statusFilter)
  );

  const seatPct = seats ? Math.round((seats.used_seats / Math.max(seats.total_seats, 1)) * 100) : 0;

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto', color: '#e2e8f0', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: 10, padding: '12px 20px',
          color: toast.type === 'success' ? '#22c55e' : '#ef4444',
          fontSize: 14, fontWeight: 500, backdropFilter: 'blur(10px)',
        }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>👥 User Management</div>
          <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Manage your organisation's users, roles, and license seats</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchData} style={{ ...btnStyle('#6b7280'), padding: '8px 14px' }}>
            {loading ? '⟳ Loading…' : '↻ Refresh'}
          </button>
          <button onClick={() => setShowInvite(true)} style={{ ...btnStyle('#6366f1'), padding: '8px 18px' }}>
            + Invite User
          </button>
        </div>
      </div>

      {/* License Seat Meter */}
      {seats && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, marginBottom: 2 }}>🪪 LICENSE SEAT USAGE</div>
              <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>{seats.plan_name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: seatPct >= 90 ? '#ef4444' : seatPct >= 70 ? '#f59e0b' : '#22c55e', fontSize: 22, fontWeight: 700 }}>
                {seats.used_seats} <span style={{ color: '#6b7280', fontSize: 14, fontWeight: 400 }}>/ {seats.total_seats}</span>
              </div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>{seats.available_seats} seats available</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, transition: 'width 0.5s',
              width: `${Math.min(seatPct, 100)}%`,
              background: seatPct >= 90 ? '#ef4444' : seatPct >= 70 ? '#f59e0b' : '#22c55e',
            }} />
          </div>
          {seatPct >= 90 && (
            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>
              ⚠️ Seat limit almost reached. Contact your Super Admin to upgrade the license.
            </div>
          )}
          {seats.expires_at && (
            <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 6 }}>
              License expires: {new Date(seats.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Role Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {ROLE_OPTIONS.map(r => {
          const count = users.filter(u => u.role === r.value).length;
          return (
            <div key={r.value} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.color}33`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => setRoleFilter(roleFilter === r.value ? '' : r.value)}>
              <div style={{ color: r.color, fontSize: 20, fontWeight: 700 }}>{count}</div>
              <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>{r.label}s</div>
              <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{r.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={selStyle}>
          <option value=''>All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selStyle}>
          <option value=''>All Statuses</option>
          <option value='active'>Active</option>
          <option value='invited'>Invited</option>
          <option value='suspended'>Suspended</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>{filtered.length} users</span>
      </div>

      {/* Users Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['User', 'Email', 'Role', 'Status', 'Joined', 'Last Active', 'Actions'].map(h => (
                <th key={h} style={{ color: '#6b7280', fontWeight: 600, textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                  {users.length === 0 ? 'No users yet. Invite your first team member!' : 'No users match the current filters.'}
                </td>
              </tr>
            )}
            {filtered.map(u => (
              <tr key={u.id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${ROLE_OPTIONS.find(r => r.value === u.role)?.color || '#6b7280'}, #1a1a2e)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>{u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}</div>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{u.name || '—'}</span>
                  </div>
                </td>
                <td style={{ padding: '14px', color: '#9ca3af' }}>{u.email}</td>
                <td style={{ padding: '14px' }}>
                  <select
                    value={u.role}
                    onChange={e => updateUserRole(u.id, e.target.value)}
                    style={{ ...selStyle, fontSize: 12, padding: '5px 10px' }}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: '14px' }}>
                  <Badge label={u.status || 'active'} color={STATUS_COLORS[u.status || 'active'] || '#6b7280'} />
                </td>
                <td style={{ padding: '14px', color: '#6b7280', fontSize: 12 }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '14px', color: '#6b7280', fontSize: 12 }}>
                  {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {u.invite_token && (
                      <button
                        onClick={() => copyInviteLink(u.invite_token!)}
                        style={{ ...btnStyle('#f59e0b'), padding: '4px 10px', fontSize: 11 }}
                      >{copiedLink === u.invite_token ? '✅ Copied' : '🔗 Copy Link'}</button>
                    )}
                    {u.status === 'active' && (
                      <button onClick={() => updateUserStatus(u.id, 'suspended')} style={{ ...btnStyle('#f97316'), padding: '4px 10px', fontSize: 11 }}>Suspend</button>
                    )}
                    {u.status === 'suspended' && (
                      <button onClick={() => updateUserStatus(u.id, 'active')} style={{ ...btnStyle('#22c55e'), padding: '4px 10px', fontSize: 11 }}>Activate</button>
                    )}
                    <button onClick={() => removeUser(u.id, u.email)} style={{ ...btnStyle('#ef4444'), padding: '4px 10px', fontSize: 11 }}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>✉️ Invite Team Member</div>
              <button onClick={() => setShowInvite(false)} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Full Name</label>
                <input
                  placeholder="e.g. Jane Smith"
                  value={inviteName} onChange={e => setInviteName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Email Address *</label>
                <input
                  placeholder="jane@company.com"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  style={inputStyle} type="email"
                />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Assign Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...selStyle, width: '100%' }}>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
              {seats && seats.available_seats <= 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 12 }}>
                  ⚠️ No license seats available. Please upgrade your plan to add more users.
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => setShowInvite(false)} style={{ ...btnStyle('#6b7280') }}>Cancel</button>
                <button
                  onClick={inviteUser}
                  disabled={!inviteEmail || (seats !== null && seats.available_seats <= 0)}
                  style={{ ...btnStyle('#6366f1'), opacity: (!inviteEmail || (seats !== null && seats.available_seats <= 0)) ? 0.5 : 1 }}
                >Send Invitation</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
