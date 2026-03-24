import { useStyletron } from "baseui";
import { ReactNode, useState } from "react";
import { StatefulTooltip } from "baseui/tooltip";
import { LineChart, Line, ResponsiveContainer } from "recharts";

/** Conditional color for any percentage value: red <90%, yellow 90–99%, green ≥100% */
export function pctColor(value: number): string {
  if (value >= 100) return '#05944F';
  if (value >= 90) return '#EA8600';
  return '#E11900';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  tooltip?: string;
  onClick?: () => void;
  small?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
}

export function MetricCard({ title, value, subtitle, trend, color, tooltip, onClick, small, sparklineData, sparklineColor }: MetricCardProps) {
  const [css] = useStyletron();
  const card = (
    <div
      onClick={onClick}
      className={css({
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: small ? '12px 16px' : '16px 20px',
        border: '1px solid #E8E8E8',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
        ':hover': onClick ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } : {},
      })}
    >
      <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '4px' })}>
        {title}
      </div>
      <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
        <div className={css({ fontSize: small ? '20px' : '28px', fontFamily: 'UberMove', fontWeight: 700, color: color || '#000', lineHeight: 1.1 })}>
          {value}
          {trend && (
            <span className={css({ fontSize: '14px', marginLeft: '4px', color: trend === 'up' ? '#05944F' : trend === 'down' ? '#E11900' : '#888' })}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
            </span>
          )}
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <div className={css({ width: '60px', height: '24px', flexShrink: 0 })}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData.map((v, i) => ({ v, i }))}>
                <Line type="monotone" dataKey="v" stroke={sparklineColor || color || '#276EF1'} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {subtitle && (
        <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', marginTop: '2px' })}>
          {subtitle}
        </div>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <StatefulTooltip content={tooltip} showArrow>
        {card}
      </StatefulTooltip>
    );
  }
  return card;
}

interface StatusBadgeProps {
  status: 'ahead' | 'on-pace' | 'behind' | 'risk' | 'ramp';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const [css] = useStyletron();
  const colors: Record<string, { bg: string; text: string }> = {
    'ahead': { bg: '#E6F4EA', text: '#137333' },
    'on-pace': { bg: '#E8F0FE', text: '#1967D2' },
    'behind': { bg: '#FEF7E0', text: '#EA8600' },
    'risk': { bg: '#FCE8E6', text: '#C5221F' },
    'ramp': { bg: '#F3E8FD', text: '#7627BB' },
  };
  const c = colors[status] || colors['behind'];
  const defaultLabel = status === 'ahead' ? 'Ahead' : status === 'on-pace' ? 'On Pace' : status === 'behind' ? 'Behind' : status === 'risk' ? 'At Risk' : 'Ramping';

  return (
    <span className={css({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      fontFamily: 'UberMoveText',
      backgroundColor: c.bg,
      color: c.text,
    })}>
      {label || defaultLabel}
    </span>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const [css] = useStyletron();
  return (
    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '24px' })}>
      <div>
        <div className={css({ fontSize: '16px', fontFamily: 'UberMove', fontWeight: 700, color: '#000' })}>{title}</div>
        {subtitle && <div className={css({ fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', marginTop: '2px' })}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, max, color, height = 8 }: { value: number; max: number; color?: string; height?: number }) {
  const [css] = useStyletron();
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || (pct >= 100 ? '#05944F' : pct >= 80 ? '#1967D2' : pct >= 60 ? '#EA8600' : '#E11900');

  return (
    <div className={css({ width: '100%', height: `${height}px`, backgroundColor: '#F0F0F0', borderRadius: '4px', overflow: 'hidden' })}>
      <div className={css({ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: '4px', transition: 'width 0.3s' })} />
    </div>
  );
}

export function InsightCard({ text, type = 'info' }: { text: string; type?: 'info' | 'warning' | 'success' | 'danger' }) {
  const [css] = useStyletron();
  const icons: Record<string, string> = { info: '💡', warning: '⚠️', success: '✅', danger: '🚨' };
  const colors: Record<string, string> = { info: '#666', warning: '#B8860B', success: '#137333', danger: '#C5221F' };

  return (
    <div className={css({
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      fontSize: '12px', fontFamily: 'UberMoveText', color: colors[type] || '#666', lineHeight: '1.4',
      padding: '4px 0',
    })}>
      <span className={css({ flexShrink: 0, fontSize: '11px' })}>{icons[type]}</span>
      <span>{text}</span>
    </div>
  );
}

export function CollapsibleInsights({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  const [css] = useStyletron();
  const [open, setOpen] = useState(false);

  return (
    <div className={css({ marginBottom: '12px', marginTop: '16px' })}>
      <div
        onClick={() => setOpen(!open)}
        className={css({
          display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', userSelect: 'none' as const,
          padding: '6px 10px', backgroundColor: '#FAFAFA',
          borderRadius: '6px', border: '1px solid #E8E8E8',
          ':hover': { backgroundColor: '#F0F0F0' },
        })}
      >
        <span className={css({ fontSize: '10px', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', color: '#888' })}>▶</span>
        <span className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, color: '#333' })}>{title}</span>
        {count !== undefined && count > 0 && (
          <span className={css({ fontSize: '10px', fontWeight: 600, padding: '0px 5px', borderRadius: '8px', backgroundColor: '#276EF1', color: '#FFF' })}>{count}</span>
        )}
        <span className={css({ fontSize: '10px', color: '#999', fontFamily: 'UberMoveText', marginLeft: 'auto' })}>{open ? 'hide' : 'show'}</span>
      </div>
      {open && (
        <div className={css({ padding: '8px 10px', borderLeft: '2px solid #E8E8E8', marginLeft: '14px', marginTop: '4px' })}>
          {children}
        </div>
      )}
    </div>
  );
}