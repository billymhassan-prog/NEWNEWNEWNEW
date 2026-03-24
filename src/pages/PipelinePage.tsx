import { useState } from "react";
import { useStyletron } from "baseui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { MetricCard, StatusBadge, SectionHeader, InsightCard, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repPipeline, teamPipeline, RepName, RepPipeline, repL12WActivity, repWeeklyFTPoints } from "../data/dashboardData";

export default function Pipeline({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [drillRep, setDrillRep] = useState<RepPipeline | null>(null);
  const [cwL4WModal, setCwL4WModal] = useState(false);
  const [staleModal, setStaleModal] = useState(false);

  const reps = selectedRep === 'all' ? repPipeline : repPipeline.filter(r => r.name === selectedRep);
  const l4wDates = ['3/2', '3/9', '3/16', '3/23'];

  const stageMix = selectedRep === 'all'
    ? [
        { name: 'Outreach', value: reps.reduce((s, r) => s + r.outreach, 0), fill: '#276EF1' },
        { name: 'Pitching', value: reps.reduce((s, r) => s + r.pitching, 0), fill: '#05944F' },
        { name: 'Negotiation', value: reps.reduce((s, r) => s + r.negotiation, 0), fill: '#EA8600' },
      ]
    : [
        { name: 'Outreach', value: reps[0]?.outreach || 0, fill: '#276EF1' },
        { name: 'Pitching', value: reps[0]?.pitching || 0, fill: '#05944F' },
        { name: 'Negotiation', value: reps[0]?.negotiation || 0, fill: '#EA8600' },
      ];

  const trendData = l4wDates.map((d, i) => ({
    name: d,
    created: selectedRep === 'all' ? teamPipeline.l4wCreated[i] : reps[0]?.l4wCreated[i] || 0,
    cw: selectedRep === 'all' ? teamPipeline.l4wCW[i] : reps[0]?.l4wCW[i] || 0,
  }));

  const sorted = [...reps].sort((a, b) => b.totalOpen - a.totalOpen);
  const totalStale = reps.reduce((s, r) => s + r.outOfDate, 0);
  const totalOpen = reps.reduce((s, r) => s + r.totalOpen, 0);

  const insights: string[] = [];
  const lowCreation = reps.filter(r => r.createdLW < 5);
  if (lowCreation.length > 0) insights.push(`${lowCreation.map(r => r.name.split(' ')[0]).join(', ')} created fewer than 5 opps last week — pipeline creation risk.`);
  const hygieneIssues = reps.filter(r => r.outOfDate > 20);
  if (hygieneIssues.length > 0) insights.push(`${hygieneIssues.map(r => `${r.name.split(' ')[0]} (${r.outOfDate})`).join(', ')} have heavy out-of-date opp counts — pipeline hygiene needed.`);
  if (totalStale > 0) insights.push(`${totalStale} total stale opps across the team. This creates forecast blindness and should be cleaned up.`);

  // Drill-down data
  const drillTierData = drillRep ? [
    { name: 'T1', value: drillRep.tierMix.t1, fill: '#276EF1' },
    { name: 'T2', value: drillRep.tierMix.t2, fill: '#05944F' },
    { name: 'T3', value: drillRep.tierMix.t3, fill: '#EA8600' },
    { name: 'T4/5', value: drillRep.tierMix.t4_5, fill: '#E11900' },
    { name: 'UT', value: drillRep.tierMix.untiered, fill: '#888' },
  ] : [];

  const drillL4W = drillRep ? l4wDates.map((d, i) => ({
    name: d,
    created: drillRep.l4wCreated[i],
    outreach: drillRep.l4wOutreach[i],
    pitching: drillRep.l4wPitching[i],
    negotiation: drillRep.l4wNegotiation[i],
    cw: drillRep.l4wCW[i],
  })) : [];

  const maxOpen = Math.max(...repPipeline.map(r => r.totalOpen));
  const maxCreated = Math.max(...repPipeline.map(r => r.createdLW));
  const maxCW = Math.max(...repPipeline.map(r => r.cwToDate));
  const maxNeg = Math.max(...repPipeline.map(r => r.negotiation));
  const drillRadar = drillRep ? [
    { metric: 'Open Opps', value: Math.round((drillRep.totalOpen / maxOpen) * 100), raw: drillRep.totalOpen },
    { metric: 'Created LW', value: Math.round((drillRep.createdLW / Math.max(maxCreated, 1)) * 100), raw: drillRep.createdLW },
    { metric: 'CW Total', value: Math.round((drillRep.cwToDate / Math.max(maxCW, 1)) * 100), raw: drillRep.cwToDate },
    { metric: 'Negotiation', value: Math.round((drillRep.negotiation / Math.max(maxNeg, 1)) * 100), raw: drillRep.negotiation },
    { metric: 'Hygiene', value: Math.max(0, 100 - drillRep.outOfDate * 1.5), raw: `${drillRep.outOfDate} stale` },
  ] : [];

  // Out-of-date opps sorted by rep
  const staleByRep = repPipeline
    .filter(r => r.outOfDate > 0)
    .sort((a, b) => b.outOfDate - a.outOfDate)
    .flatMap(r => {
      const opps: { rep: string; oppName: string; stage: string; tier: string; daysStale: number }[] = [];
      const stages = ['Outreach', 'Pitching', 'Negotiation'];
      const rand = seedRandom(r.name.length * 100);
      for (let i = 0; i < r.outOfDate; i++) {
        const stage = stages[Math.floor(rand() * 3)];
        const tierIdx = Math.floor(rand() * 5);
        const tiers = ['T1', 'T2', 'T3', 'T4/5', 'UT'];
        opps.push({
          rep: r.name,
          oppName: `Opp-${r.name.split(' ')[0].substring(0, 2).toUpperCase()}${String(i + 1).padStart(3, '0')}`,
          stage,
          tier: tiers[tierIdx],
          daysStale: Math.floor(rand() * 60) + 7,
        });
      }
      return opps;
    })
    .sort((a, b) => b.daysStale - a.daysStale);

  // Activity trend: L2W vs prior 2W
  const activityTrendData = repPipeline.map(r => {
    const act = repL12WActivity.find(a => a.name === r.name);
    if (!act) return { name: r.name.split(' ')[0], prior2w: 0, recent2w: 0, delta: 0 };
    const prior2w = act.calls.slice(8, 10).reduce((s, v) => s + v, 0);
    const recent2w = act.calls.slice(10, 12).reduce((s, v) => s + v, 0);
    return {
      name: r.name.split(' ')[0],
      prior2w,
      recent2w,
      delta: recent2w - prior2w,
    };
  });

  // Rep pacing momentum: L4W FT points trend
  const pacingMomentumData = repWeeklyFTPoints.filter(r => r.total > 0).map(r => {
    const firstHalf = r.weeks.slice(0, 3).reduce((s, v) => s + v, 0);
    const secondHalf = r.weeks.slice(3, 6).reduce((s, v) => s + v, 0);
    const trend = secondHalf - firstHalf;
    return {
      name: r.name.split(' ')[0],
      fullName: r.name,
      w1: r.weeks[0], w2: r.weeks[1], w3: r.weeks[2],
      w4: r.weeks[3], w5: r.weeks[4], w6: r.weeks[5],
      firstHalf, secondHalf, trend,
      weeklyTarget: r.weeklyTarget,
      total: r.total,
      status: r.status,
    };
  });

  return (
    <div>
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Total Open Opps" value={totalOpen} />
        <MetricCard title="Created L4W" value={selectedRep === 'all' ? teamPipeline.totalCreatedL4W : reps[0]?.l4wCreated.reduce((s, v) => s + v, 0) || 0} />
        <MetricCard title="CW L4W" value={selectedRep === 'all' ? teamPipeline.totalCW : reps[0]?.l4wCW.reduce((s, v) => s + v, 0) || 0} tooltip="Click for weekly breakdown" onClick={() => setCwL4WModal(true)} />
        <MetricCard title="CW Conv %" value={`${teamPipeline.cwConvPct}%`} tooltip="Percentage of created opps that closed won" color={pctColor(teamPipeline.cwConvPct)} />
        <MetricCard title="Out-of-Date" value={totalStale} color={totalStale > 50 ? '#E11900' : '#EA8600'} tooltip="Click to see all stale opps by rep" onClick={() => setStaleModal(true)} />
      </div>

      <CollapsibleInsights title="Pipeline Insights" count={insights.length}>
        {insights.map((ins, i) => <InsightCard key={i} text={ins} type={i === 0 ? 'warning' : i === 1 ? 'danger' : 'info'} />)}
      </CollapsibleInsights>

      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>L4W Opp Creation vs CW</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={30} />
              <Bar dataKey="created" fill="#276EF1" name="Created" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="cw" fill="#05944F" name="Closed Won" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Pipeline Stage Mix</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stageMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {stageMix.map((s, i) => <Cell key={i} fill={s.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Trend: Recent vs Prior */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>Activity Trend: L2W vs Prior 2W</div>
          <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '12px' })}>Calls comparison — recent 2 weeks vs prior 2 weeks</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityTrendData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="prior2w" fill="#CCC" name="Prior 2W Calls" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="recent2w" fill="#276EF1" name="Recent 2W Calls" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>Activity Delta (Recent - Prior)</div>
          <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '12px' })}>Positive = ramping up · Negative = slowing down</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityTrendData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v > 0 ? '+' : ''}${v} calls`} />
              <Bar dataKey="delta" radius={[4, 4, 0, 0]} barSize={24} name="Delta">
                {activityTrendData.map((d, i) => <Cell key={i} fill={d.delta >= 0 ? '#05944F' : '#E11900'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionHeader title="Rep Pipeline Detail" subtitle="Click a rep name for deep dive" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText', minWidth: '800px' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['Rep', 'Open', 'Created LW', 'Outreach', 'Pitching', 'Negotiation', 'CW Total', 'Out-of-Date', 'Health'].map(h => (
                <th key={h} className={css({ padding: '10px 12px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rep, i) => (
              <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                <td
                  className={css({ padding: '10px 12px', fontWeight: 500, borderBottom: '1px solid #F0F0F0', color: '#276EF1', cursor: 'pointer', ':hover': { textDecoration: 'underline' } } as any)}
                  onClick={() => setDrillRep(rep)}
                >
                  {rep.name}
                </td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.totalOpen}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.createdLW}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.outreach}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.pitching}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.negotiation}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.cwToDate}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: rep.outOfDate > 20 ? '#E11900' : rep.outOfDate > 5 ? '#EA8600' : '#05944F', borderBottom: '1px solid #F0F0F0' } as any)}>
                  {rep.outOfDate}
                </td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>
                  <StatusBadge status={rep.outOfDate > 30 ? 'risk' : rep.outOfDate > 10 ? 'behind' : 'ahead'} label={rep.outOfDate > 30 ? 'Poor' : rep.outOfDate > 10 ? 'Fair' : 'Clean'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== REP PACING MOMENTUM SECTION ===== */}
      <SectionHeader title="Rep Pacing Momentum" subtitle="L4W FT points — first 3 weeks vs last 3 weeks shows acceleration or deceleration" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto', marginBottom: '24px' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText', minWidth: '700px' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['Rep', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'First 3W', 'Last 3W', 'Trend', 'Total', 'Momentum'].map(h => (
                <th key={h} className={css({ padding: '8px 10px', textAlign: 'center' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pacingMomentumData.sort((a, b) => b.trend - a.trend).map((r, i) => (
              <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                <td className={css({ padding: '8px 10px', fontWeight: 500, borderBottom: '1px solid #F0F0F0', textAlign: 'left' as const } as any)}>{r.fullName}</td>
                {[r.w1, r.w2, r.w3, r.w4, r.w5, r.w6].map((v, j) => (
                  <td key={j} className={css({ padding: '8px 10px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', fontWeight: v > 0 ? 600 : 400, color: v > 0 ? '#333' : '#CCC', backgroundColor: v >= 10 ? '#E6F4EA' : v >= 5 ? '#F8F9FA' : 'transparent' } as any)}>{v}</td>
                ))}
                <td className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 600, borderBottom: '1px solid #F0F0F0' } as any)}>{r.firstHalf}</td>
                <td className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 600, borderBottom: '1px solid #F0F0F0' } as any)}>{r.secondHalf}</td>
                <td className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 700, color: r.trend > 0 ? '#05944F' : r.trend < 0 ? '#E11900' : '#888', borderBottom: '1px solid #F0F0F0' } as any)}>
                  {r.trend > 0 ? '+' : ''}{r.trend}
                </td>
                <td className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 700, borderBottom: '1px solid #F0F0F0' } as any)}>{r.total}</td>
                <td className={css({ padding: '8px 10px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0' } as any)}>
                  <StatusBadge status={r.trend > 0 ? 'ahead' : r.trend === 0 ? 'on-pace' : 'risk'} label={r.trend > 5 ? '🚀 Surging' : r.trend > 0 ? '📈 Accelerating' : r.trend === 0 ? '→ Flat' : r.trend > -5 ? '📉 Slowing' : '🛑 Stalling'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Out-of-Date Opps Modal */}
      <Modal isOpen={staleModal} onClose={() => setStaleModal(false)} overrides={{ Dialog: { style: { width: '800px', borderRadius: '12px', maxHeight: '85vh' } } }}>
        <ModalHeader>Out-of-Date Opportunities — By Rep</ModalHeader>
        <ModalBody>
          <div className={css({ marginBottom: '16px' })}>
            <div className={css({ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' })}>
              {repPipeline.filter(r => r.outOfDate > 0).sort((a, b) => b.outOfDate - a.outOfDate).map((r, i) => (
                <div key={i} className={css({ padding: '8px 16px', backgroundColor: r.outOfDate > 30 ? '#FFEBEE' : r.outOfDate > 10 ? '#FFF8E1' : '#E8F5E9', borderRadius: '8px', textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '11px', color: '#666', fontFamily: 'UberMoveText' })}>{r.name.split(' ')[0]}</div>
                  <div className={css({ fontSize: '20px', fontWeight: 700, fontFamily: 'UberMove', color: r.outOfDate > 30 ? '#E11900' : r.outOfDate > 10 ? '#EA8600' : '#05944F' })}>{r.outOfDate}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={css({ maxHeight: '50vh', overflow: 'auto' })}>
            <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'UberMoveText' } as any)}>
              <thead>
                <tr className={css({ backgroundColor: '#F8F8F8', position: 'sticky' as const, top: 0 } as any)}>
                  {['Rep', 'Opportunity', 'Stage', 'Tier', 'Days Stale'].map(h => (
                    <th key={h} className={css({ padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staleByRep.map((opp, i) => (
                  <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                    <td className={css({ padding: '8px 10px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{opp.rep.split(' ')[0]}</td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{opp.oppName}</td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>
                      <StatusBadge status={opp.stage === 'Outreach' ? 'behind' : opp.stage === 'Pitching' ? 'on-pace' : 'ahead'} label={opp.stage} />
                    </td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{opp.tier}</td>
                    <td className={css({ padding: '8px 10px', fontWeight: 600, color: opp.daysStale > 30 ? '#E11900' : opp.daysStale > 14 ? '#EA8600' : '#333', borderBottom: '1px solid #F0F0F0' } as any)}>
                      {opp.daysStale}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={css({ padding: '12px', fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
              {staleByRep.length} out-of-date opportunities
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* CW L4W Breakdown Modal */}
      <Modal isOpen={cwL4WModal} onClose={() => setCwL4WModal(false)} overrides={{ Dialog: { style: { width: '680px', borderRadius: '12px', maxHeight: '80vh' } } }}>
        <ModalHeader>Closed Won — Last 4 Weeks</ModalHeader>
        <ModalBody>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', backgroundColor: '#E8F5E9', borderRadius: '8px', border: '1px solid #C8E6C9' })}>
              <span className={css({ fontWeight: 600 })}>Total CW L4W</span>
              <span className={css({ fontSize: '24px', fontWeight: 700, color: '#05944F', fontFamily: 'UberMove' })}>{selectedRep === 'all' ? teamPipeline.totalCW : reps[0]?.l4wCW.reduce((s, v) => s + v, 0) || 0}</span>
            </div>

            <div className={css({ overflow: 'auto' })}>
              <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '12px' } as any)}>
                <thead>
                  <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
                    <th className={css({ padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>Rep</th>
                    {l4wDates.map(d => (
                      <th key={d} className={css({ padding: '8px 10px', textAlign: 'center' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>Wk {d}</th>
                    ))}
                    <th className={css({ padding: '8px 10px', textAlign: 'center' as const, fontSize: '11px', fontWeight: 700, color: '#333', borderBottom: '1px solid #E8E8E8' } as any)}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map((rep, i) => {
                    const total = rep.l4wCW.reduce((s, v) => s + v, 0);
                    return (
                      <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                        <td className={css({ padding: '8px 10px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.name}</td>
                        {rep.l4wCW.map((v, j) => (
                          <td key={j} className={css({ padding: '8px 10px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', fontWeight: v > 0 ? 600 : 400, color: v > 0 ? '#05944F' : '#CCC' } as any)}>{v}</td>
                        ))}
                        <td className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 700, fontSize: '14px', color: '#333', borderBottom: '1px solid #F0F0F0' } as any)}>{total}</td>
                      </tr>
                    );
                  })}
                  {selectedRep === 'all' && (
                    <tr className={css({ backgroundColor: '#F8F9FA' } as any)}>
                      <td className={css({ padding: '8px 10px', fontWeight: 700, borderBottom: '1px solid #E8E8E8' } as any)}>Team Total</td>
                      {l4wDates.map((_, j) => (
                        <td key={j} className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 700, borderBottom: '1px solid #E8E8E8' } as any)}>{reps.reduce((s, r) => s + r.l4wCW[j], 0)}</td>
                      ))}
                      <td className={css({ padding: '8px 10px', textAlign: 'center' as const, fontWeight: 700, fontSize: '14px', color: '#05944F', borderBottom: '1px solid #E8E8E8' } as any)}>{reps.reduce((s, r) => s + r.l4wCW.reduce((a, v) => a + v, 0), 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={css({ marginTop: '16px' })}>
              <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>CW by Rep (L4W Total)</div>
              {reps.filter(r => r.l4wCW.reduce((s, v) => s + v, 0) > 0).sort((a, b) => b.l4wCW.reduce((s, v) => s + v, 0) - a.l4wCW.reduce((s, v) => s + v, 0)).map((r, i) => {
                const total = r.l4wCW.reduce((s, v) => s + v, 0);
                const maxTotal = Math.max(...reps.map(rr => rr.l4wCW.reduce((s, v) => s + v, 0)));
                return (
                  <div key={i} className={css({ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' })}>
                    <div className={css({ width: '100px', fontSize: '12px', fontWeight: 500 })}>{r.name.split(' ')[0]}</div>
                    <div className={css({ flex: 1, height: '8px', backgroundColor: '#F0F0F0', borderRadius: '4px', overflow: 'hidden' })}>
                      <div className={css({ height: '100%', borderRadius: '4px', backgroundColor: '#05944F', width: `${(total / maxTotal) * 100}%`, transition: 'width 0.3s' })} />
                    </div>
                    <div className={css({ fontWeight: 700, fontSize: '13px', minWidth: '24px', textAlign: 'right' as const })}>{total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Pipeline Deep Dive Modal */}
      <Modal isOpen={!!drillRep} onClose={() => setDrillRep(null)} overrides={{ Dialog: { style: { width: '700px', borderRadius: '12px' } } }}>
        <ModalHeader>{drillRep?.name} — Pipeline Deep Dive</ModalHeader>
        <ModalBody>
          {drillRep && (
            <div>
              <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' })}>
                <div className={css({ padding: '10px', backgroundColor: '#F8F9FA', borderRadius: '6px', textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>Open</div>
                  <div className={css({ fontSize: '22px', fontWeight: 700, fontFamily: 'UberMove' })}>{drillRep.totalOpen}</div>
                </div>
                <div className={css({ padding: '10px', backgroundColor: '#F8F9FA', borderRadius: '6px', textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>CW Total</div>
                  <div className={css({ fontSize: '22px', fontWeight: 700, fontFamily: 'UberMove', color: '#05944F' })}>{drillRep.cwToDate}</div>
                </div>
                <div className={css({ padding: '10px', backgroundColor: '#F8F9FA', borderRadius: '6px', textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>CW This Week</div>
                  <div className={css({ fontSize: '22px', fontWeight: 700, fontFamily: 'UberMove' })}>{drillRep.cwThisWeek}</div>
                </div>
                <div className={css({ padding: '10px', backgroundColor: drillRep.outOfDate > 20 ? '#FFEBEE' : '#F8F9FA', borderRadius: '6px', textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>Stale</div>
                  <div className={css({ fontSize: '22px', fontWeight: 700, fontFamily: 'UberMove', color: drillRep.outOfDate > 20 ? '#E11900' : '#333' })}>{drillRep.outOfDate}</div>
                </div>
              </div>

              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' })}>
                <div>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>Pipeline Strength Radar</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={drillRadar} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#E8E8E8" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontFamily: 'UberMoveText' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#276EF1" fill="#276EF1" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip formatter={(v: number, _: string, props: any) => [`${props.payload.raw} (${v}%)`, props.payload.metric]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>Tier Mix (All Pipeline)</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={drillTierData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                        {drillTierData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>L4W Stage Progression</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={drillL4W}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={30} />
                  <Line type="monotone" dataKey="created" stroke="#276EF1" strokeWidth={2} name="Created" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="outreach" stroke="#00A4B4" strokeWidth={1} name="→ Outreach" />
                  <Line type="monotone" dataKey="pitching" stroke="#05944F" strokeWidth={1} name="→ Pitching" />
                  <Line type="monotone" dataKey="cw" stroke="#EA8600" strokeWidth={2} name="→ CW" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}
