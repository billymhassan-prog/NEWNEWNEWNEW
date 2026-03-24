import {
  REPS,
  RepName,
  repAttainment,
  repPipeline,
  repL12DActivity,
  repNDG,
  repCWnFT,
  repCoaching,
  teamNDG,
  teamCWnFT,
  teamInsights,
  weeklyPacing,
  repWeeklyFTPoints,
} from "../data/dashboardData";
import { DEFAULT_TEAM_MEMBERS, TeamMember } from "./teamRoster";

const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
const short = (name: string) => name.split(" ")[0];
const num = (value: number) => value.toLocaleString();
const sortDesc = <T,>(arr: T[], get: (item: T) => number) => [...arr].sort((a, b) => get(b) - get(a));

function safeFirst<T>(arr: T[], fallback?: T): T | undefined {
  return arr.length > 0 ? arr[0] : fallback;
}

function getTeamTotals() {
  const teamTotal = repAttainment.reduce((sum, rep) => sum + rep.currentPts, 0);
  const teamQuota = repAttainment.reduce((sum, rep) => sum + rep.quota, 0);
  const teamPct = teamQuota > 0 ? (teamTotal / teamQuota) * 100 : 0;
  const teamCalls = repL12DActivity.reduce((sum, rep) => sum + rep.totalCalls, 0);
  const teamTouchpoints = repL12DActivity.reduce((sum, rep) => sum + rep.totalTouchpoints, 0);
  const staleOpps = repPipeline.reduce((sum, rep) => sum + rep.outOfDate, 0);
  const cwNotLive = teamCWnFT.cwnft;
  return { teamTotal, teamQuota, teamPct, teamCalls, teamTouchpoints, staleOpps, cwNotLive };
}

function topBottom<T>(items: T[], score: (item: T) => number, n = 2) {
  const sorted = sortDesc(items, score);
  return {
    top: sorted.slice(0, n),
    bottom: [...sorted].reverse().slice(0, n),
  };
}

function repBulletLines(repName: RepName) {
  const att = repAttainment.find((r) => r.name === repName);
  const act = repL12DActivity.find((r) => r.name === repName);
  const ndg = repNDG.find((r) => r.name === repName);
  const cw = repCWnFT.find((r) => r.name === repName);
  const pipe = repPipeline.find((r) => r.name === repName);
  const coach = repCoaching.find((r) => r.name === repName);

  return [
    att ? `Attainment: ${att.currentPts}/${att.quota} pts (${pct(att.pctToQuota, 1)} of quota)` : null,
    act ? `Activity: ${num(act.totalCalls)} calls, ${num(act.totalTouchpoints)} touchpoints, ${num(act.totalTalkTime)}h talk time` : null,
    ndg ? `NDG: ${pct(ndg.ndgPct, 2)} (${num(ndg.rfo)} RFO / ${num(ndg.ads)} Ads / ${num(ndg.ufo)} UFO)` : null,
    cw ? `Post-close: ${cw.cwnft} CWnFT of ${cw.totalCW} CWs (${pct(cw.pctNFT, 2)} not yet live; avg ${cw.avgDaysCWtoFT.toFixed(1)} days CW→FT)` : null,
    pipe ? `Pipeline: ${pipe.totalOpen} open opps, ${pipe.createdLW} created last week, ${pipe.outOfDate} stale opps` : null,
    coach ? `Primary coaching area: ${coach.primaryArea}${coach.secondaryArea ? ` · secondary: ${coach.secondaryArea}` : ""}` : null,
  ].filter(Boolean) as string[];
}

export function buildHeadCoachSummaryMarkdown(selectedRep: RepName | "all" = "all"): string {
  const totals = getTeamTotals();
  const attainment = topBottom(repAttainment.filter((r) => r.quota > 0), (r) => r.pctToQuota);
  const activity = topBottom(repL12DActivity, (r) => r.totalCalls);
  const ndg = topBottom(repNDG, (r) => r.ndgPct);
  const cwnftRisk = sortDesc(repCWnFT, (r) => r.pctNFT).filter((r) => r.pctNFT >= 10);
  const stale = sortDesc(repPipeline, (r) => r.outOfDate).filter((r) => r.outOfDate >= 10);
  const coaching = sortDesc(repCoaching, (r) => r.urgency);

  const focusLine = selectedRep === "all"
    ? "Team-wide command center"
    : `${selectedRep} drill-down`;

  const lines = [
    `## ${focusLine}`,
    ``,
    `**Who is winning:** ${attainment.top.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ")}.`,
    `**Who is behind:** ${attainment.bottom.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ")}.`,
    `**What is driving it:** ${totals.staleOpps} stale opps, ${totals.cwNotLive} CWnFT accounts, and ${totals.teamCalls.toLocaleString()} L12D calls across the team.`,
    ``,
    `### Coach today`,
    coaching.slice(0, 4).map((c) => `- **${c.name}** → ${c.primaryArea}${c.secondaryArea ? ` / ${c.secondaryArea}` : ""} (urgency ${c.urgency}/10)`).join("\n"),
    ``,
    `### Quick read on the team`,
    `- Attainment: ${totals.teamTotal}/${totals.teamQuota} pts (${totals.teamPct.toFixed(1)}% to quota).`,
    `- Activity leader: ${safeFirst(activity.top, activity.bottom[0])?.name} with ${safeFirst(activity.top, activity.bottom[0]) ? num((safeFirst(activity.top, activity.bottom[0]) as any).totalCalls) : "0"} calls.`,
    `- NDG leader: ${safeFirst(ndg.top, ndg.bottom[0])?.name} at ${safeFirst(ndg.top, ndg.bottom[0]) ? pct((safeFirst(ndg.top, ndg.bottom[0]) as any).ndgPct, 2) : "0%"}.`,
    `- Post-close risk pockets: ${cwnftRisk.slice(0, 3).map((r) => `${r.name} (${r.pctNFT.toFixed(1)}%)`).join(", ") || "none"}.`,
    `- Hygiene risk pockets: ${stale.slice(0, 3).map((r) => `${r.name} (${r.outOfDate} stale opps)`).join(", ") || "none"}.`,
    ``,
    `### Use this as your coaching starting point`,
    teamInsights.slice(0, 3).map((ins) => `- ${ins}`).join("\n"),
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildSummaryReportMarkdown(summaryType: "EOD" | "EOW" | "EOM", hiringNotes = "", selectedRep: RepName | "all" = "all"): string {
  const totals = getTeamTotals();
  const repsAhead = repAttainment.filter((r) => r.quota > 0 && r.pctToQuota >= 100);
  const repsBehind = repAttainment.filter((r) => r.quota > 0 && r.pctToQuota < 85);
  const active = repL12DActivity.filter((r) => r.totalCalls > 0);
  const topCaller = safeFirst(sortDesc(active, (r) => r.totalCalls), active[0] ?? repL12DActivity[0]);
  const topNDG = safeFirst(sortDesc(repNDG, (r) => r.ndgPct), repNDG[0]);
  const topFT = safeFirst(sortDesc(repCWnFT, (r) => r.avgDaysCWtoFT > 0 ? -r.avgDaysCWtoFT : 0), repCWnFT[0]);

  const cadence = {
    EOD: "Daily operating rhythm: protect activity, clear blockers, and keep rep follow-up tight.",
    EOW: "Weekly operating rhythm: lock in attainment, clear stale opps, and push CW→FT follow-through.",
    EOM: "Month-end operating rhythm: prioritize quota catch-up, close quality, and risky post-close accounts.",
  }[summaryType];

  return [
    `## ${summaryType} manager summary`,
    ``,
    cadence,
    ``,
    `### Scoreboard`,
    `- Team attainment: ${totals.teamTotal}/${totals.teamQuota} pts (${totals.teamPct.toFixed(1)}% to quota).`,
    `- Calls: ${totals.teamCalls.toLocaleString()} | Touchpoints: ${totals.teamTouchpoints.toLocaleString()} | Stale opps: ${totals.staleOpps}.`,
    `- CWnFT: ${totals.cwNotLive} accounts not yet live.`,
    ``,
    `### What to know`,
    `- Ahead of pace: ${repsAhead.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ") || "none"}.`,
    `- Behind pace: ${repsBehind.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ") || "none"}.`,
    `- Top caller: ${topCaller?.name ?? "n/a"} with ${topCaller ? num((topCaller as any).totalCalls ?? (topCaller as any).calls ?? 0) : "0"} calls.`,
    `- NDG leader: ${topNDG.name} at ${topNDG.ndgPct.toFixed(2)}%.`,
    `- Fastest CW→FT: ${topFT.name} at ${topFT.avgDaysCWtoFT.toFixed(1)} days.`,
    ``,
    `### Hiring / manager notes`,
    hiringNotes.trim() ? hiringNotes.trim() : "No notes entered yet.",
    "",
    `### Coaching focus`,
    repCoaching
      .slice()
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5)
      .map((c) => `- **${c.name}** → ${c.primaryArea} (urgency ${c.urgency}/10)`)
      .join("\n"),
    "",
    selectedRep === "all" ? "Selected view: team-wide." : `Selected view: ${selectedRep}.`,
  ].join("\n");
}

export function buildRepInsightMarkdown(repName: RepName, teamMembers: TeamMember[] = DEFAULT_TEAM_MEMBERS): string {
  const lines = repBulletLines(repName);
  const coach = repCoaching.find((r) => r.name === repName);
  const member = teamMembers.find((m) => m.name === repName);
  const tenureDays = member ? Math.max(0, Math.floor((Date.now() - new Date(member.start_date).getTime()) / (1000 * 60 * 60 * 24))) : null;

  return [
    `## ${repName} coaching snapshot`,
    member ? `**Roster status:** ${member.status === "ramping" ? "Ramping" : "Ramped"} · ${tenureDays} days tenure · role ${member.role}` : null,
    "",
    ...lines,
    "",
    `### Strengths`,
    ...(coach?.strengths?.length ? coach.strengths.map((s) => `- ${s}`) : ["- No strengths captured yet."]),
    "",
    `### Weaknesses`,
    ...(coach?.weaknesses?.length ? coach.weaknesses.map((s) => `- ${s}`) : ["- No weaknesses captured yet."]),
    "",
    `### Best next actions`,
    ...(coach?.actions?.length ? coach.actions.map((s) => `- ${s}`) : ["- Review the rep's top gaps and set one coaching action for the week."]),
  ].filter((line) => line !== null).join("\n");
}

export function buildSidebarInsightsMarkdown(): string {
  const totals = getTeamTotals();
  const coaching = sortDesc(repCoaching, (r) => r.urgency);
  const lowActivity = sortDesc(repL12DActivity, (r) => -r.totalCalls).slice(0, 2);
  const stale = sortDesc(repPipeline, (r) => r.outOfDate).slice(0, 2);

  return [
    `## Coaching insights`,
    ``,
    `- Team attainment: ${totals.teamTotal}/${totals.teamQuota} pts (${totals.teamPct.toFixed(1)}% to quota).`,
    `- Activity: ${totals.teamCalls.toLocaleString()} calls and ${totals.teamTouchpoints.toLocaleString()} touchpoints.`,
    `- Hygiene: ${totals.staleOpps} stale opps and ${totals.cwNotLive} CWnFT accounts still not live.`,
    ``,
    `### Most urgent coaching needs`,
    coaching.slice(0, 4).map((c) => `- **${c.name}** → ${c.primaryArea}${c.secondaryArea ? ` / ${c.secondaryArea}` : ""} (urgency ${c.urgency}/10)`).join("\n"),
    ``,
    `### Watch-list`,
    `- Low activity reps: ${lowActivity.map((r) => `${r.name} (${r.totalCalls} calls)`).join(", ")}.`,
    `- Stale opps: ${stale.map((r) => `${r.name} (${r.outOfDate})`).join(", ")}.`,
    ``,
    `### Team guidance`,
    teamInsights.slice(0, 3).map((ins) => `- ${ins}`).join("\n"),
  ].join("\n");
}

export function buildManagerAdvisorMarkdown(
  question: string,
  opts: {
    teamMembers?: TeamMember[];
    alerts?: Array<{ title: string; detail?: string; severity?: string; rep?: string }>;
    forecast?: {
      teamTotal?: number;
      teamQuota?: number;
      projected?: number;
      projectedPct?: number;
      gap?: number;
      weeksRemaining?: number;
      repForecasts?: Array<{ name: string; projected: number; projPct: number; willHit: boolean }>;
    };
    baseForecast?: {
      projected?: number;
      projectedPct?: number;
    };
    oneOnOnes?: Array<{ repName: string; lastDate: string; nextDate: string }>;
  } = {}
): string {
  const q = question.toLowerCase().trim();
  const totals = getTeamTotals();
  const teamMembers = opts.teamMembers ?? DEFAULT_TEAM_MEMBERS;
  const alerts = opts.alerts ?? [];
  const forecast = opts.forecast;
  const topAlerts = alerts.slice(0, 3);
  const topBehind = sortDesc(repAttainment.filter((r) => r.quota > 0 && r.pctToQuota < 100), (r) => 100 - r.pctToQuota).slice(0, 3);
  const bestBenchmarks = sortDesc(repCoaching, (r) => r.urgency)
    .filter((c) => c.primaryArea === "Monetization / NDG" || c.primaryArea === "Post-Close Follow Through" || c.primaryArea === "Activity")
    .slice(0, 3);

  if (q.includes("forecast") || q.includes("pace") || q.includes("quoter") || q.includes("quota") || q.includes("q1")) {
    return [
      `## Forecast`,
      `- Current team pace: ${totals.teamTotal}/${totals.teamQuota} pts (${totals.teamPct.toFixed(1)}%).`,
      forecast ? `- Projected finish: ${forecast.projected ?? 0} pts (${(forecast.projectedPct ?? 0).toFixed(1)}% of quota), gap ${(forecast.gap ?? 0).toLocaleString()} pts, ${forecast.weeksRemaining ?? 0} weeks left.` : null,
      `- Main driver of the gap is not one single rep — it's a mix of pipeline hygiene, activity, and post-close follow-through.`,
      `- Tightest correction path: ${topBehind.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ")}.`,
      `- Best internal benchmarks: ${bestBenchmarks.map((c) => `${c.name} → ${c.primaryArea}`).join(", ")}.`,
      "",
      `### Why this matters`,
      `If you want to close the gap, fix the reps with the biggest combination of low pace + weak hygiene first.`,
    ].filter(Boolean).join("\n");
  }

  if (q.includes("cwnft") || q.includes("post-close") || q.includes("close quality")) {
    const cwnft = sortDesc(repCWnFT, (r) => r.pctNFT).slice(0, 4);
    return [
      `## Post-close view`,
      `- Team CWnFT: ${teamCWnFT.cwnft} of ${teamCWnFT.totalCW} deals are still not live (${teamCWnFT.pctNFT.toFixed(2)}%).`,
      `- Biggest post-close risk pockets: ${cwnft.map((r) => `${r.name} (${r.pctNFT.toFixed(1)}%)`).join(", ")}.`,
      `- Most preventable issue: follow-through after the close, not just getting the close in the first place.`,
      `- Fastest live-to-FT performer: ${safeFirst(sortDesc(repCWnFT, (r) => -r.avgDaysCWtoFT), repCWnFT[0]).name}.`,
      "",
      `### Suggested manager move`,
      `Pick the oldest CWnFT accounts, remove blockers, and set a date to FT them before chasing net-new volume.`,
    ].join("\n");
  }

  if (q.includes("activity") || q.includes("calls") || q.includes("touchpoint")) {
    const topCaller = safeFirst(sortDesc(repL12DActivity, (r) => r.totalCalls), repL12DActivity[0]);
    const low = sortDesc(repL12DActivity, (r) => -r.totalCalls).slice(0, 3);
    return [
      `## Activity`,
      `- Team logged ${totals.teamCalls.toLocaleString()} calls and ${totals.teamTouchpoints.toLocaleString()} touchpoints.`,
      `- Top caller: ${topCaller.name} with ${num(topCaller.totalCalls)} calls.`,
      `- Watch-list: ${low.map((r) => `${r.name} (${r.totalCalls} calls)`).join(", ")}.`,
      `- If a rep has volume but weak outcomes, the issue is usually conversion or hygiene — not effort.`,
    ].join("\n");
  }

  if (q.includes("ndg") || q.includes("monetization") || q.includes("ads") || q.includes("offer")) {
    const ndgLeader = safeFirst(sortDesc(repNDG, (r) => r.ndgPct), repNDG[0]);
    return [
      `## Monetization`,
      `- Team NDG sits at ${teamNDG.currentNDGPct.toFixed(2)}%.`,
      `- Benchmark rep: ${ndgLeader.name} at ${ndgLeader.ndgPct.toFixed(2)}%.`,
      `- Use ${ndgLeader.name}, ${repNDG[0].name}, and ${repNDG[3].name} as the attach/monetization references.`,
      `- If NDG is weak, it is usually a mix of volume and attach rate — not just one rep being "bad at monetization."`,
    ].join("\n");
  }

  if (q.includes("coach") || q.includes("who should i coach") || q.includes("priority")) {
    return [
      `## Coaching priorities`,
      topAlerts.length
        ? `- Highest-priority issues right now: ${topAlerts.map((a) => a.title).join("; ")}.`
        : "- No critical alerts are firing right now.",
      `- Start with the reps behind on pace: ${topBehind.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ")}.`,
      `- Then coach the reps who have output but weak hygiene or post-close follow-through.`,
      `- Best bench reps by area: ${bestBenchmarks.map((c) => `${c.name} (${c.primaryArea})`).join(", ")}.`,
    ].join("\n");
  }

  const rosterLine = teamMembers.length > 0
    ? `Roster has ${teamMembers.filter((m) => m.status === "ramping").length} ramping reps and ${teamMembers.filter((m) => m.status === "ramped").length} ramped reps.`
    : "No team roster is currently saved locally.";
  return [
    `## Manager answer`,
    `You asked: ${question || "a team question"}.`,
    rosterLine,
    `- Team attainment: ${totals.teamTotal}/${totals.teamQuota} pts (${totals.teamPct.toFixed(1)}%).`,
    `- Team alerts currently firing: ${topAlerts.map((a) => a.title).join("; ") || "none"}.`,
    `- Most likely coaching starting point: ${topBehind.map((r) => `${r.name} (${r.pctToQuota.toFixed(1)}%)`).join(", ")}.`,
    ``,
    `### Practical answer`,
    `Fix the biggest gap first: pipeline hygiene, activity consistency, then post-close follow-through.`,
  ].join("\n");
}
