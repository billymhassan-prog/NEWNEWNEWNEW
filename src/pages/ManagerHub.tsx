// FULL MANAGER HUB (WITH INTERACTIVE ALERTS)

import { useState, useCallback, useMemo } from "react";
import { useStyletron } from "baseui";
import { Button, SIZE, KIND } from "baseui/button";
import { Textarea } from "baseui/textarea";
import { SectionHeader } from "../components/SharedUI";
import {
  repAttainment,
  repPipeline,
  repL12DActivity,
  repCWnFT,
  teamCWnFT,
} from "../data/dashboardData";
import { buildManagerAdvisorMarkdown } from "../utils/localInsights";
import { loadTeamMembers } from "../utils/teamRoster";
import ReactMarkdown from "react-markdown";

type AlertMetric = "all" | "attainment" | "activity" | "pipeline" | "cwnft" | "ramp" | "other";

interface Alert {
  severity: "critical" | "warning" | "info";
  emoji: string;
  title: string;
  detail: string;
  rep?: string;
}

interface RepSignal {
  name: string;
  pct: number;
  gap: number;
  calls: number;
  stale: number;
  pctNFT: number;
  primary: string;
  secondary: string;
  score: number;
  isRamping: boolean;
}

const asNum = (v: any) => Number(v) || 0;
const safe = (v: any) => asNum(v).toFixed(0);
const fmt = (n: number) => Math.round(n).toLocaleString();
const first = (n: string) => n.split(" ")[0];

function getAlertMetric(alert: Alert): AlertMetric {
  const t = `${alert.title} ${alert.detail}`.toLowerCase();
  if (t.includes("quota")) return "attainment";
  if (t.includes("call")) return "activity";
  if (t.includes("stale") || t.includes("opp")) return "pipeline";
  if (t.includes("cwnft") || t.includes("live")) return "cwnft";
  if (t.includes("ramp")) return "ramp";
  return "other";
}

function buildActual() {
  const reps = repAttainment
    .filter((r) => asNum(r.quota) > 0)
    .map((r) => {
      const pts = asNum(r.currentPts);
      const quota = asNum(r.quota);
      const pct = quota > 0 ? (pts / quota) * 100 : 0;
      return {
        name: r.name,
        pct,
        gap: Math.max(quota - pts, 0),
        currentPts: pts,
        quota,
      };
    });

  const total = reps.reduce((s, r) => s + r.currentPts, 0);
  const quota = reps.reduce((s, r) => s + r.quota, 0);

  return {
    teamPct: quota > 0 ? (total / quota) * 100 : 0,
    gap: Math.max(quota - total, 0),
    reps,
  };
}

function buildSignals(teamMembers: any[]): RepSignal[] {
  return repAttainment
    .filter((r) => asNum(r.quota) > 0)
    .map((r) => {
      const pipeline = repPipeline.find((p) => p.name === r.name);
      const activity = repL12DActivity.find((a) => a.name === r.name);
      const cwnft = repCWnFT.find((c) => c.name === r.name);
      const member = teamMembers.find((m: any) => m.name === r.name);

      const pct = asNum(r.pctToQuota);
      const calls = asNum(activity?.totalCalls);
      const stale = asNum(pipeline?.outOfDate);
      const pctNFT = asNum(cwnft?.pctNFT);
      const isRamping = member?.status === "ramping";

      let primary = "Conversion";
      if (calls < 250) primary = "Activity";
      if (stale > 10) primary = "Pipeline";
      if (pctNFT > 10) primary = "Post-Close";
      if (isRamping) primary = "Ramp";

      return {
        name: r.name,
        pct,
        gap: asNum(r.quota) - asNum(r.currentPts),
        calls,
        stale,
        pctNFT,
        primary,
        secondary: "Follow-up",
        score: 100 - pct,
        isRamping,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function generateAlerts(): Alert[] {
  const alerts: Alert[] = [];

  repPipeline.forEach((r) => {
    if (asNum(r.outOfDate) > 10) {
      alerts.push({
        severity: "warning",
        emoji: "🗂️",
        title: `${first(r.name)} has ${r.outOfDate} stale opps`,
        detail: "Pipeline hygiene issue",
      });
    }
  });

  repL12DActivity.forEach((r) => {
    if (asNum(r.totalCalls) < 250) {
      alerts.push({
        severity: "warning",
        emoji: "📞",
        title: `${first(r.name)} low calls`,
        detail: `${r.totalCalls} calls`,
      });
    }
  });

  repCWnFT.forEach((r) => {
    if (asNum(r.pctNFT) > 10) {
      alerts.push({
        severity: "warning",
        emoji: "🔄",
        title: `${first(r.name)} CWnFT ${safe(r.pctNFT)}%`,
        detail: "Follow-through issue",
      });
    }
  });

  return alerts;
}

export default function ManagerHub() {
  const [css] = useStyletron();
  const [teamMembers] = useState(loadTeamMembers());
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [metric, setMetric] = useState<AlertMetric>("all");

  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  const actual = useMemo(() => buildActual(), []);
  const signals = useMemo(() => buildSignals(teamMembers), [teamMembers]);
  const alerts = useMemo(() => generateAlerts(), []);

  const filtered = metric === "all" ? alerts : alerts.filter((a) => getAlertMetric(a) === metric);

  const askAI = async (q: string) => {
    const res = buildManagerAdvisorMarkdown(q, { signals, alerts });
    setAiResponse(res);
  };

  return (
    <div>
      <SectionHeader title="Manager Hub" subtitle="Coaching cockpit" />

      {/* HERO */}
      <div className={css({ background: "#111827", color: "#fff", padding: 20, borderRadius: 12, marginBottom: 16 })}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>
          {signals[0]?.name} needs coaching first
        </div>
        <div style={{ opacity: 0.8 }}>
          {signals[0]?.primary} issue · {safe(signals[0]?.pct)}% to quota
        </div>
      </div>

      {/* KPI */}
      <div className={css({ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 })}>
        <div>Attainment {safe(actual.teamPct)}%</div>
        <div>Gap {fmt(actual.gap)}</div>
        <div>Alerts {alerts.length}</div>
        <div>Reps {signals.length}</div>
      </div>

      {/* ALERTS */}
      <div className={css({ marginBottom: 16 })}>
        <div style={{ fontWeight: 700 }}>Smart Alerts</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {["all", "attainment", "activity", "pipeline", "cwnft"].map((m) => (
            <button key={m} onClick={() => setMetric(m as any)}>
              {m}
            </button>
          ))}
        </div>

        {filtered.map((a, i) => (
          <div key={i} onClick={() => setSelectedAlert(a)} style={{ padding: 10, border: "1px solid #ddd", marginBottom: 6, cursor: "pointer" }}>
            {a.emoji} {a.title}
          </div>
        ))}
      </div>

      {/* AI */}
      <div style={{ marginBottom: 16 }}>
        <Textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} />
        <Button onClick={() => askAI(aiInput)}>Ask</Button>
        <ReactMarkdown>{aiResponse}</ReactMarkdown>
      </div>

      {/* DRILLDOWN */}
      {selectedAlert && (
        <div onClick={() => setSelectedAlert(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }}>
          <div style={{ background: "#fff", padding: 20, margin: 40 }}>
            <h3>{selectedAlert.title}</h3>
            <p>{selectedAlert.detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
