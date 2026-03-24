import { useState, useEffect, useCallback, useRef } from "react";
import { useStyletron } from "baseui";
import { Button, SIZE, KIND } from "baseui/button";
import { Textarea } from "baseui/textarea";
import { Select } from "baseui/select";
import { Spinner } from "baseui/spinner";
import ReactMarkdown from "react-markdown";
import { repAttainment, repL12DActivity, repNDG, repCWnFT, repPipeline, repCoaching, REPS, RepName, teamNDG } from "../data/dashboardData";
import { useThresholds } from "../context/ThresholdsContext";
import { pctColor } from "../components/SharedUI";
import { buildSidebarInsightsMarkdown } from "../utils/localInsights";

type SidebarTab = 'snapshot' | 'compare' | 'tbs' | 'notes' | 'ai';

function getRepSnapshot(name: RepName) {
  const att = repAttainment.find(r => r.name === name);
  const act = repL12DActivity.find(r => r.name === name);
  const ndg = repNDG.find(r => r.name === name);
  const cw = repCWnFT.find(r => r.name === name);
  const pipe = repPipeline.find(r => r.name === name);
  const coach = repCoaching.find(r => r.name === name);
  return { att, act, ndg, cw, pipe, coach };
}

const selectOverrides = {
  Dropdown: { style: { zIndex: 1100 } },
  Popover: { props: { overrides: { Body: { style: { zIndex: 1100 } } } } },
};

export default function AnalysisSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [css] = useStyletron();
  const { thresholds } = useThresholds();
  const [tab, setTab] = useState<SidebarTab>('snapshot');
  const [snapRep, setSnapRep] = useState<RepName>(REPS[0]);
  const [cmpRep1, setCmpRep1] = useState<RepName>(REPS[0]);
  const [cmpRep2, setCmpRep2] = useState<RepName>(REPS[1]);
  const [notes, setNotes] = useState(() => localStorage.getItem('analysis-notes') || '');
  const [tbFilter, setTbFilter] = useState<'all' | RepName>('all');

  useEffect(() => { localStorage.setItem('analysis-notes', notes); }, [notes]);

  const repOpts = REPS.map(r => ({ label: r, id: r }));

  const sectionStyle = { marginBottom: '16px' };
  const labelStyle = { fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '6px' };

  const metricRow = (label: string, value: string | number, color?: string) => (
    <div className={css({ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F0F0F0' })}>
      <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666' })}>{label}</span>
      <span className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, color: color || '#333' })}>{value}</span>
    </div>
  );

  const renderSnapshot = () => {
    const s = getRepSnapshot(snapRep);
    if (!s.att) return null;
    return (
      <div>
        <div className={css({ marginBottom: '12px' })}>
          <Select size="compact" options={repOpts}
            value={[repOpts.find(o => o.id === snapRep)!]}
            onChange={({ value }) => { if (value[0]) setSnapRep(value[0].id as RepName); }}
            clearable={false} searchable={false}
            overrides={selectOverrides}
          />
        </div>
        <div className={css(sectionStyle)}>
          <div className={css(labelStyle)}>Attainment</div>
          {metricRow('Points', `${s.att.currentPts}/${s.att.quota || '—'}`)}
          {metricRow('% to Quota', s.att.quota > 0 ? `${s.att.pctToQuota.toFixed(1)}%` : '—', pctColor(s.att.pctToQuota))}
          {metricRow('Pts/Wk', s.att.currentPtsPerWk.toFixed(1))}
          {metricRow('Wishlist %', `${s.att.wishlistPct}%`)}
        </div>
        <div className={css(sectionStyle)}>
          <div className={css(labelStyle)}>Activity (L12D)</div>
          {s.act && <>
            {metricRow('Calls', s.act.totalCalls)}
            {metricRow('Talk Time', `${s.act.totalTalkTime}h`)}
            {metricRow('Emails', s.act.totalEmails)}
            {metricRow('Touchpoints', s.act.totalTouchpoints)}
          </>}
        </div>
        <div className={css(sectionStyle)}>
          <div className={css(labelStyle)}>NDG / Monetization</div>
          {s.ndg && <>
            {metricRow('NDG %', `${s.ndg.ndgPct}%`, s.ndg.ndgPct >= thresholds.ndgTarget ? '#05944F' : '#E11900')}
            {metricRow('F28D NDG %', `${s.ndg.f28dNdgPct}%`)}
            {metricRow('RFO', `$${s.ndg.rfo.toLocaleString()}`)}
            {metricRow('Ads', `$${s.ndg.ads.toLocaleString()}`)}
            {metricRow('UFO', `$${s.ndg.ufo.toLocaleString()}`)}
          </>}
        </div>
        <div className={css(sectionStyle)}>
          <div className={css(labelStyle)}>Pipeline & CWnFT</div>
          {s.pipe && metricRow('Stale Opps', s.pipe.outOfDate, s.pipe.outOfDate > 15 ? '#E11900' : '#333')}
          {s.cw && <>
            {metricRow('Total CW', s.cw.totalCW)}
            {metricRow('CWnFT', s.cw.cwnft, s.cw.cwnft > 5 ? '#E11900' : '#05944F')}
            {metricRow('CWnFT %', `${s.cw.pctNFT.toFixed(1)}%`)}
          </>}
        </div>
        {s.coach && (
          <div className={css(sectionStyle)}>
            <div className={css(labelStyle)}>Coaching Focus</div>
            <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#333', lineHeight: '1.5' })}>
              <strong>{s.coach.primaryArea}</strong> (urgency {s.coach.urgency}/10)
            </div>
            <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', marginTop: '4px', lineHeight: '1.5' })}>
              {s.coach.insight.substring(0, 150)}...
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCompare = () => {
    const s1 = getRepSnapshot(cmpRep1);
    const s2 = getRepSnapshot(cmpRep2);
    if (!s1.att || !s2.att) return null;

    const cmpRow = (label: string, v1: string | number, v2: string | number, highlight?: 'higher' | 'lower') => {
      const n1 = typeof v1 === 'number' ? v1 : parseFloat(v1);
      const n2 = typeof v2 === 'number' ? v2 : parseFloat(v2);
      const c1 = highlight === 'higher' ? (n1 > n2 ? '#05944F' : n1 < n2 ? '#E11900' : '#333') : highlight === 'lower' ? (n1 < n2 ? '#05944F' : n1 > n2 ? '#E11900' : '#333') : '#333';
      const c2 = highlight === 'higher' ? (n2 > n1 ? '#05944F' : n2 < n1 ? '#E11900' : '#333') : highlight === 'lower' ? (n2 < n1 ? '#05944F' : n2 > n1 ? '#E11900' : '#333') : '#333';
      return (
        <div className={css({ display: 'grid', gridTemplateColumns: '1fr 70px 70px', padding: '4px 0', borderBottom: '1px solid #F0F0F0', alignItems: 'center' })}>
          <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#666' })}>{label}</span>
          <span className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, color: c1, textAlign: 'center' as const })}>{v1}</span>
          <span className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, color: c2, textAlign: 'center' as const })}>{v2}</span>
        </div>
      );
    };

    return (
      <div>
        <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' })}>
          <Select size="compact" options={repOpts}
            value={[repOpts.find(o => o.id === cmpRep1)!]}
            onChange={({ value }) => { if (value[0]) setCmpRep1(value[0].id as RepName); }}
            clearable={false} searchable={false}
            overrides={selectOverrides}
          />
          <Select size="compact" options={repOpts}
            value={[repOpts.find(o => o.id === cmpRep2)!]}
            onChange={({ value }) => { if (value[0]) setCmpRep2(value[0].id as RepName); }}
            clearable={false} searchable={false}
            overrides={selectOverrides}
          />
        </div>
        <div className={css({ display: 'grid', gridTemplateColumns: '1fr 70px 70px', marginBottom: '4px' })}>
          <span />
          <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 700, color: '#276EF1', textAlign: 'center' as const })}>{cmpRep1.split(' ')[0]}</span>
          <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 700, color: '#7627BB', textAlign: 'center' as const })}>{cmpRep2.split(' ')[0]}</span>
        </div>

        <div className={css(labelStyle)}>Attainment</div>
        {cmpRow('% to Quota', s1.att.quota > 0 ? `${s1.att.pctToQuota.toFixed(0)}%` : '—', s2.att.quota > 0 ? `${s2.att.pctToQuota.toFixed(0)}%` : '—', 'higher')}
        {cmpRow('Points', s1.att.currentPts, s2.att.currentPts, 'higher')}
        {cmpRow('Pts/Wk', s1.att.currentPtsPerWk.toFixed(1), s2.att.currentPtsPerWk.toFixed(1), 'higher')}
        {cmpRow('Wishlist %', `${s1.att.wishlistPct}%`, `${s2.att.wishlistPct}%`, 'higher')}

        <div className={css({ ...labelStyle, marginTop: '10px' })}>Activity (L12D)</div>
        {cmpRow('Calls', s1.act?.totalCalls || 0, s2.act?.totalCalls || 0, 'higher')}
        {cmpRow('Talk Time', `${s1.act?.totalTalkTime || 0}h`, `${s2.act?.totalTalkTime || 0}h`, 'higher')}
        {cmpRow('Emails', s1.act?.totalEmails || 0, s2.act?.totalEmails || 0, 'higher')}
        {cmpRow('Touchpoints', s1.act?.totalTouchpoints || 0, s2.act?.totalTouchpoints || 0, 'higher')}

        <div className={css({ ...labelStyle, marginTop: '10px' })}>NDG</div>
        {cmpRow('NDG %', `${s1.ndg?.ndgPct || 0}%`, `${s2.ndg?.ndgPct || 0}%`, 'higher')}
        {cmpRow('RFO', `$${(s1.ndg?.rfo || 0).toLocaleString()}`, `$${(s2.ndg?.rfo || 0).toLocaleString()}`, 'higher')}
        {cmpRow('Ads', `$${(s1.ndg?.ads || 0).toLocaleString()}`, `$${(s2.ndg?.ads || 0).toLocaleString()}`, 'higher')}

        <div className={css({ ...labelStyle, marginTop: '10px' })}>Pipeline</div>
        {cmpRow('Stale Opps', s1.pipe?.outOfDate || 0, s2.pipe?.outOfDate || 0, 'lower')}
        {cmpRow('CWnFT %', `${(s1.cw?.pctNFT || 0).toFixed(1)}%`, `${(s2.cw?.pctNFT || 0).toFixed(1)}%`, 'lower')}
        {cmpRow('CWnFT', s1.cw?.cwnft || 0, s2.cw?.cwnft || 0, 'lower')}
      </div>
    );
  };

  // T's & B's: Tops and Bottoms per metric
  const renderTBs = () => {
    const allActiveReps = [...REPS] as RepName[];

    type TBMetric = { label: string; category: string; getValue: (name: RepName) => number; higherBetter: boolean; format: (v: number) => string };

    const metrics: TBMetric[] = [
      { label: 'Attainment', category: 'Performance', getValue: n => repAttainment.find(r => r.name === n)?.pctToQuota || 0, higherBetter: true, format: v => `${v.toFixed(0)}%` },
      { label: 'Points/Week', category: 'Performance', getValue: n => repAttainment.find(r => r.name === n)?.currentPtsPerWk || 0, higherBetter: true, format: v => v.toFixed(1) },
      { label: 'NDG %', category: 'Performance', getValue: n => repNDG.find(r => r.name === n)?.ndgPct || 0, higherBetter: true, format: v => `${v.toFixed(1)}%` },
      { label: 'L12D Calls', category: 'Activity', getValue: n => repL12DActivity.find(r => r.name === n)?.totalCalls || 0, higherBetter: true, format: v => String(v) },
      { label: 'L12D Touchpoints', category: 'Activity', getValue: n => repL12DActivity.find(r => r.name === n)?.totalTouchpoints || 0, higherBetter: true, format: v => String(v) },
      { label: 'Talk Time', category: 'Activity', getValue: n => repL12DActivity.find(r => r.name === n)?.totalTalkTime || 0, higherBetter: true, format: v => `${v}h` },
      { label: 'Opps Created LW', category: 'Pipeline', getValue: n => repPipeline.find(r => r.name === n)?.createdLW || 0, higherBetter: true, format: v => String(v) },
      { label: 'Stale Opps', category: 'Pipeline', getValue: n => repPipeline.find(r => r.name === n)?.outOfDate || 0, higherBetter: false, format: v => String(v) },
      { label: 'CWnFT %', category: 'Pipeline', getValue: n => repCWnFT.find(r => r.name === n)?.pctNFT || 0, higherBetter: false, format: v => `${v.toFixed(1)}%` },
      { label: 'Wishlist %', category: 'Prospecting', getValue: n => repAttainment.find(r => r.name === n)?.wishlistPct || 0, higherBetter: true, format: v => `${v.toFixed(0)}%` },
    ];

    const getTopBottom = (m: TBMetric) => {
      const sorted = [...allActiveReps].sort((a, b) => m.getValue(b) - m.getValue(a));
      const top = m.higherBetter ? sorted[0] : sorted[sorted.length - 1];
      const bottom = m.higherBetter ? sorted[sorted.length - 1] : sorted[0];
      return { top, topVal: m.getValue(top), bottom, bottomVal: m.getValue(bottom) };
    };

    const getRank = (m: TBMetric, rep: RepName) => {
      const sorted = [...allActiveReps].sort((a, b) =>
        m.higherBetter ? m.getValue(b) - m.getValue(a) : m.getValue(a) - m.getValue(b)
      );
      return sorted.indexOf(rep) + 1;
    };

    const categories = [...new Set(metrics.map(m => m.category))];
    const tbRepOpts = [{ label: 'All Reps', id: 'all' }, ...REPS.map(r => ({ label: r, id: r }))];

    // TEAM VIEW
    if (tbFilter === 'all') {
      const topCounts: Record<string, number> = {};
      const bottomCounts: Record<string, number> = {};
      const allResults = metrics.map(m => {
        const tb = getTopBottom(m);
        topCounts[tb.top] = (topCounts[tb.top] || 0) + 1;
        bottomCounts[tb.bottom] = (bottomCounts[tb.bottom] || 0) + 1;
        return { ...tb, metric: m };
      });

      const mvp = Object.entries(topCounts).sort((a, b) => b[1] - a[1])[0];
      const concern = Object.entries(bottomCounts).sort((a, b) => b[1] - a[1])[0];

      const summaryBullets: string[] = [];
      if (mvp) summaryBullets.push(`${mvp[0].split(' ')[0]} leads the team in ${mvp[1]} of ${metrics.length} metrics — your most consistent performer right now.`);
      if (concern) summaryBullets.push(`${concern[0].split(' ')[0]} is flagged in ${concern[1]} of ${metrics.length} metrics — focus coaching and check-ins here.`);

      const gaps = allResults.map(r => ({
        label: r.metric.label,
        gap: r.metric.higherBetter ? r.topVal - r.bottomVal : r.bottomVal - r.topVal,
        topName: r.top.split(' ')[0],
        bottomName: r.bottom.split(' ')[0],
        topFormatted: r.metric.format(r.topVal),
        bottomFormatted: r.metric.format(r.bottomVal),
      }));
      const biggestGap = gaps.sort((a, b) => b.gap - a.gap)[0];
      if (biggestGap) summaryBullets.push(`Biggest spread is in ${biggestGap.label}: ${biggestGap.topName} (${biggestGap.topFormatted}) vs ${biggestGap.bottomName} (${biggestGap.bottomFormatted}).`);

      const mixedReps = allActiveReps.filter(r => (topCounts[r] || 0) > 0 && (bottomCounts[r] || 0) > 0);
      if (mixedReps.length > 0) {
        const mixed = mixedReps[0];
        summaryBullets.push(`${mixed.split(' ')[0]} is a mixed bag — leading in ${topCounts[mixed]} areas but flagged in ${bottomCounts[mixed]}. Targeted coaching can unlock more.`);
      }

      return (
        <div>
          <div className={css({ marginBottom: '12px' })}>
            <Select size="compact" options={tbRepOpts}
              value={[tbRepOpts.find(o => o.id === tbFilter)!]}
              onChange={({ value }) => { if (value[0]) setTbFilter(value[0].id as 'all' | RepName); }}
              clearable={false} searchable={false}
              overrides={selectOverrides}
            />
          </div>
          <div className={css({ padding: '12px', backgroundColor: '#F0F4FF', borderRadius: '8px', border: '1px solid #D0DBFF', marginBottom: '14px' })}>
            <div className={css({ fontSize: '11px', fontFamily: 'UberMove', fontWeight: 700, color: '#276EF1', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>
              📋 Quick Summary
            </div>
            {summaryBullets.map((b, i) => (
              <div key={i} className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#333', lineHeight: '1.5', marginBottom: '4px', paddingLeft: '4px' })}>
                • {b}
              </div>
            ))}
            <div className={css({ display: 'flex', gap: '6px', marginTop: '8px' })}>
              {mvp && (
                <div className={css({ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#05944F', color: '#FFF', fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
                  🏆 MVP: {mvp[0].split(' ')[0]} ({mvp[1]}×)
                </div>
              )}
              {concern && (
                <div className={css({ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#E11900', color: '#FFF', fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
                  🚩 Watch: {concern[0].split(' ')[0]} ({concern[1]}×)
                </div>
              )}
            </div>
          </div>

          {categories.map(cat => (
            <div key={cat} className={css({ marginBottom: '14px' })}>
              <div className={css(labelStyle)}>{cat}</div>
              {metrics.filter(m => m.category === cat).map((m, i) => {
                const { top, topVal, bottom, bottomVal } = getTopBottom(m);
                return (
                  <div key={i} className={css({ padding: '6px 0', borderBottom: '1px solid #F0F0F0' })}>
                    <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, color: '#333', marginBottom: '4px' })}>{m.label}</div>
                    <div className={css({ display: 'flex', gap: '6px' })}>
                      <div className={css({ flex: 1, padding: '5px 8px', borderRadius: '5px', backgroundColor: '#F0FFF4', border: '1px solid #C6F6D5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                        <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#05944F' })}>🏆 {top.split(' ')[0]}</span>
                        <span className={css({ fontSize: '12px', fontFamily: 'UberMove', fontWeight: 700, color: '#05944F' })}>{m.format(topVal)}</span>
                      </div>
                      <div className={css({ flex: 1, padding: '5px 8px', borderRadius: '5px', backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                        <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#E11900' })}>🚩 {bottom.split(' ')[0]}</span>
                        <span className={css({ fontSize: '12px', fontFamily: 'UberMove', fontWeight: 700, color: '#E11900' })}>{m.format(bottomVal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div className={css({ marginTop: '8px', padding: '10px', backgroundColor: '#F8F9FA', borderRadius: '6px', fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', lineHeight: '1.4' })}>
            💡 Select a rep from the dropdown to see their individual ranking across all metrics.
          </div>
        </div>
      );
    }

    // REP VIEW
    const selectedRep = tbFilter;
    const repMetrics = metrics.map(m => {
      const rank = getRank(m, selectedRep);
      const value = m.getValue(selectedRep);
      const { top, topVal, bottom, bottomVal } = getTopBottom(m);
      const isTop = top === selectedRep;
      const isBottom = bottom === selectedRep;
      return { ...m, rank, value, isTop, isBottom, topName: top, topVal, bottomName: bottom, bottomVal };
    });

    const topCount = repMetrics.filter(m => m.isTop).length;
    const bottomCount = repMetrics.filter(m => m.isBottom).length;
    const avgRank = repMetrics.reduce((s, m) => s + m.rank, 0) / repMetrics.length;

    const repSummary: string[] = [];
    if (topCount > 0) repSummary.push(`Leading the team in ${topCount} metric${topCount > 1 ? 's' : ''}: ${repMetrics.filter(m => m.isTop).map(m => m.label).join(', ')}.`);
    if (bottomCount > 0) repSummary.push(`Needs work in ${bottomCount} metric${bottomCount > 1 ? 's' : ''}: ${repMetrics.filter(m => m.isBottom).map(m => m.label).join(', ')}.`);
    repSummary.push(`Average rank across all metrics: ${avgRank.toFixed(1)} of ${allActiveReps.length}.`);

    const midRank = Math.ceil(allActiveReps.length / 2);
    const strengths = repMetrics.filter(m => m.rank <= 2).sort((a, b) => a.rank - b.rank);
    const weaknesses = repMetrics.filter(m => m.rank >= allActiveReps.length - 1).sort((a, b) => b.rank - a.rank);

    return (
      <div>
        <div className={css({ marginBottom: '12px' })}>
          <Select size="compact" options={tbRepOpts}
            value={[tbRepOpts.find(o => o.id === tbFilter)!]}
            onChange={({ value }) => { if (value[0]) setTbFilter(value[0].id as 'all' | RepName); }}
            clearable={false} searchable={false}
            overrides={selectOverrides}
          />
        </div>

        {/* Rep summary */}
        <div className={css({ padding: '12px', backgroundColor: '#F0F4FF', borderRadius: '8px', border: '1px solid #D0DBFF', marginBottom: '14px' })}>
          <div className={css({ fontSize: '11px', fontFamily: 'UberMove', fontWeight: 700, color: '#276EF1', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>
            📋 {selectedRep.split(' ')[0]}'s Summary
          </div>
          {repSummary.map((b, i) => (
            <div key={i} className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#333', lineHeight: '1.5', marginBottom: '4px', paddingLeft: '4px' })}>
              • {b}
            </div>
          ))}
          <div className={css({ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' as const })}>
            {topCount > 0 && (
              <div className={css({ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#05944F', color: '#FFF', fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
                🏆 Top in {topCount}
              </div>
            )}
            {bottomCount > 0 && (
              <div className={css({ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#E11900', color: '#FFF', fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
                🚩 Bottom in {bottomCount}
              </div>
            )}
            <div className={css({ padding: '4px 10px', borderRadius: '12px', backgroundColor: avgRank <= midRank ? '#276EF1' : '#EA8600', color: '#FFF', fontSize: '10px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
              Avg Rank: {avgRank.toFixed(1)}/{allActiveReps.length}
            </div>
          </div>
        </div>

        {/* Metric rankings */}
        {categories.map(cat => (
          <div key={cat} className={css({ marginBottom: '14px' })}>
            <div className={css(labelStyle)}>{cat}</div>
            {repMetrics.filter(m => m.category === cat).map((m, i) => {
              const rankColor = m.rank === 1 ? '#05944F' : m.rank === allActiveReps.length ? '#E11900' : m.rank <= 2 ? '#276EF1' : '#888';
              const bgColor = m.rank === 1 ? '#F0FFF4' : m.rank === allActiveReps.length ? '#FFF5F5' : '#FAFAFA';
              const borderColor = m.rank === 1 ? '#C6F6D5' : m.rank === allActiveReps.length ? '#FED7D7' : '#F0F0F0';
              return (
                <div key={i} className={css({ padding: '8px 10px', marginBottom: '4px', borderRadius: '6px', backgroundColor: bgColor, border: `1px solid ${borderColor}` })}>
                  <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' })}>
                    <span className={css({ fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600, color: '#333' })}>{m.label}</span>
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                      <span className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, color: rankColor })}>{m.format(m.value)}</span>
                      <span className={css({
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                        backgroundColor: rankColor, color: '#FFF', fontFamily: 'UberMoveText',
                      })}>
                        #{m.rank}
                      </span>
                    </div>
                  </div>
                  {/* Rank bar */}
                  <div className={css({ display: 'flex', gap: '2px', height: '4px' })}>
                    {allActiveReps.map((_, idx) => (
                      <div key={idx} className={css({
                        flex: 1, borderRadius: '2px',
                        backgroundColor: idx < m.rank ? rankColor : '#E8E8E8',
                        opacity: idx === m.rank - 1 ? 1 : 0.3,
                      })} />
                    ))}
                  </div>
                  <div className={css({ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '9px', fontFamily: 'UberMoveText', color: '#999' })}>
                    <span>Best: {m.topName.split(' ')[0]} ({m.format(m.topVal)})</span>
                    <span>Worst: {m.bottomName.split(' ')[0]} ({m.format(m.bottomVal)})</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // AI Coaching Insights
  const [aiInsights, setAiInsights] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchAiInsights = useCallback(async () => {
    setAiLoading(true);
    setAiInsights('');
    setAiError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setAiInsights(buildSidebarInsightsMarkdown());
    } catch (e: any) {
      setAiError(e.message || 'Failed to get insights');
    } finally {
      setAiLoading(false);
    }
  }, []);


  const renderAI = () => (
    <div>
      <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '12px', lineHeight: '1.5' })}>
        AI-powered coaching analysis based on current team performance data.
      </div>
      <Button size={SIZE.compact} onClick={fetchAiInsights} disabled={aiLoading}
        overrides={{ BaseButton: { style: { width: '100%', marginBottom: '16px', backgroundColor: '#000', color: '#FFF' } } }}>
        {aiLoading ? '⏳ Analyzing...' : '🤖 Generate Coaching Insights'}
      </Button>

      {aiLoading && !aiInsights && (
        <div className={css({ display: 'flex', justifyContent: 'center', padding: '24px' })}>
          <Spinner $size={32} />
        </div>
      )}

      {aiError && (
        <div className={css({ padding: '12px', backgroundColor: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '8px', fontSize: '12px', fontFamily: 'UberMoveText', color: '#E11900', marginBottom: '12px' })}>
          ⚠️ {aiError}
        </div>
      )}

      {aiInsights && (
        <div className={css({
          padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E8E8E8',
          fontSize: '12px', fontFamily: 'UberMoveText', lineHeight: '1.7', color: '#333',
          overflow: 'auto',
        })}>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{aiInsights}</ReactMarkdown>
          </div>
        </div>
      )}

      {aiInsights && !aiLoading && (
        <div className={css({ display: 'flex', gap: '8px', marginTop: '12px' })}>
          <Button size={SIZE.mini} kind={KIND.tertiary} onClick={() => navigator.clipboard.writeText(aiInsights)}>
            📋 Copy
          </Button>
          <Button size={SIZE.mini} kind={KIND.tertiary} onClick={fetchAiInsights}>
            🔄 Regenerate
          </Button>
        </div>
      )}
    </div>
  );

  const renderNotes = () => (
    <div>
      <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '8px' })}>
        Scratch pad for analysis notes, coaching prep, or meeting talking points. Auto-saves locally.
      </div>
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Type analysis notes here...&#10;&#10;e.g. Camilia activity dropped — check in Monday&#10;Kendall CWnFT aging — needs pipeline review"
        overrides={{
          Input: { style: { fontSize: '12px', minHeight: '400px', fontFamily: 'UberMoveText', lineHeight: '1.6' } },
        }}
      />
      <div className={css({ display: 'flex', justifyContent: 'space-between', marginTop: '8px' })}>
        <span className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#999' })}>{notes.length} chars</span>
        <Button size={SIZE.mini} kind={KIND.tertiary} onClick={() => {
          navigator.clipboard.writeText(notes);
        }}>
          📋 Copy
        </Button>
      </div>
    </div>
  );

  const tabs: { key: SidebarTab; label: string; icon: string }[] = [
    { key: 'snapshot', label: 'Snapshot', icon: '📊' },
    { key: 'compare', label: 'Compare', icon: '⚖️' },
    { key: 'tbs', label: "T's & B's", icon: '🏆' },
    { key: 'ai', label: 'AI Coach', icon: '🤖' },
    { key: 'notes', label: 'Notes', icon: '📝' },
  ];

  return (
    <>
      {isOpen && (
        <div className={css({
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 998,
          transition: 'opacity 0.2s',
        })} onClick={onClose} />
      )}

      <div className={css({
        position: 'fixed', top: 0, right: isOpen ? '0' : '-380px', bottom: 0,
        width: '380px', backgroundColor: '#FFF', zIndex: 999,
        boxShadow: isOpen ? '-4px 0 20px rgba(0,0,0,0.15)' : 'none',
        transition: 'right 0.25s ease-in-out',
        display: 'flex', flexDirection: 'column',
      })}>
        <div className={css({
          padding: '16px 20px', borderBottom: '1px solid #E8E8E8',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#000',
        })}>
          <span className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '15px', color: '#FFF' })}>
            📐 Analysis Panel
          </span>
          <Button size={SIZE.mini} kind={KIND.tertiary} onClick={onClose}
            overrides={{ BaseButton: { style: { color: '#FFF', ':hover': { backgroundColor: '#333' } } } }}>
            ✕
          </Button>
        </div>

        <div className={css({
          display: 'flex', borderBottom: '1px solid #E8E8E8', backgroundColor: '#FAFAFA',
        })}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={css({
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
              backgroundColor: tab === t.key ? '#FFF' : 'transparent',
              borderBottom: tab === t.key ? '2px solid #000' : '2px solid transparent',
              fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#000' : '#888',
              transition: 'all 0.15s',
              ':hover': { color: '#000' },
            } as any)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className={css({
          flex: 1, overflow: 'auto', padding: '16px 20px',
        })}>
          {tab === 'snapshot' && renderSnapshot()}
          {tab === 'compare' && renderCompare()}
          {tab === 'tbs' && renderTBs()}
          {tab === 'ai' && renderAI()}
          {tab === 'notes' && renderNotes()}
        </div>
      </div>
    </>
  );
}
