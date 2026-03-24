import { useStyletron } from "baseui";
import { useState, useCallback, useEffect } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { MetricCard, StatusBadge, SectionHeader, InsightCard, ProgressBar, pctColor } from "../components/SharedUI";
import { repCoaching, repAttainment, repPipeline, repCWnFT, repL12DActivity, repNDG, RepName, CoachingArea, REPS } from "../data/dashboardData";
import { getRepThemes, formatThemesAsText } from "../utils/repThemes";
import { Drawer } from "baseui/drawer";
import { Button, SIZE, KIND } from "baseui/button";
import { Input } from "baseui/input";
import { Textarea } from "baseui/textarea";
import { Spinner } from "baseui/spinner";
import ReactMarkdown from "react-markdown";
import { buildRepInsightMarkdown } from "../utils/localInsights";
import { loadTeamMembers } from "../utils/teamRoster";

const COACHING_AREAS: CoachingArea[] = ['Activity', 'Pipeline Creation', 'Conversion / Quality', 'Hygiene', 'Post-Close Follow Through', 'Monetization / NDG', 'Ramp / New Hire'];
const areaColors: Record<string, string> = {
  'Activity': '#276EF1',
  'Pipeline Creation': '#05944F',
  'Conversion / Quality': '#EA8600',
  'Hygiene': '#E11900',
  'Post-Close Follow Through': '#7627BB',
  'Monetization / NDG': '#00A4B4',
  'Ramp / New Hire': '#FF6937',
};

function getRepScores(name: RepName) {
  const attn = repAttainment.find(r => r.name === name);
  const pipe = repPipeline.find(r => r.name === name);
  const cwnft = repCWnFT.find(r => r.name === name);
  const activity = repL12DActivity.find(r => r.name === name);
  const ndg = repNDG.find(r => r.name === name);

  if (!attn || !pipe || !cwnft || !activity) return [];

  const teamAvgCalls = repL12DActivity.reduce((s, r) => s + r.totalCalls, 0) / repL12DActivity.length;
  const teamAvgCreated = repPipeline.reduce((s, r) => s + r.createdLW, 0) / repPipeline.length;

  return [
    { area: 'Activity', score: Math.min(100, (activity.totalCalls / teamAvgCalls) * 70), fullMark: 100 },
    { area: 'Pipeline', score: Math.min(100, (pipe.totalOpen / 40) * 60 + (pipe.createdLW / teamAvgCreated) * 40), fullMark: 100 },
    { area: 'Conversion', score: attn.quota > 0 ? Math.min(100, attn.pctToQuota) : 0, fullMark: 100 },
    { area: 'Hygiene', score: Math.max(0, 100 - (pipe.outOfDate / pipe.totalOpen) * 100), fullMark: 100 },
    { area: 'Post-Close', score: cwnft.totalCW > 0 ? Math.max(0, 100 - cwnft.pctNFT * 5) : 50, fullMark: 100 },
    { area: 'Monetization', score: Math.min(100, (ndg?.ndgPct || 0) * 5), fullMark: 100 },
  ];
}

// Composite rep grade 1-5 (5 = best) based on ranking across key metrics
function getRepGrade(name: RepName): number {
  const att = repAttainment.find(r => r.name === name);
  const act = repL12DActivity.find(r => r.name === name);
  const ndgD = repNDG.find(r => r.name === name);
  const cw = repCWnFT.find(r => r.name === name);
  const pipe = repPipeline.find(r => r.name === name);

  // Metrics: higher is better (except staleOpps and cwnft count which are inverted)
  const metrics: { getValue: (n: RepName) => number; higherBetter: boolean }[] = [
    { getValue: n => repAttainment.find(r => r.name === n)?.pctToQuota || 0, higherBetter: true },
    { getValue: n => repL12DActivity.find(r => r.name === n)?.totalCalls || 0, higherBetter: true },
    { getValue: n => repL12DActivity.find(r => r.name === n)?.totalTouchpoints || 0, higherBetter: true },
    { getValue: n => repNDG.find(r => r.name === n)?.ndgPct || 0, higherBetter: true },
    { getValue: n => repPipeline.find(r => r.name === n)?.createdLW || 0, higherBetter: true },
    { getValue: n => repPipeline.find(r => r.name === n)?.outOfDate || 0, higherBetter: false },
    { getValue: n => repCWnFT.find(r => r.name === n)?.pctNFT || 0, higherBetter: false },
    { getValue: n => repAttainment.find(r => r.name === n)?.currentPtsPerWk || 0, higherBetter: true },
  ];

  let totalRank = 0;
  for (const m of metrics) {
    const sorted = [...REPS].sort((a, b) =>
      m.higherBetter ? m.getValue(b) - m.getValue(a) : m.getValue(a) - m.getValue(b)
    );
    totalRank += sorted.indexOf(name) + 1;
  }
  const avgRank = totalRank / metrics.length;
  // Map avg rank (1=best, 7=worst for 7 reps) to grade 5-1
  const maxReps = REPS.length;
  const grade = Math.round(5 - ((avgRank - 1) / (maxReps - 1)) * 4);
  return Math.max(1, Math.min(5, grade));
}

const gradeLabels: Record<number, string> = { 5: '⭐ 5', 4: '4', 3: '3', 2: '2', 1: '1' };
const gradeColors: Record<number, string> = { 5: '#05944F', 4: '#276EF1', 3: '#EA8600', 2: '#E65100', 1: '#E11900' };

interface OneOnOneNote {
  id: string;
  repName: RepName;
  date: string;
  notes: string;
  followUpDate: string;
  actionItems: { text: string; done: boolean }[];
}

export default function CoachingPage({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [selectedArea, setSelectedArea] = useState<CoachingArea | null>(null);
  const [drawerRep, setDrawerRep] = useState<RepName | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'coaching' | 'notes'>('coaching');

  // 1:1 Notes state
  const [notes, setNotes] = useState<OneOnOneNote[]>(() => {
    const saved = localStorage.getItem('coaching-notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [noteDrawerRep, setNoteDrawerRep] = useState<RepName | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newFollowUp, setNewFollowUp] = useState('');
  const [newActions, setNewActions] = useState<string[]>(['']);

  // AI coaching bot state
  const [repAiInsight, setRepAiInsight] = useState('');
  const [repAiLoading, setRepAiLoading] = useState(false);
  const [repAiError, setRepAiError] = useState('');

  // Fetch team members for coaching context
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  useEffect(() => {
    setTeamMembers(loadTeamMembers());
  }, []);

  const fetchRepAiInsight = useCallback(async (repName: RepName) => {
    setRepAiLoading(true);
    setRepAiInsight('');
    setRepAiError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const insight = buildRepInsightMarkdown(repName, teamMembers as any);
      setRepAiInsight(insight);
    } catch (e: any) {
      setRepAiError(e.message || 'Failed to get insights');
    } finally {
      setRepAiLoading(false);
    }
  }, [teamMembers]);


  const saveNotes = (updated: OneOnOneNote[]) => {
    setNotes(updated);
    localStorage.setItem('coaching-notes', JSON.stringify(updated));
  };

  const addNote = () => {
    if (!noteDrawerRep || !newNote.trim()) return;
    const note: OneOnOneNote = {
      id: Date.now().toString(),
      repName: noteDrawerRep,
      date: new Date().toLocaleDateString(),
      notes: newNote,
      followUpDate: newFollowUp,
      actionItems: newActions.filter(a => a.trim()).map(a => ({ text: a, done: false })),
    };
    saveNotes([note, ...notes]);
    setNewNote('');
    setNewFollowUp('');
    setNewActions(['']);
  };

  const toggleNoteAction = (noteId: string, actionIdx: number) => {
    const updated = notes.map(n => {
      if (n.id !== noteId) return n;
      return { ...n, actionItems: n.actionItems.map((a, i) => i === actionIdx ? { ...a, done: !a.done } : a) };
    });
    saveNotes(updated);
  };

  const deleteNote = (noteId: string) => {
    saveNotes(notes.filter(n => n.id !== noteId));
  };

  const coaching = selectedRep === 'all' ? repCoaching : repCoaching.filter(r => r.name === selectedRep);
  const sorted = [...coaching].sort((a, b) => b.urgency - a.urgency);

  const areaCounts = COACHING_AREAS.map(area => ({
    area: area.split(' / ')[0].split(' ')[0],
    fullArea: area,
    primary: coaching.filter(c => c.primaryArea === area).length,
    secondary: coaching.filter(c => c.secondaryArea === area).length,
    total: coaching.filter(c => c.primaryArea === area || c.secondaryArea === area).length,
    reps: coaching.filter(c => c.primaryArea === area).map(c => c.name),
  })).filter(a => a.total > 0).sort((a, b) => b.total - a.total);

  const teamScores = COACHING_AREAS.slice(0, 6).map(area => {
    const key = area.split(' / ')[0].split(' ')[0];
    const scores = repCoaching.filter(c => c.primaryArea !== 'Ramp / New Hire').map(c => {
      const s = getRepScores(c.name);
      return s.find(sc => sc.area === key || sc.area === area)?.score || 50;
    });
    const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 50;
    return { area: key, fullArea: area, avgScore: avg, repsBelow50: scores.filter(s => s < 50).length };
  }).sort((a, b) => a.avgScore - b.avgScore);

  const filteredByArea = selectedArea ? coaching.filter(c => c.primaryArea === selectedArea || c.secondaryArea === selectedArea) : sorted;
  const drawerData = drawerRep ? repCoaching.find(r => r.name === drawerRep) : null;

  const toggleAction = (key: string) => {
    const next = new Set(completedActions);
    if (next.has(key)) next.delete(key); else next.add(key);
    setCompletedActions(next);
  };

  const repNotes = noteDrawerRep ? notes.filter(n => n.repName === noteDrawerRep) : [];
  const totalPendingFollowUps = notes.filter(n => n.followUpDate && n.actionItems.some(a => !a.done)).length;

  return (
    <div>
      {/* Section Toggle */}
      <div className={css({ display: 'flex', gap: '8px', marginBottom: '20px' })}>
        <Button size={SIZE.compact} kind={activeSection === 'coaching' ? KIND.primary : KIND.secondary} onClick={() => setActiveSection('coaching')}
          overrides={{ BaseButton: { style: { backgroundColor: activeSection === 'coaching' ? '#000' : '#F0F0F0', color: activeSection === 'coaching' ? '#FFF' : '#333' } } }}>
          📋 Development Plans
        </Button>
        <Button size={SIZE.compact} kind={activeSection === 'notes' ? KIND.primary : KIND.secondary} onClick={() => setActiveSection('notes')}
          overrides={{ BaseButton: { style: { backgroundColor: activeSection === 'notes' ? '#000' : '#F0F0F0', color: activeSection === 'notes' ? '#FFF' : '#333' } } }}>
          📝 1:1 Notes & Follow-ups {totalPendingFollowUps > 0 && <span className={css({ marginLeft: '6px', backgroundColor: '#E11900', color: '#FFF', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' })}>{totalPendingFollowUps}</span>}
        </Button>
      </div>

      {activeSection === 'coaching' && (
        <>
          {/* Top KPIs */}
          <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' })}>
            <MetricCard title="Team Avg Score" value={`${(teamScores.reduce((s, t) => s + t.avgScore, 0) / (teamScores.length || 1)).toFixed(0)}%`} subtitle="across all skill areas" color={teamScores.some(t => t.avgScore < 40) ? '#E11900' : '#EA8600'} />
            <MetricCard title="Critical Reps" value={coaching.filter(c => c.urgency >= 7).length} color="#E11900" subtitle="urgency 7+" />
            <MetricCard title="Top Opportunity" value={teamScores[0]?.area || '—'} subtitle={`avg score: ${teamScores[0]?.avgScore.toFixed(0)}%`} />
            <MetricCard title="Actions Completed" value={`${completedActions.size}/${coaching.reduce((s, c) => s + c.actions.length, 0)}`} subtitle="this session" color="#05944F" />
          </div>

          {/* Team Opportunity Areas */}
          <SectionHeader title="Areas of Opportunity" subtitle="Team-wide skill gaps ranked by average score — lower = bigger opportunity" />
          <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' })}>
            {teamScores.map((ts, i) => (
              <div
                key={i}
                onClick={() => setSelectedArea(selectedArea === ts.fullArea as CoachingArea ? null : ts.fullArea as CoachingArea)}
                className={css({
                  backgroundColor: selectedArea === ts.fullArea ? '#F0F5FF' : '#FFF',
                  border: `1px solid ${selectedArea === ts.fullArea ? '#276EF1' : '#E8E8E8'}`,
                  borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s',
                  ':hover': { borderColor: '#276EF1' },
                })}
              >
                <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' })}>
                  <div className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px' })}>{ts.area}</div>
                  <div className={css({
                    padding: '2px 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 700,
                    backgroundColor: ts.avgScore < 40 ? '#FCE8E6' : ts.avgScore < 60 ? '#FEF7E0' : '#E6F4EA',
                    color: ts.avgScore < 40 ? '#C5221F' : ts.avgScore < 60 ? '#EA8600' : '#137333',
                  })}>
                    {ts.avgScore.toFixed(0)}%
                  </div>
                </div>
                <ProgressBar value={ts.avgScore} max={100} height={6} />
                <div className={css({ fontSize: '11px', color: '#888', marginTop: '6px', fontFamily: 'UberMoveText' })}>
                  {ts.repsBelow50} rep{ts.repsBelow50 !== 1 ? 's' : ''} below 50%
                </div>
              </div>
            ))}
          </div>

          {selectedArea && (
            <div className={css({ marginBottom: '16px' })}>
              <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => setSelectedArea(null)}>
                ✕ Clear filter: {selectedArea}
              </Button>
            </div>
          )}

          <div className={css({ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '16px', marginBottom: '24px' })}>
            <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '14px' })}>
              <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>Area Distribution</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={areaCounts} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} hide />
                  <YAxis type="category" dataKey="area" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ backgroundColor: '#FFF', border: '1px solid #E8E8E8', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', fontFamily: 'UberMoveText' }}>
                        <div style={{ fontWeight: 600 }}>{d.fullArea}</div>
                        <div>Primary: {d.primary} · Secondary: {d.secondary}</div>
                      </div>
                    );
                  }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={14}>
                    {areaCounts.map((d, i) => <Cell key={i} fill={areaColors[d.fullArea] || '#276EF1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '14px' })}>
              <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px' })}>
                {selectedRep === 'all' ? 'Select a rep to see their skill radar' : `${selectedRep} — Skill Radar`}
              </div>
              {selectedRep !== 'all' ? (
                <ResponsiveContainer width="100%" height={160}>
                  <RadarChart data={getRepScores(selectedRep)}>
                    <PolarGrid stroke="#E8E8E8" />
                    <PolarAngleAxis dataKey="area" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name={selectedRep} dataKey="score" stroke="#276EF1" fill="#276EF1" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className={css({ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', color: '#888', fontSize: '12px', fontFamily: 'UberMoveText' })}>
                  Use the rep filter in the header to view individual skill radars
                </div>
              )}
            </div>
          </div>

          {/* Rep Coaching Cards */}
          <SectionHeader title="Rep Development Plans" subtitle={selectedArea ? `Filtered by: ${selectedArea}` : 'All reps — click for full plan'} />
          <div className={css({ display: 'grid', gap: '12px' })}>
            {filteredByArea.map((c, i) => {
              const attn = repAttainment.find(r => r.name === c.name);
              const repScores = getRepScores(c.name);
              const lowestScore = repScores.length > 0 ? repScores.reduce((min, s) => s.score < min.score ? s : min) : null;

              return (
                <div key={i} className={css({ backgroundColor: '#FFF', border: '1px solid #E8E8E8', borderRadius: '8px', overflow: 'hidden' })}>
                  <div
                    onClick={() => setDrawerRep(drawerRep === c.name ? null : c.name)}
                    className={css({
                      padding: '16px 20px', display: 'grid', gridTemplateColumns: '30px 1fr auto', alignItems: 'center', gap: '16px',
                      cursor: 'pointer', ':hover': { backgroundColor: '#FAFAFA' },
                    })}
                  >
                    <div className={css({
                      width: '30px', height: '30px', borderRadius: '50%',
                      backgroundColor: c.urgency >= 8 ? '#E11900' : c.urgency >= 5 ? '#EA8600' : '#276EF1',
                      color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                    })}>
                      {c.urgency}
                    </div>
                    <div>
                      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                        <span className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '15px' })}>{c.name}</span>
                        {attn && <StatusBadge status={attn.pctToQuota >= 100 ? 'ahead' : attn.pctToQuota >= 85 ? 'on-pace' : attn.pctToQuota >= 60 ? 'behind' : attn.quota === 0 ? 'ramp' : 'risk'} />}
                      </div>
                      <div className={css({ fontSize: '12px', color: '#666', fontFamily: 'UberMoveText', marginTop: '2px' })}>
                        {c.insight.substring(0, 120)}...
                      </div>
                    </div>
                    <div className={css({ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, justifyContent: 'flex-end' })}>
                      <span className={css({ padding: '3px 8px', backgroundColor: areaColors[c.primaryArea] || '#276EF1', color: '#FFF', borderRadius: '4px', fontSize: '11px', fontWeight: 600 })}>{c.primaryArea}</span>
                      {c.secondaryArea && <span className={css({ padding: '3px 8px', backgroundColor: '#F0F0F0', borderRadius: '4px', fontSize: '11px', fontWeight: 500 })}>{c.secondaryArea}</span>}
                    </div>
                  </div>

                  <div className={css({ padding: '0 20px 16px', borderTop: '1px solid #F0F0F0' })}>
                    <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, color: '#333', marginTop: '12px', marginBottom: '8px' })}>
                      Action Items
                    </div>
                    {c.actions.map((action, j) => {
                      const key = `${c.name}-${j}`;
                      const done = completedActions.has(key);
                      return (
                        <div key={j} onClick={() => toggleAction(key)} className={css({
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', marginBottom: '4px',
                          borderRadius: '6px', cursor: 'pointer', backgroundColor: done ? '#E6F4EA' : '#FAFAFA',
                          transition: 'all 0.15s', ':hover': { backgroundColor: done ? '#D4EDDA' : '#F0F0F0' },
                        })}>
                          <div className={css({
                            width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                            border: done ? 'none' : '2px solid #CCC', backgroundColor: done ? '#05944F' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '11px', fontWeight: 700,
                          })}>{done && '✓'}</div>
                          <span className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: done ? '#888' : '#333', textDecoration: done ? 'line-through' : 'none' })}>{action}</span>
                        </div>
                      );
                    })}

                    <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '12px' })}>
                      {lowestScore && (
                        <div className={css({ padding: '6px 8px', backgroundColor: '#FFF5F5', borderRadius: '4px', fontSize: '11px', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                          <div className={css({ fontWeight: 600, color: '#E11900' })}>Weakest</div>
                          <div className={css({ color: '#666' })}>{lowestScore.area} ({lowestScore.score.toFixed(0)}%)</div>
                        </div>
                      )}
                      {attn && (
                        <>
                          <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px', fontSize: '11px', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                            <div className={css({ fontWeight: 600 })}>{attn.pctToQuota.toFixed(0)}%</div>
                            <div className={css({ color: '#888' })}>Attainment</div>
                          </div>
                          <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px', fontSize: '11px', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                            <div className={css({ fontWeight: 600 })}>{attn.currentPts}/{attn.quota}</div>
                            <div className={css({ color: '#888' })}>FT Points</div>
                          </div>
                          <div className={css({ padding: '6px 8px', backgroundColor: '#F8F8F8', borderRadius: '4px', fontSize: '11px', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                            <div className={css({ fontWeight: 600 })}>{attn.currentNDG}%</div>
                            <div className={css({ color: '#888' })}>NDG</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeSection === 'notes' && (
        <>
          {/* 1:1 Notes Section */}
          <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' })}>
            <MetricCard title="Total 1:1 Notes" value={notes.length} subtitle="across all reps" />
            <MetricCard title="Pending Follow-ups" value={totalPendingFollowUps} color={totalPendingFollowUps > 3 ? '#E11900' : '#EA8600'} subtitle="with open actions" />
            <MetricCard title="Actions Complete" value={notes.reduce((s, n) => s + n.actionItems.filter(a => a.done).length, 0)} subtitle={`of ${notes.reduce((s, n) => s + n.actionItems.length, 0)} total`} color="#05944F" />
          </div>

          <SectionHeader title="Rep 1:1 Tracker" subtitle="Click a rep to view notes, AI coaching, and action items" />

          <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '24px' })}>
            {REPS.map((rep) => {
              const repNoteCount = notes.filter(n => n.repName === rep).length;
              const pendingActions = notes.filter(n => n.repName === rep).reduce((s, n) => s + n.actionItems.filter(a => !a.done).length, 0);
              const lastNote = notes.find(n => n.repName === rep);
              const coachData = repCoaching.find(c => c.name === rep);
              const attn = repAttainment.find(r => r.name === rep);
              const act = repL12DActivity.find(r => r.name === rep);
              const isSelected = noteDrawerRep === rep;

              const grade = getRepGrade(rep);

              return (
                <div
                  key={rep}
                  onClick={() => setNoteDrawerRep(rep)}
                  className={css({
                    backgroundColor: isSelected ? '#F0F5FF' : '#FFF',
                    border: `2px solid ${isSelected ? '#276EF1' : '#E8E8E8'}`,
                    borderRadius: '12px', padding: '0', cursor: 'pointer', transition: 'all 0.2s',
                    overflow: 'hidden',
                    ':hover': { borderColor: '#276EF1', boxShadow: '0 4px 16px rgba(39,110,241,0.12)', transform: 'translateY(-2px)' },
                  })}
                >
                  {/* Card header - attainment-based color */}
                  <div className={css({
                    background: attn
                      ? (attn.pctToQuota >= 100 ? 'linear-gradient(135deg, #04803B, #05944F)' : attn.pctToQuota >= 90 ? 'linear-gradient(135deg, #C77700, #EA8600)' : 'linear-gradient(135deg, #B81400, #E11900)')
                      : 'linear-gradient(135deg, #555, #888)',
                    padding: '14px 16px', color: '#FFF',
                  })}>
                    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                      <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '16px' })}>{rep}</div>
                      <div className={css({ display: 'flex', gap: '6px', alignItems: 'center' })}>
                        {pendingActions > 0 && (
                          <span className={css({ backgroundColor: 'rgba(255,255,255,0.25)', color: '#FFF', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, backdropFilter: 'blur(4px)' })}>
                            {pendingActions} pending
                          </span>
                        )}
                        <span className={css({
                          backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '12px', padding: '3px 10px',
                          fontSize: '12px', fontWeight: 700, backdropFilter: 'blur(4px)',
                          display: 'flex', alignItems: 'center', gap: '4px',
                        })}>
                          Grade: {gradeLabels[grade]}
                        </span>
                      </div>
                    </div>
                    {coachData && (
                      <div className={css({ fontSize: '11px', marginTop: '4px', opacity: 0.9, fontFamily: 'UberMoveText' })}>
                        Focus: {coachData.primaryArea}
                      </div>
                    )}
                  </div>

                  {/* Card body - metrics */}
                  <div className={css({ padding: '14px 16px' })}>
                    <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' })}>
                      <div className={css({ textAlign: 'center' as const })}>
                        <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700, color: attn ? pctColor(attn.pctToQuota) : '#333' })}>
                          {attn ? `${attn.pctToQuota.toFixed(0)}%` : '—'}
                        </div>
                        <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', textTransform: 'uppercase' as const })}>Attainment</div>
                      </div>
                      <div className={css({ textAlign: 'center' as const, borderLeft: '1px solid #F0F0F0', borderRight: '1px solid #F0F0F0' })}>
                        <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700, color: '#333' })}>
                          {act ? act.totalCalls : '—'}
                        </div>
                        <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', textTransform: 'uppercase' as const })}>L12D Calls</div>
                      </div>
                      <div className={css({ textAlign: 'center' as const })}>
                        <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700, color: '#333' })}>
                          {attn ? `${attn.currentPts}` : '—'}
                        </div>
                        <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', textTransform: 'uppercase' as const })}>FT Pts</div>
                      </div>
                    </div>

                    {/* Notes info footer */}
                    <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F0F0F0' })}>
                      <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' })}>
                        📝 {repNoteCount} note{repNoteCount !== 1 ? 's' : ''}
                      </div>
                      {lastNote ? (
                        <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#999' })}>Last: {lastNote.date}</span>
                      ) : (
                        <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#999', fontStyle: 'italic' })}>No notes yet</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Notes Feed */}
          {!noteDrawerRep && notes.length > 0 && (
            <>
              <SectionHeader title="Recent Notes" subtitle="All 1:1 notes across reps" />
              <div className={css({ display: 'grid', gap: '10px' })}>
                {notes.slice(0, 10).map(n => (
                  <div key={n.id} className={css({ backgroundColor: '#FFF', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '16px', transition: 'box-shadow 0.15s', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } })}>
                    <div className={css({ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' })}>
                      <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                        <span className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px' })}>{n.repName}</span>
                        <span className={css({ fontSize: '11px', color: '#999', fontFamily: 'UberMoveText' })}>·</span>
                        <span className={css({ fontSize: '11px', color: '#888', fontFamily: 'UberMoveText' })}>{n.date}</span>
                      </div>
                      {n.followUpDate && (
                        <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#276EF1', backgroundColor: '#F0F5FF', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 })}>
                          📅 {n.followUpDate}
                        </span>
                      )}
                    </div>
                    <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: '#333', marginBottom: '8px', lineHeight: '1.6' })}>{n.notes}</div>
                    {n.actionItems.length > 0 && (
                      <div className={css({ display: 'flex', gap: '6px', flexWrap: 'wrap' as const })}>
                        {n.actionItems.map((a, i) => (
                          <span key={i} onClick={() => toggleNoteAction(n.id, i)} className={css({
                            fontSize: '11px', padding: '4px 10px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s',
                            backgroundColor: a.done ? '#E6F4EA' : '#FFF8E1',
                            color: a.done ? '#137333' : '#EA8600',
                            textDecoration: a.done ? 'line-through' : 'none',
                            fontFamily: 'UberMoveText', fontWeight: 500,
                            border: `1px solid ${a.done ? '#A5D6A7' : '#FFE082'}`,
                          })}>
                            {a.done ? '✓' : '○'} {a.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Rep Detail Drawer (Coaching) */}
      <Drawer isOpen={!!drawerRep && !!drawerData} onClose={() => setDrawerRep(null)} size="45%"
        overrides={{ DrawerBody: { style: { marginTop: '0', marginBottom: '0', marginLeft: '0', marginRight: '0' } } }}
      >
        {drawerData && (
          <div className={css({ padding: '24px' })}>
            <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '22px', marginBottom: '20px' })}>{drawerData.name} — Full Coaching Plan</div>

            <div className={css({ marginBottom: '20px' })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Performance Radar</div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={getRepScores(drawerData.name)}>
                  <PolarGrid stroke="#E8E8E8" />
                  <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name={drawerData.name} dataKey="score" stroke="#276EF1" fill="#276EF1" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className={css({ marginBottom: '16px' })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Coaching Insight</div>
              <InsightCard text={drawerData.insight} type={drawerData.urgency >= 7 ? 'danger' : drawerData.urgency >= 4 ? 'warning' : 'info'} />
            </div>

            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' })}>
              <div>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#05944F' })}>Strengths</div>
                {drawerData.strengths.map((s, i) => (
                  <div key={i} className={css({ fontSize: '12px', color: '#333', marginBottom: '6px', fontFamily: 'UberMoveText', padding: '6px 8px', backgroundColor: '#E6F4EA', borderRadius: '4px' })}>✅ {s}</div>
                ))}
              </div>
              <div>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', marginBottom: '6px', color: '#E11900' })}>Weaknesses</div>
                {drawerData.weaknesses.map((w, i) => (
                  <div key={i} className={css({ fontSize: '12px', color: '#333', marginBottom: '6px', fontFamily: 'UberMoveText', padding: '6px 8px', backgroundColor: '#FFEBEE', borderRadius: '4px' })}>⚠️ {w}</div>
                ))}
              </div>
            </div>

            <div>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', marginBottom: '8px' })}>Action Plan</div>
              {drawerData.actions.map((a, i) => {
                const key = `${drawerData.name}-${i}`;
                const done = completedActions.has(key);
                return (
                  <div key={i} onClick={() => toggleAction(key)} className={css({
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', marginBottom: '6px',
                    borderRadius: '6px', cursor: 'pointer', backgroundColor: done ? '#E6F4EA' : '#F8F8F8',
                    border: `1px solid ${done ? '#A5D6A7' : '#E8E8E8'}`,
                    ':hover': { backgroundColor: done ? '#D4EDDA' : '#F0F0F0' },
                  })}>
                    <div className={css({
                      width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                      border: done ? 'none' : '2px solid #CCC', backgroundColor: done ? '#05944F' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700,
                    })}>{done && '✓'}</div>
                    <span className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: done ? '#888' : '#333', textDecoration: done ? 'line-through' : 'none' })}>{a}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Drawer>

      {/* 1:1 Notes Drawer */}
      <Drawer isOpen={!!noteDrawerRep} onClose={() => { setNoteDrawerRep(null); setRepAiInsight(''); setRepAiError(''); }} size="55%"
        overrides={{ DrawerBody: { style: { marginTop: '0', marginBottom: '0', marginLeft: '0', marginRight: '0' } } }}
      >
        {noteDrawerRep && (() => {
          const coachData = repCoaching.find(c => c.name === noteDrawerRep);
          const repScores = getRepScores(noteDrawerRep);
          const attn = repAttainment.find(r => r.name === noteDrawerRep);
          const pipe = repPipeline.find(r => r.name === noteDrawerRep);
          const activity = repL12DActivity.find(r => r.name === noteDrawerRep);
          const ndg = repNDG.find(r => r.name === noteDrawerRep);
          const cwnft = repCWnFT.find(r => r.name === noteDrawerRep);

          const { goingWell, workOn } = getRepThemes(noteDrawerRep);
          const themesText = formatThemesAsText(noteDrawerRep);

          const handleCopyThemes = () => {
            const prefix = newNote.trim() ? newNote + '\n\n' : '';
            let queueSummary = '';
            if (coachData) {
              queueSummary = `── COACHING QUEUE SUMMARY ──\nUrgency: ${coachData.urgency}/10\nFocus: ${coachData.primaryArea}${coachData.secondaryArea ? ' / ' + coachData.secondaryArea : ''}\nInsight: ${coachData.insight}\nActions: ${coachData.actions.map((a, i) => `${i + 1}) ${a}`).join(' ')}\n\n`;
            }
            setNewNote(prefix + queueSummary + themesText);
          };

          return (
          <div className={css({ padding: '0' })}>
            {/* Drawer Header */}
            <div className={css({
              background: coachData ? (coachData.urgency >= 7 ? 'linear-gradient(135deg, #1a1a2e, #E11900)' : coachData.urgency >= 4 ? 'linear-gradient(135deg, #1a1a2e, #EA8600)' : 'linear-gradient(135deg, #1a1a2e, #276EF1)') : 'linear-gradient(135deg, #1a1a2e, #333)',
              padding: '24px 28px', color: '#FFF',
            })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '24px', marginBottom: '8px' })}>{noteDrawerRep}</div>
              <div className={css({ display: 'flex', gap: '8px', flexWrap: 'wrap' as const })}>
                {coachData && (
                  <>
                    <span className={css({ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' })}>
                      🔥 Urgency {coachData.urgency}/10
                    </span>
                    <span className={css({ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' })}>
                      🎯 {coachData.primaryArea}
                    </span>
                  </>
                )}
                {attn && (
                  <span className={css({ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' })}>
                    📊 {attn.pctToQuota.toFixed(0)}% Attainment
                  </span>
                )}
              </div>
            </div>

            <div className={css({ padding: '24px 28px' })}>
              {/* Quick Stats Row */}
              <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '24px' })}>
                {[
                  { label: 'Attainment', value: attn ? `${attn.pctToQuota.toFixed(0)}%` : '—', color: attn ? pctColor(attn.pctToQuota) : '#333' },
                  { label: 'FT Points', value: attn ? `${attn.currentPts}/${attn.quota}` : '—', color: '#333' },
                  { label: 'L12D Calls', value: activity ? `${activity.totalCalls}` : '—', color: '#333' },
                  { label: 'NDG %', value: ndg ? `${ndg.ndgPct}%` : '—', color: ndg && ndg.ndgPct >= 6 ? '#05944F' : '#E11900' },
                  { label: 'CWnFT', value: cwnft ? `${cwnft.cwnft}` : '—', color: cwnft && cwnft.cwnft <= 5 ? '#05944F' : '#E11900' },
                ].map((s, i) => (
                  <div key={i} className={css({ textAlign: 'center' as const, padding: '12px 8px', backgroundColor: '#F8F9FA', borderRadius: '10px', border: '1px solid #E8E8E8' })}>
                    <div className={css({ fontSize: '20px', fontFamily: 'UberMove', fontWeight: 700, color: s.color })}>{s.value}</div>
                    <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', textTransform: 'uppercase' as const, marginTop: '2px' })}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* AI Coaching Bot */}
              <div className={css({ backgroundColor: '#F5F0FF', borderRadius: '12px', padding: '20px', border: '1px solid #D8C7FF', marginBottom: '24px' })}>
                <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
                  <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '15px', color: '#5B2C8A', display: 'flex', alignItems: 'center', gap: '8px' })}>
                    🤖 AI Coaching Assistant
                  </div>
                  <Button size={SIZE.compact} onClick={() => fetchRepAiInsight(noteDrawerRep)} disabled={repAiLoading}
                    overrides={{ BaseButton: { style: { backgroundColor: '#5B2C8A', color: '#FFF', fontSize: '12px', borderRadius: '8px' } } }}>
                    {repAiLoading ? '⏳ Thinking...' : repAiInsight ? '🔄 Regenerate' : '✨ Get Coaching Tips'}
                  </Button>
                </div>
                <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#7B5EA7', marginBottom: '8px' })}>
                  AI analyzes this rep's performance data and suggests 1:1 talking points, coaching priorities, and action items.
                </div>

                {repAiLoading && !repAiInsight && (
                  <div className={css({ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', justifyContent: 'center' })}>
                    <Spinner $size={24} />
                    <span className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#7B5EA7' })}>Analyzing {noteDrawerRep.split(' ')[0]}'s performance...</span>
                  </div>
                )}

                {repAiError && (
                  <div className={css({ padding: '12px', backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', fontSize: '12px', fontFamily: 'UberMoveText', color: '#E11900' })}>
                    ⚠️ {repAiError}
                  </div>
                )}

                {repAiInsight && (
                  <div className={css({
                    padding: '16px', backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E0F0',
                    fontSize: '12px', fontFamily: 'UberMoveText', lineHeight: '1.7', color: '#333',
                    maxHeight: '300px', overflow: 'auto',
                  })}>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{repAiInsight}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {repAiInsight && !repAiLoading && (
                  <div className={css({ display: 'flex', gap: '8px', marginTop: '10px' })}>
                    <Button size={SIZE.mini} kind={KIND.tertiary} onClick={() => navigator.clipboard.writeText(repAiInsight)}>
                      📋 Copy
                    </Button>
                    <Button size={SIZE.mini} kind={KIND.tertiary} onClick={() => {
                      const prefix = newNote.trim() ? newNote + '\n\n' : '';
                      setNewNote(prefix + '── AI COACHING INSIGHTS ──\n' + repAiInsight);
                    }}>
                      📝 Add to Notes
                    </Button>
                  </div>
                )}
              </div>

              {/* Coaching Queue Summary */}
              {coachData && (
                <div className={css({ backgroundColor: '#F0F5FF', borderRadius: '12px', padding: '18px', border: '1px solid #C2D9FF', marginBottom: '20px' })}>
                  <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', color: '#276EF1', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' })}>
                    🧑‍🏫 Coaching Queue Summary
                  </div>
                  <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#333', lineHeight: '1.6', marginBottom: '10px' })}>{coachData.insight}</div>
                  <div className={css({ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '10px' })}>
                    <span className={css({ padding: '3px 10px', backgroundColor: '#276EF1', color: '#FFF', borderRadius: '12px', fontSize: '11px', fontWeight: 600 })}>{coachData.primaryArea}</span>
                    {coachData.secondaryArea && <span className={css({ padding: '3px 10px', backgroundColor: '#E8E8E8', borderRadius: '12px', fontSize: '11px', fontWeight: 500 })}>{coachData.secondaryArea}</span>}
                  </div>
                  <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666' })}>
                    {coachData.actions.map((a, i) => `${i + 1}) ${a}`).join(' · ')}
                  </div>
                </div>
              )}

              {/* Going Well / Work On */}
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' })}>
                <div className={css({ backgroundColor: '#E6F4EA', borderRadius: '12px', padding: '16px', border: '1px solid #A5D6A7' })}>
                  <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', color: '#137333', marginBottom: '10px' })}>
                    🟢 Going Well
                  </div>
                  {goingWell.slice(0, 3).map((item, i) => (
                    <div key={i} className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#333', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px', marginBottom: '6px', lineHeight: '1.5' })}>
                      {item}
                    </div>
                  ))}
                  {goingWell.length === 0 && (
                    <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#666', fontStyle: 'italic' })}>No standout strengths detected</div>
                  )}
                </div>
                <div className={css({ backgroundColor: '#FFF8E1', borderRadius: '12px', padding: '16px', border: '1px solid #FFE082' })}>
                  <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '13px', color: '#E65100', marginBottom: '10px' })}>
                    🟠 Work On
                  </div>
                  {workOn.slice(0, 3).map((item, i) => (
                    <div key={i} className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#333', padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '6px', marginBottom: '6px', lineHeight: '1.5' })}>
                      {item}
                    </div>
                  ))}
                  {workOn.length === 0 && (
                    <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#666', fontStyle: 'italic' })}>No major concerns detected</div>
                  )}
                </div>
              </div>

              {/* Copy Themes */}
              <div className={css({ display: 'flex', gap: '8px', marginBottom: '24px' })}>
                <Button size={SIZE.compact} onClick={handleCopyThemes}
                  overrides={{ BaseButton: { style: { backgroundColor: '#276EF1', color: '#FFF', fontSize: '12px', borderRadius: '8px' } } }}>
                  📋 Copy Themes to Notes
                </Button>
              </div>

              {/* Add New Note */}
              <div className={css({ backgroundColor: '#FFF', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '2px solid #E8E8E8' })}>
                <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' })}>
                  ➕ Add New Note
                </div>
                <div className={css({ marginBottom: '14px' })}>
                  <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '6px', color: '#555' })}>Notes</div>
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="What did you discuss in your 1:1?" overrides={{ Input: { style: { fontSize: '13px', minHeight: '100px', borderRadius: '8px' } } }} />
                </div>
                <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' })}>
                  <div>
                    <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '6px', color: '#555' })}>Follow-up Date</div>
                    <Input size="compact" value={newFollowUp} onChange={e => setNewFollowUp(e.target.value)} placeholder="e.g. 3/28/2026" />
                  </div>
                </div>
                <div className={css({ marginBottom: '14px' })}>
                  <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '6px', color: '#555' })}>Action Items</div>
                  {newActions.map((a, i) => (
                    <div key={i} className={css({ display: 'flex', gap: '8px', marginBottom: '6px' })}>
                      <Input size="compact" value={a} onChange={e => {
                        const updated = [...newActions];
                        updated[i] = e.target.value;
                        setNewActions(updated);
                      }} placeholder={`Action ${i + 1}`} />
                      {i === newActions.length - 1 && (
                        <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => setNewActions([...newActions, ''])}>+</Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button size={SIZE.compact} onClick={addNote} disabled={!newNote.trim()}
                  overrides={{ BaseButton: { style: { backgroundColor: '#000', color: '#FFF', borderRadius: '8px' } } }}>
                  💾 Save Note
                </Button>
              </div>

              {/* Existing Notes */}
              {repNotes.length === 0 ? (
                <div className={css({ textAlign: 'center' as const, padding: '40px', color: '#888', fontFamily: 'UberMoveText', fontSize: '13px', backgroundColor: '#FAFAFA', borderRadius: '12px', border: '1px dashed #DDD' })}>
                  No notes yet for {noteDrawerRep}. Add your first 1:1 note above.
                </div>
              ) : (
                <>
                  <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '15px', marginBottom: '12px' })}>📚 Previous Notes</div>
                  <div className={css({ display: 'grid', gap: '12px' })}>
                    {repNotes.map(n => (
                      <div key={n.id} className={css({ backgroundColor: '#FFF', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '18px', transition: 'box-shadow 0.15s', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } })}>
                        <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' })}>
                          <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                            <span className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px' })}>{n.date}</span>
                            {n.followUpDate && (
                              <span className={css({ fontSize: '11px', color: '#276EF1', backgroundColor: '#F0F5FF', padding: '3px 10px', borderRadius: '12px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
                                📅 {n.followUpDate}
                              </span>
                            )}
                          </div>
                          <Button size={SIZE.mini} kind={KIND.tertiary} onClick={() => deleteNote(n.id)} overrides={{ BaseButton: { style: { color: '#CCC', fontSize: '14px', ':hover': { color: '#E11900' } } } }}>✕</Button>
                        </div>
                        <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: '#333', marginBottom: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' as const })}>{n.notes}</div>
                        {n.actionItems.length > 0 && (
                          <div>
                            <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, color: '#888', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>Action Items</div>
                            {n.actionItems.map((a, i) => (
                              <div key={i} onClick={() => toggleNoteAction(n.id, i)} className={css({
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px',
                                backgroundColor: a.done ? '#E6F4EA' : '#FAFAFA', border: `1px solid ${a.done ? '#A5D6A7' : '#F0F0F0'}`,
                                transition: 'all 0.15s', ':hover': { backgroundColor: a.done ? '#D4EDDA' : '#F0F0F0' },
                              })}>
                                <div className={css({
                                  width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                                  border: a.done ? 'none' : '2px solid #CCC', backgroundColor: a.done ? '#05944F' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '10px', fontWeight: 700,
                                })}>{a.done && '✓'}</div>
                                <span className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: a.done ? '#888' : '#333', textDecoration: a.done ? 'line-through' : 'none' })}>{a.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          );
        })()}
      </Drawer>
    </div>
  );
}
