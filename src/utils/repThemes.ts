import { repAttainment, repPipeline, repCWnFT, repL12DActivity, repNDG, repCoaching, RepName } from "../data/dashboardData";

export function getRepThemes(repName: RepName) {
  const coachData = repCoaching.find(c => c.name === repName);
  const attn = repAttainment.find(r => r.name === repName);
  const pipe = repPipeline.find(r => r.name === repName);
  const activity = repL12DActivity.find(r => r.name === repName);
  const ndg = repNDG.find(r => r.name === repName);
  const cwnft = repCWnFT.find(r => r.name === repName);

  const goingWell: string[] = [];
  if (attn && attn.pctToQuota >= 90) goingWell.push(`Strong attainment at ${attn.pctToQuota.toFixed(0)}% to quota`);
  if (activity && activity.totalCalls >= 400) goingWell.push(`High call volume (${activity.totalCalls} calls L12D)`);
  if (ndg && ndg.ndgPct >= 10) goingWell.push(`NDG performing well at ${ndg.ndgPct.toFixed(1)}%`);
  if (cwnft && cwnft.pctNFT <= 5) goingWell.push(`Clean post-close execution (${cwnft.pctNFT.toFixed(1)}% CWnFT)`);
  if (pipe && pipe.createdLW >= 10) goingWell.push(`Strong pipeline creation (${pipe.createdLW} opps last week)`);
  if (pipe && pipe.outOfDate === 0) goingWell.push('Pipeline hygiene is excellent — 0 stale opps');
  if (activity && activity.totalTalkTime >= 15) goingWell.push(`Good talk time engagement (${activity.totalTalkTime}+ min L12D)`);
  if (attn && attn.delta > 0) goingWell.push(`Ahead of expected pace by ${attn.delta.toFixed(1)} pts`);
  if (goingWell.length < 2 && coachData) {
    for (const s of coachData.strengths) {
      if (goingWell.length >= 3) break;
      if (!goingWell.some(g => g.toLowerCase().includes(s.split(' ')[0].toLowerCase()))) goingWell.push(s);
    }
  }

  const workOn: string[] = [];
  if (attn && attn.pctToQuota < 80) workOn.push(`Attainment at ${attn.pctToQuota.toFixed(0)}% — needs ${attn.extraPointsNeeded} more pts`);
  if (pipe && pipe.outOfDate >= 15) workOn.push(`${pipe.outOfDate} out-of-date opps — pipeline hygiene needed`);
  if (activity && activity.totalCalls < 300) workOn.push(`Low call volume (${activity.totalCalls} L12D) — activity ramp needed`);
  if (ndg && ndg.ndgPct < 5 && attn && attn.quota > 0) workOn.push(`NDG at ${ndg.ndgPct.toFixed(1)}% — monetization coaching needed`);
  if (cwnft && cwnft.pctNFT >= 10) workOn.push(`${cwnft.cwnft} CWnFT deals (${cwnft.pctNFT.toFixed(1)}%) — follow-through gap`);
  if (pipe && pipe.createdLW < 5) workOn.push(`Only ${pipe.createdLW} opps created last week — pipeline velocity low`);
  if (attn && attn.wishlistPct >= 40) goingWell.push(`High wishlist rate (${attn.wishlistPct.toFixed(0)}%) — strong prospecting appetite`);
  if (workOn.length < 2 && coachData) {
    for (const w of coachData.weaknesses) {
      if (workOn.length >= 3) break;
      if (!workOn.some(wo => wo.toLowerCase().includes(w.split(' ')[0].toLowerCase()))) workOn.push(w);
    }
  }

  return { goingWell: goingWell.slice(0, 3), workOn: workOn.slice(0, 3) };
}

export function formatThemesAsText(repName: RepName): string {
  const { goingWell, workOn } = getRepThemes(repName);
  let text = `1:1 Themes for ${repName}\n\n`;
  text += `✅ GOING WELL:\n`;
  goingWell.forEach((item, i) => { text += `${i + 1}. ${item}\n`; });
  if (goingWell.length === 0) text += '- No standout strengths detected\n';
  text += `\n⚠️ WORK ON:\n`;
  workOn.forEach((item, i) => { text += `${i + 1}. ${item}\n`; });
  if (workOn.length === 0) text += '- No major concerns detected\n';
  return text;
}
