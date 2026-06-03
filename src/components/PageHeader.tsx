import React from 'react';

interface PageHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
}

/* ── Slim, elegant page header — replaces verbose dark-gradient banners ── */
export default function PageHeader({ icon: Icon, title, subtitle, badge, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingBottom: 20, marginBottom: 20,
      borderBottom: '1px solid #E2E8F0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #0F172A 0%, #5B6CFF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon style={{ width: 20, height: 20, color: '#ffffff' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{
              fontFamily: '"Inter", Arial, sans-serif',
              fontSize: 20, fontWeight: 700,
              color: '#0F172A', lineHeight: 1, margin: 0
            }}>{title}</h1>
            {badge && (
              <span style={{
                fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10, fontWeight: 700,
                color: '#5B6CFF', background: '#eaf5fd',
                border: '1px solid #b0d9f5',
                borderRadius: 99, padding: '2px 8px',
                textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>{badge}</span>
            )}
          </div>
          {subtitle && (
            <p style={{
              fontFamily: '"Inter", Arial, sans-serif',
              fontSize: 13, color: '#475569',
              margin: '3px 0 0', lineHeight: 1.4
            }}>{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
