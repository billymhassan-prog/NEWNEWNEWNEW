import { useState, useMemo, useCallback } from "react";
import { useStyletron } from "baseui";
import { Button, SIZE, KIND } from "baseui/button";
import ReactMarkdown from "react-markdown";
import { SectionHeader } from "../components/SharedUI";
import {
  repAttainment,
  repPipeline,
  repL12DActivity,
  repCWnFT,
  teamCWnFT,
} from "../data/dashboardData";
import { loadTeamMembers } from "../utils/teamRoster";

// --- helpers (reuse your existing ones) ---
const asNum = (v: any) => Number(v) || 0;
const fmt = (n: number) => Math.round(n).toLocaleString();
const firstName = (s: string) => (s || "").split(" ")[0] || s;
const safePct0 = (v: any) => asNum(v).toFixed(0);

// Exclude Eli Beahm (per your requirement)
const EXCLUDE_REP = "Eli Beahm";

// --- churn risk model ---
// Simple weighted combination of signals. Tunable.
// We produce a 0-100 risk score (higher => more at-risk).
function computeRepRisk(repName: string, teamMembers: any[]) {
  // Find data rows
  const pipeline = repPipeline.find((r) => r.name === repName) || {};
  const activity = repL12DActivity.find((r) => r.name === repName) || {};
  const cwnft = repCWnFT.find((r) => r.name === repName) || {};
  const attainment = repAttainment.find((r) => r.name === repName) || {};
  const member = teamMembers.find((m: any) => m.name === repName) || {};

  // signals
  const stale = asNum(pipeline.outOfDate); // number stale
  const totalOpen = asNum(pipeline.totalOpen);
  const createdLW = asNum(pipeline.createdLW);
  const calls = asNum(activity.totalCalls);
  const callsDrop = (() => {
    try {
      const arr = activity.calls || [];
      const recent = arr.slice(-3).reduce((s: number, x: number) => s + asNum(x), 0);
      const prior = arr.slice(-6, -3).reduce((s: number, x: number) => s + asNum(x), 0);
      return prior > 0 ? Math.max(0, 1 - recent / prior) : 0;
    } catch {
      return 0;
    }
  })();
  const pctNFT = asNum(cwnft.pctNFT);
  const cwnftCount = asNum(cwnft.cwnft);
  const pctToQuota = asNum(attainment.pctToQuota) || 0;
  const isRamping = member?.status === "ramping";

  // normalized pieces (0-1)
  const staleNorm = Math.min(stale / 20, 1); // 20+ stale -> 1
  const coverageNorm = totalOpen > 0 ? Math.max(0, 1 - totalOpen / 10) : 1; // <10 opps => risk
  const createdNorm = Math.max(0, 1 - createdLW / 3); // <3 created -> risk
  const callsNorm = calls < 250 ? 1 : Math.max(0, 1 - calls / 5000); // low calls high risk
  const dropNorm = Math.min(callsDrop, 1);
  const cwnftNorm = Math.min(pctNFT / 30, 1); // 30%+ dangerous
  const attainmentNorm = pctToQuota < 80 ? (80 - pctToQuota) / 80 : 0;
  const rampNorm = isRamping ? 0.6 : 0; // ramp has moderate risk by behavior

  // weights (adjustable)
  const weights = {
    stale: 0.28,
    cwnft: 0.22,
    calls: 0.18,
    drop: 0.10,
    coverage: 0.08,
    attainment: 0.08,
    ramp: 0.06,
    created: 0.10, // small hygiene weight
  };

  let raw =
    staleNorm * weights.stale +
    cwnftNorm * weights.cwnft +
    callsNorm * weights.calls +
    dropNorm * weights.drop +
    coverageNorm * weights.coverage +
    attainmentNorm * weights.attainment +
    rampNorm * weights.ramp +
    createdNorm * weights.created;

  // Normalize and scale 0-100
  raw = Math.min(1, raw);
  const score = Math.round(raw * 100);

  // Primary driver
  const drivers = [
    { k: "stale opps", v: staleNorm * weights.stale },
    { k: "cwnft", v: cwnftNorm * weights.cwnft },
    { k: "low calls", v: callsNorm * weights.calls },
    { k: "activity drop", v: dropNorm * weights.drop },
    { k: "coverage", v: coverageNorm * weights.coverage },
    { k: "attainment gap", v: attainmentNorm * weights.attainment },
    { k: "ramping", v: rampNorm * weights.ramp },
    { k: "low creation", v: createdNorm * weights.created },
  ];
  drivers.sort((a, b) => b.v - a.v);
  const primary = drivers[0].k;

  // Return detail summary for UI
  return {
    name: repName,
    score,
    primary,
    stale,
    totalOpen,
    createdLW,
    calls,
    callsDrop,
    pctNFT,
    cwnftCount,
    pctToQuota,
    isRamping,
  };
}

// small helper to pull account-level list when available
// we try to use src/data/accountData.ts if present, otherwise fallback to an empty list.
function getAccountListForRep(repName: string) {
  // If your app has an account mapping file, import it at top and use it.
  // We do a dynamic attempt to read global `accountData` to avoid hard import.
  // If not present, return empty (you can wire this to real data).
  try {
    // @ts-ignore
    const ad = (window as any).__appAccountData || null;
    if (!ad) return [];
    return ad[repName] || [];
  } catch {
    return [];
  }
}

// ---------- UI Component ----------
export default function ChurnMonitor() {
  const [css] = useStyletron();
  const teamMembers = loadTeamMembers().filter((m: any) => m.name !== EXCLUDE_REP);

  // compute risks
  const repRisks = useMemo(() => {
    const reps = repAttainment.filter((r) => r.name !== EXCLUDE_REP && asNum(r.quota) > 0).map((r) => computeRepRisk(r.name, teamMembers));
    return reps.sort((a, b) => b.score - a.score);
  }, [teamMembers]);

  // team-level churn proxy KPIs
  const teamKpis = useMemo(() => {
    const stale = repPipeline.reduce((s, r) => s + (r.name === EXCLUDE_REP ? 0 : asNum(r.outOfDate)), 0);
    const openOpps = repPipeline.reduce((s, r) => s + (r.name === EXCLUDE_REP ? 0 : asNum(r.totalOpen)), 0);
    const totalCWnFT = repCWnFT.reduce((s, r) => s + (r.name === EXCLUDE_REP ? 0 : asNum(r.cwnft)), 0);
    const avgCWnFTpct = repCWnFT.reduce((s, r) => s + (r.name === EXCLUDE_REP ? 0 : asNum(r.pctNFT)), 0) / Math.max(1, repCWnFT.filter(r => r.name !== EXCLUDE_REP).length);
    const lowActivityReps = repL12DActivity.filter(r => r.name !== EXCLUDE_REP && asNum(r.totalCalls) < 250).length;
    const atRiskCount = repRisks.filter(r => r.score >= 50).length;
    return { stale, openOpps, totalCWnFT, avgCWnFTpct, lowActivityReps, atRiskCount };
  }, [repRisks]);

  // selected rep and actions storage
  const [selectedRep, setSelectedRep] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  // simple assign-action store (persist in localStorage)
  const [assignedActions, setAssignedActions] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem("churn-assigned-actions") || "{}";
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });

  const saveAssigned = useCallback((rep: string, action: string) => {
    const next = { ...assignedActions, [rep]: [...(assignedActions[rep] || []), { action, date: new Date().toISOString() }] };
    setAssignedActions(next);
    localStorage.setItem("churn-assigned-actions", JSON.stringify(next));
  }, [assignedActions]);

  // drilldown modal props
  const [modalOpen, setModalOpen] = useState(false);

  // rep details builder
  const buildRepDetail = (repName: string) => {
    const risk = repRisks.find(r => r.name === repName);
    const accounts = getAccountListForRep(repName);
    return { risk, accounts };
  };

  return (
    <div>
      <SectionHeader title="Churn & Risk Monitor" subtitle="Track at-risk accounts and reps — drive preventative coaching." />

      {/* Top KPIs */}
      <div className={css({ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px", marginBottom: "12px" })}>
        <div className={css({ background: "#fff", border: "1px solid #E8E8E8", padding: "12px 14px", borderRadius: 10 })}>
          <div style={{ fontSize: 11, color: "#666" }}>At-risk reps</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{repRisks.filter(r => r.score >= 50).length}</div>
        </div>

        <div className={css({ background: "#fff", border: "1px solid #E8E8E8", padding: "12px 14px", borderRadius: 10 })}>
          <div style={{ fontSize: 11, color: "#666" }}>Stale opps</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(teamKpis.stale)}</div>
        </div>

        <div className={css({ background: "#fff", border: "1px solid #E8E8E8", padding: "12px 14px", borderRadius: 10 })}>
          <div style={{ fontSize: 11, color: "#666" }}>CWnFT deals</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(teamKpis.totalCWnFT)}</div>
          <div style={{ fontSize: 11, color: "#999" }}>{safePct0(teamKpis.avgCWnFTpct)}% avg CWnFT</div>
        </div>

        <div className={css({ background: "#fff", border: "1px solid #E8E8E8", padding: "12px 14px", borderRadius: 10 })}>
          <div style={{ fontSize: 11, color: "#666" }}>Low activity reps</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{teamKpis.lowActivityReps}</div>
        </div>
      </div>

      {/* Risk leaderboard */}
      <div className={css({ background: "#fff", borderRadius: 10, border: "1px solid #E8E8E8", padding: "14px 16px", marginBottom: "14px" })}>
        <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 })}>
          <div style={{ fontWeight: 700 }}>Rep churn-risk leaderboard</div>
          <div style={{ fontSize: 12, color: "#666" }}>Sort by risk (high → low)</div>
        </div>

        <div className={css({ display: "grid", gap: 8 })}>
          {repRisks.slice(0, 10).map((r) => (
            <div key={r.name} className={css({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid #EEE", backgroundColor: r.score >= 70 ? "#FFF5F5" : r.score >= 50 ? "#FFFBEE" : "#FAFAFA" })}>
              <div style={{ width: 8, height: 40, background: r.score >= 70 ? "#B42318" : r.score >= 50 ? "#EA8600" : "#0A84FF", borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontWeight: 700 }}>{r.score}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, fontSize: 12, color: "#444" }}>
                  <div style={{ padding: "4px 8px", borderRadius: 999, background: "#EEF4FF", color: "#175CD3" }}>{r.primary}</div>
                  <div style={{ padding: "4px 8px", borderRadius: 999, background: "#F8F9FA" }}>{r.calls} calls</div>
                  <div style={{ padding: "4px 8px", borderRadius: 999, background: "#FFF9ED", color: "#B54708" }}>{r.stale} stale</div>
                  <div style={{ padding: "4px 8px", borderRadius: 999, background: "#FCE7F3", color: "#BE185D" }}>{safePct0(r.pctNFT)}% CWnFT</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => { setSelectedRep(r.name); setModalOpen(true); }}>
                  Inspect
                </Button>
                <Button size={SIZE.compact} kind={KIND.secondary} onClick={() => saveAssigned(r.name, "Call & confirm next steps")}>
                  Assign action
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* At-risk accounts (best-effort) */}
      <div className={css({ background: "#fff", borderRadius: 10, border: "1px solid #E8E8E8", padding: "14px 16px", marginBottom: "14px" })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>At-risk accounts (sample)</div>
          <div style={{ fontSize: 12, color: "#666" }}>Click an account to inspect / assign action</div>
        </div>

        {/* aggregate from known account data if available; otherwise show proxy rows */}
        <div style={{ display: "grid", gap: 8 }}>
          {repRisks.slice(0, 6).map((r) => {
            // try to get accounts for this rep
            const accounts = getAccountListForRep(r.name);
            if (accounts && accounts.length > 0) {
              return accounts.slice(0, 2).map((acct: any) => (
                <div key={r.name + acct.name} className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: "1px solid #EEE" })}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{acct.name}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{acct.stage || "Stage unknown"} · Owner {r.name}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => { setSelectedAlert({ title: acct.name, detail: `Owner: ${r.name}` }); }}>
                      Inspect
                    </Button>
                    <Button size={SIZE.compact} kind={KIND.secondary} onClick={() => saveAssigned(r.name, `Contact ${acct.name} - confirm live date`)}>
                      Assign
                    </Button>
                  </div>
                </div>
              ));
            }

            // fallback: show rep-level proxy row
            return (
              <div key={r.name} className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, border: "1px solid #EEE" })}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{r.stale} stale · {r.cwnftCount} CWnFT</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => { setSelectedRep(r.name); setModalOpen(true); }}>
                    Inspect
                  </Button>
                  <Button size={SIZE.compact} kind={KIND.secondary} onClick={() => saveAssigned(r.name, "Call accounts with stale pipeline")}>
                    Assign
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assigned actions quick view */}
      <div className={css({ background: "#fff", borderRadius: 10, border: "1px solid #E8E8E8", padding: "12px 14px", marginBottom: "14px" })}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Assigned actions</div>
        {Object.keys(assignedActions).length === 0 ? (
          <div style={{ color: "#666" }}>No assigned actions yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(assignedActions).map(([rep, arr]) => (
              <div key={rep} style={{ padding: 8, border: "1px solid #EEE", borderRadius: 8 }}>
                <div style={{ fontWeight: 700 }}>{rep}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {arr.map((a: any, i: number) => <div key={i}>• {a.action} <span style={{ color: "#999", fontSize: 11 }}>({new Date(a.date).toLocaleString()})</span></div>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rep detail modal */}
      {modalOpen && selectedRep && (() => {
        const detail = buildRepDetail(selectedRep);
        const r = detail.risk;
        return (
          <div onClick={() => { setModalOpen(false); setSelectedRep(null); }} className={css({ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 })}>
            <div onClick={(e) => e.stopPropagation()} className={css({ width: "min(920px, 100%)", maxHeight: "84vh", overflowY: "auto", backgroundColor: "#FFF", borderRadius: 12, padding: 18 })}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedRep}</div>
                  <div style={{ color: "#666", marginTop: 6 }}>Risk score: <b>{r.score}</b> · Primary driver: <b>{r.primary}</b></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size={SIZE.compact} kind={KIND.primary} onClick={() => saveAssigned(selectedRep, "Schedule urgent coaching")}>Assign coaching</Button>
                  <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => { setModalOpen(false); setSelectedRep(null); }}>Close</Button>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ background: "#FAFAFA", border: "1px solid #EEE", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Why this rep is at risk</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>Stale opps: <b>{r.stale}</b></li>
                    <li>CWnFT: <b>{r.cwnftCount} deals</b> ({safePct0(r.pctNFT)}%)</li>
                    <li>Recent calls: <b>{r.calls}</b> (drop {Math.round(r.callsDrop * 100)}%)</li>
                    <li>Attainment: <b>{safePct0(r.pctToQuota)}%</b> to quota</li>
                    <li>{r.isRamping ? "Rep is in ramp — focus on habits" : "Rep is post-ramp"}</li>
                  </ul>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12 }}>
                  <div style={{ background: "#FFF", border: "1px solid #EEE", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Suggested coaching plan (manager-ready)</div>
                    <div style={{ fontSize: 13, color: "#333" }}>
                      <div style={{ marginBottom: 8 }}>1) Immediate: call top 1–2 stalled accounts and confirm next step + owner.</div>
                      <div style={{ marginBottom: 8 }}>2) This week: enforce daily call blocks, require new opp creation of 3/wk, and review talk track on objections.</div>
                      <div style={{ marginBottom: 8 }}>3) Post-close: set a live-date expectation at close and add handoff checklist. Track changes next 7 days.</div>
                    </div>
                  </div>

                  <div style={{ background: "#FFF", border: "1px solid #EEE", padding: 12, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Accounts (if available)</div>
                    {detail.accounts.length === 0 ? (
                      <div style={{ color: "#666" }}>No account-level data wired. Wire `accountData` to show owned accounts.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {detail.accounts.map((a: any, i: number) => (
                          <div key={i} style={{ padding: 8, borderRadius: 6, border: "1px solid #EEE" }}>
                            <div style={{ fontWeight: 700 }}>{a.name}</div>
                            <div style={{ fontSize: 12, color: "#666" }}>{a.stage || "Stage unknown"} · {a.ageDays ? `${a.ageDays}d since last activity` : ""}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* small note about churn data wiring */}
      <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
        <b>Notes:</b> This page computes churn *risk* from pipeline, activity and CWnFT signals. If you have a canonical churn dataset (e.g., `churnEvents` table or `account_churn` sheet), we can replace the proxies with true churn & retention metrics, cohort charts, and LTV impact modeling.
      </div>
    </div>
  );
}
