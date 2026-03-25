import { useState } from "react";
import { useStyletron } from "baseui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ReferenceLine } from "recharts";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { MetricCard, SectionHeader, InsightCard, ProgressBar, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repL12DActivity, l12dDates, teamL12DActivity, repL12WActivity, l12wWeeks, RepName } from "../data/dashboardData";
import { Button, SIZE, KIND } from "baseui/button";
import { useThresholds } from "../context/ThresholdsContext";

export default function ActivityL12D({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [radarRep, setRadarRep] = useState<string | null>(null);
  const [wowPeriod, setWowPeriod] = useState<1 | 2 | 3 | 4 | 'mom'>(1);

  const reps = selectedRep === 'all' ? repL12DActivity : repL12DActivity.filter(r => r.name === selectedRep);
  const { thresholds } = useThresholds();
  const numReps = repL12DActivity.length;
  const teamAvgCalls = teamL12DActivity.totalCalls / numReps;
  const teamAvgTP = teamL12DActivity.totalTouchpoints / numReps;

  // Daily targets — team = daily × numReps, individual = daily
  const dailyCallTarget = selectedRep === 'all' ? thresholds.dailyDials * numReps : thresholds.dailyDials;
  const dailyTPTarget = selectedRep === 'all' ? thresholds.dailyTouchpoints * numReps : thresholds.dailyTouchpoints;

  const callLeaderboard = [...reps].sort((a, b) => b.totalCalls - a.totalCalls);

  const dailyTrend = l12dDates.map((d, i) => {
    const obj: Record<string, string | number> = { name: d };
    if (selectedRep === 'all') {
      obj.calls = teamL12DActivity.dailyCalls[i];
      obj.touchpoints = teamL12DActivity.dailyTouchpoints[i];
    } else {
      const rep = reps[0];
      obj.calls = rep.calls[i];
      obj.touchpoints = rep.touchpoints[i];
    }
    return obj;
  });

  const repCompare = reps.map(r => ({
    name: r.name.split(' ')[0],
    calls: r.totalCalls,
    talkTime: r.totalTalkTime,
    touchpoints: r.totalTouchpoints,
    emails: r.totalEmails,
  }));

  const repColors = ['#276EF1', '#05944F', '#EA8600', '#E11900', '#7627BB', '#00A4B4', '#FF6937'];

  const insights: string[] = [];
  const lowActivity = reps.filter(r => r.totalCalls < teamAvgCalls * 0.7);
  if (lowActivity.length > 0) insights.push(`${lowActivity.map(r => r.name.split(' ')[0]).join(', ')} ${lowActivity.length === 1 ? 'is' : 'are'} below 70% of team avg on calls — potential effort gap.`);
  const highTTLowResult = reps.filter(r => r.totalTalkTime > 15 && r.totalCalls < teamAvgCalls);
  if (highTTLowResult.length > 0) insights.push(`${highTTLowResult.map(r => r.name.split(' ')[0]).join(', ')} ${highTTLowResult.length === 1 ? 'has' : 'have'} decent talk time but low call count — may need efficiency coaching.`);
  const recentDrop = reps.filter(r => {
    const last3 = r.calls.slice(-3).reduce((s, v) => s + v, 0);
    const first3 = r.calls.slice(0, 3).reduce((s, v) => s + v, 0);
    return last3 < first3 * 0.5 && first3 > 50;
  });
  if (recentDrop.length > 0) insights.push(`${recentDrop.map(r => r.name.split(' ')[0]).join(', ')} show a significant activity drop in the last 3 days vs earlier in the period.`);

  // Radar data for selected rep
  const selectedRadarRep = radarRep ? repL12DActivity.find(r => r.name === radarRep) : null;
  const maxCalls = Math.max(...repL12DActivity.map(r => r.totalCalls));
  const maxTT = Math.max(...repL12DActivity.map(r => r.totalTalkTime));
  const maxEmails = Math.max(...repL12DActivity.map(r => r.totalEmails));
  const maxTP = Math.max(...repL12DActivity.map(r => r.totalTouchpoints));
  const maxBrands = Math.max(...repL12DActivity.map(r => r.brands.reduce((s, v) => s + v, 0)));

  const radarData = selectedRadarRep ? [
    { metric: 'Calls', value: Math.round((selectedRadarRep.totalCalls / maxCalls) * 100), raw: selectedRadarRep.totalCalls },
    { metric: 'Talk Time', value: Math.round((selectedRadarRep.totalTalkTime / maxTT) * 100), raw: `${selectedRadarRep.totalTalkTime}h` },
    { metric: 'Emails', value: Math.round((selectedRadarRep.totalEmails / maxEmails) * 100), raw: selectedRadarRep.totalEmails },
    { metric: 'Touchpoints', value: Math.round((selectedRadarRep.totalTouchpoints / maxTP) * 100), raw: selectedRadarRep.totalTouchpoints },
    { metric: 'Brands', value: Math.round((selectedRadarRep.brands.reduce((s, v) => s + v, 0) / maxBrands) * 100), raw: selectedRadarRep.brands.reduce((s, v) => s + v, 0) },
  ] : [];

  return (
    <div>
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Total Calls" value={selectedRep === 'all' ? teamL12DActivity.totalCalls.toLocaleString() : reps[0]?.totalCalls.toLocaleString() || '0'} subtitle="last 12 days" tooltip="Outbound calls across all reps" />
        <MetricCard title="Total Touchpoints" value={selectedRep === 'all' ? teamL12DActivity.totalTouchpoints.toLocaleString() : reps[0]?.totalTouchpoints.toLocaleString() || '0'} subtitle="calls + emails + SMS + meetings" />
        <MetricCard title="Avg Calls/Rep" value={Math.round(teamAvgCalls).toLocaleString()} subtitle="team average" />
        <MetricCard title="Talk Time" value={`${teamL12DActivity.medianTalkTime}h`} subtitle="total median" />
        <MetricCard title="Total Emails" value={selectedRep === 'all' ? teamL12DActivity.totalEmails.toLocaleString() : reps[0]?.totalEmails.toLocaleString() || '0'} />
      </div>

      <CollapsibleInsights title="Activity Insights" count={insights.length}>
        {insights.map((ins, i) => {
          const isNegative = ins.includes('below') || ins.includes('drop') || ins.includes('gap');
          return <InsightCard key={i} text={ins} type={isNegative ? 'danger' : 'warning'} />;
        })}
        {insights.length === 0 && <InsightCard text="Activity levels are within normal range across the team." type="success" />}
      </CollapsibleInsights>

      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Daily Calls Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine y={dailyCallTarget} stroke="#E11900" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: 'Target', position: 'right', fontSize: 9, fill: '#E11900' }} />
              <Line type="monotone" dataKey="calls" stroke="#276EF1" strokeWidth={2} dot={{ r: 3 }} name="Calls" />
              <Line type="monotone" dataKey="touchpoints" stroke="#05944F" strokeWidth={1} dot={false} name="Touchpoints" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Calls by Rep</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={repCompare} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="calls" radius={[0, 4, 4, 0]} barSize={16}>
                {repCompare.map((_, i) => <Cell key={i} fill={repColors[i % repColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* WoW Comparison by Metric with period toggle */}
      {(() => {
        const metrics = [
          { key: 'calls', label: 'Calls' },
          { key: 'talkTime', label: 'Talk Time (h)' },
          { key: 'emails', label: 'Emails' },
          { key: 'sms', label: 'SMS' },
          { key: 'meetings', label: 'Meetings' },
        ];

        const periodLabels: Record<string, string> = { '1': 'WoW', '2': '2Wo2W', '3': '3Wo3W', '4': '4Wo4W', 'mom': 'MoM' };
        const isMoM = wowPeriod === 'mom';
        const n = isMoM ? 4 : wowPeriod; // MoM ≈ 4 weeks per side

        // Use L12W data for weekly comparisons
        const l12wReps = selectedRep === 'all' ? repL12WActivity : repL12WActivity.filter(r => r.name === selectedRep);

        // For SMS & Meetings, use L12D data split
        const l12dReps = reps;

        // Recent N weeks = last N entries, Prior N weeks = the N before that
        const recentStart = 12 - n;
        const priorStart = 12 - n * 2;

        const periodDesc = isMoM
          ? `${l12wWeeks[Math.max(0, recentStart)]}–${l12wWeeks[11]} vs ${l12wWeeks[Math.max(0, priorStart)]}–${l12wWeeks[Math.max(0, recentStart - 1)]} (≈month)`
          : n === 1
            ? `W/o ${l12wWeeks[11]} vs W/o ${l12wWeeks[10]}`
            : `${l12wWeeks[Math.max(0, recentStart)]}–${l12wWeeks[11]} vs ${l12wWeeks[Math.max(0, priorStart)]}–${l12wWeeks[Math.max(0, recentStart - 1)]}`;

        const wowRepData = l12wReps.map(r => {
          const sumSlice = (arr: number[], start: number, end: number) => arr.slice(Math.max(0, start), end).reduce((s, v) => s + v, 0);
          const l12d = l12dReps.find(d => d.name === r.name);
          const smsPrior = l12d ? sumSlice(l12d.sms, 0, 6) : 0;
          const smsRecent = l12d ? sumSlice(l12d.sms, 6, 12) : 0;
          const meetingsPrior = l12d ? sumSlice(l12d.meetings, 0, 6) : 0;
          const meetingsRecent = l12d ? sumSlice(l12d.meetings, 6, 12) : 0;

          return {
            name: r.name.split(' ')[0],
            callsPrior: sumSlice(r.calls, priorStart, recentStart),
            callsRecent: sumSlice(r.calls, recentStart, 12),
            talkTimePrior: +sumSlice(r.talkTime, priorStart, recentStart).toFixed(1),
            talkTimeRecent: +sumSlice(r.talkTime, recentStart, 12).toFixed(1),
            emailsPrior: sumSlice(r.emails, priorStart, recentStart),
            emailsRecent: sumSlice(r.emails, recentStart, 12),
            smsPrior, smsRecent,
            meetingsPrior, meetingsRecent,
          };
        });

        return (
          <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px', marginBottom: '24px' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' })}>
              <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700 })}>📊 Period Comparison by Rep</div>
              <div className={css({ display: 'flex', gap: '4px' })}>
                {([1, 2, 3, 4, 'mom'] as const).map(p => (
                  <Button key={p} size={SIZE.mini} kind={wowPeriod === p ? KIND.primary : KIND.tertiary} onClick={() => setWowPeriod(p)}
                    overrides={{ BaseButton: { style: { backgroundColor: wowPeriod === p ? '#000' : '#F0F0F0', color: wowPeriod === p ? '#FFF' : '#333', fontSize: '11px', paddingLeft: '10px', paddingRight: '10px' } } }}>
                    {periodLabels[String(p)]}
                  </Button>
                ))}
              </div>
            </div>
            <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '16px' })}>
              {periodDesc} — comparing {n === 1 ? '1 week' : `${n} weeks`} vs prior {n === 1 ? '1 week' : `${n} weeks`}
            </div>
            <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' })}>
              {metrics.map(m => (
                <div key={m.key} className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px' })}>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>{m.label}</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={wowRepData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey={`${m.key}Prior`} name={isMoM ? 'Prior Month' : `Prior ${n}W`} fill="#B0C4DE" radius={[3, 3, 0, 0]} barSize={14} />
                      <Bar dataKey={`${m.key}Recent`} name={isMoM ? 'Recent Month' : `Recent ${n}W`} fill="#276EF1" radius={[3, 3, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' })}>
                    {wowRepData.map(r => {
                      const prior = r[`${m.key}Prior` as keyof typeof r] as number;
                      const recent = r[`${m.key}Recent` as keyof typeof r] as number;
                      const change = prior > 0 ? ((recent - prior) / prior) * 100 : (recent > 0 ? 100 : 0);
                      const isUp = recent >= prior;
                      return (
                        <span key={r.name} className={css({
                          fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 600,
                          padding: '2px 6px', borderRadius: '4px',
                          color: isUp ? '#05944F' : '#E11900',
                          backgroundColor: isUp ? '#E6F4EA' : '#FFEBEE',
                        })}>
                          {r.name} {isUp ? '↑' : '↓'}{Math.abs(change).toFixed(0)}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <SectionHeader title="L12D Activity Leaderboard" subtitle="Click a rep name for radar breakdown" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText', minWidth: '850px' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['#', 'Rep', 'Calls', 'Talk Time', 'SMS', 'Meetings', 'Emails', 'Total TP', 'vs Avg'].map(h => (
                <th key={h} className={css({ padding: '10px 12px', textAlign: h === 'Rep' ? 'left' as const : 'center' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {callLeaderboard.map((rep, i) => {
              const totalSMS = rep.sms.reduce((s, v) => s + v, 0);
              const totalMeetings = rep.meetings.reduce((s, v) => s + v, 0);
              const vsAvg = ((rep.totalTouchpoints / teamAvgTP) * 100 - 100);
              return (
                <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                  <td className={css({ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #F0F0F0', color: '#888', textAlign: 'center' as const } as any)}>{i + 1}</td>
                  <td
                    className={css({ padding: '10px 12px', fontWeight: 500, borderBottom: '1px solid #F0F0F0', color: '#276EF1', cursor: 'pointer', ':hover': { textDecoration: 'underline' } } as any)}
                    onClick={() => setRadarRep(rep.name)}
                  >
                    {rep.name}
                  </td>
                  <td className={css({ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>{rep.totalCalls}</td>
                  <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>{rep.totalTalkTime.toFixed(1)}h</td>
                  <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>{totalSMS}</td>
                  <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>{totalMeetings}</td>
                  <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>{rep.totalEmails}</td>
                  <td className={css({ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>{rep.totalTouchpoints}</td>
                  <td className={css({ padding: '10px 12px', fontWeight: 600, color: pctColor(vsAvg + 100), borderBottom: '1px solid #F0F0F0', textAlign: 'center' as const } as any)}>
                    {vsAvg >= 0 ? '+' : ''}{vsAvg.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Radar Chart Modal */}
      <Modal isOpen={!!radarRep} onClose={() => setRadarRep(null)} overrides={{ Dialog: { style: { width: '520px', borderRadius: '12px' } } }}>
        <ModalHeader>{radarRep} — L12D Activity Radar</ModalHeader>
        <ModalBody>
          {selectedRadarRep && (
            <div>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#E8E8E8" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fontFamily: 'UberMoveText' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={radarRep!} dataKey="value" stroke="#276EF1" fill="#276EF1" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip formatter={(v: number, _: string, props: any) => [`${props.payload.raw} (${v}% of team max)`, props.payload.metric]} />
                </RadarChart>
              </ResponsiveContainer>
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' })}>
                {radarData.map(d => (
                  <div key={d.metric} className={css({ padding: '8px 12px', backgroundColor: '#F8F9FA', borderRadius: '6px', fontSize: '12px', fontFamily: 'UberMoveText' })}>
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
