import { useState } from "react";
import { useStyletron } from "baseui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Button, SIZE, KIND } from "baseui/button";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { MetricCard, StatusBadge, SectionHeader, InsightCard, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repNDG, teamNDG, repAttainment, repCoaching, RepName } from "../data/dashboardData";
import { useThresholds } from "../context/ThresholdsContext";

export default function NDGPage({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const { thresholds } = useThresholds();
  const [spendView, setSpendView] = useState<'$' | '%'>('$');
  const [drillRep, setDrillRep] = useState<string | null>(null);
  const [drillMetric, setDrillMetric] = useState<'rfo' | 'ads' | 'ufo' | 'gb' | 'wishlist' | 'f28dRfo' | 'f28dAds' | null>(null);

  const reps = selectedRep === 'all' ? repNDG : repNDG.filter(r => r.name === selectedRep);
  const attn = selectedRep === 'all' ? repAttainment : repAttainment.filter(r => r.name === selectedRep);
  const spendReps = reps.filter(r => r.gbF28D > 0);

  const ndgChart = spendReps.map(r => ({
    name: r.name.split(' ')[0],
    current: r.ndgPct,
    f28d: r.f28dNdgPct,
    fill: r.ndgPct > 10 ? '#05944F' : r.ndgPct > 3 ? '#EA8600' : '#E11900',
  })).sort((a, b) => b.current - a.current);

  const rfoChart = spendReps.map(r => ({
    name: r.name.split(' ')[0],
    rfo: spendView === '$' ? r.rfo : r.gbF28D > 0 ? (r.rfo / r.gbF28D * 100) : 0,
    ufo: spendView === '$' ? r.ufo : r.gbF28D > 0 ? (r.ufo / r.gbF28D * 100) : 0,
    ads: spendView === '$' ? r.ads : r.gbF28D > 0 ? (r.ads / r.gbF28D * 100) : 0,
  }));

  // Team-level spend breakdown for donut
  const totalRFO = spendReps.reduce((s, r) => s + r.rfo, 0);
  const totalUFO = spendReps.reduce((s, r) => s + r.ufo, 0);
  const totalAds = spendReps.reduce((s, r) => s + r.ads, 0);
  const totalSpend = totalRFO + totalUFO + totalAds;
  const totalGB = spendReps.reduce((s, r) => s + r.gbF28D, 0);

  const spendDonut = [
    { name: 'RFO', value: totalRFO, pct: totalSpend > 0 ? (totalRFO / totalSpend * 100).toFixed(1) : '0', color: '#276EF1' },
    { name: 'UFO', value: totalUFO, pct: totalSpend > 0 ? (totalUFO / totalSpend * 100).toFixed(1) : '0', color: '#05944F' },
    { name: 'Ads', value: totalAds, pct: totalSpend > 0 ? (totalAds / totalSpend * 100).toFixed(1) : '0', color: '#EA8600' },
  ];

  // Per-rep spend breakdown cards
  const repSpendBreakdown = spendReps.map(r => {
    const total = r.rfo + r.ufo + r.ads;
    return {
      name: r.name.split(' ')[0],
      fullName: r.name,
      rfo: r.rfo, ufo: r.ufo, ads: r.ads,
      total, gb: r.gbF28D, ndg: r.ndgPct, f28dNdg: r.f28dNdgPct,
      rfoPct: total > 0 ? (r.rfo / total * 100) : 0,
      ufoPct: total > 0 ? (r.ufo / total * 100) : 0,
      adsPct: total > 0 ? (r.ads / total * 100) : 0,
      rfoPercGB: r.rfoPercGB,
      ufoPercGB: r.ufoPercGB,
      adsPercGB: r.adsPercGB,
    };
  }).sort((a, b) => b.total - a.total);

  const insights: string[] = [];
  const strong = reps.filter(r => r.ndgPct > 10);
  if (strong.length > 0) insights.push(`${strong.map(r => r.name.split(' ')[0]).join(' & ')} lead NDG performance and can be used as monetization benchmarks for the team.`);
  const weak = reps.filter(r => r.ndgPct < 5 && r.gbF28D > 0);
  if (weak.length > 0) insights.push(`${weak.map(r => `${r.name.split(' ')[0]} (${r.ndgPct}%)`).join(', ')} are below 5% NDG — monetization coaching needed.`);
  const lowAds = attn.filter(r => r.adsPercGB < 1 && r.quota > 0);
  if (lowAds.length > 0) insights.push(`${lowAds.map(r => r.name.split(' ')[0]).join(', ')} have nearly zero ads attach — missed revenue opportunity.`);
  if (totalSpend > 0) {
    const dominant = [...spendDonut].sort((a, b) => b.value - a.value)[0];
    insights.push(`${dominant.pct}% of total merchant spend is in ${dominant.name}. ${totalAds < totalRFO * 0.5 ? 'Ads adoption is low — opportunity to grow.' : 'Ads attach is healthy.'}`);
  }

  // Attainment + NDG combined view
  const combinedData = reps.filter(r => r.gbF28D > 0).map(r => {
    const a = attn.find(at => at.name === r.name);
    return {
      name: r.name.split(' ')[0],
      fullName: r.name,
      ndgPct: r.ndgPct,
      f28dNdgPct: r.f28dNdgPct,
      rfo: r.rfo, ufo: r.ufo, ads: r.ads, gbF28D: r.gbF28D,
      rfoPercGB: r.rfoPercGB, adsPercGB: r.adsPercGB, ufoPercGB: r.ufoPercGB,
      attainment: a?.pctToQuota || 0,
      wishlistPct: a?.wishlistPct || 0,
      ndgMet: r.ndgPct >= thresholds.ndgTarget,
      status: a?.status || '—',
    };
  }).sort((a, b) => b.ndgPct - a.ndgPct);

  // Derive team NDG from rep table data
  const activeNdgReps = reps.filter(r => r.gbF28D > 0);
  const totalRepRFO = activeNdgReps.reduce((s, r) => s + r.rfo, 0);
  const totalRepUFO = activeNdgReps.reduce((s, r) => s + r.ufo, 0);
  const totalRepAds = activeNdgReps.reduce((s, r) => s + r.ads, 0);
  const totalRepGB = activeNdgReps.reduce((s, r) => s + r.gbF28D, 0);
  const totalRepSpend = totalRepRFO + totalRepUFO + totalRepAds;
  const calcNDGPct = totalRepGB > 0 ? +((totalRepSpend / totalRepGB) * 100).toFixed(2) : 0;
  const calcF28DNDGPct = totalRepGB > 0
    ? +(activeNdgReps.reduce((s, r) => s + (r.f28dNdgPct * r.gbF28D), 0) / totalRepGB).toFixed(2)
    : 0;

  // Computed team-level metrics
  const teamWishlistPct = attn.filter(r => r.quota > 0).length > 0
    ? (attn.filter(r => r.quota > 0).reduce((s, r) => s + r.wishlistPct, 0) / attn.filter(r => r.quota > 0).length).toFixed(1)
    : '0';
  const f28dRfoPercGB = totalRepGB > 0 ? (totalRepRFO / totalRepGB * 100).toFixed(2) : '0';
  const f28dAdsPercGB = totalRepGB > 0 ? (totalRepAds / totalRepGB * 100).toFixed(2) : '0';

  return (
    <div>
      {/* Row 1: NDG & Quarter context */}
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '8px' })}>
        <MetricCard title="Team NDG %" value={`${calcNDGPct}%`} subtitle="From rep data" color={calcNDGPct >= thresholds.ndgTarget ? '#05944F' : calcNDGPct >= thresholds.ndgTarget / 2 ? '#EA8600' : '#E11900'} />
        <MetricCard title="F28D NDG %" value={`${calcF28DNDGPct}%`} subtitle="GB-weighted avg" color={calcF28DNDGPct >= thresholds.ndgTarget ? '#05944F' : calcF28DNDGPct >= thresholds.ndgTarget / 2 ? '#EA8600' : '#E11900'} />
        <MetricCard title="FT Points" value={`${teamNDG.currentPoints}/${teamNDG.targetPoints}`} subtitle={`${teamNDG.pctToTarget}% to target`} />
        <MetricCard title="Today's Pace" value={`${teamNDG.todaysPace}`} subtitle={teamNDG.onPace ? '✅ On Pace' : '⚠️ Behind Pace'} color={teamNDG.onPace ? '#05944F' : '#E11900'} />
        <MetricCard title="Q1 Progress" value={`${teamNDG.pctQElapsed}%`} subtitle={`Day ${teamNDG.daysElapsed}/${teamNDG.totalDaysInQ}`} />
        <MetricCard title="Q1 Window" value={`${teamNDG.daysElapsed}/${teamNDG.totalDaysInQ}d`} subtitle={`${teamNDG.qStartDate} – ${teamNDG.qEndDate}`} />
      </div>
      {/* Row 2: Financials & rates */}
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '20px' })}>
        <MetricCard title="Total RFO" value={`$${(totalRepRFO / 1000).toFixed(1)}K`} onClick={() => setDrillMetric('rfo')} />
        <MetricCard title="Total Ads" value={`$${(totalRepAds / 1000).toFixed(1)}K`} onClick={() => setDrillMetric('ads')} />
        <MetricCard title="Total UFO" value={`$${(totalRepUFO / 1000).toFixed(1)}K`} onClick={() => setDrillMetric('ufo')} />
        <MetricCard title="Total GB (F28D)" value={`$${(totalRepGB / 1000).toFixed(0)}K`} onClick={() => setDrillMetric('gb')} />
        <MetricCard title="Team Wishlist %" value={`${teamWishlistPct}%`} onClick={() => setDrillMetric('wishlist')} />
        <MetricCard title="F28D RFO %GB" value={`${f28dRfoPercGB}%`} onClick={() => setDrillMetric('f28dRfo')} />
        <MetricCard title="F28D Ads %GB" value={`${f28dAdsPercGB}%`} onClick={() => setDrillMetric('f28dAds')} />
      </div>

      {/* Metric Drill-Down Modal */}
      <Modal isOpen={drillMetric !== null} onClose={() => setDrillMetric(null)} overrides={{ Dialog: { style: { width: '700px', maxWidth: '90vw', borderRadius: '12px' } } }}>
        <ModalHeader>
          <span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>
            {drillMetric === 'rfo' ? 'RFO by Rep' : drillMetric === 'ads' ? 'Ads by Rep' : drillMetric === 'ufo' ? 'UFO by Rep' : drillMetric === 'gb' ? 'Gross Bookings (F28D) by Rep' : drillMetric === 'wishlist' ? 'Wishlist % by Rep' : drillMetric === 'f28dRfo' ? 'F28D RFO %GB by Rep' : drillMetric === 'f28dAds' ? 'F28D Ads %GB by Rep' : ''}
          </span>
        </ModalHeader>
        <ModalBody>
          {(() => {
            const getRepData = () => {
              const activeReps = spendReps.length > 0 ? spendReps : reps;
              switch (drillMetric) {
                case 'rfo': return activeReps.map(r => ({ name: r.name, value: r.rfo, display: `$${r.rfo.toLocaleString()}`, pctOfTotal: totalRepRFO > 0 ? (r.rfo / totalRepRFO * 100) : 0, color: '#276EF1' })).sort((a, b) => b.value - a.value);
                case 'ads': return activeReps.map(r => ({ name: r.name, value: r.ads, display: `$${r.ads.toLocaleString()}`, pctOfTotal: totalRepAds > 0 ? (r.ads / totalRepAds * 100) : 0, color: '#EA8600' })).sort((a, b) => b.value - a.value);
                case 'ufo': return activeReps.map(r => ({ name: r.name, value: r.ufo, display: `$${r.ufo.toLocaleString()}`, pctOfTotal: totalRepUFO > 0 ? (r.ufo / totalRepUFO * 100) : 0, color: '#05944F' })).sort((a, b) => b.value - a.value);
                case 'gb': return activeReps.map(r => ({ name: r.name, value: r.gbF28D, display: `$${r.gbF28D.toLocaleString()}`, pctOfTotal: totalRepGB > 0 ? (r.gbF28D / totalRepGB * 100) : 0, color: '#276EF1' })).sort((a, b) => b.value - a.value);
                case 'wishlist': return attn.filter(r => r.quota > 0).map(r => ({ name: r.name, value: r.wishlistPct, display: `${r.wishlistPct.toFixed(1)}%`, pctOfTotal: 0, color: r.wishlistPct >= 40 ? '#05944F' : r.wishlistPct >= 20 ? '#EA8600' : '#E11900' })).sort((a, b) => b.value - a.value);
                case 'f28dRfo': return activeReps.map(r => ({ name: r.name, value: r.rfoPercGB, display: `${r.rfoPercGB}%`, pctOfTotal: 0, color: r.rfoPercGB >= 5 ? '#05944F' : r.rfoPercGB >= 2 ? '#EA8600' : '#E11900' })).sort((a, b) => b.value - a.value);
                case 'f28dAds': return activeReps.map(r => ({ name: r.name, value: r.adsPercGB, display: `${r.adsPercGB}%`, pctOfTotal: 0, color: r.adsPercGB >= 2 ? '#05944F' : r.adsPercGB >= 1 ? '#EA8600' : '#E11900' })).sort((a, b) => b.value - a.value);
                default: return [];
              }
            };
            const data = getRepData();
            const maxVal = Math.max(...data.map(d => d.value), 1);
            const isDollar = ['rfo', 'ads', 'ufo', 'gb'].includes(drillMetric || '');

            return (
              <div className={css({ display: 'grid', gap: '8px' })}>
                {data.map((d, i) => (
                  <div key={i} className={css({ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FAFAFA' })}>
                    <span className={css({ fontFamily: 'UberMoveText', fontWeight: 600, fontSize: '13px', width: '150px' })}>{d.name}</span>
                    <div className={css({ flex: 1, height: '10px', backgroundColor: '#E8E8E8', borderRadius: '5px', overflow: 'hidden' })}>
                      <div className={css({ height: '100%', borderRadius: '5px', backgroundColor: d.color, width: `${(d.value / maxVal) * 100}%`, transition: 'width 0.3s' })} />
                    </div>
                    <span className={css({ fontFamily: 'UberMoveText', fontWeight: 700, fontSize: '13px', minWidth: '80px', textAlign: 'right' as const, color: d.color })}>
                      {d.display}
                    </span>
                    {isDollar && d.pctOfTotal > 0 && (
                      <span className={css({ fontFamily: 'UberMoveText', fontSize: '11px', color: '#888', minWidth: '50px', textAlign: 'right' as const })}>
                        {d.pctOfTotal.toFixed(0)}%
                      </span>
                    )}
                  </div>
                ))}
                {isDollar && (
                  <div className={css({ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #E8E8E8', marginTop: '4px' })}>
                    <span className={css({ fontFamily: 'UberMoveText', fontWeight: 700, fontSize: '13px', color: '#333' })}>
                      Total: ${data.reduce((s, d) => s + d.value, 0).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </ModalBody>
      </Modal>

      <CollapsibleInsights title="Monetization Insights" count={insights.length}>
        {insights.map((ins, i) => <InsightCard key={i} text={ins} type={i === 0 ? 'success' : 'warning'} />)}
      </CollapsibleInsights>

      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        {/* Current NDG % by Rep */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Current NDG % by Rep</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ndgChart} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Bar dataKey="current" fill="#276EF1" name="Current NDG%" radius={[0, 4, 4, 0]} barSize={18}>
                {ndgChart.map((d, i) => (
                  <Cell key={i} fill={d.current > 10 ? '#05944F' : d.current > 3 ? '#EA8600' : '#E11900'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* F28D NDG % by Rep */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>F28D NDG % by Rep</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ndgChart} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <Bar dataKey="f28d" fill="#05944F" name="F28D NDG%" radius={[0, 4, 4, 0]} barSize={18}>
                {ndgChart.map((d, i) => (
                  <Cell key={i} fill={d.f28d > 10 ? '#05944F' : d.f28d > 3 ? '#EA8600' : '#E11900'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        {/* Spend Mix Donut */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>
            {selectedRep === 'all' ? 'Team' : selectedRep.split(' ')[0]} Spend Breakdown
          </div>
          <div className={css({ display: 'flex', alignItems: 'center' })}>
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={(() => {
                    if (selectedRep !== 'all') {
                      const r = spendReps[0];
                      if (!r) return [];
                      return [
                        { name: 'RFO', value: r.rfo, color: '#276EF1' },
                        { name: 'UFO', value: r.ufo, color: '#05944F' },
                        { name: 'Ads', value: r.ads, color: '#EA8600' },
                      ];
                    }
                    return spendDonut;
                  })()}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" nameKey="name" strokeWidth={2} stroke="#FFF"
                >
                  {spendDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={30} />
              </PieChart>
            </ResponsiveContainer>
            <div className={css({ flex: 1, paddingLeft: '12px' })}>
              {(() => {
                const data = selectedRep !== 'all' && spendReps[0]
                  ? [
                      { label: 'RFO', val: spendReps[0].rfo, color: '#276EF1' },
                      { label: 'UFO', val: spendReps[0].ufo, color: '#05944F' },
                      { label: 'Ads', val: spendReps[0].ads, color: '#EA8600' },
                    ]
                  : [
                      { label: 'RFO', val: totalRFO, color: '#276EF1' },
                      { label: 'UFO', val: totalUFO, color: '#05944F' },
                      { label: 'Ads', val: totalAds, color: '#EA8600' },
                    ];
                const total = data.reduce((s, d) => s + d.val, 0);
                return data.map((d, i) => (
                  <div key={i} className={css({ marginBottom: '10px' })}>
                    <div className={css({ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'UberMoveText', marginBottom: '3px' })}>
                      <span className={css({ fontWeight: 600, color: d.color })}>{d.label}</span>
                      <span className={css({ fontWeight: 500 })}>${(d.val / 1000).toFixed(1)}K</span>
                    </div>
                    <div className={css({ height: '6px', backgroundColor: '#F0F0F0', borderRadius: '3px', overflow: 'hidden' })}>
                      <div className={css({ height: '100%', backgroundColor: d.color, borderRadius: '3px', width: `${total > 0 ? (d.val / total * 100) : 0}%` })} />
                    </div>
                    <div className={css({ fontSize: '10px', color: '#888', fontFamily: 'UberMoveText', marginTop: '2px' })}>
                      {total > 0 ? (d.val / total * 100).toFixed(1) : 0}% of spend · {totalGB > 0 ? (d.val / totalGB * 100).toFixed(2) : 0}% of GB
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Revenue Breakdown — Grouped Bar (side-by-side per rep) */}
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
            <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700 })}>Revenue by Rep</div>
            <div className={css({ display: 'flex', gap: '4px' })}>
              <Button size={SIZE.mini} kind={spendView === '$' ? KIND.primary : KIND.tertiary} onClick={() => setSpendView('$')}
                overrides={{ BaseButton: { style: { backgroundColor: spendView === '$' ? '#000' : '#F0F0F0', color: spendView === '$' ? '#FFF' : '#333', fontSize: '11px', paddingLeft: '10px', paddingRight: '10px' } } }}>
                $
              </Button>
              <Button size={SIZE.mini} kind={spendView === '%' ? KIND.primary : KIND.tertiary} onClick={() => setSpendView('%')}
                overrides={{ BaseButton: { style: { backgroundColor: spendView === '%' ? '#000' : '#F0F0F0', color: spendView === '%' ? '#FFF' : '#333', fontSize: '11px', paddingLeft: '10px', paddingRight: '10px' } } }}>
                % of GB
              </Button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rfoChart} margin={{ left: 10, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => spendView === '$' ? `$${(v / 1000).toFixed(0)}K` : `${v.toFixed(0)}%`} />
              <Tooltip formatter={(v: number) => spendView === '$' ? `$${v.toLocaleString()}` : `${v.toFixed(2)}%`} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="rfo" fill="#276EF1" name="RFO" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="ufo" fill="#05944F" name="UFO" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="ads" fill="#EA8600" name="Ads" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Rep Spend Cards — all real data from sheet */}
      <SectionHeader title="Where Is Merchant Spend Going?" subtitle="Per-rep spend mix and penetration rates (from NDG tab)" />
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '24px' })}>
        {repSpendBreakdown.map((r, i) => (
          <div key={i} className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' })}>
              <div className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px' })}>{r.name}</div>
              <div className={css({
                padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                backgroundColor: r.ndg >= 10 ? '#E6F4EA' : r.ndg >= 5 ? '#FEF7E0' : '#FFEBEE',
                color: r.ndg >= 10 ? '#137333' : r.ndg >= 5 ? '#EA8600' : '#C5221F',
              })}>
                NDG {r.ndg}%
              </div>
            </div>
            <div className={css({ display: 'flex', gap: '4px', marginBottom: '10px', height: '8px', borderRadius: '4px', overflow: 'hidden' })}>
              <div className={css({ backgroundColor: '#276EF1', width: `${r.rfoPct}%`, borderRadius: r.ufoPct === 0 && r.adsPct === 0 ? '4px' : '4px 0 0 4px' })} />
              <div className={css({ backgroundColor: '#05944F', width: `${r.ufoPct}%` })} />
              <div className={css({ backgroundColor: '#EA8600', width: `${r.adsPct}%`, borderRadius: r.rfoPct === 0 && r.ufoPct === 0 ? '4px' : '0 4px 4px 0' })} />
            </div>
            <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '11px', fontFamily: 'UberMoveText' })}>
              <div>
                <div className={css({ color: '#276EF1', fontWeight: 600 })}>RFO</div>
                <div className={css({ fontWeight: 600 })}>${(r.rfo / 1000).toFixed(1)}K</div>
                <div className={css({ color: '#888' })}>{r.rfoPercGB}% GB</div>
              </div>
              <div>
                <div className={css({ color: '#05944F', fontWeight: 600 })}>UFO</div>
                <div className={css({ fontWeight: 600 })}>${(r.ufo / 1000).toFixed(1)}K</div>
                <div className={css({ color: '#888' })}>{r.ufoPercGB}% GB</div>
              </div>
              <div>
                <div className={css({ color: '#EA8600', fontWeight: 600 })}>Ads</div>
                <div className={css({ fontWeight: 600 })}>${(r.ads / 1000).toFixed(1)}K</div>
                <div className={css({ color: '#888' })}>{r.adsPercGB}% GB</div>
              </div>
            </div>
            <div className={css({ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F0F0F0', fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', display: 'flex', justifyContent: 'space-between' })}>
              <span>Total Spend: <strong>${(r.total / 1000).toFixed(1)}K</strong></span>
              <span>GB: <strong>${(r.gb / 1000).toFixed(0)}K</strong></span>
            </div>
            <div className={css({ marginTop: '4px', fontSize: '10px', fontFamily: 'UberMoveText', color: '#999' })}>
              F28D NDG: {r.f28dNdg}%
            </div>
          </div>
        ))}
      </div>

      {/* Rep Monetization Detail Table — all from sheet data */}
      <SectionHeader title="Rep Monetization Detail" subtitle="Sourced from NDG tab & Attainment/Pacing tab" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['Rep', 'NDG %', 'F28D NDG %', 'RFO', 'UFO', 'Ads', 'GB (F28D)', 'RFO %GB', 'UFO %GB', 'Ads %GB', 'Wishlist %', 'Attainment', 'NDG Met?'].map(h => (
                <th key={h} className={css({ padding: '10px 12px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8', whiteSpace: 'nowrap' as const } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {combinedData.map((rep, i) => (
              <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                <td className={css({ padding: '10px 12px', fontWeight: 500, borderBottom: '1px solid #F0F0F0', color: '#276EF1', cursor: 'pointer', ':hover': { textDecoration: 'underline' } } as any)}
                  onClick={() => setDrillRep(rep.fullName)}>
                  {rep.fullName}
                </td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: pctColor(rep.ndgPct), borderBottom: '1px solid #F0F0F0' } as any)}>{rep.ndgPct}%</td>
                <td className={css({ padding: '10px 12px', fontWeight: 500, color: pctColor(rep.f28dNdgPct), borderBottom: '1px solid #F0F0F0' } as any)}>{rep.f28dNdgPct}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>${rep.rfo.toLocaleString()}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>${rep.ufo.toLocaleString()}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>${rep.ads.toLocaleString()}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>${rep.gbF28D.toLocaleString()}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.rfoPercGB}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.ufoPercGB}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.adsPercGB}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.wishlistPct}%</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: pctColor(rep.attainment), borderBottom: '1px solid #F0F0F0' } as any)}>
                  {rep.attainment > 0 ? `${rep.attainment.toFixed(1)}%` : '—'}
                </td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>
                  <StatusBadge status={rep.ndgMet ? 'ahead' : 'risk'} label={rep.ndgMet ? '✅ Met' : '❌ Miss'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rep NDG Deep Dive Modal */}
      {(() => {
        const ndgRep = drillRep ? repNDG.find(r => r.name === drillRep) : null;
        const attnRep = drillRep ? repAttainment.find(r => r.name === drillRep) : null;
        const coachRep = drillRep ? repCoaching.find(r => r.name === drillRep) : null;
        if (!ndgRep || !attnRep) return null;

        const totalSpend = ndgRep.rfo + ndgRep.ufo + ndgRep.ads;
        const spendBreakdown = [
          { name: 'RFO', value: ndgRep.rfo, pct: totalSpend > 0 ? (ndgRep.rfo / totalSpend * 100) : 0, color: '#276EF1', percGB: ndgRep.rfoPercGB },
          { name: 'UFO', value: ndgRep.ufo, pct: totalSpend > 0 ? (ndgRep.ufo / totalSpend * 100) : 0, color: '#05944F', percGB: ndgRep.ufoPercGB },
          { name: 'Ads', value: ndgRep.ads, pct: totalSpend > 0 ? (ndgRep.ads / totalSpend * 100) : 0, color: '#EA8600', percGB: ndgRep.adsPercGB },
        ];

        // Radar: spend mix vs ideal (50% RFO, 50% Ads, 0% UFO)
        const repTotalSpendForRadar = ndgRep.rfo + ndgRep.ufo + ndgRep.ads;
        const rfoMix = repTotalSpendForRadar > 0 ? (ndgRep.rfo / repTotalSpendForRadar) * 100 : 0;
        const ufoMix = repTotalSpendForRadar > 0 ? (ndgRep.ufo / repTotalSpendForRadar) * 100 : 0;
        const adsMix = repTotalSpendForRadar > 0 ? (ndgRep.ads / repTotalSpendForRadar) * 100 : 0;
        const radarData = [
          { metric: 'RFO (Offers)', actual: rfoMix, ideal: 50, raw: `$${ndgRep.rfo.toLocaleString()} (${rfoMix.toFixed(1)}%)` },
          { metric: 'UFO', actual: ufoMix, ideal: 0, raw: `$${ndgRep.ufo.toLocaleString()} (${ufoMix.toFixed(1)}%)` },
          { metric: 'Ads (PPC)', actual: adsMix, ideal: 50, raw: `$${ndgRep.ads.toLocaleString()} (${adsMix.toFixed(1)}%)` },
        ];

        // Team averages for comparison
        const activeReps = repNDG.filter(r => r.gbF28D > 0);
        const teamAvgNDG = activeReps.reduce((s, r) => s + r.ndgPct, 0) / activeReps.length;
        const teamAvgRFO = activeReps.reduce((s, r) => s + r.rfo, 0) / activeReps.length;
        const teamAvgAds = activeReps.reduce((s, r) => s + r.ads, 0) / activeReps.length;
        const teamAvgUFO = activeReps.reduce((s, r) => s + r.ufo, 0) / activeReps.length;

        const vsTeam = (val: number, avg: number) => {
          const diff = avg > 0 ? ((val - avg) / avg * 100) : 0;
          return { diff, isUp: diff >= 0 };
        };

        const ndgMet = ndgRep.ndgPct >= thresholds.ndgTarget;

        // Strengths & weaknesses
        const strengths: string[] = [];
        const concerns: string[] = [];
        if (ndgMet) strengths.push(`NDG at ${ndgRep.ndgPct}% — meets ${thresholds.ndgTarget}% target`);
        else concerns.push(`NDG at ${ndgRep.ndgPct}% — below ${thresholds.ndgTarget}% target`);
        if (ndgRep.rfoPercGB > 5) strengths.push(`Strong RFO attach at ${ndgRep.rfoPercGB}% of GB`);
        else if (ndgRep.gbF28D > 0) concerns.push(`Low RFO attach at ${ndgRep.rfoPercGB}% of GB`);
        if (ndgRep.adsPercGB > 1) strengths.push(`Ads attach at ${ndgRep.adsPercGB}% of GB`);
        else if (ndgRep.gbF28D > 0) concerns.push(`Minimal ads adoption — ${ndgRep.adsPercGB}% of GB`);
        if (attnRep.wishlistPct > 35) strengths.push(`Wishlist at ${attnRep.wishlistPct}% — healthy prospecting`);
        if (attnRep.pctToQuota >= 100) strengths.push(`Above quota at ${attnRep.pctToQuota.toFixed(1)}%`);
        else if (attnRep.pctToQuota < 85 && attnRep.quota > 0) concerns.push(`Attainment at ${attnRep.pctToQuota.toFixed(1)}% — behind pace`);

        const changeBadge = (diff: number) => (
          <span className={css({
            fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
            color: diff >= 0 ? '#05944F' : '#E11900',
            backgroundColor: diff >= 0 ? '#E6F4EA' : '#FFEBEE',
          })}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(0)}% vs team
          </span>
        );

        return (
          <Modal isOpen={!!drillRep} onClose={() => setDrillRep(null)}
            overrides={{ Dialog: { style: { width: '680px', borderRadius: '12px', maxHeight: '90vh', overflow: 'auto' } } }}>
            <ModalHeader>
              <span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>{drillRep} — NDG Deep Dive</span>
            </ModalHeader>
            <ModalBody>
              {/* Status banner */}
              <div className={css({
                padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
                backgroundColor: ndgMet ? '#E6F4EA' : '#FFEBEE',
                border: `1px solid ${ndgMet ? '#05944F' : '#E11900'}20`,
              })}>
                <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                  <span className={css({ fontFamily: 'UberMove', fontWeight: 700, fontSize: '14px', color: ndgMet ? '#137333' : '#C5221F' })}>
                    {ndgMet ? '✅ NDG Target Met' : '❌ NDG Target Not Met'}
                  </span>
                  <span className={css({ fontFamily: 'UberMoveText', fontSize: '12px', color: '#666' })}>
                    Target: {thresholds.ndgTarget}% · Actual: {ndgRep.ndgPct}%
                  </span>
                </div>
              </div>

              {/* Key metrics row */}
              <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' })}>
                {[
                  { label: 'NDG %', val: `${ndgRep.ndgPct}%`, vs: vsTeam(ndgRep.ndgPct, teamAvgNDG) },
                  { label: 'F28D NDG %', val: `${ndgRep.f28dNdgPct}%`, vs: vsTeam(ndgRep.f28dNdgPct, teamAvgNDG) },
                  { label: 'Attainment', val: attnRep.quota > 0 ? `${attnRep.pctToQuota.toFixed(1)}%` : '—', vs: { diff: 0, isUp: true } },
                  { label: 'Wishlist %', val: `${attnRep.wishlistPct}%`, vs: { diff: 0, isUp: true } },
                ].map((m, i) => (
                  <div key={i} className={css({ padding: '10px 12px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #E8E8E8' })}>
                    <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '2px' })}>{m.label}</div>
                    <div className={css({ fontSize: '18px', fontFamily: 'UberMove', fontWeight: 700 })}>{m.val}</div>
                    {m.vs.diff !== 0 && <div className={css({ marginTop: '2px' })}>{changeBadge(m.vs.diff)}</div>}
                  </div>
                ))}
              </div>

              {/* Spend breakdown + Radar side by side */}
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' })}>
                {/* Spend breakdown */}
                <div className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px' })}>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '10px' })}>Spend Breakdown</div>
                  {/* Stacked bar */}
                  <div className={css({ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '12px' })}>
                    {spendBreakdown.map(s => (
                      <div key={s.name} className={css({ backgroundColor: s.color, width: `${s.pct}%` })} />
                    ))}
                  </div>
                  {spendBreakdown.map(s => (
                    <div key={s.name} className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F0F0F0', fontSize: '12px', fontFamily: 'UberMoveText' })}>
                      <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
                        <div className={css({ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: s.color })} />
                        <span className={css({ fontWeight: 600 })}>{s.name}</span>
                      </div>
                      <div className={css({ display: 'flex', gap: '12px', alignItems: 'center' })}>
                        <span className={css({ fontWeight: 600 })}>${s.value.toLocaleString()}</span>
                        <span className={css({ color: '#888', fontSize: '11px' })}>{s.pct.toFixed(1)}%</span>
                        <span className={css({ color: '#888', fontSize: '11px' })}>{s.percGB}% GB</span>
                      </div>
                    </div>
                  ))}
                  <div className={css({ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600 })}>
                    <span>Total Spend</span>
                    <span>${totalSpend.toLocaleString()}</span>
                  </div>
                  <div className={css({ display: 'flex', justifyContent: 'space-between', padding: '4px 0 0', fontSize: '11px', fontFamily: 'UberMoveText', color: '#888' })}>
                    <span>Gross Bookings (F28D)</span>
                    <span>${(ndgRep.gbF28D / 1000).toFixed(1)}K</span>
                  </div>
                </div>

                {/* Radar */}
                <div className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px' })}>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '4px' })}>Spend Mix vs Ideal</div>
                  <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>Ideal: 50% RFO, 50% Ads, 0% UFO</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="#E8E8E8" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontFamily: 'UberMoveText' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="ideal" stroke="#05944F" fill="#05944F" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" name="Ideal" />
                      <Radar dataKey="actual" stroke="#276EF1" fill="#276EF1" fillOpacity={0.2} strokeWidth={2} name="Actual" />
                      <Tooltip formatter={(v: number, name: string, props: any) => [name === 'Actual' ? props.payload.raw : `${v}%`, name]} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* vs Team Avg comparison */}
              <div className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px', marginBottom: '16px' })}>
                <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '10px' })}>vs Team Average</div>
                <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' })}>
                  {[
                    { label: 'RFO', val: ndgRep.rfo, avg: teamAvgRFO },
                    { label: 'UFO', val: ndgRep.ufo, avg: teamAvgUFO },
                    { label: 'Ads', val: ndgRep.ads, avg: teamAvgAds },
                    { label: 'NDG %', val: ndgRep.ndgPct, avg: teamAvgNDG },
                  ].map((m, i) => {
                    const vs = vsTeam(m.val, m.avg);
                    return (
                      <div key={i} className={css({ textAlign: 'center' as const, padding: '8px', backgroundColor: '#FAFAFA', borderRadius: '6px' })}>
                        <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#888' })}>{m.label}</div>
                        <div className={css({ fontSize: '15px', fontFamily: 'UberMove', fontWeight: 700, margin: '2px 0' })}>
                          {m.label === 'NDG %' ? `${m.val}%` : `$${m.val.toLocaleString()}`}
                        </div>
                        {changeBadge(vs.diff)}
                        <div className={css({ fontSize: '10px', fontFamily: 'UberMoveText', color: '#999', marginTop: '3px' })}>
                          Avg: {m.label === 'NDG %' ? `${m.avg.toFixed(1)}%` : `$${m.avg.toFixed(0)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths & Concerns */}
              <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' })}>
                <div className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px' })}>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px', color: '#05944F' })}>💪 Strengths</div>
                  {strengths.length > 0 ? strengths.map((s, i) => (
                    <div key={i} className={css({ fontSize: '12px', fontFamily: 'UberMoveText', padding: '4px 0', color: '#333' })}>• {s}</div>
                  )) : <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#888' })}>No notable strengths</div>}
                </div>
                <div className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px' })}>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px', color: '#E11900' })}>⚠️ Concerns</div>
                  {concerns.length > 0 ? concerns.map((c, i) => (
                    <div key={i} className={css({ fontSize: '12px', fontFamily: 'UberMoveText', padding: '4px 0', color: '#333' })}>• {c}</div>
                  )) : <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#888' })}>No major concerns</div>}
                </div>
              </div>

              {/* Coaching note if available */}
              {coachRep && (
                <div className={css({ border: '1px solid #E8E8E8', borderRadius: '8px', padding: '12px' })}>
                  <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '6px' })}>🧑‍🏫 Coaching Context</div>
                  <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#555', lineHeight: '1.6' })}>{coachRep.insight}</div>
                </div>
              )}
            </ModalBody>
          </Modal>
        );
      })()}

    </div>
  );
}
