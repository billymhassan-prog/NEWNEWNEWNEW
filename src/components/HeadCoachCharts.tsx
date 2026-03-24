import { useStyletron } from "baseui";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, CartesianGrid, LineChart, Line,
} from "recharts";

import {
  repAttainment, repPipeline, repL12DActivity, repCWnFT, repNDG,
  repWeeklyFTPoints, teamL12DActivity, teamPipeline, teamCWnFT,
  l12dDates, weeklyPacing,
} from "../data/dashboardData";

// ===== PIPELINE FUNNEL =====
export function PipelineFunnelChart() {
  const [css] = useStyletron();
  const data = [
    { stage: 'Outreach', count: repPipeline.reduce((s, r) => s + r.outreach, 0), fill: '#276EF1' },
    { stage: 'Pitching', count: repPipeline.reduce((s, r) => s + r.pitching, 0), fill: '#05944F' },
    { stage: 'Negotiation', count: repPipeline.reduce((s, r) => s + r.negotiation, 0), fill: '#EA8600' },
    { stage: 'CW to Date', count: repPipeline.reduce((s, r) => s + r.cwToDate, 0), fill: '#7627BB' },
  ];

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Pipeline Funnel</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="stage" width={80} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== DAILY CALLS TREND (L12D) =====
export function DailyCallsTrendChart() {
  const [css] = useStyletron();
  const data = teamL12DActivity.dailyCalls.map((v, i) => ({
    date: l12dDates[i],
    calls: v,
    touchpoints: teamL12DActivity.dailyTouchpoints[i],
  }));

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>L12D Team Activity Trend</div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend verticalAlign="top" height={24} />
          <Area type="monotone" dataKey="touchpoints" stroke="#276EF1" fill="#276EF1" fillOpacity={0.15} name="Touchpoints" />
          <Area type="monotone" dataKey="calls" stroke="#05944F" fill="#05944F" fillOpacity={0.2} name="Calls" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== TIER MIX DISTRIBUTION =====
export function TierMixChart() {
  const [css] = useStyletron();
  const activeReps = repAttainment.filter(r => r.quota > 0);
  const data = [
    { name: 'Tier 1', value: activeReps.reduce((s, r) => s + r.tier1, 0), fill: '#276EF1' },
    { name: 'Tier 2', value: activeReps.reduce((s, r) => s + r.tier2, 0), fill: '#05944F' },
    { name: 'Tier 3', value: activeReps.reduce((s, r) => s + r.tier3, 0), fill: '#EA8600' },
    { name: 'T4/5', value: activeReps.reduce((s, r) => s + r.tier4_5, 0), fill: '#E11900' },
    { name: 'Untiered', value: activeReps.reduce((s, r) => s + r.untiered_lt14 + r.ut_14_55 + r.ut_gt55, 0), fill: '#999' },
  ];

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Team FT Tier Mix</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }} style={{ fontSize: '10px' }}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== CWnFT BY REP =====
export function CWnFTByRepChart() {
  const [css] = useStyletron();
  const data = repCWnFT.filter(r => r.totalCW > 0).sort((a, b) => b.pctNFT - a.pctNFT).map(r => ({
    name: r.name.split(' ')[0],
    nftPct: r.pctNFT,
    fill: r.pctNFT > 15 ? '#E11900' : r.pctNFT > 10 ? '#EA8600' : '#05944F',
  }));

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>CWnFT % by Rep</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 10, bottom: 20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} domain={[0, 25]} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
          <Bar dataKey="nftPct" radius={[4, 4, 0, 0]} barSize={24} name="CWnFT %">
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== WEEKLY FT POINTS HEATMAP =====
export function WeeklyFTPointsChart() {
  const [css] = useStyletron();
  const weeks = weeklyPacing.map(w => `W${w.weekNum}`);
  const data = repWeeklyFTPoints.filter(r => r.total > 0).map(r => ({
    name: r.name.split(' ')[0],
    ...Object.fromEntries(weeks.map((w, i) => [w, r.weeks[i]])),
  }));

  const colors = ['#276EF1', '#05944F', '#EA8600', '#7627BB', '#E11900', '#1967D2'];

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Weekly FT Points by Rep</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 10 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '10px' }} />
          {weeks.map((w, i) => (
            <Bar key={w} dataKey={w} stackId="a" fill={colors[i % colors.length]} name={w} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== REP PERFORMANCE RADAR =====
export function RepRadarChart() {
  const [css] = useStyletron();
  const activeReps = repAttainment.filter(r => r.quota > 0 || r.currentPts > 0);
  const [selectedRep, setSelectedRep] = useState<string | null>(null);

  const maxCalls = Math.max(...repL12DActivity.map(r => r.totalCalls));
  const maxOpen = Math.max(...repPipeline.map(r => r.totalOpen));

  const data = [
    { metric: 'Attainment', ...Object.fromEntries(activeReps.map(r => [r.name.split(' ')[0], Math.min(100, r.quota > 0 ? r.pctToQuota : 0)])) },
    { metric: 'Activity', ...Object.fromEntries(activeReps.map(r => {
      const act = repL12DActivity.find(a => a.name === r.name);
      return [r.name.split(' ')[0], act ? Math.round((act.totalCalls / maxCalls) * 100) : 0];
    })) },
    { metric: 'Pipeline', ...Object.fromEntries(activeReps.map(r => {
      const pip = repPipeline.find(p => p.name === r.name);
      return [r.name.split(' ')[0], pip ? Math.round((pip.totalOpen / maxOpen) * 100) : 0];
    })) },
    { metric: 'NDG', ...Object.fromEntries(activeReps.map(r => {
      const ndg = repNDG.find(n => n.name === r.name);
      return [r.name.split(' ')[0], ndg ? Math.min(100, ndg.ndgPct * 5) : 0];
    })) },
    { metric: 'FT Quality', ...Object.fromEntries(activeReps.map(r => {
      const cw = repCWnFT.find(c => c.name === r.name);
      return [r.name.split(' ')[0], cw ? Math.max(0, 100 - (cw.pctNFT * 5)) : 100];
    })) },
  ];

  const colors = ['#276EF1', '#05944F', '#EA8600', '#E11900', '#7627BB'];
  const visibleReps = selectedRep ? activeReps.filter(r => r.name.split(' ')[0] === selectedRep) : activeReps;

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' })}>
        <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700 })}>Rep Performance Radar</div>
        {selectedRep && (
          <span onClick={() => setSelectedRep(null)} className={css({ fontSize: '11px', color: '#276EF1', cursor: 'pointer', fontFamily: 'UberMoveText', ':hover': { textDecoration: 'underline' } })}>
            Show All
          </span>
        )}
      </div>
      <div className={css({ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' })}>
        {activeReps.map((r, i) => {
          const firstName = r.name.split(' ')[0];
          const isSelected = selectedRep === firstName;
          const isVisible = !selectedRep || isSelected;
          return (
            <span
              key={r.name}
              onClick={() => setSelectedRep(isSelected ? null : firstName)}
              className={css({
                fontSize: '11px', fontFamily: 'UberMoveText', fontWeight: 600,
                padding: '3px 10px', borderRadius: '12px', cursor: 'pointer',
                backgroundColor: isSelected ? colors[i % colors.length] : '#F0F0F0',
                color: isSelected ? '#FFF' : isVisible ? '#333' : '#BBB',
                border: `1px solid ${isSelected ? colors[i % colors.length] : '#E0E0E0'}`,
                transition: 'all 0.15s',
                ':hover': { opacity: 0.8 },
              })}
            >
              {firstName}
            </span>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e8e8e8" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
          {visibleReps.map((r) => {
            const i = activeReps.findIndex(a => a.name === r.name);
            return (
              <Radar key={r.name} name={r.name.split(' ')[0]} dataKey={r.name.split(' ')[0]}
                stroke={colors[i % colors.length]} fill={colors[i % colors.length]}
                fillOpacity={selectedRep ? 0.25 : 0.1} />
            );
          })}
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== STALE OPPS BY REP =====
export function StaleOppsChart() {
  const [css] = useStyletron();
  const data = repPipeline.filter(r => r.totalOpen > 0).sort((a, b) => b.outOfDate - a.outOfDate).map(r => ({
    name: r.name.split(' ')[0],
    stale: r.outOfDate,
    clean: r.totalOpen - r.outOfDate,
    fill: r.outOfDate > 30 ? '#E11900' : r.outOfDate > 10 ? '#EA8600' : '#05944F',
  }));

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Pipeline Health (Stale vs Clean)</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 10, bottom: 20 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: '10px' }} />
          <Bar dataKey="clean" stackId="a" fill="#05944F" name="Clean Opps" radius={[0, 0, 0, 0]} />
          <Bar dataKey="stale" stackId="a" fill="#E11900" name="Stale Opps" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ===== WEEKLY PACING GAP =====
export function WeeklyPacingGapChart() {
  const [css] = useStyletron();
  const data = weeklyPacing.map(w => ({
    name: `W${w.weekNum}`,
    gap: w.gap,
    fill: w.gap >= 0 ? '#05944F' : '#E11900',
  }));

  return (
    <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
      <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Weekly Pacing Gap (vs Target)</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 0, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: number) => `${v > 0 ? '+' : ''}${v}`} />
          <Bar dataKey="gap" radius={[4, 4, 0, 0]} barSize={28} name="Gap to Target">
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
