import { useState } from "react";
import { useStyletron } from "baseui";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ReferenceLine,
} from "recharts";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { MetricCard, SectionHeader, InsightCard, CollapsibleInsights } from "../components/SharedUI";
import { repL12WActivity, l12wWeeks, teamL12WActivity, RepName } from "../data/dashboardData";
import { useThresholds } from "../context/ThresholdsContext";

const REP_COLORS: Record<string, string> = {
  Sarah: '#276EF1', Camilia: '#05944F', Kendall: '#EA8600', Sofia: '#E11900',
  Nafisa: '#7627BB', Allen: '#1967D2', Shawna: '#FF6B6B',
};

export default function ActivityL12W({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [radarRep, setRadarRep] = useState<string | null>(null);
  const { thresholds } = useThresholds();
  const numReps = repL12WActivity.length;
  const weeklyCallTarget = selectedRep === 'all' ? thresholds.dailyDials * 5 * numReps : thresholds.dailyDials * 5;

  const reps = selectedRep === 'all' ? repL12WActivity : repL12WActivity.filter(r => r.name === selectedRep);

  // ── Weekly calls line chart data ──
  const weeklyData = l12wWeeks.map((w, i) => {
    const obj: Record<string, string | number> = { name: w };
    if (selectedRep === 'all') {
      obj.teamCalls = teamL12WActivity.weeklyCalls[i];
      obj.target = teamL12WActivity.weeklyExpectations.calls;
    } else {
      obj.calls = reps[0]?.calls[i] || 0;
    }
    return obj;
  });

  // ── Consistency score (CV-based) ──
  const repConsistency = reps.map(r => {
    const activeWeeks = r.calls.filter(c => c > 0);
    if (activeWeeks.length < 3) return { name: r.name, consistency: 0, avgCalls: 0, peakCalls: 0, lowCalls: 0, trend: 'ramp' as const, streak: 0 };
    const avg = activeWeeks.reduce((s, v) => s + v, 0) / activeWeeks.length;
    const variance = activeWeeks.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / activeWeeks.length;
    const cv = Math.sqrt(variance) / avg;
    // Streak: consecutive weeks above average (from most recent)
    let streak = 0;
    for (let i = r.calls.length - 1; i >= 0; i--) {
      if (r.calls[i] >= avg * 0.8) streak++;
      else break;
    }
    return {
      name: r.name,
      consistency: Math.max(0, 100 - cv * 100),
      avgCalls: Math.round(avg),
      peakCalls: Math.max(...activeWeeks),
      lowCalls: Math.min(...activeWeeks),
      trend: cv < 0.3 ? 'consistent' as const : cv < 0.5 ? 'moderate' as const : 'volatile' as const,
      streak,
    };
  }).sort((a, b) => b.consistency - a.consistency);

  // ── Momentum: recent 4W vs prior 4W across multiple metrics ──
  const repMomentum = reps.map(r => {
    const r4Calls = r.calls.slice(-4).reduce((s, v) => s + v, 0);
    const p4Calls = r.calls.slice(4, 8).reduce((s, v) => s + v, 0);
    const r4TP = r.touchpoints.slice(-4).reduce((s, v) => s + v, 0);
    const p4TP = r.touchpoints.slice(4, 8).reduce((s, v) => s + v, 0);
    const r4TT = r.talkTime.slice(-4).reduce((s, v) => s + v, 0);
    const p4TT = r.talkTime.slice(4, 8).reduce((s, v) => s + v, 0);
    const r4Emails = r.emails.slice(-4).reduce((s, v) => s + v, 0);
    const p4Emails = r.emails.slice(4, 8).reduce((s, v) => s + v, 0);
    const r4Brands = r.brands.slice(-4).reduce((s, v) => s + v, 0);
    const p4Brands = r.brands.slice(4, 8).reduce((s, v) => s + v, 0);
    const pctChange = (recent: number, prior: number) => prior > 0 ? ((recent - prior) / prior) * 100 : (recent > 0 ? 100 : 0);
    return {
      name: r.name.split(' ')[0],
      fullName: r.name,
      calls: { recent: r4Calls, prior: p4Calls, change: pctChange(r4Calls, p4Calls) },
      touchpoints: { recent: r4TP, prior: p4TP, change: pctChange(r4TP, p4TP) },
      talkTime: { recent: r4TT, prior: p4TT, change: pctChange(r4TT, p4TT) },
      emails: { recent: r4Emails, prior: p4Emails, change: pctChange(r4Emails, p4Emails) },
      brands: { recent: r4Brands, prior: p4Brands, change: pctChange(r4Brands, p4Brands) },
      overallMomentum: (pctChange(r4Calls, p4Calls) + pctChange(r4TP, p4TP) + pctChange(r4TT, p4TT)) / 3,
    };
  }).sort((a, b) => b.overallMomentum - a.overallMomentum);

  // ── Week-over-week trend per rep (for sparklines) ──
  const wowData = reps.map(r => {
    const weeks = r.calls.map((c, i) => ({
      week: l12wWeeks[i],
      calls: c,
      tp: r.touchpoints[i],
    }));
    const last3 = r.calls.slice(-3);
    const prior3 = r.calls.slice(-6, -3);
    const l3Avg = last3.reduce((s, v) => s + v, 0) / 3;
    const p3Avg = prior3.reduce((s, v) => s + v, 0) / 3;
    const trajectory = p3Avg > 0 ? ((l3Avg - p3Avg) / p3Avg) * 100 : 0;
    return { name: r.name.split(' ')[0], fullName: r.name, weeks, trajectory, l3Avg: Math.round(l3Avg) };
  });

  // ── Cumulative calls over 12W per rep ──
  const cumulativeData = l12wWeeks.map((w, i) => {
    const obj: Record<string, string | number> = { name: w };
    reps.forEach(r => {
      const cum = r.calls.slice(0, i + 1).reduce((s, v) => s + v, 0);
      obj[r.name.split(' ')[0]] = cum;
    });
    return obj;
  });

  // ── Radar data for modal ──
  const maxCalls = Math.max(...repL12WActivity.map(r => r.totalCalls));
  const maxTT = Math.max(...repL12WActivity.map(r => r.totalTalkTime));
  const maxEmails = Math.max(...repL12WActivity.map(r => r.totalEmails));
  const maxTP = Math.max(...repL12WActivity.map(r => r.totalTouchpoints));
  const maxBrands = Math.max(...repL12WActivity.map(r => r.brands.reduce((s, v) => s + v, 0)));
  const selectedRadarRep = radarRep ? repL12WActivity.find(r => r.name === radarRep) : null;
  const radarData = selectedRadarRep ? [
    { metric: 'Calls', value: Math.round((selectedRadarRep.totalCalls / maxCalls) * 100), raw: selectedRadarRep.totalCalls.toLocaleString() },
    { metric: 'Talk Time', value: Math.round((selectedRadarRep.totalTalkTime / maxTT) * 100), raw: `${selectedRadarRep.totalTalkTime.toFixed(1)}h` },
    { metric: 'Emails', value: Math.round((selectedRadarRep.totalEmails / maxEmails) * 100), raw: selectedRadarRep.totalEmails.toLocaleString() },
    { metric: 'Touchpoints', value: Math.round((selectedRadarRep.totalTouchpoints / maxTP) * 100), raw: selectedRadarRep.totalTouchpoints.toLocaleString() },
    { metric: 'Brands', value: Math.round((selectedRadarRep.brands.reduce((s, v) => s + v, 0) / maxBrands) * 100), raw: selectedRadarRep.brands.reduce((s, v) => s + v, 0).toLocaleString() },
  ] : [];

  // ── Insights ──
  const insights: string[] = [];
  const consistent = repConsistency.filter(r => r.trend === 'consistent');
  if (consistent.length > 0) insights.push(`${consistent.map(r => r.name.split(' ')[0]).join(', ')} ${consistent.length === 1 ? 'shows' : 'show'} consistent activity — reliable performers.`);
  const volatile = repConsistency.filter(r => r.trend === 'volatile');
  if (volatile.length > 0) insights.push(`${volatile.map(r => r.name.split(' ')[0]).join(', ')} ${volatile.length === 1 ? 'is' : 'are'} volatile — need habit-building coaching.`);
  const surging = repMomentum.filter(r => r.overallMomentum > 20);
  if (surging.length > 0) insights.push(`${surging.map(r => r.name).join(', ')} surging — momentum up significantly over prior period.`);
  const fading = repMomentum.filter(r => r.overallMomentum < -30 && r.calls.prior > 100);
  if (fading.length > 0) insights.push(`${fading.map(r => r.name).join(', ')} fading — recent output well below prior period.`);

  const changeBadge = (change: number) => (
    <span className={css({
      fontFamily: 'UberMoveText', fontWeight: 700, fontSize: '11px',
      color: change >= 0 ? '#05944F' : '#E11900',
      padding: '1px 6px', borderRadius: '4px',
      backgroundColor: change >= 0 ? '#E6F4EA' : '#FFEBEE',
    })}>
      {change >= 0 ? '+' : ''}{change.toFixed(0)}%
    </span>
  );

  return (
    <div>
      {/* Metric Cards */}
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Total Calls (12W)" value={selectedRep === 'all' ? teamL12WActivity.totalCalls.toLocaleString() : reps[0]?.totalCalls.toLocaleString() || '0'} />
        <MetricCard title="Total Touchpoints" value={selectedRep === 'all' ? teamL12WActivity.totalTouchpoints.toLocaleString() : reps[0]?.totalTouchpoints.toLocaleString() || '0'} />
        <MetricCard title="Median Talk Time" value={`${teamL12WActivity.medianTalkTime}h/wk`} />
        <MetricCard title="Weekly Target" value={`${teamL12WActivity.weeklyExpectations.calls}`} subtitle="calls per week" />
      </div>

      <CollapsibleInsights title="L12W Activity Insights" count={insights.length}>
        {insights.map((ins, i) => <InsightCard key={i} text={ins} type={i === 0 ? 'success' : 'warning'} />)}
      </CollapsibleInsights>

      {/* Weekly Calls Trend */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', marginBottom: '20px' })}>
        <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>
          {selectedRep === 'all' ? 'Team Weekly Calls vs Target' : `${selectedRep} Weekly Calls`}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '11px' }} />
            {selectedRep === 'all' ? (
              <>
                <Line type="monotone" dataKey="teamCalls" stroke="#276EF1" strokeWidth={2} dot={{ r: 2 }} name="Team Calls" />
                <Line type="monotone" dataKey="target" stroke="#E11900" strokeDasharray="5 5" dot={false} name="Target" />
              </>
            ) : (
              <>
                <ReferenceLine y={weeklyCallTarget} stroke="#E11900" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#E11900' }} />
                <Line type="monotone" dataKey="calls" stroke="#276EF1" strokeWidth={2} dot={{ r: 2 }} name="Calls" />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Calls + Trajectory */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' })}>
        {/* Cumulative race chart */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Cumulative Calls Race</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '10px' }} />
              {reps.map(r => {
                const firstName = r.name.split(' ')[0];
                return <Area key={firstName} type="monotone" dataKey={firstName} stroke={REP_COLORS[firstName] || '#888'} fill={REP_COLORS[firstName] || '#888'} fillOpacity={0.08} strokeWidth={2} dot={false} />;
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 3W Trajectory */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>3-Week Trajectory</div>
          <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '12px' })}>Last 3W avg vs prior 3W avg</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wowData.sort((a, b) => b.trajectory - a.trajectory)} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="trajectory" radius={[0, 4, 4, 0]} barSize={16} name="Trajectory">
                {wowData.sort((a, b) => b.trajectory - a.trajectory).map((d, i) => (
                  <Cell key={i} fill={d.trajectory >= 0 ? '#05944F' : '#E11900'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consistency + Momentum Cards */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' })}>
        {/* Enhanced Consistency Score */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Rep Consistency Score</div>
          {repConsistency.map((r, i) => {
            const barWidth = r.trend === 'ramp' ? 0 : r.consistency;
            const barColor = r.trend === 'consistent' ? '#05944F' : r.trend === 'moderate' ? '#EA8600' : '#E11900';
            return (
              <div key={i} className={css({ padding: '8px 10px', marginBottom: '6px', borderRadius: '6px', backgroundColor: '#FAFAFA', cursor: 'pointer', ':hover': { backgroundColor: '#F0F0F0' } })}
                onClick={() => setRadarRep(r.name)}>
                <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' })}>
                  <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                    <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '12px', color: '#276EF1' })}>{r.name.split(' ')[0]}</span>
                    {r.streak >= 3 && <span className={css({ fontSize: '10px', padding: '0 4px', borderRadius: '3px', backgroundColor: '#E6F4EA', color: '#137333', fontFamily: 'UberMoveText', fontWeight: 600 })}>{r.streak}W streak</span>}
                  </div>
                  <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
                    <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888' })}>avg {r.avgCalls}/wk</span>
                    <span className={css({ fontFamily: 'UberMoveText', fontWeight: 700, fontSize: '12px', color: barColor })}>
                      {r.trend === 'ramp' ? 'Ramp' : `${r.consistency.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
                <div className={css({ height: '4px', backgroundColor: '#E8E8E8', borderRadius: '2px', overflow: 'hidden' })}>
                  <div className={css({ height: '100%', backgroundColor: barColor, borderRadius: '2px', width: `${barWidth}%`, transition: 'width 0.3s' })} />
                </div>
                <div className={css({ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '10px', fontFamily: 'UberMoveText', color: '#AAA' })}>
                  <span>Low: {r.lowCalls}</span>
                  <span>Peak: {r.peakCalls}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-Metric Momentum */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>Momentum Scorecard</div>
          <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '10px' })}>Recent 4W vs prior 4W across all metrics</div>
          <div className={css({ overflowX: 'auto' })}>
            <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'UberMoveText' } as any)}>
              <thead>
                <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
                  {['Rep', 'Calls', 'TPs', 'Talk', 'Emails', 'Overall'].map(h => (
                    <th key={h} className={css({ padding: '6px 8px', textAlign: h === 'Rep' ? 'left' as const : 'center' as const, fontWeight: 600, color: '#666', fontSize: '10px', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {repMomentum.map((r, i) => (
                  <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                    <td className={css({ padding: '6px 8px', fontWeight: 600 } as any)}>{r.name}</td>
                    <td className={css({ padding: '6px 8px', textAlign: 'center' as const } as any)}>{changeBadge(r.calls.change)}</td>
                    <td className={css({ padding: '6px 8px', textAlign: 'center' as const } as any)}>{changeBadge(r.touchpoints.change)}</td>
                    <td className={css({ padding: '6px 8px', textAlign: 'center' as const } as any)}>{changeBadge(r.talkTime.change)}</td>
                    <td className={css({ padding: '6px 8px', textAlign: 'center' as const } as any)}>{changeBadge(r.emails.change)}</td>
                    <td className={css({ padding: '6px 8px', textAlign: 'center' as const } as any)}>
                      <span className={css({
                        fontWeight: 700, fontSize: '12px',
                        color: r.overallMomentum >= 10 ? '#05944F' : r.overallMomentum >= -10 ? '#EA8600' : '#E11900',
                      })}>
                        {r.overallMomentum >= 20 ? '🔥' : r.overallMomentum >= 0 ? '📈' : r.overallMomentum >= -20 ? '📉' : '🚨'}
                        {' '}{r.overallMomentum >= 0 ? '+' : ''}{r.overallMomentum.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Per-Rep Weekly Sparklines */}
      <SectionHeader title="Rep Weekly Activity Sparklines" subtitle="12-week call volume trend per rep" />
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        {wowData.map((r, i) => (
          <div key={i} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '12px 16px' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' })}>
              <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px' })}>{r.name}</span>
              <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
                <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888' })}>L3W avg: {r.l3Avg}</span>
                {changeBadge(r.trajectory)}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={r.weeks}>
                <Area type="monotone" dataKey="calls" stroke={REP_COLORS[r.name] || '#276EF1'} fill={REP_COLORS[r.name] || '#276EF1'} fillOpacity={0.1} strokeWidth={2} dot={false} />
                <Tooltip formatter={(v: number) => `${v} calls`} labelFormatter={(l) => `Week of ${l}`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Radar Modal */}
      <Modal isOpen={!!radarRep} onClose={() => setRadarRep(null)} overrides={{ Dialog: { style: { width: '520px', borderRadius: '12px' } } }}>
        <ModalHeader>{radarRep} — L12W Activity Radar</ModalHeader>
        <ModalBody>
          {selectedRadarRep && (
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#E8E8E8" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontFamily: 'UberMoveText' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={radarRep!} dataKey="value" stroke="#276EF1" fill="#276EF1" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip formatter={(v: number, _: string, props: any) => [`${props.payload.raw} (${v}% of team max)`, props.payload.metric]} />
                </RadarChart>
              </ResponsiveContainer>
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' })}>
                {radarData.map(d => (
                  <div key={d.metric} className={css({ padding: '6px 10px', backgroundColor: '#F8F9FA', borderRadius: '6px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
                    <span className={css({ color: '#888' })}>{d.metric}: </span>
                    <span className={css({ fontWeight: 600 })}>{d.raw}</span>
                    <span className={css({ color: '#888', marginLeft: '4px' })}>({d.value}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
