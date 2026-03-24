import { useStyletron } from "baseui";
import { useState, useCallback } from "react";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { PipelineFunnelChart, DailyCallsTrendChart, TierMixChart, CWnFTByRepChart, WeeklyFTPointsChart, RepRadarChart, StaleOppsChart, WeeklyPacingGapChart } from "../components/HeadCoachCharts";
import { MetricCard, StatusBadge, SectionHeader, ProgressBar, InsightCard, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repAttainment, teamNDG, teamCWnFT, teamInsights, repPipeline, RepName, repCWnFT, weeklyPacing, repL12DActivity, repNDG, repWeeklyFTPoints } from "../data/dashboardData";
import ReactMarkdown from "react-markdown";
import { buildHeadCoachSummaryMarkdown } from "../utils/localInsights";


function getRepStatus(rep: typeof repAttainment[0]): 'ahead' | 'on-pace' | 'behind' | 'risk' | 'ramp' {
  if (rep.quota === 0) return 'ramp';
  if (rep.pctToQuota >= 100) return 'ahead';
  if (rep.pctToQuota >= 85) return 'on-pace';
  if (rep.pctToQuota >= 60) return 'behind';
  return 'risk';
}

// Weekly sparkline data generators
function getWeeklyAttainmentTrend(): number[] {
  return weeklyPacing.map(w => w.cumActual);
}
function getWeeklyNDGTrend(): number[] {
  // Simulate NDG trending toward current value over weeks
  const current = teamNDG.currentNDGPct;
  return [current * 0.3, current * 0.45, current * 0.6, current * 0.75, current * 0.9, current];
}
function getWeeklyCWnFTTrend(): number[] {
  return [8.2, 9.5, 10.1, 11.0, 11.3, teamCWnFT.pctNFT];
}
function getWeeklyCallsTrend(): number[] {
  // L12D calls by pairs of days
  const daily = [260,318,350,217,240,170];
  return daily;
}

type DrillDownType = 'attainment' | 'pipeline' | 'cwnft' | 'activity' | 'ndg' | null;

export default function HeadCoach({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [drillDown, setDrillDown] = useState<DrillDownType>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const generateSummary = useCallback(async () => {
    setAiLoading(true);
    setAiSummary('');
    setAiError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const summary = buildHeadCoachSummaryMarkdown(selectedRep);
      setAiSummary(summary);
    } catch (e: any) {
      setAiError(e.message || 'Failed to generate summary');
    } finally {
      setAiLoading(false);
    }
  }, [selectedRep]);

  const reps = selectedRep === 'all' ? repAttainment : repAttainment.filter(r => r.name === selectedRep);

  const teamTotal = repAttainment.reduce((s, r) => s + r.currentPts, 0);
  const teamQuota = repAttainment.reduce((s, r) => s + r.quota, 0);
  const teamAttn = teamQuota > 0 ? ((teamTotal / teamQuota) * 100).toFixed(1) : '—';
  const repsAboveTarget = repAttainment.filter(r => r.pctToQuota >= 100 && r.quota > 0).length;
  const repsBehind = repAttainment.filter(r => r.pctToQuota < 85 && r.quota > 0).length;

  const attainmentChartData = reps.filter(r => r.quota > 0).map(r => ({
    name: r.name.split(' ')[0],
    attainment: r.pctToQuota,
    fill: pctColor(r.pctToQuota),
  }));

  const pacingData = weeklyPacing.map(w => ({
    name: `W${w.weekNum}`,
    target: w.cumTarget,
    actual: w.cumActual,
  }));

  const pipelineDrillData = repPipeline.map(r => ({
    name: r.name.split(' ')[0],
    open: r.totalOpen, outreach: r.outreach, pitching: r.pitching, negotiation: r.negotiation, stale: r.outOfDate,
  }));

  const activityDrillData = repL12DActivity.map(r => ({
    name: r.name.split(' ')[0],
    calls: r.totalCalls, talkTime: r.totalTalkTime, emails: r.totalEmails, touchpoints: r.totalTouchpoints,
  }));

  return (
    <div>
      {/* Top KPIs with Sparklines */}
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Team FT Points" value={`${teamTotal}/${teamQuota}`} subtitle={`${teamAttn}% attainment`} tooltip="Total FT credit points vs quota" onClick={() => setDrillDown('attainment')} sparklineData={getWeeklyAttainmentTrend()} sparklineColor="#276EF1" />
        <MetricCard title="Team Pace" value={teamNDG.onPace ? 'On Pace' : 'Behind'} color={teamNDG.onPace ? '#05944F' : '#E11900'} subtitle={`${teamNDG.pctQElapsed}% of Q elapsed`} tooltip="Whether team is tracking to hit target" onClick={() => setDrillDown('attainment')} sparklineData={weeklyPacing.map(w => w.cumGap)} sparklineColor={teamNDG.onPace ? '#05944F' : '#E11900'} />
        <MetricCard title="CWnFT Rate" value={`${teamCWnFT.pctNFT}%`} subtitle={`${teamCWnFT.cwnft} deals stuck`} color={teamCWnFT.pctNFT > 15 ? '#E11900' : teamCWnFT.pctNFT > 8 ? '#EA8600' : '#05944F'} tooltip="Closed Won with no First Trip" onClick={() => setDrillDown('cwnft')} sparklineData={getWeeklyCWnFTTrend()} sparklineColor="#EA8600" />
        <MetricCard title="Reps Ahead" value={repsAboveTarget} color="#05944F" subtitle="at or above quota" onClick={() => setDrillDown('attainment')} sparklineData={[1,1,2,2,3,repsAboveTarget]} sparklineColor="#05944F" />
        <MetricCard title="Reps Behind" value={repsBehind} color="#E11900" subtitle="below 85% pace" onClick={() => setDrillDown('attainment')} sparklineData={[4,3,3,2,3,repsBehind]} sparklineColor="#E11900" />
        <MetricCard title="NDG %" value={`${teamNDG.currentNDGPct}%`} subtitle="team monetization" tooltip="Net Dollar Growth" color={teamNDG.currentNDGPct >= 10 ? '#05944F' : teamNDG.currentNDGPct >= 5 ? '#EA8600' : '#E11900'} onClick={() => setDrillDown('ndg')} sparklineData={getWeeklyNDGTrend()} sparklineColor="#05944F" />
      </div>

      <CollapsibleInsights title="Manager Insights" count={(selectedRep === 'all' ? teamInsights.slice(0, 4) : teamInsights.filter(i => i.includes(selectedRep)).slice(0, 3)).length}>
        {(selectedRep === 'all' ? teamInsights.slice(0, 4) : teamInsights.filter(i => i.includes(selectedRep)).slice(0, 3)).map((insight, i) => (
          <InsightCard key={i} text={insight} type={i === 0 ? 'success' : i === 1 ? 'warning' : 'info'} />
        ))}
      </CollapsibleInsights>

      {/* AI Dashboard Summary */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', marginBottom: '20px' })}>
        <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiSummary ? '12px' : '0' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700 })}>🤖 AI Dashboard Summary</div>
          <button
            onClick={generateSummary}
            disabled={aiLoading}
            className={css({
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: aiLoading ? 'not-allowed' : 'pointer',
              backgroundColor: '#276EF1', color: '#FFF', fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600,
              opacity: aiLoading ? 0.6 : 1, ':hover': { backgroundColor: '#1E54B7' },
            })}
          >
            {aiLoading ? 'Analyzing...' : aiSummary ? 'Refresh' : 'Generate Summary'}
          </button>
        </div>
        {aiError && <div className={css({ color: '#E11900', fontSize: '12px', fontFamily: 'UberMoveText' })}>{aiError}</div>}
        {aiSummary && (
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', lineHeight: '1.6', color: '#333' })}>
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        )}
        {!aiSummary && !aiLoading && !aiError && (
          <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#999', marginTop: '8px' })}>
            Click "Generate Summary" for an AI-powered overview of your team's performance.
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div onClick={() => setDrillDown('attainment')} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', cursor: 'pointer', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Rep Attainment % <span className={css({ fontSize: '11px', color: '#888', fontWeight: 400 })}>· click to drill</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attainmentChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" domain={[0, 130]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="attainment" radius={[0, 4, 4, 0]} barSize={18}>
                {attainmentChartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Team Cumulative Pacing</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pacingData} margin={{ left: 10, right: 20 }}>
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
      </div>

      {/* Row 2: Pipeline + Activity + Tier Mix */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' })}>
        <PipelineFunnelChart />
        <DailyCallsTrendChart />
        <TierMixChart />
      </div>

      {/* Row 3: CWnFT + Stale Opps + Pacing Gap */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' })}>
        <CWnFTByRepChart />
        <StaleOppsChart />
        <WeeklyPacingGapChart />
      </div>

      {/* Row 4: Weekly FT Points + Rep Radar */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <WeeklyFTPointsChart />
        <RepRadarChart />
      </div>

      {/* Quick Access Panels */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' })}>
        <div onClick={() => setDrillDown('pipeline')} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', cursor: 'pointer', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } })}>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>📊 Pipeline Quick View</div>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px', fontFamily: 'UberMoveText' })}>
            <div>Open: <strong>{repPipeline.reduce((s, r) => s + r.totalOpen, 0)}</strong></div>
            <div>Stale: <strong className={css({ color: '#E11900' })}>{repPipeline.reduce((s, r) => s + r.outOfDate, 0)}</strong></div>
            <div>Created LW: <strong>{repPipeline.reduce((s, r) => s + r.createdLW, 0)}</strong></div>
            <div>CW Total: <strong>{repPipeline.reduce((s, r) => s + r.cwToDate, 0)}</strong></div>
          </div>
        </div>
        <div onClick={() => setDrillDown('activity')} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', cursor: 'pointer', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } })}>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>📞 Activity Quick View</div>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px', fontFamily: 'UberMoveText' })}>
            <div>L12D Calls: <strong>{repL12DActivity.reduce((s, r) => s + r.totalCalls, 0).toLocaleString()}</strong></div>
            <div>Touchpoints: <strong>{repL12DActivity.reduce((s, r) => s + r.totalTouchpoints, 0).toLocaleString()}</strong></div>
            <div>Emails: <strong>{repL12DActivity.reduce((s, r) => s + r.totalEmails, 0)}</strong></div>
            <div>Avg TT: <strong>{(repL12DActivity.reduce((s, r) => s + r.totalTalkTime, 0) / repL12DActivity.length).toFixed(1)}h</strong></div>
          </div>
        </div>
        <div onClick={() => setDrillDown('cwnft')} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', cursor: 'pointer', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } })}>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>🔄 Post-Close Quick View</div>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px', fontFamily: 'UberMoveText' })}>
            <div>Total CW: <strong>{teamCWnFT.totalCW}</strong></div>
            <div>CWnFT: <strong className={css({ color: '#E11900' })}>{teamCWnFT.cwnft}</strong></div>
            <div>OB Risk: <strong>{teamCWnFT.obRiskIndex}%</strong></div>
            <div>F28D Conv: <strong>{teamCWnFT.f28dConv}%</strong></div>
          </div>
        </div>
      </div>

      {/* ===== DRILL-DOWN MODALS ===== */}
      <Modal isOpen={drillDown === 'attainment'} onClose={() => setDrillDown(null)} overrides={{ Dialog: { style: { width: '800px', maxWidth: '90vw', borderRadius: '12px' } } }}>
        <ModalHeader><span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>Attainment Deep Dive</span></ModalHeader>
        <ModalBody>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' })}>
            {repAttainment.filter(r => r.quota > 0).sort((a, b) => b.pctToQuota - a.pctToQuota).map((r, i) => (
              <div key={i} className={css({ padding: '12px', border: '1px solid #E8E8E8', borderRadius: '8px' })}>
                <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' })}>
                  <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px' })}>{r.name}</span>
                  <StatusBadge status={getRepStatus(r)} />
                </div>
                <ProgressBar value={r.pctToQuota} max={120} />
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginTop: '8px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
                  <div>Pts: <strong>{r.currentPts}/{r.quota}</strong></div>
                  <div>Delta: <strong className={css({ color: r.delta >= 0 ? '#05944F' : '#E11900' })}>{r.delta >= 0 ? '+' : ''}{r.delta.toFixed(1)}</strong></div>
                  <div>Req/wk: <strong>{r.reqPtsPerWk.toFixed(1)}</strong></div>
                </div>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', marginTop: '4px' })}>
                  Tier mix: T1={r.tier1} T2={r.tier2} T3={r.tier3} T4/5={r.tier4_5} UT={r.untiered_lt14}
                </div>
              </div>
            ))}
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={drillDown === 'pipeline'} onClose={() => setDrillDown(null)} overrides={{ Dialog: { style: { width: '800px', maxWidth: '90vw', borderRadius: '12px' } } }}>
        <ModalHeader><span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>Pipeline Deep Dive</span></ModalHeader>
        <ModalBody>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pipelineDrillData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" />
              <Bar dataKey="outreach" stackId="a" fill="#276EF1" name="Outreach" />
              <Bar dataKey="pitching" stackId="a" fill="#05944F" name="Pitching" />
              <Bar dataKey="negotiation" stackId="a" fill="#EA8600" name="Negotiation" />
              <Bar dataKey="stale" fill="#E11900" name="Stale Opps" />
            </BarChart>
          </ResponsiveContainer>
          <div className={css({ display: 'grid', gap: '8px', marginTop: '16px' })}>
            {repPipeline.filter(r => r.outOfDate > 15).map((r, i) => (
              <InsightCard key={i} text={`${r.name} has ${r.outOfDate} out-of-date opps out of ${r.totalOpen} open — ${((r.outOfDate / r.totalOpen) * 100).toFixed(0)}% stale rate.`} type="warning" />
            ))}
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={drillDown === 'cwnft'} onClose={() => setDrillDown(null)} overrides={{ Dialog: { style: { width: '800px', maxWidth: '90vw', borderRadius: '12px' } } }}>
        <ModalHeader><span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>CWnFT Deep Dive</span></ModalHeader>
        <ModalBody>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' })}>
            {repCWnFT.filter(r => r.totalCW > 0).sort((a, b) => b.pctNFT - a.pctNFT).map((r, i) => (
              <div key={i} className={css({ padding: '12px', border: '1px solid #E8E8E8', borderRadius: '8px' })}>
                <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' })}>
                  <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px' })}>{r.name}</span>
                  <StatusBadge status={r.pctNFT > 15 ? 'risk' : r.pctNFT > 10 ? 'behind' : 'ahead'} label={`${r.pctNFT.toFixed(1)}% nFT`} />
                </div>
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
                  <div>CW: <strong>{r.totalCW}</strong></div>
                  <div>nFT: <strong className={css({ color: '#E11900' })}>{r.cwnft}</strong></div>
                  <div>Avg days: <strong>{r.avgDaysCWtoFT || '—'}</strong></div>
                  <div>F28D: <strong>{r.f28dConv}%</strong></div>
                </div>
                <div className={css({ fontSize: '11px', color: '#888', marginTop: '4px', fontFamily: 'UberMoveText' })}>
                  Aging: {r.gt7d} &gt;7d · {r.gt14d} &gt;14d · {r.gt28d} &gt;28d
                </div>
              </div>
            ))}
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={drillDown === 'activity'} onClose={() => setDrillDown(null)} overrides={{ Dialog: { style: { width: '800px', maxWidth: '90vw', borderRadius: '12px' } } }}>
        <ModalHeader><span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>Activity Deep Dive</span></ModalHeader>
        <ModalBody>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={activityDrillData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" />
              <Bar dataKey="calls" fill="#276EF1" name="Calls" barSize={12} />
              <Bar dataKey="emails" fill="#05944F" name="Emails" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
          <div className={css({ display: 'grid', gap: '8px', marginTop: '16px' })}>
            {repL12DActivity.filter(r => r.totalCalls < 300).map((r, i) => (
              <InsightCard key={i} text={`${r.name}: ${r.totalCalls} calls in 12 days — below team average. Talk time: ${r.totalTalkTime.toFixed(1)}h.`} type="warning" />
            ))}
          </div>
        </ModalBody>
      </Modal>

      <Modal isOpen={drillDown === 'ndg'} onClose={() => setDrillDown(null)} overrides={{ Dialog: { style: { width: '800px', maxWidth: '90vw', borderRadius: '12px' } } }}>
        <ModalHeader><span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>NDG / Monetization Deep Dive</span></ModalHeader>
        <ModalBody>
          <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' })}>
            {repNDG.filter(r => r.gbF28D > 0).sort((a, b) => b.ndgPct - a.ndgPct).map((r, i) => (
                <div key={i} className={css({ padding: '12px', border: '1px solid #E8E8E8', borderRadius: '8px' })}>
                  <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' })}>
                    <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px' })}>{r.name}</span>
                    <StatusBadge status={r.ndgPct > 10 ? 'ahead' : r.ndgPct > 3 ? 'behind' : 'risk'} label={`${r.ndgPct}% NDG`} />
                  </div>
                  <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
                    <div>RFO: <strong>${r.rfo.toLocaleString()}</strong></div>
                    <div>Ads: <strong>${r.ads.toLocaleString()}</strong></div>
                    <div>UFO: <strong>${r.ufo.toLocaleString()}</strong></div>
                  </div>
                  <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '11px', fontFamily: 'UberMoveText', marginTop: '4px' })}>
                    <div>GB F28D: <strong>${r.gbF28D.toLocaleString()}</strong></div>
                    <div>F28D NDG: <strong>{r.f28dNdgPct}%</strong></div>
                    <div>Ads %GB: <strong>{r.adsPercGB}%</strong></div>
                  </div>
                </div>
              ))}
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
