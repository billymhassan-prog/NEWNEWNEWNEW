import { useState, useCallback, useEffect, useMemo } from "react";
import { useStyletron } from "baseui";
import { Button, SIZE, KIND } from "baseui/button";
import { Textarea } from "baseui/textarea";
import { SectionHeader } from "../components/SharedUI";
import { repAttainment, repPipeline, repL12DActivity, repNDG, repCWnFT, teamNDG, teamCWnFT, weeklyPacing, repCoaching, repWeeklyFTPoints, RepName } from "../data/dashboardData";
import { buildManagerAdvisorMarkdown } from "../utils/localInsights";
import { loadTeamMembers } from "../utils/teamRoster";
import ReactMarkdown from "react-markdown";

// ─── Forecasting helpers ───
const WEEKS_ELAPSED = 5;
const TOTAL_WEEKS = 13;

function getTeamForecast(overrides?: Record<string, number>) {
  const weeksRemaining = TOTAL_WEEKS - WEEKS_ELAPSED;
  const repForecasts = repAttainment.filter(r => r.quota > 0).map(r => {
    const basePtsPerWk = r.currentPtsPerWk || (r.currentPts / WEEKS_ELAPSED);
    const ptsPerWk = overrides?.[r.name] ?? basePtsPerWk;
    const proj = r.currentPts + ptsPerWk * weeksRemaining;
    const projPct = r.quota > 0 ? (proj / r.quota * 100) : 0;
    return { name: r.name, current: r.currentPts, quota: r.quota, basePtsPerWk, ptsPerWk, projected: Math.round(proj), projPct, willHit: projPct >= 100 };
  });
  const teamTotal = repAttainment.reduce((s, r) => s + r.currentPts, 0);
  const teamQuota = repAttainment.reduce((s, r) => s + r.quota, 0);
  const projected = repForecasts.reduce((s, r) => s + r.projected, 0);
  const projectedPct = teamQuota > 0 ? (projected / teamQuota * 100) : 0;
  const avgPtsPerWeek = repForecasts.reduce((s, r) => s + r.ptsPerWk, 0);
  return { teamTotal, teamQuota, avgPtsPerWeek, projected, projectedPct, gap: teamQuota - projected, weeksRemaining, repForecasts };
}

// ─── Smart Alerts Engine ───
interface Alert {
  severity: 'critical' | 'warning' | 'info';
  emoji: string;
  title: string;
  detail: string;
  rep?: string;
}

function generateAlerts(teamMembers: any[]): Alert[] {
  const alerts: Alert[] = [];

  // Activity drops
  repL12DActivity.forEach(r => {
    const recentCalls = r.calls.slice(-3).reduce((s, c) => s + c, 0);
    const priorCalls = r.calls.slice(-6, -3).reduce((s, c) => s + c, 0);
    if (priorCalls > 0 && recentCalls < priorCalls * 0.5) {
      alerts.push({ severity: 'critical', emoji: '📉', title: `${r.name.split(' ')[0]} activity dropped ${Math.round((1 - recentCalls / priorCalls) * 100)}%`, detail: `Last 3 days: ${recentCalls} calls vs prior 3 days: ${priorCalls} calls`, rep: r.name });
    }
    if (r.totalCalls < 250) {
      alerts.push({ severity: 'warning', emoji: '📞', title: `${r.name.split(' ')[0]} low call volume (${r.totalCalls} L12D)`, detail: 'Below 250 calls in last 12 days — activity ramp needed', rep: r.name });
    }
  });

  // Pipeline hygiene
  repPipeline.forEach(r => {
    if (r.outOfDate >= 20) {
      alerts.push({ severity: 'critical', emoji: '🗂️', title: `${r.name.split(' ')[0]} has ${r.outOfDate} stale opps`, detail: `${((r.outOfDate / r.totalOpen) * 100).toFixed(0)}% of pipeline is out-of-date`, rep: r.name });
    } else if (r.outOfDate >= 10) {
      alerts.push({ severity: 'warning', emoji: '🗂️', title: `${r.name.split(' ')[0]} has ${r.outOfDate} stale opps`, detail: 'Pipeline cleanup needed this week', rep: r.name });
    }
    if (r.createdLW < 3) {
      alerts.push({ severity: 'warning', emoji: '🔻', title: `${r.name.split(' ')[0]} only created ${r.createdLW} opps last week`, detail: 'Pipeline creation velocity is low', rep: r.name });
    }
  });

  // Attainment at risk
  repAttainment.filter(r => r.quota > 0).forEach(r => {
    if (r.pctToQuota < 60) {
      alerts.push({ severity: 'critical', emoji: '🚨', title: `${r.name.split(' ')[0]} at ${r.pctToQuota.toFixed(0)}% to quota`, detail: `Needs ${r.extraPointsNeeded} more pts — requires ${r.reqPtsPerWk.toFixed(1)} pts/wk`, rep: r.name });
    }
  });

  // CWnFT issues
  repCWnFT.forEach(r => {
    if (r.pctNFT >= 15) {
      alerts.push({ severity: 'warning', emoji: '🔄', title: `${r.name.split(' ')[0]} CWnFT at ${r.pctNFT.toFixed(0)}%`, detail: `${r.cwnft} of ${r.totalCW} deals not yet live — follow-through gap`, rep: r.name });
    }
  });

  // Ramp alerts
  teamMembers.forEach(m => {
    if (m.status === 'ramping') {
      const days = Math.floor((Date.now() - new Date(m.start_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days > 180) {
        alerts.push({ severity: 'warning', emoji: '🐢', title: `${m.name.split(' ')[0]} still ramping after ${Math.round(days / 30)} months`, detail: 'Consider reviewing ramp plan and expectations', rep: m.name });
      }
      if (days < 60) {
        alerts.push({ severity: 'info', emoji: '🌱', title: `${m.name.split(' ')[0]} is ${days} days into ramp`, detail: 'Focus on activity habits, shadow calls, and product depth', rep: m.name });
      }
    }
  });

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// ─── 1:1 Tracker ───
interface OneOnOneTracker {
  repName: string;
  lastDate: string;
  nextDate: string;
}

const severityStyles = {
  critical: { bg: '#FFEBEE', border: '#FFCDD2', color: '#B71C1C', badge: '#E11900' },
  warning: { bg: '#FFF8E1', border: '#FFE082', color: '#E65100', badge: '#EA8600' },
  info: { bg: '#E8F0FE', border: '#BBDEFB', color: '#1565C0', badge: '#276EF1' },
};

export default function ManagerHub() {
  const [css] = useStyletron();
  const [teamMembers, setTeamMembers] = useState<any[]>(() => loadTeamMembers());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissed-alerts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Scenario modeler
  const [scenarioOverrides, setScenarioOverrides] = useState<Record<string, number>>({});
  const forecast = useMemo(() => getTeamForecast(Object.keys(scenarioOverrides).length > 0 ? scenarioOverrides : undefined), [scenarioOverrides]);
  const baseForecast = useMemo(() => getTeamForecast(), []);

  // 1:1 tracker
  const [oneOnOnes, setOneOnOnes] = useState<OneOnOneTracker[]>(() => {
    const saved = localStorage.getItem('manager-1on1-tracker');
    return saved ? JSON.parse(saved) : [];
  });

  // AI Bot
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');


  const alerts = useMemo(() => generateAlerts(teamMembers), [teamMembers]);
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.title));

  const dismissAlert = (title: string) => {
    const next = new Set(dismissedAlerts);
    next.add(title);
    setDismissedAlerts(next);
    localStorage.setItem('dismissed-alerts', JSON.stringify([...next]));
  };

  // 1:1 helpers
  const save1on1s = (items: OneOnOneTracker[]) => {
    setOneOnOnes(items);
    localStorage.setItem('manager-1on1-tracker', JSON.stringify(items));
  };
  const update1on1 = (repName: string, field: 'lastDate' | 'nextDate', value: string) => {
    const existing = oneOnOnes.find(o => o.repName === repName);
    if (existing) {
      save1on1s(oneOnOnes.map(o => o.repName === repName ? { ...o, [field]: value } : o));
    } else {
      save1on1s([...oneOnOnes, { repName, lastDate: field === 'lastDate' ? value : '', nextDate: field === 'nextDate' ? value : '' }]);
    }
  };

  // Dynamic quick prompts
  const dynamicPrompts = useMemo(() => {
    const prompts: { label: string; prompt: string; urgent?: boolean }[] = [];

    // Find biggest activity drop
    const activityDrops = repL12DActivity.map(r => {
      const recent = r.calls.slice(-3).reduce((s, c) => s + c, 0);
      const prior = r.calls.slice(-6, -3).reduce((s, c) => s + c, 0);
      return { name: r.name, drop: prior > 0 ? (1 - recent / prior) : 0, recent, prior };
    }).filter(r => r.drop > 0.3).sort((a, b) => b.drop - a.drop);

    if (activityDrops.length > 0) {
      const top = activityDrops[0];
      prompts.push({ label: `📉 ${top.name.split(' ')[0]}'s activity drop`, prompt: `${top.name}'s call activity dropped ${Math.round(top.drop * 100)}% in the last 3 days (${top.recent} vs ${top.prior}). What should I do about this? Give me a specific action plan.`, urgent: true });
    }

    // Ramp check if there are ramping reps
    const rampingReps = teamMembers.filter(m => m.status === 'ramping');
    if (rampingReps.length > 0) {
      const newest = rampingReps.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
      const days = Math.floor((Date.now() - new Date(newest.start_date).getTime()) / (1000 * 60 * 60 * 24));
      prompts.push({ label: `🌱 ${newest.name.split(' ')[0]}'s ramp (${days}d)`, prompt: `${newest.name} is ${days} days into their ramp. Based on their current metrics, are they on track? What should I adjust in their ramp plan?` });
    }

    // Quota gap if behind
    if (forecast.projectedPct < 100) {
      prompts.push({ label: `🎯 Close ${Math.abs(forecast.gap)} pt gap`, prompt: `We're projecting ${forecast.projectedPct.toFixed(0)}% to quota with a ${Math.abs(forecast.gap)} point gap. Break down exactly where we can find those points — which reps, which levers, what's realistic vs stretch?`, urgent: true });
    }

    // Stale pipeline
    const totalStale = repPipeline.reduce((s, r) => s + r.outOfDate, 0);
    if (totalStale > 30) {
      prompts.push({ label: `🗂️ ${totalStale} stale opps`, prompt: `We have ${totalStale} stale opportunities across the team. Which reps are the worst offenders and what's the fastest way to clean this up?` });
    }

    // CWnFT concern
    if (teamCWnFT.pctNFT > 10) {
      prompts.push({ label: `🔄 CWnFT at ${teamCWnFT.pctNFT}%`, prompt: `Our CWnFT rate is ${teamCWnFT.pctNFT}% — ${teamCWnFT.cwnft} deals closed but not yet live. What's my action plan to fix post-close follow-through?` });
    }

    // Always add a general one
    prompts.push({ label: '📅 Plan my week', prompt: 'Based on all current team data, alerts, and my upcoming 1:1 schedule, help me plan my priorities for this week. What\'s most urgent and what can wait?' });

    return prompts.slice(0, 5);
  }, [teamMembers, forecast]);

  // AI streamer
  const askAI = useCallback(async (question?: string) => {
    const prompt = question || aiInput;
    if (!prompt.trim()) return;

    setAiLoading(true);
    setAiResponse('');
    setAiError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const response = buildManagerAdvisorMarkdown(prompt, {
        teamMembers,
        alerts: visibleAlerts.slice(0, 10),
        forecast,
        baseForecast,
        oneOnOnes,
      });
      setAiResponse(response);
    } catch (e: any) {
      setAiError(e.message || 'Request failed');
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, teamMembers, visibleAlerts, forecast, baseForecast, oneOnOnes]);


  const hasScenarioChanges = Object.keys(scenarioOverrides).length > 0;

  // Get days since last 1:1
  const daysSince = (dateStr: string) => {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const repsForTracker = repAttainment.filter(r => r.quota > 0).map(r => r.name);

  return (
    <div>
      <SectionHeader title="Manager Hub" subtitle="Your morning briefing — alerts, forecast, 1:1s, and AI advisor" />

      {/* ─── SMART ALERTS ─── */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '20px', marginBottom: '20px' })}>
        <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
          <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px' })}>
            🔔 Smart Alerts
            {visibleAlerts.filter(a => a.severity === 'critical').length > 0 && (
              <span className={css({ marginLeft: '8px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: '#FFEBEE', color: '#E11900' })}>
                {visibleAlerts.filter(a => a.severity === 'critical').length} critical
              </span>
            )}
          </div>
          {dismissedAlerts.size > 0 && (
            <button onClick={() => { setDismissedAlerts(new Set()); localStorage.removeItem('dismissed-alerts'); }}
              className={css({ border: 'none', backgroundColor: 'transparent', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'UberMoveText', ':hover': { color: '#333' } })}
            >Show dismissed ({dismissedAlerts.size})</button>
          )}
        </div>

        {visibleAlerts.length === 0 ? (
          <div className={css({ textAlign: 'center' as const, padding: '16px', color: '#999', fontSize: '13px', fontFamily: 'UberMoveText' })}>
            ✅ No alerts — team is looking good.
          </div>
        ) : (
          <div className={css({ display: 'grid', gap: '6px' })}>
            {visibleAlerts.map((alert, i) => {
              const s = severityStyles[alert.severity];
              return (
                <div key={i} className={css({ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '6px', backgroundColor: s.bg, border: `1px solid ${s.border}` })}>
                  <span className={css({ fontSize: '16px' })}>{alert.emoji}</span>
                  <span className={css({ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: s.badge, color: '#FFF', textTransform: 'uppercase' as const })}>{alert.severity}</span>
                  <div className={css({ flex: 1 })}>
                    <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', fontWeight: 600, color: s.color })}>{alert.title}</div>
                    <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', marginTop: '1px' })}>{alert.detail}</div>
                  </div>
                  <button onClick={() => dismissAlert(alert.title)}
                    className={css({ border: 'none', backgroundColor: 'transparent', color: '#999', cursor: 'pointer', fontSize: '16px', padding: '0 4px', ':hover': { color: '#333' } })}
                  >×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── FORECAST + SCENARIO MODELER ─── */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px', marginBottom: '20px' })}>
        <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' })}>
          <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px' })}>
            📈 Q1 Forecast {hasScenarioChanges && <span className={css({ fontSize: '11px', fontWeight: 500, color: '#276EF1', marginLeft: '8px' })}>· scenario mode</span>}
          </div>
          {hasScenarioChanges && (
            <button onClick={() => setScenarioOverrides({})}
              className={css({ padding: '4px 12px', borderRadius: '6px', border: '1px solid #E8E8E8', backgroundColor: '#FFF', fontSize: '11px', fontFamily: 'UberMoveText', cursor: 'pointer', ':hover': { backgroundColor: '#F0F0F0' } })}
            >Reset to actual</button>
          )}
        </div>

        {/* Team KPI cards */}
        <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' })}>
          {[
            { label: 'Current Total', value: `${forecast.teamTotal} pts` },
            { label: 'Projected EOQ', value: `${forecast.projected} pts`, color: forecast.projectedPct >= 100 ? '#05944F' : '#E11900' },
            { label: 'Projected %', value: `${forecast.projectedPct.toFixed(0)}%`, color: forecast.projectedPct >= 100 ? '#05944F' : forecast.projectedPct >= 90 ? '#EA8600' : '#E11900' },
            { label: 'Avg Pts/Wk', value: forecast.avgPtsPerWeek.toFixed(1) },
            { label: 'Weeks Left', value: String(forecast.weeksRemaining) },
          ].map((card, i) => (
            <div key={i} className={css({ padding: '14px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E8E8E8' })}>
              <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>{card.label}</div>
              <div className={css({ fontSize: '22px', fontFamily: 'UberMove', fontWeight: 700, color: card.color || 'inherit' })}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Rep projections with scenario sliders */}
        <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>Rep Projections</div>
        <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '10px' })}>
          Drag the slider to model "what if" scenarios for each rep's weekly pace
        </div>
        <div className={css({ display: 'grid', gap: '8px' })}>
          {forecast.repForecasts.sort((a, b) => b.projPct - a.projPct).map((r, i) => {
            const base = baseForecast.repForecasts.find(b => b.name === r.name);
            const isOverridden = scenarioOverrides[r.name] !== undefined;
            const diff = base ? r.projPct - base.projPct : 0;
            return (
              <div key={i} className={css({ padding: '10px 14px', borderRadius: '8px', backgroundColor: isOverridden ? '#F0F4FF' : '#FAFAFA', border: `1px solid ${isOverridden ? '#BBDEFB' : '#E8E8E8'}` })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' })}>
                  <span className={css({ fontFamily: 'UberMoveText', fontWeight: 500, fontSize: '13px', width: '140px' })}>{r.name}</span>
                  <div className={css({ flex: 1, height: '8px', backgroundColor: '#E8E8E8', borderRadius: '4px', overflow: 'hidden' })}>
                    <div className={css({ height: '100%', borderRadius: '4px', backgroundColor: r.willHit ? '#05944F' : r.projPct >= 90 ? '#EA8600' : '#E11900', width: `${Math.min(r.projPct, 100)}%`, transition: 'width 0.3s' })} />
                  </div>
                  <span className={css({ fontFamily: 'UberMoveText', fontWeight: 700, fontSize: '12px', color: r.willHit ? '#05944F' : '#E11900', minWidth: '45px', textAlign: 'right' as const })}>
                    {r.projPct.toFixed(0)}%
                    {isOverridden && diff !== 0 && <span className={css({ fontSize: '10px', color: diff > 0 ? '#05944F' : '#E11900', marginLeft: '3px' })}>{diff > 0 ? '+' : ''}{diff.toFixed(0)}</span>}
                  </span>
                  <span className={css({ fontFamily: 'UberMoveText', fontSize: '11px', color: '#888', minWidth: '75px' })}>{r.projected}/{r.quota}</span>
                  <span className={css({ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', backgroundColor: r.willHit ? '#E6F4EA' : '#FFEBEE', color: r.willHit ? '#05944F' : '#E11900' })}>
                    {r.willHit ? '✅ Hit' : '⚠️ Miss'}
                  </span>
                </div>
                {/* Scenario slider */}
                <div className={css({ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '140px' })}>
                  <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', minWidth: '50px' })}>Pace:</span>
                  <input type="range" min={0} max={Math.round(r.basePtsPerWk * 3)} step={0.5}
                    value={scenarioOverrides[r.name] ?? r.basePtsPerWk}
                    onChange={e => setScenarioOverrides(prev => ({ ...prev, [r.name]: parseFloat(e.target.value) }))}
                    className={css({ flex: 1, height: '4px', cursor: 'pointer' })}
                  />
                  <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, minWidth: '55px', textAlign: 'right' as const })}>
                    {(scenarioOverrides[r.name] ?? r.basePtsPerWk).toFixed(1)} pts/wk
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 1:1 SCHEDULE TRACKER ─── */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px', marginBottom: '20px' })}>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px', marginBottom: '12px' })}>🗓️ 1:1 Schedule Tracker</div>
        <div className={css({ display: 'grid', gap: '6px' })}>
          {repsForTracker.map(repName => {
            const tracker = oneOnOnes.find(o => o.repName === repName);
            const lastDays = daysSince(tracker?.lastDate || '');
            const overdue = lastDays !== null && lastDays > 10;
            const nextDate = tracker?.nextDate || '';
            const nextDays = nextDate ? daysSince(nextDate) : null;
            const isPast = nextDays !== null && nextDays > 0;
            return (
              <div key={repName} className={css({
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '6px',
                backgroundColor: overdue ? '#FFF8E1' : '#FAFAFA', border: `1px solid ${overdue ? '#FFE082' : '#E8E8E8'}`,
              })}>
                <span className={css({ fontFamily: 'UberMoveText', fontWeight: 500, fontSize: '13px', width: '140px' })}>{repName}</span>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
                  <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', minWidth: '35px' })}>Last:</span>
                  <input type="date" value={tracker?.lastDate || ''} onChange={e => update1on1(repName, 'lastDate', e.target.value)}
                    className={css({ padding: '4px 8px', borderRadius: '4px', border: '1px solid #E8E8E8', fontSize: '11px', fontFamily: 'UberMoveText' })}
                  />
                  {lastDays !== null && (
                    <span className={css({ fontSize: '11px', fontWeight: 600, color: overdue ? '#E11900' : '#05944F', fontFamily: 'UberMoveText' })}>
                      {overdue ? `⚠️ ${lastDays}d ago` : `${lastDays}d ago`}
                    </span>
                  )}
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' })}>
                  <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', minWidth: '35px' })}>Next:</span>
                  <input type="date" value={nextDate} onChange={e => update1on1(repName, 'nextDate', e.target.value)}
                    className={css({ padding: '4px 8px', borderRadius: '4px', border: `1px solid ${isPast ? '#FFCDD2' : '#E8E8E8'}`, fontSize: '11px', fontFamily: 'UberMoveText' })}
                  />
                  {nextDate && (
                    <span className={css({ fontSize: '11px', fontWeight: 600, color: isPast ? '#E11900' : '#276EF1', fontFamily: 'UberMoveText' })}>
                      {isPast ? `❌ overdue` : nextDays !== null ? `in ${Math.abs(nextDays)}d` : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── AI ADVISOR ─── */}
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px' })}>
        <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px', marginBottom: '4px' })}>🤖 AI Manager Advisor</div>
        <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '12px' })}>
          Context-aware prompts based on your team's current situation
        </div>

        {/* Dynamic quick prompts */}
        <div className={css({ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' })}>
          {dynamicPrompts.map((qp, i) => (
            <button key={i} onClick={() => { setAiInput(qp.prompt); askAI(qp.prompt); }}
              className={css({
                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${qp.urgent ? '#FFCDD2' : '#E8E8E8'}`,
                backgroundColor: qp.urgent ? '#FFF5F5' : '#FAFAFA',
                ':hover': { backgroundColor: qp.urgent ? '#FFEBEE' : '#E8F0FE', borderColor: qp.urgent ? '#E11900' : '#276EF1' },
              })}
            >{qp.label}</button>
          ))}
        </div>

        {/* Input */}
        <div className={css({ display: 'flex', gap: '8px', marginBottom: '16px' })}>
          <div className={css({ flex: 1 })}>
            <Textarea value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="Ask about forecasting, strategy, team health, ramp progress..."
              overrides={{ Input: { style: { fontSize: '13px', minHeight: '60px', fontFamily: 'UberMoveText' } } }}
            />
          </div>
          <Button size={SIZE.compact} kind={KIND.primary} onClick={() => askAI()} disabled={aiLoading || !aiInput.trim()}>
            {aiLoading ? '...' : 'Ask'}
          </Button>
        </div>

        {aiError && <div className={css({ color: '#E11900', fontSize: '12px', fontFamily: 'UberMoveText', marginBottom: '8px' })}>{aiError}</div>}
        {aiResponse && (
          <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', lineHeight: '1.7', color: '#333', backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px' })}>
            <ReactMarkdown>{aiResponse}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
