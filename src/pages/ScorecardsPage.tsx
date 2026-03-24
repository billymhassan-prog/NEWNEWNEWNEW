import { useStyletron } from "baseui";
import { useState } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import { MetricCard, StatusBadge, SectionHeader, ProgressBar, InsightCard, pctColor } from "../components/SharedUI";
import { repCoaching, repAttainment, repPipeline, repCWnFT, repL12DActivity, repL12WActivity, repNDG, RepName } from "../data/dashboardData";
import { Drawer } from "baseui/drawer";
import { Button, SIZE, KIND } from "baseui/button";
import { getRepThemes } from "../utils/repThemes";

function getRepStatus(rep: typeof repAttainment[0]): 'ahead' | 'on-pace' | 'behind' | 'risk' | 'ramp' {
  if (rep.quota === 0) return 'ramp';
  if (rep.pctToQuota >= 100) return 'ahead';
  if (rep.pctToQuota >= 85) return 'on-pace';
  if (rep.pctToQuota >= 60) return 'behind';
  return 'risk';
}

function getRepScores(name: RepName) {
  const attn = repAttainment.find(r => r.name === name);
  const pipe = repPipeline.find(r => r.name === name);
  const cwnft = repCWnFT.find(r => r.name === name);
  const activity = repL12DActivity.find(r => r.name === name);
  const ndg = repNDG.find(r => r.name === name);
  if (!attn || !pipe || !cwnft || !activity) return [];
  const teamAvgCalls = repL12DActivity.reduce((s, r) => s + r.totalCalls, 0) / repL12DActivity.length;
  return [
    { area: 'Activity', score: Math.min(100, (activity.totalCalls / teamAvgCalls) * 70), fullMark: 100 },
    { area: 'Pipeline', score: Math.min(100, (pipe.totalOpen / 40) * 60 + (pipe.createdLW / 8) * 40), fullMark: 100 },
    { area: 'Conversion', score: attn.quota > 0 ? Math.min(100, attn.pctToQuota) : 0, fullMark: 100 },
    { area: 'Hygiene', score: Math.max(0, 100 - (pipe.outOfDate / Math.max(1, pipe.totalOpen)) * 100), fullMark: 100 },
    { area: 'Post-Close', score: cwnft.totalCW > 0 ? Math.max(0, 100 - cwnft.pctNFT * 5) : 50, fullMark: 100 },
    { area: 'NDG', score: Math.min(100, (ndg?.ndgPct || 0) * 5), fullMark: 100 },
  ];
}

export default function ScorecardsPage({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [drawerRep, setDrawerRep] = useState<RepName | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const reps = selectedRep === 'all' ? repAttainment : repAttainment.filter(r => r.name === selectedRep);
  const coaching = selectedRep === 'all' ? repCoaching : repCoaching.filter(r => r.name === selectedRep);
  const sortedCoaching = [...coaching].sort((a, b) => b.urgency - a.urgency);
  const drawerData = drawerRep ? repCoaching.find(r => r.name === drawerRep) : null;
  const drawerAttn = drawerRep ? repAttainment.find(r => r.name === drawerRep) : null;
  const drawerPipe = drawerRep ? repPipeline.find(r => r.name === drawerRep) : null;
  const drawerCwnft = drawerRep ? repCWnFT.find(r => r.name === drawerRep) : null;
  const drawerActivity = drawerRep ? repL12DActivity.find(r => r.name === drawerRep) : null;
  const drawerL12W = drawerRep ? repL12WActivity.find(r => r.name === drawerRep) : null;

  return (
    <div>
      {/* Coaching Queue */}
      <SectionHeader title="Coaching Queue" subtitle="Ranked by urgency — who needs your attention first" />
      <div className={css({ display: 'grid', gap: '8px', marginBottom: '24px' })}>
        {sortedCoaching.map((c, i) => {
          const rep = repAttainment.find(r => r.name === c.name)!;
          return (
            <div
              key={i}
              onClick={() => setDrawerRep(c.name)}
              className={css({
                backgroundColor: '#FFF', border: '1px solid #E8E8E8', borderRadius: '8px',
                padding: '14px 18px', display: 'grid',
                gridTemplateColumns: '30px 1fr 100px 120px 200px',
                alignItems: 'center', gap: '16px', cursor: 'pointer',
                ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderColor: '#CCC' },
              })}
            >
              <div className={css({
                width: '26px', height: '26px', borderRadius: '50%',
                backgroundColor: c.urgency >= 8 ? '#E11900' : c.urgency >= 5 ? '#EA8600' : '#276EF1',
                color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700,
              })}>
                {i + 1}
              </div>
              <div>
                <div className={css({ fontFamily: 'UberMoveText', fontWeight: 500, fontSize: '14px' })}>{c.name}</div>
                <div className={css({ fontFamily: 'UberMoveText', fontSize: '12px', color: '#666', marginTop: '2px' })}>{c.insight.substring(0, 100)}...</div>
              </div>
              <StatusBadge status={getRepStatus(rep)} />
              <div className={css({ fontSize: '11px', color: '#666', textAlign: 'center' as const })}>
                <div className={css({ fontWeight: 600, color: pctColor(rep.pctToQuota), fontSize: '13px' })}>{rep.pctToQuota > 0 ? `${rep.pctToQuota.toFixed(0)}%` : '—'}</div>
                attainment
              </div>
              <div className={css({ display: 'flex', gap: '4px', flexWrap: 'wrap' as const })}>
                <span className={css({ padding: '2px 6px', backgroundColor: '#F0F0F0', borderRadius: '3px', fontSize: '10px', fontWeight: 500 })}>{c.primaryArea}</span>
                {c.secondaryArea && <span className={css({ padding: '2px 6px', backgroundColor: '#F0F0F0', borderRadius: '3px', fontSize: '10px', fontWeight: 500 })}>{c.secondaryArea}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rep Scorecards — ALL reps */}
      <SectionHeader title="Rep Scorecards" subtitle="Click any rep for a deep dive" />
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' })}>
        {reps.map((rep, i) => {
          const c = repCoaching.find(r2 => r2.name === rep.name);
          const pipe = repPipeline.find(r2 => r2.name === rep.name);
          return (
            <div key={i} onClick={() => setDrawerRep(rep.name)} className={css({
              backgroundColor: '#FFF', border: '1px solid #E8E8E8', borderRadius: '8px', padding: '16px', cursor: 'pointer',
              ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderColor: '#CCC' },
            })}>
              <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '15px' })}>{rep.name}</div>
                <StatusBadge status={getRepStatus(rep)} />
              </div>
              <ProgressBar value={rep.quota > 0 ? rep.pctToQuota : 0} max={100} />
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' })}>
                <div className={css({ textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700 })}>{rep.currentPts}</div>
                  <div className={css({ fontSize: '10px', color: '#888' })}>FT Pts</div>
                </div>
                <div className={css({ textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700 })}>{rep.totalFTs}</div>
                  <div className={css({ fontSize: '10px', color: '#888' })}>FTs</div>
                </div>
                <div className={css({ textAlign: 'center' as const })}>
                  <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700, color: pctColor(rep.pctToQuota) })}>{rep.quota > 0 ? `${rep.pctToQuota.toFixed(0)}%` : '—'}</div>
                  <div className={css({ fontSize: '10px', color: '#888' })}>Attn</div>
                </div>
              </div>
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', marginTop: '8px', fontSize: '11px', color: '#666' })}>
                <div>CW: {pipe?.cwToDate ?? 0}</div>
                <div>Open: {pipe?.totalOpen ?? 0}</div>
                <div>Stale: {pipe?.outOfDate ?? 0}</div>
                <div>NDG: {rep.currentNDG}%</div>
              </div>
              {c && (
                <div className={css({ marginTop: '8px', padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px', fontSize: '11px', color: '#555' })}>
                  📋 Coach: {c.primaryArea}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rep Detail Drawer */}
      <Drawer isOpen={!!drawerRep} onClose={() => setDrawerRep(null)} size="45%"
        overrides={{ DrawerBody: { style: { marginTop: '0', marginBottom: '0', marginLeft: '0', marginRight: '0' } } }}
      >
        {drawerData && drawerAttn && (
          <div className={css({ padding: '24px' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '22px' })}>{drawerData.name}</div>
              <div className={css({ display: 'flex', gap: '8px', alignItems: 'center' })}>
                <Button size={SIZE.compact} onClick={() => {
                  const { goingWell, workOn } = getRepThemes(drawerData.name);
                  const attn = drawerAttn;
                  const pipe = drawerPipe;
                  const cwnft = drawerCwnft;
                  let text = `1:1 PREP — ${drawerData.name}\n`;
                  text += `Generated: ${new Date().toLocaleDateString()}\n\n`;
                  text += `📊 PERFORMANCE SNAPSHOT\n`;
                  text += `• Attainment: ${attn.pctToQuota.toFixed(0)}% (${attn.currentPts}/${attn.quota} pts)\n`;
                  text += `• NDG: ${attn.currentNDG}%\n`;
                  if (pipe) text += `• Pipeline: ${pipe.totalOpen} open, ${pipe.outOfDate} stale, ${pipe.createdLW} created LW\n`;
                  if (cwnft) text += `• Post-Close: ${cwnft.cwnft} CWnFT (${cwnft.pctNFT.toFixed(1)}%), F28D Conv: ${cwnft.f28dConv}%\n`;
                  text += `\n🧑‍🏫 COACHING FOCUS\n`;
                  text += `• Primary: ${drawerData.primaryArea}${drawerData.secondaryArea ? ` / ${drawerData.secondaryArea}` : ''}\n`;
                  text += `• Urgency: ${drawerData.urgency}/10\n`;
                  text += `• Insight: ${drawerData.insight}\n`;
                  text += `\n✅ GOING WELL\n`;
                  goingWell.forEach(g => { text += `• ${g}\n`; });
                  text += `\n⚠️ WORK ON\n`;
                  workOn.forEach(w => { text += `• ${w}\n`; });
                  text += `\n📋 ACTIONS\n`;
                  drawerData.actions.forEach(a => { text += `• ${a}\n`; });
                  navigator.clipboard.writeText(text).then(() => {
                    setCopiedSummary(true);
                    setTimeout(() => setCopiedSummary(false), 2000);
                  });
                }}
                  overrides={{ BaseButton: { style: { backgroundColor: '#276EF1', color: '#FFF', fontSize: '12px' } } }}>
                  {copiedSummary ? '✅ Copied!' : '📋 Copy 1:1 Summary'}
                </Button>
                <StatusBadge status={getRepStatus(drawerAttn)} />
              </div>
            </div>

            {/* Skill Radar */}
            <div className={css({ marginBottom: '16px' })}>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={getRepScores(drawerData.name)}>
                  <PolarGrid stroke="#E8E8E8" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name={drawerData.name} dataKey="score" stroke="#276EF1" fill="#276EF1" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' })}>
              <MetricCard title="Attainment" value={`${drawerAttn.pctToQuota.toFixed(1)}%`} small />
              <MetricCard title="FT Points" value={`${drawerAttn.currentPts}/${drawerAttn.quota}`} small />
              <MetricCard title="NDG" value={`${drawerAttn.currentNDG}%`} small />
            </div>

            {/* Activity Sparkline */}
            {drawerActivity && (
              <div className={css({ marginBottom: '16px' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>L12D Call Trend</div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={drawerActivity.calls.map((c, i) => ({ day: i + 1, calls: c }))}>
                    <Line type="monotone" dataKey="calls" stroke="#276EF1" strokeWidth={2} dot={false} />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {drawerL12W && (
              <div className={css({ marginBottom: '16px' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>12-Week Call Trend</div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={drawerL12W.calls.map((c, i) => ({ wk: i + 1, calls: c }))}>
                    <Line type="monotone" dataKey="calls" stroke="#05944F" strokeWidth={2} dot={false} />
                    <Tooltip />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className={css({ marginBottom: '16px' })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Coaching Areas</div>
              <div className={css({ display: 'flex', gap: '6px', flexWrap: 'wrap' as const })}>
                <span className={css({ padding: '4px 10px', backgroundColor: '#276EF1', color: '#FFF', borderRadius: '4px', fontSize: '12px', fontWeight: 600 })}>{drawerData.primaryArea}</span>
                {drawerData.secondaryArea && <span className={css({ padding: '4px 10px', backgroundColor: '#E8E8E8', borderRadius: '4px', fontSize: '12px', fontWeight: 500 })}>{drawerData.secondaryArea}</span>}
              </div>
            </div>

            <div className={css({ marginBottom: '16px' })}>
              <InsightCard text={drawerData.insight} type={drawerData.urgency >= 7 ? 'danger' : drawerData.urgency >= 4 ? 'warning' : 'info'} />
            </div>

            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' })}>
              <div>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#05944F' })}>Strengths</div>
                {drawerData.strengths.map((s, i) => (
                  <div key={i} className={css({ fontSize: '12px', color: '#333', marginBottom: '4px', fontFamily: 'UberMoveText' })}>✅ {s}</div>
                ))}
              </div>
              <div>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#E11900' })}>Weaknesses</div>
                {drawerData.weaknesses.map((w, i) => (
                  <div key={i} className={css({ fontSize: '12px', color: '#333', marginBottom: '4px', fontFamily: 'UberMoveText' })}>⚠️ {w}</div>
                ))}
              </div>
            </div>

            <div className={css({ marginBottom: '16px' })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Recommended Actions</div>
              {drawerData.actions.map((a, i) => (
                <div key={i} className={css({ fontSize: '13px', color: '#333', marginBottom: '6px', fontFamily: 'UberMoveText', paddingLeft: '16px', borderLeft: '3px solid #276EF1' })}>
                  {a}
                </div>
              ))}
            </div>

            {drawerPipe && (
              <div className={css({ marginBottom: '16px' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Pipeline</div>
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' })}>
                  <MetricCard title="Open" value={drawerPipe.totalOpen} small />
                  <MetricCard title="Created LW" value={drawerPipe.createdLW} small />
                  <MetricCard title="CW Total" value={drawerPipe.cwToDate} small />
                  <MetricCard title="Stale" value={drawerPipe.outOfDate} color={drawerPipe.outOfDate > 20 ? '#E11900' : undefined} small />
                </div>
              </div>
            )}

            {drawerCwnft && (
              <div>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Post-Close</div>
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' })}>
                  <MetricCard title="CWnFT" value={drawerCwnft.cwnft} small />
                  <MetricCard title="Avg Days" value={drawerCwnft.avgDaysCWtoFT || '—'} small />
                  <MetricCard title="F28D Conv" value={`${drawerCwnft.f28dConv}%`} small />
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
