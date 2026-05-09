import { Info, X } from 'lucide-react';
import { C } from '<npm>/app/dashboard/_lib/theme';

type Trend = 'up' | 'down' | 'neutral';

export function StatCard({
  label,
  value,
  delta,
  trend = 'up',
  hint = 'vs last month',
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: Trend;
  hint?: string;
}) {
  const trendColor = trend === 'down' ? C.red : trend === 'neutral' ? C.sub : C.green;
  const trendBg    = trend === 'down' ? C.redBg : trend === 'neutral' ? 'rgba(148,163,184,0.1)' : C.greenBg;
  const arrow      = trend === 'down' ? '▼' : trend === 'neutral' ? '•' : '▲';

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, color: C.sub, fontWeight: 500 }}>{label}</span>
          <Info size={11} color={C.muted} />
        </div>
        <X size={12} color={C.muted} style={{ cursor: 'pointer' }} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.text, lineHeight: 1, marginBottom: 12 }}>
        {value}
      </div>
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: trendColor,
              background: trendBg,
              borderRadius: 20,
              padding: '2px 8px',
            }}
          >
            {arrow} {delta}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>{hint}</span>
        </div>
      )}
    </div>
  );
}
