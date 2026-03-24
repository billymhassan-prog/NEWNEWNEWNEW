import { useState } from "react";
import { useStyletron } from "baseui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { MetricCard, StatusBadge, SectionHeader, InsightCard, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repCWnFT, repPipeline, repAttainment, repCoaching, RepName, REPS } from "../data/dashboardData";
import { getRepCWAccounts } from "../data/accountData";

type DrilldownType = 'attainment' | 'stale' | 'cwnft' | 'creation' | 'coaching' | null;

export default function RiskMonitor({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [staleModal, setStaleModal] = useState(false);
  const [cwnftModal, setCwnftModal] = useState(false);
  const [drilldown, setDrilldown] = useState<DrilldownType>(null);
  const [selectedRiskRep, setSelectedRiskRep] = useState<string | null>(null);

  const reps = selectedRep === 'all' ? repAttainment : repAttainment.filter(r => r.name === selectedRep);
  const pipes = selectedRep === 'all' ? repPipeline : repPipeline.filter(r => r.name === selectedRep);
  const cwnfts = selectedRep === 'all' ? repCWnFT : repCWnFT.filter(r => r.name === selectedRep);

  // Risk scoring
  const riskScores = reps.filter(r => r.quota > 0).map(r => {
    const pipe = pipes.find(p => p.name === r.name);
    const cw = cwnfts.find(c => c.name === r.name);
    const coach = repCoaching.find(c => c.name === r.name);

    const attainmentScore = r.pctToQuota < 60 ? 30 : r.pctToQuota < 85 ? 15 : 0;
    const staleScore = (pipe?.outOfDate || 0) > 30 ? 20 : (pipe?.outOfDate || 0) > 10 ? 10 : 0;
    const cwnftScore = (cw?.pctNFT || 0) > 15 ? 15 : (cw?.pctNFT || 0) > 10 ? 8 : 0;
    const creationScore = (pipe?.createdLW || 0) < 3 ? 10 : 0;
    const coachingScore = (coach?.urgency || 0) * 2;
    const score = attainmentScore + staleScore + cwnftScore + creationScore + coachingScore;

    return {
      name: r.name,
      score,
      attainmentScore, staleScore, cwnftScore, creationScore, coachingScore,
      attainment: r.pctToQuota,
      staleOpps: pipe?.outOfDate || 0,
      cwnftRate: cw?.pctNFT || 0,
      createdLW: pipe?.createdLW || 0,
      coachingUrgency: coach?.urgency || 0,
      coachingArea: coach?.primaryArea || '—',
      level: score >= 50 ? 'Critical' : score >= 30 ? 'High' : score >= 15 ? 'Medium' : 'Low',
    };
  }).sort((a, b) => b.score - a.score);

  const totalStale = pipes.reduce((s, p) => s + p.outOfDate, 0);
  const totalCWnFT = cwnfts.reduce((s, c) => s + c.cwnft, 0);
  const criticalReps = riskScores.filter(r => r.level === 'Critical').length;

  // Stale opps by rep
  const staleByRep = pipes.filter(p => p.outOfDate > 0).map(p => ({
    name: p.name, count: p.outOfDate, totalOpen: p.totalOpen,
    pct: Math.round((p.outOfDate / p.totalOpen) * 100),
  })).sort((a, b) => b.count - a.count);

  // CWnFT accounts
  const relevantReps = selectedRep === 'all' ? [...REPS] : [selectedRep];
  const cwnftAccounts = relevantReps.flatMap(rep => {
    const accounts = getRepCWAccounts(rep);
    return accounts.filter(a => a.status === 'CWnFT').map(a => ({ ...a, rep }));
  });
  const cwnftByRep = cwnfts.filter(c => c.cwnft > 0).map(c => ({
    name: c.name, count: c.cwnft, totalCW: c.totalCW, pctNFT: c.pctNFT, byTier: c.cwnftByTier,
  })).sort((a, b) => b.count - a.count);

  const insights: string[] = [];
  const criticals = riskScores.filter(r => r.level === 'Critical');
  if (criticals.length > 0) insights.push(`${criticals.map(r => r.name.split(' ')[0]).join(', ')} ${criticals.length === 1 ? 'is' : 'are'} at critical risk level — multiple compounding issues requiring immediate intervention.`);
  if (totalStale > 100) insights.push(`${totalStale} total stale opportunities across the team create forecast blindness and hide real pipeline value.`);
  if (totalCWnFT > 15) insights.push(`${totalCWnFT} deals closed but not live — this is revenue at risk of never materializing.`);
  const hygieneRisk = pipes.filter(p => p.outOfDate > 20);
  if (hygieneRisk.length > 0) insights.push(`Pipeline hygiene is concentrated with ${hygieneRisk.map(p => `${p.name.split(' ')[0]} (${p.outOfDate})`).join(', ')} — these reps need a cleanup sprint.`);

  const barStyle = (color: string, pct: number) => css({
    height: '6px', borderRadius: '3px', backgroundColor: color,
    width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s',
  });

  // Risk factor definitions for drill-down
  const riskFactors: { key: DrilldownType; label: string; count: number; desc: string }[] = [
    { key: 'attainment', label: 'Attainment below 85%', count: reps.filter(r => r.pctToQuota < 85 && r.quota > 0).length, desc: 'Reps falling behind on quota — the biggest signal of overall risk.' },
    { key: 'stale', label: '30+ stale opportunities', count: pipes.filter(p => p.outOfDate > 30).length, desc: 'Opportunities not updated recently. High counts mean reps aren\'t working their pipe.' },
    { key: 'cwnft', label: 'CWnFT rate above 15%', count: cwnfts.filter(c => c.pctNFT > 15).length, desc: 'Closed Won deals that never went live — revenue at risk of clawback.' },
    { key: 'creation', label: 'Low opp creation (<3 LW)', count: pipes.filter(p => p.createdLW < 3).length, desc: 'Reps not building future pipeline. This creates a lagging revenue gap.' },
    { key: 'coaching', label: 'Coaching urgency ≥7', count: repCoaching.filter(c => c.urgency >= 7).length, desc: 'Reps flagged as needing immediate coaching intervention.' },
  ];

  // Get drill-down data based on type
  const getDrilldownReps = (type: DrilldownType) => {
    switch (type) {
      case 'attainment': return reps.filter(r => r.pctToQuota < 85 && r.quota > 0).sort((a, b) => a.pctToQuota - b.pctToQuota);
      case 'stale': return pipes.filter(p => p.outOfDate > 30).sort((a, b) => b.outOfDate - a.outOfDate);
      case 'cwnft': return cwnfts.filter(c => c.pctNFT > 15).sort((a, b) => b.pctNFT - a.pctNFT);
      case 'creation': return pipes.filter(p => p.createdLW < 3).sort((a, b) => a.createdLW - b.createdLW);
      case 'coaching': return repCoaching.filter(c => c.urgency >= 7).sort((a, b) => b.urgency - a.urgency);
      default: return [];
    }
  };

  // Selected rep radar data
  const selectedRepData = selectedRiskRep ? riskScores.find(r => r.name === selectedRiskRep) : null;
  const radarData = selectedRepData ? [
    { factor: 'Attainment', value: selectedRepData.attainmentScore, max: 30 },
    { factor: 'Stale Opps', value: selectedRepData.staleScore, max: 20 },
    { factor: 'CWnFT', value: selectedRepData.cwnftScore, max: 15 },
    { factor: 'Opp Creation', value: selectedRepData.creationScore, max: 10 },
    { factor: 'Coach Urgency', value: selectedRepData.coachingScore, max: 20 },
  ] : [];

  return (
    <div>
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Critical Risk Reps" value={criticalReps} color={criticalReps > 0 ? '#E11900' : '#05944F'} />
        <MetricCard title="Stale Opps" value={totalStale} color={totalStale > 50 ? '#E11900' : '#EA8600'} tooltip="Click for breakdown" onClick={() => setStaleModal(true)} />
        <MetricCard title="CWnFT Deals" value={totalCWnFT} color={totalCWnFT > 15 ? '#E11900' : totalCWnFT > 5 ? '#EA8600' : '#05944F'} tooltip="Click for breakdown" onClick={() => setCwnftModal(true)} />
        <MetricCard title="Avg Risk Score" value={Math.round(riskScores.reduce((s, r) => s + r.score, 0) / riskScores.length)} subtitle="out of 100" />
      </div>

      {/* Stale Opps Modal */}
      <Modal isOpen={staleModal} onClose={() => setStaleModal(false)} overrides={{ Dialog: { style: { width: '640px', maxHeight: '80vh', overflow: 'auto' } } }}>
        <ModalHeader>Stale Opportunities Breakdown</ModalHeader>
        <ModalBody>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', backgroundColor: '#FFF8F0', borderRadius: '8px', border: '1px solid #FFE0B2' })}>
              <span className={css({ fontWeight: 600 })}>Total Stale Opps</span>
              <span className={css({ fontSize: '24px', fontWeight: 700, color: '#E11900', fontFamily: 'UberMove' })}>{totalStale}</span>
            </div>
            <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>By Rep</div>
            {staleByRep.map((r, i) => (
              <div key={i} className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: '12px' })}>
                <div className={css({ width: '130px', fontWeight: 500 })}>{r.name}</div>
                <div className={css({ flex: 1 })}>
                  <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' })}>
                    <span className={css({ fontSize: '11px', color: '#888' })}>{r.count} of {r.totalOpen} open opps ({r.pct}%)</span>
                  </div>
                  <div className={css({ height: '6px', backgroundColor: '#F0F0F0', borderRadius: '3px', overflow: 'hidden' })}>
                    <div className={barStyle(r.count > 30 ? '#E11900' : r.count > 10 ? '#EA8600' : '#276EF1', r.pct)} />
                  </div>
                </div>
                <div className={css({ fontWeight: 700, fontSize: '16px', color: r.count > 30 ? '#E11900' : r.count > 10 ? '#EA8600' : '#276EF1', minWidth: '30px', textAlign: 'right' as const })}>{r.count}</div>
              </div>
            ))}
            {staleByRep.length === 0 && (
              <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#05944F', fontWeight: 500 })}>✅ No stale opportunities — pipeline is clean!</div>
            )}
            <div className={css({ marginTop: '16px', padding: '10px 12px', backgroundColor: '#F8F8F8', borderRadius: '6px', fontSize: '11px', color: '#666' })}>
              💡 Stale = opportunities not updated recently. High counts indicate reps need a pipeline cleanup sprint.
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* CWnFT Modal */}
      <Modal isOpen={cwnftModal} onClose={() => setCwnftModal(false)} overrides={{ Dialog: { style: { width: '720px', maxHeight: '80vh', overflow: 'auto' } } }}>
        <ModalHeader>CWnFT Deals Breakdown</ModalHeader>
        <ModalBody>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', backgroundColor: '#FFF0F0', borderRadius: '8px', border: '1px solid #FFCDD2' })}>
              <span className={css({ fontWeight: 600 })}>Total CWnFT Deals</span>
              <span className={css({ fontSize: '24px', fontWeight: 700, color: '#E11900', fontFamily: 'UberMove' })}>{totalCWnFT}</span>
            </div>
            <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Count by Rep</div>
            {cwnftByRep.map((r, i) => (
              <div key={i} className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' })}>
                <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' })}>
                  <span className={css({ fontWeight: 500, width: '130px' })}>{r.name}</span>
                  <span className={css({ fontSize: '11px', color: '#888' })}>{r.count} of {r.totalCW} CW ({r.pctNFT.toFixed(1)}% NFT)</span>
                  <span className={css({ fontWeight: 700, fontSize: '16px', color: r.pctNFT > 15 ? '#E11900' : r.pctNFT > 8 ? '#EA8600' : '#276EF1' })}>{r.count}</span>
                </div>
                <div className={css({ display: 'flex', gap: '6px', fontSize: '10px' })}>
                  {r.byTier.t1 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 500 })}>T1: {r.byTier.t1}</span>}
                  {r.byTier.t2 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E8F5E9', borderRadius: '3px', fontWeight: 500 })}>T2: {r.byTier.t2}</span>}
                  {r.byTier.t3 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>T3: {r.byTier.t3}</span>}
                  {r.byTier.t4_5 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>T4/5: {r.byTier.t4_5}</span>}
                  {r.byTier.ut > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#F3E5F5', borderRadius: '3px', fontWeight: 500 })}>UT: {r.byTier.ut}</span>}
                </div>
              </div>
            ))}
            {cwnftAccounts.length > 0 && (
              <>
                <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginTop: '20px', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>All CWnFT Accounts</div>
                <div className={css({ overflow: 'auto', maxHeight: '300px' })}>
                  <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '12px' } as any)}>
                    <thead>
                      <tr className={css({ backgroundColor: '#F8F8F8', position: 'sticky' as const, top: 0 } as any)}>
                        {['Account', 'Rep', 'Tier', 'CW Date'].map(h => (
                          <th key={h} className={css({ padding: '8px 10px', textAlign: 'left' as const, fontSize: '10px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cwnftAccounts.map((a, i) => (
                        <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                          <td className={css({ padding: '7px 10px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{a.account}</td>
                          <td className={css({ padding: '7px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.rep.split(' ')[0]}</td>
                          <td className={css({ padding: '7px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>
                            <span className={css({ padding: '1px 5px', backgroundColor: '#F0F0F0', borderRadius: '3px', fontSize: '10px' })}>{a.tier}</span>
                          </td>
                          <td className={css({ padding: '7px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.cwDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className={css({ marginTop: '16px', padding: '10px 12px', backgroundColor: '#F8F8F8', borderRadius: '6px', fontSize: '11px', color: '#666' })}>
              💡 CWnFT = Closed Won but No First Trip. These are revenue at risk of never materializing. Focus on high-tier accounts first.
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Risk Factor Drilldown Modal */}
      <Modal isOpen={drilldown !== null} onClose={() => setDrilldown(null)} overrides={{ Dialog: { style: { width: '700px', maxHeight: '80vh', overflow: 'auto' } } }}>
        <ModalHeader>{riskFactors.find(f => f.key === drilldown)?.label || ''} — Deep Dive</ModalHeader>
        <ModalBody>
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText' })}>
            {/* Description */}
            <div className={css({ padding: '12px', backgroundColor: '#F0F4FF', borderRadius: '8px', border: '1px solid #D0DBFF', marginBottom: '16px', fontSize: '12px', color: '#333' })}>
              {riskFactors.find(f => f.key === drilldown)?.desc}
            </div>

            {drilldown === 'attainment' && (
              <>
                <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Reps Below 85% Attainment</div>
                {(getDrilldownReps('attainment') as typeof reps).map((r, i) => {
                  const gap = 85 - r.pctToQuota;
                  const ptsNeeded = Math.ceil((r.quota * 0.85) - r.currentPts);
                  return (
                    <div key={i} className={css({ padding: '12px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: '16px' })}>
                      <div className={css({ width: '140px', fontWeight: 500 })}>{r.name}</div>
                      <div className={css({ flex: 1 })}>
                        <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' })}>
                          <span className={css({ fontSize: '11px', color: '#888' })}>{r.currentPts}/{r.quota} pts • {r.pctToQuota.toFixed(1)}%</span>
                          <span className={css({ fontSize: '11px', color: '#E11900', fontWeight: 600 })}>{gap.toFixed(0)}% below threshold</span>
                        </div>
                        <div className={css({ height: '8px', backgroundColor: '#F0F0F0', borderRadius: '4px', overflow: 'hidden', position: 'relative' as const })}>
                          <div className={css({ height: '100%', borderRadius: '4px', backgroundColor: r.pctToQuota < 60 ? '#E11900' : '#EA8600', width: `${Math.min(r.pctToQuota, 100)}%`, transition: 'width 0.3s' })} />
                          <div className={css({ position: 'absolute' as const, left: '85%', top: 0, bottom: 0, width: '2px', backgroundColor: '#276EF1' })} />
                        </div>
                        <div className={css({ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px' })}>
                          <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>Needs {ptsNeeded > 0 ? ptsNeeded : 0} more pts</span>
                          <span className={css({ padding: '2px 6px', backgroundColor: '#F3E5F5', borderRadius: '3px', fontWeight: 500 })}>{r.reqPtsPerWk.toFixed(1)} pts/wk needed</span>
                          <span className={css({ padding: '2px 6px', backgroundColor: r.currentPtsPerWk >= r.reqPtsPerWk ? '#E8F5E9' : '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>
                            Currently {r.currentPtsPerWk.toFixed(1)} pts/wk
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(getDrilldownReps('attainment') as typeof reps).length === 0 && (
                  <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#05944F', fontWeight: 500 })}>✅ All reps above 85% attainment!</div>
                )}
              </>
            )}

            {drilldown === 'stale' && (
              <>
                <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Reps with 30+ Stale Opps</div>
                {(getDrilldownReps('stale') as typeof pipes).map((p, i) => {
                  const stalePct = Math.round((p.outOfDate / p.totalOpen) * 100);
                  return (
                    <div key={i} className={css({ padding: '12px', borderBottom: '1px solid #F0F0F0' })}>
                      <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' })}>
                        <span className={css({ fontWeight: 500, width: '140px' })}>{p.name}</span>
                        <span className={css({ fontWeight: 700, fontSize: '20px', color: '#E11900' })}>{p.outOfDate}</span>
                      </div>
                      <div className={css({ height: '8px', backgroundColor: '#F0F0F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' })}>
                        <div className={barStyle('#E11900', stalePct)} />
                      </div>
                      <div className={css({ display: 'flex', gap: '8px', fontSize: '10px', flexWrap: 'wrap' as const })}>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>{stalePct}% of pipeline stale</span>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 500 })}>Outreach: {p.outreach}</span>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#E8F5E9', borderRadius: '3px', fontWeight: 500 })}>Pitching: {p.pitching}</span>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>Negotiation: {p.negotiation}</span>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#F3E5F5', borderRadius: '3px', fontWeight: 500 })}>Created LW: {p.createdLW}</span>
                      </div>
                    </div>
                  );
                })}
                {(getDrilldownReps('stale') as typeof pipes).length === 0 && (
                  <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#05944F', fontWeight: 500 })}>✅ No reps with 30+ stale opps!</div>
                )}
              </>
            )}

            {drilldown === 'cwnft' && (
              <>
                <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Reps with CWnFT Rate Above 15%</div>
                {(getDrilldownReps('cwnft') as typeof cwnfts).map((c, i) => (
                  <div key={i} className={css({ padding: '12px', borderBottom: '1px solid #F0F0F0' })}>
                    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' })}>
                      <span className={css({ fontWeight: 500, width: '140px' })}>{c.name}</span>
                      <span className={css({ fontWeight: 700, fontSize: '16px', color: '#E11900' })}>{c.pctNFT.toFixed(1)}% NFT</span>
                    </div>
                    <div className={css({ display: 'flex', gap: '8px', fontSize: '10px', flexWrap: 'wrap' as const, marginBottom: '6px' })}>
                      <span className={css({ padding: '2px 6px', backgroundColor: '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>{c.cwnft} of {c.totalCW} deals not live</span>
                      <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>Avg {c.avgDaysCWtoFT.toFixed(0)}d CW→FT</span>
                      <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 500 })}>F28D Conv: {c.f28dConv.toFixed(0)}%</span>
                      {c.cwnftGt90d > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E11900', color: '#FFF', borderRadius: '3px', fontWeight: 500 })}>{c.cwnftGt90d} deals 90d+ old</span>}
                    </div>
                    <div className={css({ display: 'flex', gap: '6px', fontSize: '10px' })}>
                      {c.cwnftByTier.t1 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 500 })}>T1: {c.cwnftByTier.t1}</span>}
                      {c.cwnftByTier.t2 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E8F5E9', borderRadius: '3px', fontWeight: 500 })}>T2: {c.cwnftByTier.t2}</span>}
                      {c.cwnftByTier.t3 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>T3: {c.cwnftByTier.t3}</span>}
                      {c.cwnftByTier.t4_5 > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>T4/5: {c.cwnftByTier.t4_5}</span>}
                      {c.cwnftByTier.ut > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#F3E5F5', borderRadius: '3px', fontWeight: 500 })}>UT: {c.cwnftByTier.ut}</span>}
                    </div>
                  </div>
                ))}
                {(getDrilldownReps('cwnft') as typeof cwnfts).length === 0 && (
                  <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#05944F', fontWeight: 500 })}>✅ All reps below 15% CWnFT rate!</div>
                )}
              </>
            )}

            {drilldown === 'creation' && (
              <>
                <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Reps Creating &lt;3 Opps Last Week</div>
                {(getDrilldownReps('creation') as typeof pipes).map((p, i) => {
                  const att = reps.find(r => r.name === p.name);
                  return (
                    <div key={i} className={css({ padding: '12px', borderBottom: '1px solid #F0F0F0' })}>
                      <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' })}>
                        <span className={css({ fontWeight: 500, width: '140px' })}>{p.name}</span>
                        <span className={css({ fontWeight: 700, fontSize: '16px', color: '#E11900' })}>{p.createdLW} created LW</span>
                      </div>
                      <div className={css({ display: 'flex', gap: '8px', fontSize: '10px', flexWrap: 'wrap' as const })}>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 500 })}>L4W trend: {p.l4wCreated.join(' → ')}</span>
                        <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>{p.totalOpen} open opps</span>
                        {att && <span className={css({ padding: '2px 6px', backgroundColor: att.pctToQuota >= 85 ? '#E8F5E9' : '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>Attainment: {att.pctToQuota.toFixed(0)}%</span>}
                      </div>
                    </div>
                  );
                })}
                {(getDrilldownReps('creation') as typeof pipes).length === 0 && (
                  <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#05944F', fontWeight: 500 })}>✅ All reps created 3+ opps last week!</div>
                )}
              </>
            )}

            {drilldown === 'coaching' && (
              <>
                <div className={css({ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Reps with High Coaching Urgency</div>
                {(getDrilldownReps('coaching') as typeof repCoaching).map((c, i) => (
                  <div key={i} className={css({ padding: '12px', borderBottom: '1px solid #F0F0F0' })}>
                    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' })}>
                      <span className={css({ fontWeight: 500, width: '140px' })}>{c.name}</span>
                      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                        <span className={css({ padding: '2px 8px', backgroundColor: '#E11900', color: '#FFF', borderRadius: '10px', fontSize: '11px', fontWeight: 700 })}>Urgency: {c.urgency}/10</span>
                      </div>
                    </div>
                    <div className={css({ fontSize: '12px', color: '#555', marginBottom: '8px', lineHeight: '1.4' })}>{c.insight}</div>
                    <div className={css({ display: 'flex', gap: '6px', fontSize: '10px', flexWrap: 'wrap' as const, marginBottom: '6px' })}>
                      <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 600 })}>Primary: {c.primaryArea}</span>
                      {c.secondaryArea && <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>Secondary: {c.secondaryArea}</span>}
                    </div>
                    <div className={css({ fontSize: '11px', color: '#333', marginTop: '6px' })}>
                      <div className={css({ fontWeight: 600, marginBottom: '3px' })}>Recommended Actions:</div>
                      <ul className={css({ margin: 0, paddingLeft: '16px' })}>
                        {c.actions.map((a, j) => <li key={j} className={css({ marginBottom: '2px' })}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                ))}
                {(getDrilldownReps('coaching') as typeof repCoaching).length === 0 && (
                  <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#05944F', fontWeight: 500 })}>✅ No reps with urgency ≥7!</div>
                )}
              </>
            )}
          </div>
        </ModalBody>
      </Modal>

      <CollapsibleInsights title="Risk Insights" count={insights.length}>
        {insights.map((ins, i) => <InsightCard key={i} text={ins} type={i === 0 ? 'danger' : 'warning'} />)}
      </CollapsibleInsights>

      {/* Composite Risk Score — improved visualization */}
      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' })}>
            <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700 })}>Composite Risk Score</div>
          </div>
          <div className={css({ fontSize: '11px', color: '#888', marginBottom: '14px', lineHeight: '1.4' })}>
            Weighted score (0–100) combining attainment, pipeline hygiene, CWnFT, opp creation, and coaching urgency. Click a rep to see their risk breakdown.
          </div>

          {/* Visual risk cards instead of bar chart */}
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '6px' })}>
            {riskScores.map((r, i) => {
              const color = r.score >= 50 ? '#E11900' : r.score >= 30 ? '#EA8600' : r.score >= 15 ? '#276EF1' : '#05944F';
              const bgColor = r.score >= 50 ? '#FFF0F0' : r.score >= 30 ? '#FFF8F0' : r.score >= 15 ? '#F0F4FF' : '#F0FFF4';
              const isSelected = selectedRiskRep === r.name;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedRiskRep(isSelected ? null : r.name)}
                  className={css({
                    padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                    backgroundColor: isSelected ? bgColor : '#FAFAFA',
                    border: isSelected ? `2px solid ${color}` : '1px solid #F0F0F0',
                    transition: 'all 0.15s',
                    ':hover': { backgroundColor: bgColor },
                  })}
                >
                  <div className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}>
                    <div className={css({ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700, fontFamily: 'UberMove', flexShrink: 0 })}>
                      {r.score}
                    </div>
                    <div className={css({ flex: 1, minWidth: 0 })}>
                      <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' })}>
                        <span className={css({ fontWeight: 600, fontSize: '12px' })}>{r.name.split(' ')[0]}</span>
                        <StatusBadge status={r.level === 'Critical' ? 'risk' : r.level === 'High' ? 'behind' : r.level === 'Medium' ? 'on-pace' : 'ahead'} label={r.level} />
                      </div>
                      <div className={css({ height: '4px', backgroundColor: '#E8E8E8', borderRadius: '2px', overflow: 'hidden' })}>
                        <div className={css({ height: '100%', borderRadius: '2px', backgroundColor: color, width: `${Math.min(r.score, 100)}%`, transition: 'width 0.3s' })} />
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className={css({ marginTop: '8px', display: 'flex', gap: '4px', flexWrap: 'wrap' as const, fontSize: '10px' })}>
                      {r.attainmentScore > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#FCE4EC', borderRadius: '3px', fontWeight: 500 })}>Attainment: +{r.attainmentScore}</span>}
                      {r.staleScore > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#FFF3E0', borderRadius: '3px', fontWeight: 500 })}>Stale: +{r.staleScore}</span>}
                      {r.cwnftScore > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E3F2FD', borderRadius: '3px', fontWeight: 500 })}>CWnFT: +{r.cwnftScore}</span>}
                      {r.creationScore > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#F3E5F5', borderRadius: '3px', fontWeight: 500 })}>Creation: +{r.creationScore}</span>}
                      {r.coachingScore > 0 && <span className={css({ padding: '2px 6px', backgroundColor: '#E8F5E9', borderRadius: '3px', fontWeight: 500 })}>Coaching: +{r.coachingScore}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: Radar chart for selected rep OR Risk Factor Breakdown */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          {selectedRepData ? (
            <>
              <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' })}>
                <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700 })}>{selectedRepData.name} — Risk Profile</div>
                <span onClick={() => setSelectedRiskRep(null)} className={css({ fontSize: '11px', color: '#276EF1', cursor: 'pointer', ':hover': { textDecoration: 'underline' } })}>← Back to factors</span>
              </div>
              <div className={css({ fontSize: '11px', color: '#888', marginBottom: '8px' })}>
                Radar shows where this rep's risk is concentrated. Larger area = more risk in that dimension.
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#E8E8E8" />
                  <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#666' }} />
                  <PolarRadiusAxis domain={[0, 30]} tick={false} axisLine={false} />
                  <Radar name="Risk" dataKey="value" stroke={selectedRepData.score >= 50 ? '#E11900' : selectedRepData.score >= 30 ? '#EA8600' : '#276EF1'} fill={selectedRepData.score >= 50 ? '#E11900' : selectedRepData.score >= 30 ? '#EA8600' : '#276EF1'} fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', marginTop: '8px' })}>
                <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px' })}>
                  <span className={css({ color: '#888' })}>Attainment</span>
                  <span className={css({ float: 'right' as const, fontWeight: 600, color: pctColor(selectedRepData.attainment) })}>{selectedRepData.attainment.toFixed(0)}%</span>
                </div>
                <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px' })}>
                  <span className={css({ color: '#888' })}>Stale Opps</span>
                  <span className={css({ float: 'right' as const, fontWeight: 600, color: selectedRepData.staleOpps > 20 ? '#E11900' : '#05944F' })}>{selectedRepData.staleOpps}</span>
                </div>
                <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px' })}>
                  <span className={css({ color: '#888' })}>CWnFT Rate</span>
                  <span className={css({ float: 'right' as const, fontWeight: 600, color: selectedRepData.cwnftRate > 15 ? '#E11900' : '#05944F' })}>{selectedRepData.cwnftRate.toFixed(1)}%</span>
                </div>
                <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px' })}>
                  <span className={css({ color: '#888' })}>Created LW</span>
                  <span className={css({ float: 'right' as const, fontWeight: 600, color: selectedRepData.createdLW < 3 ? '#E11900' : '#05944F' })}>{selectedRepData.createdLW}</span>
                </div>
                <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px', gridColumn: '1 / -1' })}>
                  <span className={css({ color: '#888' })}>Coaching Focus</span>
                  <span className={css({ float: 'right' as const, fontWeight: 600 })}>{selectedRepData.coachingArea} (urgency: {selectedRepData.coachingUrgency})</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>Risk Factor Breakdown</div>
              <div className={css({ fontSize: '11px', color: '#888', marginBottom: '12px' })}>Click any factor to see which reps are flagged and why.</div>
              <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#555' })}>
                {riskFactors.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => f.count > 0 ? setDrilldown(f.key) : undefined}
                    className={css({
                      padding: '10px 12px',
                      borderBottom: i < riskFactors.length - 1 ? '1px solid #F0F0F0' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: f.count > 0 ? 'pointer' : 'default',
                      borderRadius: '4px',
                      transition: 'background-color 0.15s',
                      ':hover': f.count > 0 ? { backgroundColor: '#F8F8FF' } : {},
                    })}
                  >
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                      <span>{f.label}</span>
                      {f.count > 0 && <span className={css({ fontSize: '10px', color: '#276EF1' })}>→ drill down</span>}
                    </div>
                    <span className={css({
                      fontWeight: 700, fontSize: '14px',
                      color: f.count > 0 ? '#E11900' : '#05944F',
                      backgroundColor: f.count > 0 ? '#FFF0F0' : '#F0FFF4',
                      padding: '2px 10px', borderRadius: '10px',
                    })}>{f.count} reps</span>
                  </div>
                ))}
              </div>

              {/* Scoring methodology */}
              <div className={css({ marginTop: '16px', padding: '10px 12px', backgroundColor: '#F8F8F8', borderRadius: '6px', fontSize: '10px', color: '#888', lineHeight: '1.5' })}>
                <span className={css({ fontWeight: 600, color: '#666' })}>How scores are calculated:</span><br />
                Attainment &lt;60% → +30 | &lt;85% → +15 &nbsp;•&nbsp;
                Stale &gt;30 → +20 | &gt;10 → +10 &nbsp;•&nbsp;
                CWnFT &gt;15% → +15 | &gt;10% → +8 &nbsp;•&nbsp;
                Created &lt;3 → +10 &nbsp;•&nbsp;
                Coaching urgency × 2
              </div>
            </>
          )}
        </div>
      </div>

      <SectionHeader title="Rep Risk Matrix" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText', minWidth: '800px' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['Rep', 'Risk Score', 'Level', 'Attainment', 'Stale Opps', 'CWnFT %', 'Created LW', 'Coach Area'].map(h => (
                <th key={h} className={css({ padding: '10px 12px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {riskScores.map((rep, i) => (
              <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                <td className={css({ padding: '10px 12px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{rep.name}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 700, color: rep.score >= 50 ? '#E11900' : rep.score >= 30 ? '#EA8600' : rep.score >= 15 ? '#276EF1' : '#05944F', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.score}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>
                  <StatusBadge status={rep.level === 'Critical' ? 'risk' : rep.level === 'High' ? 'behind' : rep.level === 'Medium' ? 'on-pace' : 'ahead'} label={rep.level} />
                </td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: rep.attainment >= 100 ? '#05944F' : rep.attainment >= 85 ? '#1967D2' : rep.attainment >= 60 ? '#EA8600' : '#E11900', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.attainment.toFixed(0)}%</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: rep.staleOpps > 20 ? '#E11900' : rep.staleOpps > 5 ? '#EA8600' : '#05944F', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.staleOpps}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: rep.cwnftRate > 15 ? '#E11900' : rep.cwnftRate > 8 ? '#EA8600' : '#05944F', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.cwnftRate.toFixed(1)}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.createdLW}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>
                  <span className={css({ padding: '2px 6px', backgroundColor: '#F0F0F0', borderRadius: '3px', fontSize: '10px', fontWeight: 500 })}>{rep.coachingArea}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
