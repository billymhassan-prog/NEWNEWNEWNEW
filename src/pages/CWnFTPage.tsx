import { useState } from "react";
import { useStyletron } from "baseui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Modal, ModalHeader, ModalBody } from "baseui/modal";
import { MetricCard, StatusBadge, SectionHeader, InsightCard, CollapsibleInsights, pctColor } from "../components/SharedUI";
import { repCWnFT, teamCWnFT, RepName } from "../data/dashboardData";
import { getRepCWAccounts } from "../data/accountData";

export default function CWnFTPage({ selectedRep }: { selectedRep: RepName | 'all' }) {
  const [css] = useStyletron();
  const [listModal, setListModal] = useState<{ title: string; filter: 'all' | 'cwnft' } | null>(null);
  const [repDrill, setRepDrill] = useState<RepName | null>(null);

  const reps = selectedRep === 'all' ? repCWnFT : repCWnFT.filter(r => r.name === selectedRep);
  const sorted = [...reps].sort((a, b) => b.pctNFT - a.pctNFT);

  const chartData = reps.filter(r => r.totalCW > 0).map(r => ({
    name: r.name.split(' ')[0],
    cwnft: r.pctNFT,
    fill: r.pctNFT > 15 ? '#E11900' : r.pctNFT > 10 ? '#EA8600' : '#05944F',
  }));

  const agingData = reps.filter(r => r.totalCW > 0).map(r => ({
    name: r.name.split(' ')[0],
    days: r.avgDaysCWtoFT,
    fill: r.avgDaysCWtoFT > 12 ? '#E11900' : r.avgDaysCWtoFT > 8 ? '#EA8600' : '#05944F',
  }));

  const insights: string[] = [];
  const worstNFT = sorted.filter(r => r.pctNFT > 12 && r.totalCW > 5);
  if (worstNFT.length > 0) insights.push(`${worstNFT.map(r => `${r.name.split(' ')[0]} (${r.pctNFT}%)`).join(', ')} have the highest CWnFT rates — closing deals but not getting them live.`);
  const slowest = reps.filter(r => r.avgDaysCWtoFT > 10 && r.totalCW > 5);
  if (slowest.length > 0) insights.push(`${slowest.map(r => `${r.name.split(' ')[0]} (${r.avgDaysCWtoFT}d avg)`).join(', ')} are slowest CW→FT — indicates post-close follow-through issues.`);
  if (teamCWnFT.pctNFT > 10) insights.push(`Team-wide ${teamCWnFT.pctNFT}% CWnFT rate means roughly 1 in 9 closed deals isn't going live. This is a process issue, not a sales issue.`);

  // Account lists for modals
  const allAccounts = repCWnFT.filter(r => r.totalCW > 0).flatMap(r => getRepCWAccounts(r.name as RepName).map(a => ({ ...a, rep: r.name })));
  const listAccounts = listModal
    ? (listModal.filter === 'cwnft' ? allAccounts.filter(a => a.status === 'CWnFT') : allAccounts)
    : [];

  const repDrillAccounts = repDrill ? getRepCWAccounts(repDrill).filter(a => a.status === 'CWnFT') : [];

  return (
    <div>
      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' })}>
        <MetricCard title="Total CW" value={selectedRep === 'all' ? teamCWnFT.totalCW : reps[0]?.totalCW || 0} color="#05944F"
          onClick={() => setListModal({ title: 'All Closed Won Accounts', filter: 'all' })} />
        <MetricCard title="CWnFT Count" value={selectedRep === 'all' ? teamCWnFT.cwnft : reps[0]?.cwnft || 0}
          color={(selectedRep === 'all' ? teamCWnFT.cwnft : reps[0]?.cwnft || 0) > 15 ? '#E11900' : (selectedRep === 'all' ? teamCWnFT.cwnft : reps[0]?.cwnft || 0) > 5 ? '#EA8600' : '#05944F'}
          onClick={() => setListModal({ title: 'CWnFT Accounts (Not Yet Live)', filter: 'cwnft' })} />
        <MetricCard title="CWnFT Rate" value={`${selectedRep === 'all' ? teamCWnFT.pctNFT : reps[0]?.pctNFT || 0}%`} color={(selectedRep === 'all' ? teamCWnFT.pctNFT : reps[0]?.pctNFT || 0) > 15 ? '#E11900' : (selectedRep === 'all' ? teamCWnFT.pctNFT : reps[0]?.pctNFT || 0) > 8 ? '#EA8600' : '#05944F'} />
        <MetricCard title="OB Risk Index" value={`${selectedRep === 'all' ? teamCWnFT.obRiskIndex : reps[0]?.obRiskIndex || 0}%`} color={(selectedRep === 'all' ? teamCWnFT.obRiskIndex : reps[0]?.obRiskIndex || 0) >= 90 ? '#05944F' : (selectedRep === 'all' ? teamCWnFT.obRiskIndex : reps[0]?.obRiskIndex || 0) >= 80 ? '#EA8600' : '#E11900'} tooltip="Onboarding risk — % of accounts that are NOT stale" />
        <MetricCard title="F28D Conversion" value={`${selectedRep === 'all' ? teamCWnFT.f28dConv : reps[0]?.f28dConv || 0}%`} color={(selectedRep === 'all' ? teamCWnFT.f28dConv : reps[0]?.f28dConv || 0) >= 80 ? '#05944F' : (selectedRep === 'all' ? teamCWnFT.f28dConv : reps[0]?.f28dConv || 0) >= 60 ? '#EA8600' : '#E11900'} tooltip="Finance 28-day conversion rate" />
      </div>

      <CollapsibleInsights title="Post-Close Insights" count={insights.length}>
        {insights.map((ins, i) => <InsightCard key={i} text={ins} type={i === 0 ? 'danger' : 'warning'} />)}
      </CollapsibleInsights>

      <div className={css({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>CWnFT Rate by Rep</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="cwnft" radius={[0, 4, 4, 0]} barSize={16}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '14px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '12px' })}>Avg Days CW → FT</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agingData.filter(d => d.days > 0)} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v} days`} />
              <Bar dataKey="days" radius={[0, 4, 4, 0]} barSize={16}>
                {agingData.filter(d => d.days > 0).map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionHeader title="Rep Post-Close Detail" subtitle="Click a rep name to see their CWnFT accounts" />
      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', overflow: 'auto' })}>
        <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText', minWidth: '900px' } as any)}>
          <thead>
            <tr className={css({ backgroundColor: '#F8F8F8' } as any)}>
              {['Rep', 'Total CW', 'CWnFT', '%nFT', 'Avg Days', '>7D', '>14D', '>28D', 'OB Risk', 'F28D Conv', 'Status'].map(h => (
                <th key={h} className={css({ padding: '10px 12px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.filter(r => r.totalCW > 0).map((rep, i) => (
              <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                <td
                  className={css({ padding: '10px 12px', fontWeight: 500, borderBottom: '1px solid #F0F0F0', color: '#276EF1', cursor: 'pointer', ':hover': { textDecoration: 'underline' } } as any)}
                  onClick={() => setRepDrill(rep.name as RepName)}
                >
                  {rep.name}
                </td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.totalCW}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: rep.cwnft > 5 ? '#E11900' : rep.cwnft > 0 ? '#EA8600' : '#05944F', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.cwnft}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: pctColor(rep.pctNFT), borderBottom: '1px solid #F0F0F0' } as any)}>{rep.pctNFT.toFixed(1)}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.avgDaysCWtoFT || '—'}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.gt7d}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.gt14d}</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>{rep.gt28d}</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: pctColor(rep.obRiskIndex), borderBottom: '1px solid #F0F0F0' } as any)}>{rep.obRiskIndex}%</td>
                <td className={css({ padding: '10px 12px', fontWeight: 600, color: pctColor(rep.f28dConv), borderBottom: '1px solid #F0F0F0' } as any)}>{rep.f28dConv}%</td>
                <td className={css({ padding: '10px 12px', borderBottom: '1px solid #F0F0F0' } as any)}>
                  <StatusBadge status={rep.pctNFT > 15 ? 'risk' : rep.pctNFT > 10 ? 'behind' : 'ahead'} label={rep.pctNFT > 15 ? 'High Risk' : rep.pctNFT > 10 ? 'Watch' : 'Healthy'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total CW / CWnFT List Modal */}
      <Modal isOpen={!!listModal} onClose={() => setListModal(null)} overrides={{ Dialog: { style: { width: '750px', borderRadius: '12px', maxHeight: '80vh' } } }}>
        <ModalHeader>{listModal?.title}</ModalHeader>
        <ModalBody>
          <div className={css({ maxHeight: '60vh', overflow: 'auto' })}>
            <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'UberMoveText' } as any)}>
              <thead>
                <tr className={css({ backgroundColor: '#F8F8F8', position: 'sticky' as const, top: 0 } as any)}>
                  {['Account', 'Rep', 'Tier', 'CW Date', 'FT Date', 'Days', 'Status'].map(h => (
                    <th key={h} className={css({ padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listAccounts.map((a, i) => (
                  <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                    <td className={css({ padding: '8px 10px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{a.account}</td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.rep.split(' ')[0]}</td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.tier}</td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.cwDate}</td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.ftDate || '—'}</td>
                    <td className={css({ padding: '8px 10px', fontWeight: 600, color: a.daysCWtoFT === null ? '#E11900' : a.daysCWtoFT > 14 ? '#EA8600' : '#05944F', borderBottom: '1px solid #F0F0F0' } as any)}>
                      {a.daysCWtoFT ?? 'Pending'}
                    </td>
                    <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>
                      <StatusBadge status={a.status === 'CWnFT' ? 'risk' : 'ahead'} label={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={css({ padding: '12px', fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
              {listAccounts.length} accounts
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Rep CWnFT Accounts Modal */}
      <Modal isOpen={!!repDrill} onClose={() => setRepDrill(null)} overrides={{ Dialog: { style: { width: '650px', borderRadius: '12px', maxHeight: '80vh' } } }}>
        <ModalHeader>{repDrill} — CWnFT Accounts</ModalHeader>
        <ModalBody>
          {repDrillAccounts.length === 0 ? (
            <div className={css({ padding: '20px', textAlign: 'center' as const, color: '#888', fontFamily: 'UberMoveText' })}>
              ✅ No CWnFT accounts — all closed deals are live!
            </div>
          ) : (
            <div className={css({ maxHeight: '55vh', overflow: 'auto' })}>
              <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'UberMoveText' } as any)}>
                <thead>
                  <tr className={css({ backgroundColor: '#F8F8F8', position: 'sticky' as const, top: 0 } as any)}>
                    {['Account', 'Tier', 'CW Date', 'Status'].map(h => (
                      <th key={h} className={css({ padding: '8px 10px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8' } as any)}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {repDrillAccounts.map((a, i) => (
                    <tr key={i} className={css({ ':hover': { backgroundColor: '#FAFAFA' } } as any)}>
                      <td className={css({ padding: '8px 10px', fontWeight: 500, borderBottom: '1px solid #F0F0F0' } as any)}>{a.account}</td>
                      <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.tier}</td>
                      <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>{a.cwDate}</td>
                      <td className={css({ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' } as any)}>
                        <StatusBadge status="risk" label="Not Live" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={css({ padding: '12px', fontSize: '12px', color: '#888', fontFamily: 'UberMoveText', textAlign: 'center' as const })}>
                {repDrillAccounts.length} CWnFT accounts
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
}
