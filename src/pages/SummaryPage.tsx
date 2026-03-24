import { useState, useRef, useCallback } from "react";
import { useStyletron } from "baseui";
import { Button, SIZE, KIND } from "baseui/button";
import { Textarea } from "baseui/textarea";
import { SectionHeader, MetricCard, pctColor } from "../components/SharedUI";
import { repAttainment, repCoaching, repPipeline, repCWnFT, repL12DActivity, repNDG, teamNDG, teamCWnFT, teamInsights, teamL12DActivity, teamL12WActivity, repWeeklyFTPoints, weeklyPacing, RepName } from "../data/dashboardData";
import { useThresholds } from "../context/ThresholdsContext";
import ReactMarkdown from "react-markdown";
import { buildSummaryReportMarkdown } from "../utils/localInsights";

function getRepStatus(rep: typeof repAttainment[0]): string {
  if (rep.quota === 0) return 'Ramping';
  if (rep.pctToQuota >= 100) return '✅ Ahead';
  if (rep.pctToQuota >= 85) return '🟡 On Pace';
  if (rep.pctToQuota >= 60) return '⚠️ Behind';
  return '🔴 At Risk';
}

// Week 5 = this week (3/16-3/22), Week 4 = last week (3/9-3/15)
const thisWeekIdx = 4; // index 4 = week 5
const lastWeekIdx = 3; // index 3 = week 4

function generateAutoSummary(selectedRep: RepName | 'all'): string {
  const teamTotal = repAttainment.reduce((s, r) => s + r.currentPts, 0);
  const teamQuota = repAttainment.reduce((s, r) => s + r.quota, 0);
  const teamAttn = teamQuota > 0 ? ((teamTotal / teamQuota) * 100).toFixed(1) : '0';
  const repsAbove = repAttainment.filter(r => r.pctToQuota >= 100 && r.quota > 0);
  const repsBehind = repAttainment.filter(r => r.pctToQuota < 85 && r.quota > 0);
  const totalCalls = teamL12DActivity.totalCalls;
  const totalStale = repPipeline.reduce((s, r) => s + r.outOfDate, 0);

  let summary = `📊 SABRES TEAM — EOW SUMMARY (Week ending March 23, 2026)\n\n`;

  summary += `🏆 ATTAINMENT\n`;
  summary += `Team is at ${teamTotal}/${teamQuota} FT points (${teamAttn}% to quota). `;
  summary += `NDG sits at ${teamNDG.currentNDGPct}% — ${teamNDG.onPace ? 'on pace' : 'behind pace'} for Q1.\n`;
  if (repsAbove.length > 0) summary += `Ahead of pace: ${repsAbove.map(r => `${r.name.split(' ')[0]} (${r.pctToQuota.toFixed(0)}%)`).join(', ')}.\n`;
  if (repsBehind.length > 0) summary += `Behind pace: ${repsBehind.map(r => `${r.name.split(' ')[0]} (${r.pctToQuota.toFixed(0)}%)`).join(', ')}.\n`;
  summary += '\n';

  summary += `📞 ACTIVITY (L12D)\n`;
  summary += `Team logged ${totalCalls.toLocaleString()} calls and ${teamL12DActivity.totalTouchpoints.toLocaleString()} touchpoints.\n`;
  const lowActivity = repL12DActivity.filter(r => r.totalCalls < 300);
  if (lowActivity.length > 0) summary += `Low activity: ${lowActivity.map(r => `${r.name.split(' ')[0]} (${r.totalCalls} calls)`).join(', ')}.\n`;
  summary += '\n';

  summary += `📊 PIPELINE\n`;
  summary += `${totalStale} stale opps across the team. `;
  summary += `CWnFT rate: ${teamCWnFT.pctNFT}% (${teamCWnFT.cwnft} of ${teamCWnFT.totalCW} deals not yet live).\n`;
  const worstStale = repPipeline.filter(r => r.outOfDate >= 15).sort((a, b) => b.outOfDate - a.outOfDate);
  if (worstStale.length > 0) summary += `Hygiene concerns: ${worstStale.map(r => `${r.name.split(' ')[0]} (${r.outOfDate} stale)`).join(', ')}.\n`;
  summary += '\n';

  summary += `🔑 KEY INSIGHTS\n`;
  teamInsights.slice(0, 3).forEach(ins => { summary += `• ${ins}\n`; });
  summary += '\n';

  summary += `🧑‍🏫 COACHING PRIORITIES\n`;
  const urgent = repCoaching.filter(c => c.urgency >= 7).sort((a, b) => b.urgency - a.urgency);
  if (urgent.length > 0) {
    urgent.forEach(c => { summary += `• ${c.name}: ${c.primaryArea} (urgency ${c.urgency}/10)\n`; });
  } else {
    summary += `No critical coaching needs this week.\n`;
  }

  return summary;
}

export default function SummaryPage({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const { thresholds } = useThresholds();
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLDivElement>(null);
  const [hiringNotes, setHiringNotes] = useState(() => localStorage.getItem('hiring-notes') || '');
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [summaryType, setSummaryType] = useState<'EOD' | 'EOW' | 'EOM'>('EOW');

  const generateAiSummary = useCallback(async () => {
    setAiLoading(true);
    setAiSummary('');
    setAiError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const summary = buildSummaryReportMarkdown(summaryType, hiringNotes, selectedRep);
      setAiSummary(summary);
    } catch (e: any) {
      setAiError(e.message || 'Failed to generate summary');
    } finally {
      setAiLoading(false);
    }
  }, [summaryType, hiringNotes, selectedRep]);


  const autoSummary = generateAutoSummary(selectedRep);

  // WoW comparison data
  const thisWeek = weeklyPacing[thisWeekIdx];
  const lastWeek = weeklyPacing[lastWeekIdx];
  const thisWeekCalls = teamL12WActivity.weeklyCalls[thisWeekIdx + 6]; // L12W index offset
  const lastWeekCalls = teamL12WActivity.weeklyCalls[thisWeekIdx + 5];
  const thisWeekTP = teamL12WActivity.weeklyTouchpoints[thisWeekIdx + 6];
  const lastWeekTP = teamL12WActivity.weeklyTouchpoints[thisWeekIdx + 5];

  const wowMetrics = [
    { label: 'FT Points', thisWk: thisWeek.actual, lastWk: lastWeek.actual, target: thisWeek.target, unit: 'pts' },
    { label: 'Team Calls', thisWk: thisWeekCalls, lastWk: lastWeekCalls, target: teamL12WActivity.weeklyExpectations.calls, unit: '' },
    { label: 'Touchpoints', thisWk: thisWeekTP, lastWk: lastWeekTP, target: teamL12WActivity.weeklyExpectations.touchpoints, unit: '' },
    { label: 'Cum Points', thisWk: thisWeek.cumActual, lastWk: lastWeek.cumActual, target: thisWeek.cumTarget, unit: 'pts' },
  ];

  const repsData = repAttainment.filter(r => selectedRep === 'all' || r.name === selectedRep);

  const copyToClipboard = () => {
    const fullText = autoSummary + '\n📋 HIRING & HEADCOUNT\n' + (hiringNotes.trim() || 'No updates this week.') + '\n';
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([fullText], { type: 'text/plain' }),
      })
    ]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveHiringNotes = (val: string) => {
    setHiringNotes(val);
    localStorage.setItem('hiring-notes', val);
  };

  return (
    <div>
      <SectionHeader title="EOW Summary" subtitle="Auto-generated from dashboard data — copy and send to leadership" />
      <div className={css({ marginBottom: '16px', display: 'flex', gap: '12px' })}>
        <Button size={SIZE.compact} kind={KIND.primary} onClick={copyToClipboard}>
          {copied ? '✅ Copied to clipboard!' : '📋 Copy Summary'}
        </Button>
      </div>

      {/* Week-over-Week Comparison */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px', marginBottom: '24px' })}>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px', marginBottom: '4px' })}>📈 This Week vs Last Week</div>
        <div className={css({ fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '16px' })}>
          W5 (3/16–3/22) vs W4 (3/9–3/15)
        </div>

        {/* Team KPI comparison cards */}
        <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' })}>
          {wowMetrics.map((m, i) => {
            const change = m.lastWk > 0 ? ((m.thisWk - m.lastWk) / m.lastWk * 100) : 0;
            const isUp = m.thisWk >= m.lastWk;
            return (
              <div key={i} className={css({ padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E8E8E8' })}>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>{m.label}</div>
                <div className={css({ display: 'flex', alignItems: 'baseline', gap: '8px' })}>
                  <span className={css({ fontSize: '22px', fontFamily: 'UberMove', fontWeight: 700 })}>{m.thisWk}</span>
                  <span className={css({
                    fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600,
                    color: pctColor(isUp ? 100 : (100 + change)),
                    padding: '2px 6px', borderRadius: '4px',
                    backgroundColor: isUp ? (change >= 0 ? '#E6F4EA' : '#FEF7E0') : '#FFEBEE',
                  })}>
                    {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(0)}%
                  </span>
                </div>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginTop: '4px' })}>
                  Last week: {m.lastWk} · Target: {m.target}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rep-level WoW */}
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '12px' })}>Rep FT Points — This Week vs Last Week</div>
        <div className={css({ display: 'grid', gap: '8px' })}>
          {repWeeklyFTPoints.map((rep, i) => {
            const tw = rep.weeks[thisWeekIdx];
            const lw = rep.weeks[lastWeekIdx];
            const change = lw > 0 ? ((tw - lw) / lw * 100) : (tw > 0 ? 100 : 0);
            const isUp = tw >= lw;
            return (
              <div key={i} className={css({ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FAFAFA' })}>
                <span className={css({ fontFamily: 'UberMoveText', fontWeight: 500, fontSize: '13px', width: '120px' })}>{rep.name.split(' ')[0]}</span>
                <div className={css({ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' })}>
                  <div className={css({ textAlign: 'center' as const, minWidth: '50px' })}>
                    <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>Last Wk</div>
                    <div className={css({ fontSize: '16px', fontFamily: 'UberMove', fontWeight: 700, color: '#666' })}>{lw}</div>
                  </div>
                  <span className={css({ fontSize: '16px', color: '#CCC' })}>→</span>
                  <div className={css({ textAlign: 'center' as const, minWidth: '50px' })}>
                    <div className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>This Wk</div>
                    <div className={css({ fontSize: '16px', fontFamily: 'UberMove', fontWeight: 700 })}>{tw}</div>
                  </div>
                </div>
                <span className={css({
                  fontFamily: 'UberMoveText', fontWeight: 700, fontSize: '12px',
                  color: pctColor(isUp ? 100 : (100 + change)),
                  padding: '3px 10px', borderRadius: '4px',
                  backgroundColor: isUp ? (change >= 0 ? '#E6F4EA' : '#FEF7E0') : '#FFEBEE',
                  minWidth: '60px', textAlign: 'center' as const,
                })}>
                  {tw === lw ? '—' : `${isUp ? '+' : ''}${change.toFixed(0)}%`}
                </span>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', minWidth: '60px', textAlign: 'right' as const })}>
                  Target: {rep.weeklyTarget}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-generated Summary */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px', marginBottom: '24px' })}>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px', marginBottom: '16px' })}>📊 Auto-Generated Summary</div>
        <pre className={css({ fontFamily: 'UberMoveText', fontSize: '13px', color: '#333', lineHeight: '1.7', whiteSpace: 'pre-wrap' as const, margin: 0 })}>
          {autoSummary}
        </pre>
      </div>

      {/* Hiring Section */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px', marginBottom: '24px' })}>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px', marginBottom: '4px' })}>📋 Hiring & Headcount</div>
        <div className={css({ fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', marginBottom: '12px' })}>Add hiring updates, interview pipeline, and headcount notes for your EOW summary</div>
        <Textarea
          value={hiringNotes}
          onChange={e => saveHiringNotes(e.target.value)}
          placeholder="e.g. Interviewed 2 candidates this week. Final round scheduled for Tuesday. Backfill req still open for AE role..."
          overrides={{ Input: { style: { fontSize: '13px', minHeight: '100px', fontFamily: 'UberMoveText' } } }}
        />
      </div>

      {/* AI Summary Bot */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px', marginBottom: '24px' })}>
        <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
          <div>
            <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px' })}>🤖 AI Summary Generator</div>
            <div className={css({ fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', marginTop: '2px' })}>
              Generate a polished summary from all dashboard data — ready to copy and send
            </div>
          </div>
        </div>
        <div className={css({ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' })}>
          {(['EOD', 'EOW', 'EOM'] as const).map(type => (
            <button
              key={type}
              onClick={() => setSummaryType(type)}
              className={css({
                padding: '6px 16px', borderRadius: '6px', border: '1px solid',
                borderColor: summaryType === type ? '#276EF1' : '#E8E8E8',
                backgroundColor: summaryType === type ? '#276EF1' : '#FFF',
                color: summaryType === type ? '#FFF' : '#333',
                fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, cursor: 'pointer',
                ':hover': { borderColor: '#276EF1' },
              })}
            >
              {type === 'EOD' ? '📅 End of Day' : type === 'EOW' ? '📆 End of Week' : '📊 End of Month'}
            </button>
          ))}
          <button
            onClick={generateAiSummary}
            disabled={aiLoading}
            className={css({
              marginLeft: 'auto', padding: '6px 16px', borderRadius: '6px', border: 'none',
              backgroundColor: '#276EF1', color: '#FFF', fontSize: '12px', fontFamily: 'UberMoveText',
              fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.6 : 1,
              ':hover': { backgroundColor: '#1E54B7' },
            })}
          >
            {aiLoading ? 'Generating...' : aiSummary ? '🔄 Regenerate' : '✨ Generate'}
          </button>
        </div>
        {aiError && <div className={css({ color: '#E11900', fontSize: '12px', fontFamily: 'UberMoveText', marginBottom: '8px' })}>{aiError}</div>}
        {aiSummary && (
          <div>
            <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', lineHeight: '1.7', color: '#333', backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', marginBottom: '8px' })}>
              <ReactMarkdown>{aiSummary}</ReactMarkdown>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(aiSummary);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={css({
                padding: '6px 14px', borderRadius: '6px', border: '1px solid #E8E8E8',
                backgroundColor: '#FFF', fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600,
                cursor: 'pointer', ':hover': { backgroundColor: '#F8F8F8' },
              })}
            >
              {copied ? '✅ Copied!' : '📋 Copy AI Summary'}
            </button>
          </div>
        )}
        {!aiSummary && !aiLoading && !aiError && (
          <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#999', textAlign: 'center' as const, padding: '20px 0' })}>
            Select a summary type and click Generate to create an AI-powered report from your dashboard data.
          </div>
        )}
      </div>

      {/* Rep Table */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px' })}>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px', marginBottom: '16px' })}>👥 Rep Summary</div>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'UberMoveText' } as any)}>
          <thead>
            <tr style={{ backgroundColor: '#F8F8F8' }}>
              {['Rep', 'Pts', 'Attn %', 'L12D Calls', 'NDG %', 'Status', 'Focus'].map(h => (
                <th key={h} className={css({ padding: '8px', textAlign: h === 'Rep' || h === 'Focus' ? 'left' as const : 'center' as const, fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {repsData.map((rep, i) => {
              const act = repL12DActivity.find(r => r.name === rep.name);
              const ndg = repNDG.find(r => r.name === rep.name);
              const coach = repCoaching.find(r => r.name === rep.name);
              return (
                <tr key={i} style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <td className={css({ padding: '8px', fontWeight: 500 } as any)}>{rep.name}</td>
                  <td className={css({ padding: '8px', textAlign: 'center' as const } as any)}>{rep.currentPts}/{rep.quota || '—'}</td>
                  <td className={css({ padding: '8px', textAlign: 'center' as const, fontWeight: 600, color: pctColor(rep.pctToQuota) } as any)}>
                    {rep.quota > 0 ? `${rep.pctToQuota.toFixed(0)}%` : '—'}
                  </td>
                  <td className={css({ padding: '8px', textAlign: 'center' as const } as any)}>{act?.totalCalls || 0}</td>
                  <td className={css({ padding: '8px', textAlign: 'center' as const, fontWeight: 600, color: pctColor(ndg?.ndgPct || 0) } as any)}>
                    {ndg?.ndgPct || 0}%
                  </td>
                  <td className={css({ padding: '8px', textAlign: 'center' as const } as any)}>{getRepStatus(rep)}</td>
                  <td className={css({ padding: '8px', fontSize: '11px', color: '#666' } as any)}>{coach?.primaryArea || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
