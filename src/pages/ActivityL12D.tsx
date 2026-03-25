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

interface Alert {
  severity: "critical" | "warning" | "info";
  emoji: string;
  title: string;
  detail: string;
  rep?: string;
}

interface RepSignal {
  name: string;
  currentPts: number;
  quota: number;
  pct: number;
  gap: number;
  calls: number;
  talkTime: number;
  openOpps: number;
  stale: number;
  createdLW: number;
  totalCW: number;
  cwnft: number;
  pctNFT: number;
  isRamping: boolean;
  primary: string;
  secondary: string;
  score: number;
}

interface CoachingTheme {
  title: string;
  why: string;
  actions: string[];
  focusRep?: string;
}

const asNum = (value: any) => Number(value) || 0;
const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);
const firstName = (fullName: string) => fullName.split(" ")[0] || fullName;
const fmt = (n: number) => Math.round(n).toLocaleString();
const safePct0 = (value: any) => asNum(value).toFixed(0);
const safePct1 = (value: any) => asNum(value).toFixed(1);

function getPrimaryCoachingArea(signal: {
  isRamping: boolean;
  pctNFT: number;
  stale: number;
  createdLW: number;
  calls: number;
  pct: number;
  openOpps: number;
}) {
  if (signal.isRamping) return "Ramp / New Hire";
  if (signal.pctNFT >= 15) return "Post-Close Follow Through";
  if (signal.stale >= 15 || signal.createdLW < 3) return "Pipeline Creation";
  if (signal.calls < 250) return "Activity";
  if (signal.pct < 80) return "Conversion / Quality";
  if (signal.openOpps < 5) return "Pipeline Coverage";
  return "Maintain / Scale";
}

function getSecondaryCoachingArea(
  primary: string,
  signal: { calls: number; pct: number; stale: number; pctNFT: number }
) {
  if (primary === "Pipeline Creation") return signal.calls < 250 ? "Activity" : "Pipeline Hygiene";
  if (primary === "Activity") return signal.pct < 80 ? "Conversion / Quality" : "Pipeline Creation";
  if (primary === "Post-Close Follow Through") return "Hygiene";
  if (primary === "Ramp / New Hire") return "Activity";
  if (signal.stale > 0) return "Pipeline Hygiene";
  if (signal.pctNFT > 0) return "Post-Close Follow Through";
  return "Attainment / Pace";
}

function buildActualAttainment() {
  const repRows = repAttainment
    .filter((r) => asNum(r.quota) > 0)
    .map((r) => {
      const currentPts = asNum(r.currentPts);
      const quota = asNum(r.quota);
      const pctToQuota = asNum(r.pctToQuota) || pct(currentPts, quota);
      return {
        name: r.name,
        currentPts,
        quota,
        pctToQuota,
        gap: Math.max(quota - currentPts, 0),
        reqPtsPerWk: asNum(r.reqPtsPerWk),
        extraPointsNeeded: asNum(r.extraPointsNeeded),
      };
    })
    .sort((a, b) => a.pctToQuota - b.pctToQuota);

  const teamCurrent = repRows.reduce((sum, r) => sum + r.currentPts, 0);
  const teamQuota = repRows.reduce((sum, r) => sum + r.quota, 0);

  return {
    teamCurrent,
    teamQuota,
    teamPct: pct(teamCurrent, teamQuota),
    gap: Math.max(teamQuota - teamCurrent, 0),
    repRows,
  };
}

function buildRepSignals(teamMembers: any[]): RepSignal[] {
  const memberMap = new Map(teamMembers.map((m: any) => [m.name, m]));

  return repAttainment
    .filter((r) => asNum(r.quota) > 0)
    .map((r) => {
      const pipeline = repPipeline.find((p) => p.name === r.name);
      const activity = repL12DActivity.find((a) => a.name === r.name);
      const cwnft = repCWnFT.find((c) => c.name === r.name);
      const member = memberMap.get(r.name);

      const currentPts = asNum(r.currentPts);
      const quota = asNum(r.quota);
      const pctToQuota = asNum(r.pctToQuota) || pct(currentPts, quota);
      const calls = asNum(activity?.totalCalls);
      const talkTime = asNum(activity?.talkTime);
      const openOpps = asNum(pipeline?.totalOpen);
      const stale = asNum(pipeline?.outOfDate);
      const createdLW = asNum(pipeline?.createdLW);
      const totalCW = asNum(cwnft?.totalCW);
      const cwnftCount = asNum(cwnft?.cwnft);
      const pctNFT = asNum(cwnft?.pctNFT);
      const isRamping = member?.status === "ramping";

      const primary = getPrimaryCoachingArea({
        isRamping,
        pctNFT,
        stale,
        createdLW,
        calls,
        pct: pctToQuota,
        openOpps,
      });
      const secondary = getSecondaryCoachingArea(primary, { calls, pct: pctToQuota, stale, pctNFT });

      let score = 0;
      if (pctToQuota < 60) score += 5;
      else if (pctToQuota < 80) score += 3;
      else if (pctToQuota < 90) score += 1;

      if (calls < 250) score += 2;
      if (stale >= 10) score += 2;
      if (stale >= 20) score += 2;
      if (createdLW < 3) score += 1;
      if (pctNFT >= 15) score += 2;
      if (isRamping) score += 1;
      if (openOpps < 5 && pctToQuota < 100) score += 1;

      return {
        name: r.name,
        currentPts,
        quota,
        pct: pctToQuota,
        gap: Math.max(quota - currentPts, 0),
        calls,
        talkTime,
        openOpps,
        stale,
        createdLW,
        totalCW,
        cwnft: cwnftCount,
        pctNFT,
        isRamping,
        primary,
        secondary,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildCoachingThemes(signals: RepSignal[], teamActual: ReturnType<typeof buildActualAttainment>) {
  const themes: CoachingTheme[] = [];

  const lowAttainment = signals.filter((s) => s.pct < 80).slice(0, 3);
  const lowActivity = signals.filter((s) => s.calls < 250).slice(0, 3);
  const pipelineRisk = signals.filter((s) => s.stale >= 10 || s.createdLW < 3).slice(0, 3);
  const postCloseRisk = signals.filter((s) => s.pctNFT >= 10).slice(0, 3);

  if (teamActual.teamPct < 100) {
    themes.push({
      title: "Close the Q1 attainment gap",
      why: `Team is at ${safePct0(teamActual.teamPct)}% to quota and short ${fmt(teamActual.gap)} points.`,
      actions: [
        `Coach ${lowAttainment.map((r) => firstName(r.name)).join(", ") || "the bottom cohort"} first.`,
        "Tie each rep to a weekly points target and one concrete deal move.",
        "Use the top 1–2 stalled opportunities to create immediate point movement.",
      ],
      focusRep: lowAttainment[0]?.name,
    });
  }

  if (pipelineRisk.length > 0 || repPipeline.reduce((s, r) => s + asNum(r.outOfDate), 0) >= 20) {
    themes.push({
      title: "Fix pipeline creation and hygiene",
      why: `${repPipeline.reduce((s, r) => s + asNum(r.outOfDate), 0)} stale opps and weak recent creation are slowing momentum.`,
      actions: [
        `Run a hygiene cleanup with ${pipelineRisk.map((r) => firstName(r.name)).join(", ") || "the team"} today.`,
        "Require a next step, date, and owner on every open opportunity.",
        "Coach reps to create new opps before old ones go stale.",
      ],
      focusRep: pipelineRisk[0]?.name,
    });
  }

  if ((asNum(teamCWnFT.pctNFT) || 0) >= 10 || postCloseRisk.length > 0) {
    themes.push({
      title: "Tighten post-close follow-through",
      why: `${asNum(teamCWnFT.cwnft)} deals are closed but not yet live (${safePct0(teamCWnFT.pctNFT)}% CWnFT rate).`,
      actions: [
        `Review post-close handoff with ${postCloseRisk.map((r) => firstName(r.name)).join(", ") || "the reps with open CWs"}.`,
        "Set a same-week live date expectation on every new close.",
        "Make post-close ownership part of the closing checklist.",
      ],
      focusRep: postCloseRisk[0]?.name,
    });
  }

  if (lowActivity.length > 0) {
    themes.push({
      title: "Raise activity where volume is light",
      why: "Some reps are below the activity floor and need a stronger habit plan.",
      actions: [
        `Coach ${lowActivity.map((r) => firstName(r.name)).join(", ")} on daily call blocks and talk track discipline.`,
        "Use a daily activity target for the lowest-volume reps.",
        "Check whether the issue is effort, scheduling, or confidence.",
      ],
      focusRep: lowActivity[0]?.name,
    });
  }

  if (themes.length === 0) {
    themes.push({
      title: "Protect the current pace",
      why: "The team is not flashing major structural risk, so focus on consistency and maintaining current momentum.",
      actions: [
        "Keep the top reps honest on conversion and hygiene.",
        "Use weekly reviews to prevent pipeline drift.",
        "Continue reinforcing the behaviors that are already working.",
      ],
    });
  }

  return themes.slice(0, 4);
}

function generateAlerts(teamMembers: any[]): Alert[] {
  const alerts: Alert[] = [];

  repL12DActivity.forEach((r) => {
    const recentCalls = r.calls.slice(-3).reduce((s, c) => s + c, 0);
    const priorCalls = r.calls.slice(-6, -3).reduce((s, c) => s + c, 0);
    if (priorCalls > 0 && recentCalls < priorCalls * 0.5) {
      alerts.push({
        severity: "critical",
        emoji: "📉",
        title: `${firstName(r.name)} activity dropped ${Math.round((1 - recentCalls / priorCalls) * 100)}%`,
        detail: `Last 3 days: ${recentCalls} calls vs prior 3 days: ${priorCalls} calls`,
        rep: r.name,
      });
    }
    if (asNum(r.totalCalls) < 250) {
      alerts.push({
        severity: "warning",
        emoji: "📞",
        title: `${firstName(r.name)} low call volume (${r.totalCalls} L12D)`,
        detail: "Below 250 calls in the last 12 days.",
        rep: r.name,
      });
    }
  });

  repPipeline.forEach((r) => {
    if (asNum(r.outOfDate) >= 20) {
      alerts.push({
        severity: "critical",
        emoji: "🗂️",
        title: `${firstName(r.name)} has ${r.outOfDate} stale opps`,
        detail: `${r.totalOpen > 0 ? ((asNum(r.outOfDate) / asNum(r.totalOpen)) * 100).toFixed(0) : 0}% of pipeline is out-of-date`,
        rep: r.name,
      });
    } else if (asNum(r.outOfDate) >= 10) {
      alerts.push({
        severity: "warning",
        emoji: "🗂️",
        title: `${firstName(r.name)} has ${r.outOfDate} stale opps`,
        detail: "Pipeline cleanup needed this week.",
        rep: r.name,
      });
    }
    if (asNum(r.createdLW) < 3) {
      alerts.push({
        severity: "warning",
        emoji: "🔻",
        title: `${firstName(r.name)} only created ${r.createdLW} opps last week`,
        detail: "Pipeline creation velocity is low.",
        rep: r.name,
      });
    }
  });

  repAttainment
    .filter((r) => asNum(r.quota) > 0)
    .forEach((r) => {
      const p = asNum(r.pctToQuota) || pct(asNum(r.currentPts), asNum(r.quota));
      if (p < 60) {
        alerts.push({
          severity: "critical",
          emoji: "🚨",
          title: `${firstName(r.name)} at ${safePct0(p)}% to quota`,
          detail: `Needs ${asNum(r.extraPointsNeeded)} more pts.`,
          rep: r.name,
        });
      }
    });

  repCWnFT.forEach((r) => {
    if (asNum(r.pctNFT) >= 15) {
      alerts.push({
        severity: "warning",
        emoji: "🔄",
        title: `${firstName(r.name)} CWnFT at ${safePct0(r.pctNFT)}%`,
        detail: `${asNum(r.cwnft)} of ${asNum(r.totalCW)} deals not yet live.`,
        rep: r.name,
      });
    }
  });

  teamMembers.forEach((m) => {
    if (m.status === "ramping") {
      const days = Math.floor((Date.now() - new Date(m.start_date).getTime()) / (1000 * 60 * 60 * 24));
      if (days > 180) {
        alerts.push({
          severity: "warning",
          emoji: "🐢",
          title: `${firstName(m.name)} still ramping after ${Math.round(days / 30)} months`,
          detail: "Review the ramp plan and expectations.",
          rep: m.name,
        });
      }
      if (days < 60) {
        alerts.push({
          severity: "info",
          emoji: "🌱",
          title: `${firstName(m.name)} is ${days} days into ramp`,
          detail: "Focus on activity habits, shadow calls, and product depth.",
          rep: m.name,
        });
      }
    }
  });

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

const severityStyles = {
  critical: { bg: "#FFF4F4", border: "#FFD5D5", color: "#B42318", badge: "#E11900" },
  warning: { bg: "#FFF9ED", border: "#FFE2A8", color: "#B54708", badge: "#EA8600" },
  info: { bg: "#F2F7FF", border: "#D6E4FF", color: "#175CD3", badge: "#276EF1" },
};

export default function ManagerHub() {
  const [css] = useStyletron();
  const [teamMembers] = useState<any[]>(() => loadTeamMembers());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("dismissed-alerts");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const teamActual = useMemo(() => buildActualAttainment(), []);
  const repSignals = useMemo(() => buildRepSignals(teamMembers), [teamMembers]);
  const coachingThemes = useMemo(() => buildCoachingThemes(repSignals, teamActual), [repSignals, teamActual]);

  const teamHealth = useMemo(() => {
    const calls = repL12DActivity.reduce((sum, r) => sum + asNum(r.totalCalls), 0);
    const talkTime = repL12DActivity.reduce((sum, r) => sum + asNum(r.talkTime), 0);
    const openOpps = repPipeline.reduce((sum, r) => sum + asNum(r.totalOpen), 0);
    const staleOpps = repPipeline.reduce((sum, r) => sum + asNum(r.outOfDate), 0);
    const createdLW = repPipeline.reduce((sum, r) => sum + asNum(r.createdLW), 0);
    const teamCwnftRate = asNum(teamCWnFT.pctNFT);
    const teamCwnftCount = asNum(teamCWnFT.cwnft);
    const teamCW = asNum(teamCWnFT.totalCW);
    return {
      calls,
      talkTime,
      openOpps,
      staleOpps,
      createdLW,
      teamCwnftRate,
      teamCwnftCount,
      teamCW,
    };
  }, []);

  const alerts = useMemo(() => generateAlerts(teamMembers), [teamMembers]);
  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.title));
  const alertPreview = showAllAlerts ? visibleAlerts : visibleAlerts.slice(0, 3);

  const topPriorityRep = repSignals[0];
  const topTheme = coachingThemes[0];

  const summaryCards = useMemo(
    () => [
      {
        label: "Q1 Attainment",
        value: `${safePct0(teamActual.teamPct)}%`,
        tone: teamActual.teamPct >= 100 ? "#05944F" : teamActual.teamPct >= 90 ? "#B54708" : "#B42318",
      },
      { label: "Gap to Quota", value: fmt(teamActual.gap), tone: teamActual.gap === 0 ? "#05944F" : "#B42318" },
      { label: "L12D Calls", value: fmt(teamHealth.calls) },
      {
        label: "Stale Opps",
        value: fmt(teamHealth.staleOpps),
        tone: teamHealth.staleOpps >= 20 ? "#B42318" : teamHealth.staleOpps >= 10 ? "#B54708" : "#333",
      },
      {
        label: "CWnFT Rate",
        value: `${safePct0(teamHealth.teamCwnftRate)}%`,
        tone: teamHealth.teamCwnftRate >= 15 ? "#B42318" : teamHealth.teamCwnftRate >= 10 ? "#B54708" : "#05944F",
      },
    ],
    [teamActual, teamHealth]
  );

  const dismissAlert = (title: string) => {
    const next = new Set(dismissedAlerts);
    next.add(title);
    setDismissedAlerts(next);
    localStorage.setItem("dismissed-alerts", JSON.stringify([...next]));
  };

  const askAI = useCallback(
    async (question?: string) => {
      const prompt = question || aiInput;
      if (!prompt.trim()) return;

      setAiLoading(true);
      setAiResponse("");
      setAiError("");

      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const response = buildManagerAdvisorMarkdown(prompt, {
          teamMembers,
          alerts: visibleAlerts.slice(0, 8),
          teamActual,
          teamHealth,
          repSignals,
          coachingThemes,
        });
        setAiResponse(response);
      } catch (e: any) {
        setAiError(e?.message || "Request failed");
      } finally {
        setAiLoading(false);
      }
    },
    [aiInput, teamMembers, visibleAlerts, teamActual, teamHealth, repSignals, coachingThemes]
  );

  const runPrompt = (prompt: string) => {
    setAiInput(prompt);
    askAI(prompt);
  };

  const quickPrompts = useMemo(() => {
    const prompts: { label: string; prompt: string; urgent?: boolean }[] = [];

    prompts.push({
      label: "🧭 Generate coaching themes",
      prompt:
        "Using the current team data, generate 3 coaching themes and the 5 most important action items for this week. Be direct, specific, and manager-ready.",
      urgent: true,
    });

    if (topPriorityRep) {
      prompts.push({
        label: `🎯 Coach ${firstName(topPriorityRep.name)} first`,
        prompt: `Coach ${topPriorityRep.name}. Their primary issue is ${topPriorityRep.primary} and their secondary issue is ${topPriorityRep.secondary}. They are at ${safePct0(
          topPriorityRep.pct
        )}% to quota, have ${topPriorityRep.calls} calls, ${topPriorityRep.stale} stale opps, and ${safePct0(topPriorityRep.pctNFT)}% CWnFT. Give me 3 coaching actions and a short talk track.`,
        urgent: true,
      });
    }

    prompts.push({
      label: "📋 Build team action plan",
      prompt:
        "Turn the team's current situation into a practical action plan for this week. Break it into today, this week, and coaching follow-up. Focus on attainment, pipeline, and follow-through.",
    });

    prompts.push({
      label: "📈 What should I coach today?",
      prompt:
        "Based on the current data, tell me what I should coach today, who I should coach first, and what the expected business impact is.",
    });

    if (teamActual.teamPct < 100) {
      prompts.push({
        label: "⚡ Close the quota gap",
        prompt: `We are at ${safePct0(teamActual.teamPct)}% to quota and short ${fmt(teamActual.gap)} points. Give me a tactical plan to close the gap with the fewest high-confidence actions.`,
        urgent: true,
      });
    }

    if (teamHealth.teamCwnftRate >= 10) {
      prompts.push({
        label: `🔄 Fix CWnFT`,
        prompt: `Our CWnFT rate is ${safePct0(teamHealth.teamCwnftRate)}% with ${teamHealth.teamCwnftCount} deals not yet live. What are the best coaching actions to improve post-close follow-through?`,
      });
    }

    return prompts.slice(0, 5);
  }, [teamActual, teamHealth, topPriorityRep]);

  const actionItems = coachingThemes.flatMap((theme) => theme.actions).slice(0, 5);

  return (
    <div>
      <SectionHeader title="Manager Hub" subtitle="A compact coaching cockpit for insights, priorities, and action planning." />

      {/* Today banner */}
      <div
        className={css({
          backgroundColor: "#0B1220",
          color: "#FFF",
          borderRadius: "12px",
          padding: "18px 20px",
          marginBottom: "16px",
          border: "1px solid #13213A",
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        })}
      >
        <div>
          <div className={css({ fontSize: "11px", opacity: 0.75, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" })}>
            Today’s focus
          </div>
          <div className={css({ fontSize: "18px", fontFamily: "UberMove", fontWeight: 700, marginBottom: "6px" })}>
            {topTheme?.title || "Coach the biggest business risk first"}
          </div>
          <div className={css({ fontSize: "13px", lineHeight: "1.5", opacity: 0.9, maxWidth: "760px" })}>
            {topTheme?.why || "Use this tab to decide who to coach, what to coach, and what actions to assign."}
          </div>
        </div>

        <div className={css({ display: "flex", gap: "8px", flexWrap: "wrap" })}>
          <button
            onClick={() => runPrompt("Generate 3 coaching themes and 5 specific action items for this week.")}
            className={css({
              border: "none",
              backgroundColor: "#276EF1",
              color: "#FFF",
              padding: "10px 14px",
              borderRadius: "8px",
              fontFamily: "UberMoveText",
              fontWeight: 700,
              cursor: "pointer",
            })}
          >
            Generate coaching themes
          </button>
          <button
            onClick={() =>
              runPrompt(
                `Build a manager action plan from the current team data. Include who to coach first, what to say, and the 3 highest leverage actions for this week.`
              )
            }
            className={css({
              border: "1px solid #334155",
              backgroundColor: "transparent",
              color: "#FFF",
              padding: "10px 14px",
              borderRadius: "8px",
              fontFamily: "UberMoveText",
              fontWeight: 700,
              cursor: "pointer",
            })}
          >
            Build action plan
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        })}
      >
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className={css({
              backgroundColor: "#FFF",
              border: "1px solid #E8E8E8",
              borderRadius: "10px",
              padding: "14px 15px",
            })}
          >
            <div className={css({ fontSize: "11px", fontFamily: "UberMoveText", color: "#888", marginBottom: "6px" })}>{card.label}</div>
            <div className={css({ fontSize: "23px", fontFamily: "UberMove", fontWeight: 700, color: card.tone || "#111" })}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Compact alerts */}
      <div
        className={css({
          backgroundColor: "#FFF",
          borderRadius: "10px",
          border: "1px solid #E8E8E8",
          padding: "14px 16px",
          marginBottom: "16px",
        })}
      >
        <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "10px" })}>
          <div className={css({ fontFamily: "UberMove", fontWeight: 700, fontSize: "15px" })}>
            🔔 Smart Alerts
            <span className={css({ marginLeft: "8px", fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "999px", backgroundColor: "#F1F5F9", color: "#334155" })}>
              {visibleAlerts.length} active
            </span>
          </div>
          <div className={css({ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" })}>
            <span className={css({ fontSize: "11px", padding: "3px 8px", borderRadius: "999px", backgroundColor: "#FFF4F4", color: "#B42318" })}>
              {visibleAlerts.filter((a) => a.severity === "critical").length} critical
            </span>
            <span className={css({ fontSize: "11px", padding: "3px 8px", borderRadius: "999px", backgroundColor: "#FFF9ED", color: "#B54708" })}>
              {visibleAlerts.filter((a) => a.severity === "warning").length} warnings
            </span>
            <span className={css({ fontSize: "11px", padding: "3px 8px", borderRadius: "999px", backgroundColor: "#F2F7FF", color: "#175CD3" })}>
              {visibleAlerts.filter((a) => a.severity === "info").length} info
            </span>
            {dismissedAlerts.size > 0 && (
              <button
                onClick={() => {
                  setDismissedAlerts(new Set());
                  localStorage.removeItem("dismissed-alerts");
                }}
                className={css({
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "11px",
                  color: "#666",
                  cursor: "pointer",
                  fontFamily: "UberMoveText",
                })}
              >
                Reset dismissed
              </button>
            )}
          </div>
        </div>

        {alertPreview.length === 0 ? (
          <div className={css({ textAlign: "center", padding: "10px", color: "#666", fontSize: "13px", fontFamily: "UberMoveText" })}>
            ✅ No active alerts. Team looks stable.
          </div>
        ) : (
          <div className={css({ display: "grid", gap: "8px" })}>
            {alertPreview.map((alert, i) => {
              const s = severityStyles[alert.severity];
              return (
                <div
                  key={i}
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    backgroundColor: s.bg,
                    border: `1px solid ${s.border}`,
                  })}
                >
                  <span className={css({ fontSize: "15px" })}>{alert.emoji}</span>
                  <span
                    className={css({
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: s.badge,
                      color: "#FFF",
                      textTransform: "uppercase",
                    })}
                  >
                    {alert.severity}
                  </span>
                  <div className={css({ flex: 1, minWidth: 0 })}>
                    <div className={css({ fontSize: "13px", fontFamily: "UberMoveText", fontWeight: 700, color: s.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
                      {alert.title}
                    </div>
                    <div className={css({ fontSize: "11px", fontFamily: "UberMoveText", color: "#666", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
                      {alert.detail}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.title)}
                    className={css({
                      border: "none",
                      backgroundColor: "transparent",
                      color: "#999",
                      cursor: "pointer",
                      fontSize: "18px",
                      lineHeight: 1,
                    })}
                    aria-label="Dismiss alert"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {visibleAlerts.length > 3 && (
          <button
            onClick={() => setShowAllAlerts((v) => !v)}
            className={css({
              marginTop: "10px",
              border: "none",
              backgroundColor: "transparent",
              color: "#276EF1",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "UberMoveText",
              fontWeight: 600,
            })}
          >
            {showAllAlerts ? "Show fewer alerts" : `Show all ${visibleAlerts.length} alerts`}
          </button>
        )}
      </div>

      {/* Main two-column area */}
      <div
        className={css({
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: "16px",
          alignItems: "start",
          marginBottom: "16px",
        })}
      >
        {/* Attainment + coaching queue */}
        <div
          className={css({
            display: "grid",
            gap: "16px",
          })}
        >
          <div
            className={css({
              backgroundColor: "#FFF",
              borderRadius: "10px",
              border: "1px solid #E8E8E8",
              padding: "16px",
            })}
          >
            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "8px" })}>
              <div>
                <div className={css({ fontFamily: "UberMove", fontWeight: 700, fontSize: "16px" })}>📈 Q1 Attainment & Pace</div>
                <div className={css({ fontSize: "12px", color: "#777", fontFamily: "UberMoveText", marginTop: "2px" })}>
                  Tracking actual attainment from the Q1 tab.
                </div>
              </div>
              <div
                className={css({
                  padding: "7px 10px",
                  borderRadius: "8px",
                  backgroundColor: teamActual.teamPct >= 100 ? "#E6F4EA" : teamActual.teamPct >= 90 ? "#FFF9ED" : "#FFF4F4",
                  color: teamActual.teamPct >= 100 ? "#05944F" : teamActual.teamPct >= 90 ? "#B54708" : "#B42318",
                  fontSize: "12px",
                  fontFamily: "UberMoveText",
                  fontWeight: 700,
                })}
              >
                {safePct0(teamActual.teamPct)}% to quota
              </div>
            </div>

            <div className={css({ display: "grid", gap: "8px" })}>
              {teamActual.repRows.slice(0, 6).map((r) => (
                <button
                  key={r.name}
                  onClick={() =>
                    runPrompt(
                      `Coach ${r.name}. They are at ${safePct0(r.pctToQuota)}% to quota, gap ${fmt(r.gap)} points, and need ${fmt(
                        r.extraPointsNeeded
                      )} more points. Build a manager-ready coaching plan with talk track, actions, and what I should inspect next.`
                    )
                  }
                  className={css({
                    width: "100%",
                    textAlign: "left",
                    padding: "11px 12px",
                    borderRadius: "8px",
                    border: "1px solid #E8E8E8",
                    backgroundColor: "#FAFAFA",
                    cursor: "pointer",
                    ":hover": { backgroundColor: "#F7F9FC", borderColor: "#D6E4FF" },
                  })}
                >
                  <div className={css({ display: "flex", alignItems: "center", gap: "10px", marginBottom: "5px" })}>
                    <span className={css({ fontFamily: "UberMoveText", fontWeight: 700, fontSize: "13px", width: "148px" })}>{r.name}</span>
                    <div className={css({ flex: 1, height: "7px", backgroundColor: "#E8E8E8", borderRadius: "999px", overflow: "hidden" })}>
                      <div
                        className={css({
                          height: "100%",
                          width: `${Math.min(r.pctToQuota, 100)}%`,
                          borderRadius: "999px",
                          backgroundColor: r.pctToQuota >= 100 ? "#05944F" : r.pctToQuota >= 90 ? "#EA8600" : "#E11900",
                        })}
                      />
                    </div>
                    <span className={css({ width: "52px", textAlign: "right", fontSize: "12px", fontFamily: "UberMoveText", fontWeight: 700, color: r.pctToQuota >= 100 ? "#05944F" : "#E11900" })}>
                      {safePct0(r.pctToQuota)}%
                    </span>
                    <span className={css({ width: "82px", textAlign: "right", fontSize: "11px", fontFamily: "UberMoveText", color: "#666" })}>
                      {fmt(r.currentPts)}/{fmt(r.quota)}
                    </span>
                  </div>
                  <div className={css({ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" })}>
                    <div className={css({ fontSize: "11px", color: "#666", fontFamily: "UberMoveText" })}>
                      Gap: <b>{fmt(r.gap)}</b> pts · Req/wk: <b>{r.reqPtsPerWk ? safePct1(r.reqPtsPerWk) : "—"}</b>
                    </div>
                    <div className={css({ display: "flex", gap: "6px", flexWrap: "wrap" })}>
                      <span className={css({ fontSize: "10px", padding: "3px 7px", borderRadius: "999px", backgroundColor: "#E8F0FE", color: "#175CD3" })}>
                        {r.currentPts === 0 ? "Ramp" : "Active"}
                      </span>
                      <span className={css({ fontSize: "10px", padding: "3px 7px", borderRadius: "999px", backgroundColor: "#F1F5F9", color: "#334155" })}>
                        {r.calls} calls
                      </span>
                      <span className={css({ fontSize: "10px", padding: "3px 7px", borderRadius: "999px", backgroundColor: "#FFF9ED", color: "#B54708" })}>
                        {r.stale} stale
                      </span>
                      <span className={css({ fontSize: "10px", padding: "3px 7px", borderRadius: "999px", backgroundColor: "#FCE7F3", color: "#BE185D" })}>
                        {safePct0(r.pctNFT)}% CWnFT
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className={css({
              backgroundColor: "#FFF",
              borderRadius: "10px",
              border: "1px solid #E8E8E8",
              padding: "16px",
            })}
          >
            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "8px" })}>
              <div className={css({ fontFamily: "UberMove", fontWeight: 700, fontSize: "16px" })}>🚦 Priority coaching queue</div>
              <div className={css({ fontSize: "12px", color: "#777", fontFamily: "UberMoveText" })}>Who to coach first and why.</div>
            </div>

            <div className={css({ display: "grid", gap: "8px" })}>
              {repSignals.slice(0, 4).map((rep, idx) => (
                <div
                  key={rep.name}
                  className={css({
                    display: "grid",
                    gridTemplateColumns: "150px minmax(0, 1fr) 148px",
                    gap: "10px",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #E8E8E8",
                    backgroundColor: idx === 0 ? "#FFF9ED" : "#FAFAFA",
                  })}
                >
                  <div>
                    <div className={css({ fontFamily: "UberMove", fontWeight: 700, fontSize: "13px", marginBottom: "3px" })}>{rep.name}</div>
                    <div className={css({ fontSize: "11px", color: "#666", fontFamily: "UberMoveText" })}>
                      {safePct0(rep.pct)}% to quota · {fmt(rep.gap)} gap
                    </div>
                  </div>

                  <div className={css({ display: "grid", gap: "5px" })}>
                    <div className={css({ display: "flex", gap: "6px", flexWrap: "wrap" })}>
                      <span className={css({ fontSize: "10px", padding: "3px 7px", borderRadius: "999px", backgroundColor: "#E8F0FE", color: "#175CD3" })}>
                        {rep.primary}
                      </span>
                      <span className={css({ fontSize: "10px", padding: "3px 7px", borderRadius: "999px", backgroundColor: "#F1F5F9", color: "#334155" })}>
                        {rep.secondary}
                      </span>
                    </div>
                    <div className={css({ fontSize: "12px", color: "#333", fontFamily: "UberMoveText", lineHeight: 1.45 })}>
                      <b>Next:</b>{" "}
                      {rep.primary === "Pipeline Creation"
                        ? "Create new opps and clean stale ones."
                        : rep.primary === "Post-Close Follow Through"
                          ? "Set a live date and force ownership."
                          : rep.primary === "Activity"
                            ? "Increase call volume and sharpen the talk track."
                            : rep.primary === "Ramp / New Hire"
                              ? "Reinforce daily habits and shadowing."
                              : "Improve deal quality and move next steps."}
                    </div>
                  </div>

                  <div className={css({ display: "flex", justifyContent: "flex-end" })}>
                    <Button
                      size={SIZE.compact}
                      kind={KIND.secondary}
                      onClick={() =>
                        runPrompt(
                          `Coach ${rep.name}. Primary issue: ${rep.primary}. Secondary issue: ${rep.secondary}. They are at ${safePct0(
                            rep.pct
                          )}% to quota, have ${rep.calls} calls, ${rep.stale} stale opps, and ${safePct0(rep.pctNFT)}% CWnFT. Give me 3 action items and a short talk track.`
                        )
                      }
                    >
                      Coach with AI
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className={css({ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #E8E8E8" })}>
              <div className={css({ fontFamily: "UberMoveText", fontWeight: 700, fontSize: "12px", color: "#666", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" })}>
                Team action items
              </div>
              <div className={css({ display: "grid", gap: "8px" })}>
                {actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={css({
                      padding: "9px 11px",
                      borderRadius: "8px",
                      backgroundColor: "#F8F9FA",
                      border: "1px solid #E8E8E8",
                      fontSize: "12px",
                      fontFamily: "UberMoveText",
                      color: "#333",
                    })}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI coach panel */}
        <div className={css({ display: "grid", gap: "16px" })}>
          <div
            className={css({
              backgroundColor: "#FFF",
              borderRadius: "10px",
              border: "1px solid #E8E8E8",
              padding: "16px",
            })}
          >
            <div className={css({ fontFamily: "UberMove", fontWeight: 700, fontSize: "16px", marginBottom: "4px" })}>🤖 AI Manager Coach</div>
            <div className={css({ fontSize: "12px", color: "#777", fontFamily: "UberMoveText", marginBottom: "12px" })}>
              Generate coaching themes, action plans, and talk tracks.
            </div>

            <div className={css({ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" })}>
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => runPrompt(qp.prompt)}
                  className={css({
                    padding: "7px 10px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontFamily: "UberMoveText",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: `1px solid ${qp.urgent ? "#FFD5D5" : "#E8E8E8"}`,
                    backgroundColor: qp.urgent ? "#FFF4F4" : "#FAFAFA",
                    color: "#222",
                  })}
                >
                  {qp.label}
                </button>
              ))}
            </div>

            <div className={css({ display: "flex", gap: "8px", marginBottom: "12px" })}>
              <div className={css({ flex: 1 })}>
                <Textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask for themes, actions, or talk tracks..."
                  overrides={{
                    Input: {
                      style: {
                        fontSize: "13px",
                        minHeight: "72px",
                        fontFamily: "UberMoveText",
                      },
                    },
                  }}
                />
              </div>
              <Button size={SIZE.compact} kind={KIND.primary} onClick={() => askAI()} disabled={aiLoading || !aiInput.trim()}>
                {aiLoading ? "..." : "Ask"}
              </Button>
            </div>

            {aiError && (
              <div className={css({ color: "#B42318", fontSize: "12px", fontFamily: "UberMoveText", marginBottom: "8px" })}>{aiError}</div>
            )}

            {aiResponse ? (
              <div
                className={css({
                  fontSize: "13px",
                  fontFamily: "UberMoveText",
                  lineHeight: "1.7",
                  color: "#333",
                  backgroundColor: "#F8F9FA",
                  borderRadius: "10px",
                  padding: "14px",
                })}
              >
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            ) : (
              <div
                className={css({
                  fontSize: "13px",
                  fontFamily: "UberMoveText",
                  lineHeight: "1.7",
                  color: "#666",
                  backgroundColor: "#F8F9FA",
                  borderRadius: "10px",
                  padding: "14px",
                })}
              >
                Ask the coach to turn the team data into themes and a concrete action plan.
              </div>
            )}
          </div>

          <div
            className={css({
              backgroundColor: "#FFF",
              borderRadius: "10px",
              border: "1px solid #E8E8E8",
              padding: "16px",
            })}
          >
            <div className={css({ fontFamily: "UberMove", fontWeight: 700, fontSize: "15px", marginBottom: "8px" })}>What this hub should answer</div>
            <div className={css({ display: "grid", gap: "8px" })}>
              {[
                "Who needs coaching first?",
                "Why are they behind?",
                "What action items should I assign today?",
                "What is the team theme this week?",
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={css({
                    padding: "10px 11px",
                    borderRadius: "8px",
                    border: "1px solid #E8E8E8",
                    backgroundColor: "#FAFAFA",
                    fontSize: "12px",
                    fontFamily: "UberMoveText",
                    color: "#333",
                  })}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
