import { useStyletron } from "baseui";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend, PieChart, Pie } from "recharts";
import { MetricCard, StatusBadge, SectionHeader, ProgressBar, InsightCard, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repAttainment, weeklyPacing, repWeeklyFTPoints, RepName, teamNDG, repPipeline, repCWnFT } from "../data/dashboardData";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from "baseui/modal";
import { Input } from "baseui/input";
import { Button, SIZE, KIND } from "baseui/button";

interface RepGoal {
  repName: RepName;
  weeklyTarget: number;
  monthlyTarget: number;
  customNote: string;
}

export default function Attainment({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [goals, setGoals] = useState<RepGoal[]>(() => {
    const saved = localStorage.getItem('rep-goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<RepGoal | null>(null);

  const reps = (selectedRep === 'all' ? repAttainment : repAttainment.filter(r => r.name === selectedRep)).filter(r => r.quota > 0);
  const sorted = [...reps].sort((a, b) => b.pctToQuota - a.pctToQuota);
  const teamTotal = repAttainment.reduce((s, r) => s + r.currentPts, 0);
  const teamQuota = repAttainment.reduce((s, r) => s + r.quota, 0);

  const pacingData = weeklyPacing.map(w => ({
    name: `W${w.weekNum}`,
    target: w.cumTarget,
    actual: w.cumActual,
    weeklyTarget: w.target,
    weeklyActual: w.actual,
  }));

  const weekDates = ['2/16', '2/23', '3/2', '3/9', '3/16', '3/23'];
  const repWeeklyData = weekDates.map((d, i) => {
    const obj: Record<string, string | number> = { name: d };
    const filteredReps = selectedRep === 'all' ? repWeeklyFTPoints : repWeeklyFTPoints.filter(r => r.name === selectedRep);
    filteredReps.filter(r => r.weeklyTarget > 0).forEach(r => {
      obj[r.name.split(' ')[0]] = r.weeks[i];
    });
    return obj;
  });

  const repColors: Record<string, string> = { Sarah: '#276EF1', Camilia: '#05944F', Kendall: '#EA8600', Sofia: '#E11900', Nafisa: '#7627BB' };
  const repKeys = (selectedRep === 'all' ? repWeeklyFTPoints : repWeeklyFTPoints.filter(r => r.name === selectedRep)).filter(r => r.weeklyTarget > 0).map(r => r.name.split(' ')[0]);
  const pctElapsed = teamNDG.pctQElapsed;
  const currentGap = teamTotal - weeklyPacing[weeklyPacing.length - 1]?.cumTarget;

  const saveGoal = () => {
    if (!editingGoal) return;
    const updated = goals.filter(g => g.repName !== editingGoal.repName);
    updated.push(editingGoal);
    setGoals(updated);
    localStorage.setItem('rep-goals', JSON.stringify(updated));
    setEditingGoal(null);
    setGoalModalOpen(false);
  };

  return (
    <div>
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Team FT Points" value={`${teamTotal}/${teamQuota}`} subtitle={`${((teamTotal / teamQuota) * 100).toFixed(1)}%`} sparklineData={weeklyPacing.map(w => w.cumActual)} sparklineColor="#276EF1" />
        <MetricCard title="Weekly Gap" value={currentGap >= 0 ? `+${currentGap}` : currentGap} color={currentGap >= 0 ? '#05944F' : '#E11900'} subtitle={`${pctElapsed}% of Q elapsed`} sparklineData={weeklyPacing.map(w => w.cumGap)} sparklineColor={currentGap >= 0 ? '#05944F' : '#E11900'} />
        <MetricCard title="Carrying" value={`${sorted.filter(r => r.pctToQuota >= 100).length} rep${sorted.filter(r => r.pctToQuota >= 100).length !== 1 ? 's' : ''}`} color="#05944F" subtitle="at or above 100%" />
        <MetricCard title="Behind Pace" value={`${sorted.filter(r => r.pctToQuota < 85).length} reps`} color="#E11900" subtitle="below 85%" />
      </div>

      {/* Goal Setting Button */}
      <SectionHeader
        title="Rep Attainment"
        subtitle="Goal setting & individual performance"
        action={
          <Button size={SIZE.compact} kind={KIND.secondary} onClick={() => setGoalModalOpen(true)}
            overrides={{ BaseButton: { style: { fontSize: '12px' } } }}>
            🎯 Set Goals
          </Button>
        }
      />

      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginBottom: '24px' })}>
        {sorted.map((rep, i) => {
          const goal = goals.find(g => g.repName === rep.name);
          return (
            <div key={i} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
              <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px' })}>{rep.name}</div>
                <StatusBadge status={rep.pctToQuota >= 100 ? 'ahead' : rep.pctToQuota >= 85 ? 'on-pace' : rep.pctToQuota >= 60 ? 'behind' : 'risk'} />
              </div>
              <ProgressBar value={rep.pctToQuota} max={120} />
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '8px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
                <div>Pts: <strong>{rep.currentPts}/{rep.quota}</strong></div>
                <div>Delta: <strong className={css({ color: rep.delta >= 0 ? '#05944F' : '#E11900' })}>{rep.delta >= 0 ? '+' : ''}{rep.delta.toFixed(1)}</strong></div>
                <div>Req/wk: <strong>{rep.reqPtsPerWk.toFixed(1)}</strong></div>
              </div>
              <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', marginTop: '6px' })}>
                Tier mix: T1={rep.tier1} T2={rep.tier2} T3={rep.tier3} T4/5={rep.tier4_5} UT={rep.untiered_lt14}
              </div>
              {goal && (
                <div className={css({ marginTop: '8px', padding: '6px 8px', backgroundColor: '#F0F5FF', borderRadius: '4px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
                  🎯 Weekly target: <strong>{goal.weeklyTarget}</strong> · Monthly: <strong>{goal.monthlyTarget}</strong>
                  {goal.customNote && <div className={css({ color: '#666', marginTop: '2px' })}>{goal.customNote}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Cumulative Team Pacing</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={pacingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={30} />
              <Line type="monotone" dataKey="target" stroke="#999" strokeDasharray="5 5" dot={false} name="Target" />
              <Line type="monotone" dataKey="actual" stroke="#276EF1" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Rep Weekly FT Points</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={repWeeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={30} />
              {repKeys.map(name => (
                <Line key={name} type="monotone" dataKey={name} stroke={repColors[name] || '#888'} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team-Level CW vs Pipeline Tier Comparison */}
      {selectedRep === 'all' && (() => {
        const teamCW = repAttainment.filter(r => r.quota > 0).reduce((acc, r) => ({
          t1: acc.t1 + r.tier1, t2: acc.t2 + r.tier2, t3: acc.t3 + r.tier3,
          t4_5: acc.t4_5 + r.tier4_5, ut: acc.ut + r.untiered_lt14 + r.ut_14_55 + r.ut_gt55,
        }), { t1: 0, t2: 0, t3: 0, t4_5: 0, ut: 0 });
        const teamPipe = repPipeline.reduce((acc, r) => ({
          t1: acc.t1 + r.tierMix.t1, t2: acc.t2 + r.tierMix.t2, t3: acc.t3 + r.tierMix.t3,
          t4_5: acc.t4_5 + r.tierMix.t4_5, ut: acc.ut + r.tierMix.untiered,
        }), { t1: 0, t2: 0, t3: 0, t4_5: 0, ut: 0 });
        const cwTotal = teamCW.t1 + teamCW.t2 + teamCW.t3 + teamCW.t4_5 + teamCW.ut;
        const pipeTotal = teamPipe.t1 + teamPipe.t2 + teamPipe.t3 + teamPipe.t4_5 + teamPipe.ut;
        const compData = [
          { tier: 'Tier 1', cw: teamCW.t1, pipeline: teamPipe.t1, color: '#276EF1' },
          { tier: 'Tier 2', cw: teamCW.t2, pipeline: teamPipe.t2, color: '#05944F' },
          { tier: 'Tier 3', cw: teamCW.t3, pipeline: teamPipe.t3, color: '#EA8600' },
          { tier: 'T4/5', cw: teamCW.t4_5, pipeline: teamPipe.t4_5, color: '#E11900' },
          { tier: 'Untiered', cw: teamCW.ut, pipeline: teamPipe.ut, color: '#999' },
        ];
        const compPctData = compData.map(d => ({
          tier: d.tier,
          cw: cwTotal > 0 ? Number((d.cw / cwTotal * 100).toFixed(1)) : 0,
          pipeline: pipeTotal > 0 ? Number((d.pipeline / pipeTotal * 100).toFixed(1)) : 0,
        }));
        return (
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
            <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
              <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>
                Team Tier Mix: CW vs Pipeline (Count)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={compData} margin={{ left: 0, right: 10 }}>
                  <XAxis dataKey="tier" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="cw" fill="#276EF1" name={`Closed Won (${cwTotal})`} radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="pipeline" fill="#EA8600" name={`Pipeline (${pipeTotal})`} radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
              <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>
                Team Tier Mix: CW vs Pipeline (%)
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={compPctData} margin={{ left: 0, right: 10 }}>
                  <XAxis dataKey="tier" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="cw" fill="#276EF1" name="CW %" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="pipeline" fill="#EA8600" name="Pipeline %" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* Tier Mix Section — CW (closed won) vs Pipeline (outreach/pitching/negotiation) */}
      <SectionHeader title="Opportunity Tier Mix by Rep" subtitle="Closed Won deals vs. deals still in pipeline — from Sabres Team Opps tab" />
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', marginBottom: '24px' })}>
        {(selectedRep === 'all' ? repPipeline : repPipeline.filter(r => r.name === selectedRep)).filter(r => r.totalOpen > 0 || r.cwToDate > 0).map((rep, i) => {
          const tm = rep.tierMix;
          const totalAll = tm.t1 + tm.t2 + tm.t3 + tm.t4_5 + tm.untiered;
          const att = repAttainment.find(a => a.name === rep.name);

          // CW tier data from repAttainment (closed won FTs by tier)
          const cwTiers = att ? [
            { name: 'T1', value: att.tier1, color: '#276EF1' },
            { name: 'T2', value: att.tier2, color: '#05944F' },
            { name: 'T3', value: att.tier3, color: '#EA8600' },
            { name: 'T4/5', value: att.tier4_5, color: '#E11900' },
            { name: 'UT', value: att.untiered_lt14 + att.ut_14_55 + att.ut_gt55, color: '#999' },
          ] : [];
          const cwTotal = cwTiers.reduce((s, t) => s + t.value, 0);

          // Pipeline tier data (still open: outreach + pitching + negotiation)
          const pipeTiers = [
            { name: 'T1', value: tm.t1, color: '#276EF1' },
            { name: 'T2', value: tm.t2, color: '#05944F' },
            { name: 'T3', value: tm.t3, color: '#EA8600' },
            { name: 'T4/5', value: tm.t4_5, color: '#E11900' },
            { name: 'UT', value: tm.untiered, color: '#999' },
          ];

          return (
            <div key={i} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
              <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px' })}>{rep.name.split(' ')[0]}</div>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666' })}>
                  {cwTotal} CW · {totalAll} in pipeline
                </div>
              </div>

              {/* Closed Won bar */}
              <div className={css({ marginBottom: '12px' })}>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px', color: '#333' })}>
                  ✅ Closed Won ({cwTotal} deals)
                </div>
                <div className={css({ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '4px' })}>
                  {cwTiers.filter(t => t.value > 0).map((t, j) => (
                    <div key={j} className={css({ backgroundColor: t.color, width: `${cwTotal > 0 ? (t.value / cwTotal * 100) : 0}%`, minWidth: t.value > 0 ? '2px' : '0' })} title={`${t.name}: ${t.value}`} />
                  ))}
                </div>
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '2px', fontSize: '10px', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                  {cwTiers.map((t, j) => (
                    <div key={j}>
                      <span className={css({ color: t.color, fontWeight: 700 })}>{t.name}</span>
                      <span className={css({ marginLeft: '2px' })}>{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline bar */}
              <div>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px', color: '#333' })}>
                  📋 Pipeline ({totalAll} opps)
                </div>
                <div className={css({ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '4px' })}>
                  {pipeTiers.filter(t => t.value > 0).map((t, j) => (
                    <div key={j} className={css({ backgroundColor: t.color, width: `${totalAll > 0 ? (t.value / totalAll * 100) : 0}%`, minWidth: t.value > 0 ? '2px' : '0' })} title={`${t.name}: ${t.value}`} />
                  ))}
                </div>
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '2px', fontSize: '10px', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                  {pipeTiers.map((t, j) => (
                    <div key={j}>
                      <span className={css({ color: t.color, fontWeight: 700 })}>{t.name}</span>
                      <span className={css({ marginLeft: '2px' })}>{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage breakdown */}
              <div className={css({ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F0F0F0', fontSize: '10px', fontFamily: 'UberMoveText', color: '#666', display: 'flex', gap: '12px' })}>
                <span>Outreach: <strong>{rep.outreach}</strong></span>
                <span>Pitching: <strong>{rep.pitching}</strong></span>
                <span>Negotiation: <strong>{rep.negotiation}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Insights */}
      <CollapsibleInsights title="Attainment Insights" count={sorted.filter(r => r.pctToQuota < 85).length + sorted.filter(r => r.pctToQuota >= 100).length}>
        {sorted.filter(r => r.pctToQuota < 85).map((rep, i) => (
          <InsightCard key={i} text={`${rep.name} is at ${rep.pctToQuota.toFixed(1)}% — needs ${rep.reqPtsPerWk.toFixed(1)} pts/wk with ${rep.weeksLeft} weeks left.`} type={rep.pctToQuota < 60 ? 'danger' : 'warning'} />
        ))}
        {sorted.filter(r => r.pctToQuota >= 100).map((rep, i) => (
          <InsightCard key={`a-${i}`} text={`${rep.name} is carrying at ${rep.pctToQuota.toFixed(1)}% with ${rep.currentPts} pts. Focus on maintaining momentum.`} type="success" />
        ))}
      </CollapsibleInsights>

      {/* Rep Breakdown Table */}
      <SectionHeader title="Rep Attainment Breakdown" subtitle="CW, FT, FT Points, Attainment %, and CW by Tier" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto', marginBottom: '24px' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText', minWidth: '900px' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['Rep', 'CW', 'FT', 'FT Pts', 'Attainment %', 'T1', 'T2', 'T3', 'T4/5', 'UT'].map(h => (
                <th key={h} className={css({ padding: '10px 12px', textAlign: h === 'Rep' ? 'left' as const : 'center' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rep, i) => {
              const pipe = repPipeline.find(p => p.name === rep.name);
              const cw = repCWnFT.find(c => c.name === rep.name);
              const cwCount = cw?.totalCW || pipe?.cwToDate || 0;
              return (
                <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                  <td className={css({ padding: '10px 12px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.name}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 600, borderBottom: '1px solid #F0F0F0' } as any)}>{cwCount}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 600, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.totalFTs}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.currentPts}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderBottom: '1px solid #F0F0F0', color: pctColor(rep.pctToQuota) } as any)}>
                    {rep.pctToQuota.toFixed(1)}%
                  </td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', color: '#276EF1', fontWeight: 600 } as any)}>{rep.tier1}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', color: '#05944F', fontWeight: 600 } as any)}>{rep.tier2}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', color: '#EA8600', fontWeight: 600 } as any)}>{rep.tier3}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', color: '#E11900', fontWeight: 600 } as any)}>{rep.tier4_5}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, borderBottom: '1px solid #F0F0F0', color: '#999', fontWeight: 600 } as any)}>{rep.untiered_lt14 + rep.ut_14_55 + rep.ut_gt55}</td>
                </tr>
              );
            })}
            {/* Team totals row */}
            {selectedRep === 'all' && (() => {
              const totals = sorted.reduce((acc, r) => ({
                cw: acc.cw + (repCWnFT.find(c => c.name === r.name)?.totalCW || repPipeline.find(p => p.name === r.name)?.cwToDate || 0),
                ft: acc.ft + r.totalFTs, pts: acc.pts + r.currentPts,
                t1: acc.t1 + r.tier1, t2: acc.t2 + r.tier2, t3: acc.t3 + r.tier3, t4_5: acc.t4_5 + r.tier4_5,
                ut: acc.ut + r.untiered_lt14 + r.ut_14_55 + r.ut_gt55,
              }), { cw: 0, ft: 0, pts: 0, t1: 0, t2: 0, t3: 0, t4_5: 0, ut: 0 });
              return (
                <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
                  <td className={css({ padding: '10px 12px', fontWeight: 700, fontFamily: 'UberMove', borderTop: '2px solid #E8E8E8' } as any)}>Team Total</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8' } as any)}>{totals.cw}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8' } as any)}>{totals.ft}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8' } as any)}>{totals.pts}</td>
                   <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8', color: pctColor(totals.pts / teamQuota * 100) } as any)}>
                    {(totals.pts / teamQuota * 100).toFixed(1)}%
                  </td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8', color: '#276EF1' } as any)}>{totals.t1}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8', color: '#05944F' } as any)}>{totals.t2}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8', color: '#EA8600' } as any)}>{totals.t3}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8', color: '#E11900' } as any)}>{totals.t4_5}</td>
                  <td className={css({ padding: '10px 12px', textAlign: 'center' as const, fontWeight: 700, borderTop: '2px solid #E8E8E8', color: '#999' } as any)}>{totals.ut}</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      <Modal isOpen={goalModalOpen} onClose={() => { setGoalModalOpen(false); setEditingGoal(null); }}
        overrides={{ Dialog: { style: { width: '500px', borderRadius: '12px' } } }}>
        <ModalHeader><span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>🎯 Set Rep Goals & Targets</span></ModalHeader>
        <ModalBody>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: '#666', marginBottom: '16px' })}>
            Set custom weekly and monthly targets for each rep. These are saved locally.
          </div>
          {repAttainment.filter(r => r.quota > 0).map((rep) => {
            const goal = editingGoal?.repName === rep.name ? editingGoal : goals.find(g => g.repName === rep.name);
            const isEditing = editingGoal?.repName === rep.name;
            return (
              <div key={rep.name} className={css({
                padding: '12px', borderRadius: '8px', border: '1px solid #E8E8E8', marginBottom: '10px',
                backgroundColor: isEditing ? '#F0F5FF' : '#FFF',
              })}>
                <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' })}>
                  <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px' })}>{rep.name}</span>
                  {!isEditing && (
                    <Button size={SIZE.mini} kind={KIND.tertiary} onClick={() => setEditingGoal({
                      repName: rep.name, weeklyTarget: goal?.weeklyTarget || Math.round(rep.quota / 13),
                      monthlyTarget: goal?.monthlyTarget || Math.round(rep.quota / 3), customNote: goal?.customNote || '',
                    })}>Edit</Button>
                  )}
                </div>
                {isEditing ? (
                  <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' })}>
                    <div>
                      <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '2px' })}>Weekly Target</div>
                      <Input size="compact" type="number" value={String(editingGoal.weeklyTarget)}
                        onChange={e => setEditingGoal({ ...editingGoal, weeklyTarget: Number(e.target.value) })} />
                    </div>
                    <div>
                      <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '2px' })}>Monthly Target</div>
                      <Input size="compact" type="number" value={String(editingGoal.monthlyTarget)}
                        onChange={e => setEditingGoal({ ...editingGoal, monthlyTarget: Number(e.target.value) })} />
                    </div>
                    <div className={css({ gridColumn: '1 / -1' })}>
                      <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '2px' })}>Note</div>
                      <Input size="compact" value={editingGoal.customNote}
                        onChange={e => setEditingGoal({ ...editingGoal, customNote: e.target.value })} placeholder="Optional note" />
                    </div>
                  </div>
                ) : goal ? (
                  <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666' })}>
                    Weekly: {goal.weeklyTarget} · Monthly: {goal.monthlyTarget}{goal.customNote ? ` · ${goal.customNote}` : ''}
                  </div>
                ) : (
                  <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888' })}>No custom goals set</div>
                )}
              </div>
            );
          })}
        </ModalBody>
        <ModalFooter>
          <ModalButton kind={KIND.tertiary} onClick={() => { setGoalModalOpen(false); setEditingGoal(null); }}>Cancel</ModalButton>
          <ModalButton onClick={saveGoal} disabled={!editingGoal}
            overrides={{ BaseButton: { style: { backgroundColor: editingGoal ? '#000' : '#E8E8E8', color: editingGoal ? '#FFF' : '#999' } } }}>
            Save Goal
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
