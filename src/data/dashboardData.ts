// ===== DASHBOARD DATA EXTRACTED FROM WORKBOOK =====
// Excludes Eli Beahm per requirements

export const REPS = ['Sarah Jang', 'Camilia Pabelico', 'Kendall Peters', 'Sofia Boselli', 'Nafisa Akram', 'Allen Hsu', 'Shawna Majidansari'] as const;
export type RepName = typeof REPS[number];

// ===== PAGE 1: HEAD COACH / ATTAINMENT =====
export interface RepAttainment {
  name: RepName;
  tier1: number; tier2: number; tier3: number; tier4_5: number;
  untiered_lt14: number; ut_14_55: number; ut_gt55: number;
  totalFTs: number; totalFTCredits: number; ftCreditAttn: number; currentNDG: number;
  quota: number; currentPts: number; expectedPts: number; delta: number;
  pctToQuota: number; weeksLeft: number; reqPtsPerWk: number; currentPtsPerWk: number;
  status: string; realistic: string;
  rfoPercGB: number; adsPercGB: number; ufoPercGB: number; ndgPercGB: number;
  wishlistPct: number;
  extraPointsNeeded: number; extraPointsPerDay: number;
}

export const repAttainment: RepAttainment[] = [
  {
    name: 'Sarah Jang', tier1: 3, tier2: 12, tier3: 1, tier4_5: 5,
    untiered_lt14: 7, ut_14_55: 2, ut_gt55: 2,
    totalFTs: 32, totalFTCredits: 84, ftCreditAttn: 101.20, currentNDG: 15.19,
    quota: 83, currentPts: 84, expectedPts: 76.24, delta: 7.76,
    pctToQuota: 101.20, weeksLeft: 1.00, reqPtsPerWk: -1.00, currentPtsPerWk: 7.44,
    status: '✅', realistic: 'Recoverable',
    rfoPercGB: 9.36, adsPercGB: 2.42, ufoPercGB: 8.25, ndgPercGB: 14.65, wishlistPct: 46.88,
    extraPointsNeeded: 0, extraPointsPerDay: 0,
  },
  {
    name: 'Camilia Pabelico', tier1: 3, tier2: 10, tier3: 10, tier4_5: 2,
    untiered_lt14: 7, ut_14_55: 2, ut_gt55: 0,
    totalFTs: 34, totalFTCredits: 81, ftCreditAttn: 89.01, currentNDG: 3.72,
    quota: 91, currentPts: 81, expectedPts: 83.59, delta: -2.59,
    pctToQuota: 89.01, weeksLeft: 1.00, reqPtsPerWk: 10.00, currentPtsPerWk: 7.18,
    status: '❌', realistic: 'Recoverable',
    rfoPercGB: 3.78, adsPercGB: 1.35, ufoPercGB: 1.29, ndgPercGB: 3.28, wishlistPct: 38.24,
    extraPointsNeeded: 10, extraPointsPerDay: 2,
  },
  {
    name: 'Kendall Peters', tier1: 4, tier2: 12, tier3: 12, tier4_5: 7,
    untiered_lt14: 4, ut_14_55: 0, ut_gt55: 0,
    totalFTs: 39, totalFTCredits: 95, ftCreditAttn: 114.46, currentNDG: 17.32,
    quota: 83, currentPts: 95, expectedPts: 76.24, delta: 18.76,
    pctToQuota: 114.46, weeksLeft: 1.00, reqPtsPerWk: -12.00, currentPtsPerWk: 8.42,
    status: '✅', realistic: 'Recoverable',
    rfoPercGB: 15.91, adsPercGB: 0.03, ufoPercGB: 1.44, ndgPercGB: 17.11, wishlistPct: 41.03,
    extraPointsNeeded: 0, extraPointsPerDay: 0,
  },
  {
    name: 'Sofia Boselli', tier1: 4, tier2: 0, tier3: 11, tier4_5: 3,
    untiered_lt14: 3, ut_14_55: 0, ut_gt55: 0,
    totalFTs: 21, totalFTCredits: 52, ftCreditAttn: 91.23, currentNDG: 1.55,
    quota: 57, currentPts: 52, expectedPts: 52.36, delta: -0.36,
    pctToQuota: 91.23, weeksLeft: 1.00, reqPtsPerWk: 5.00, currentPtsPerWk: 4.61,
    status: '✅', realistic: 'Recoverable',
    rfoPercGB: 0.43, adsPercGB: 0.03, ufoPercGB: 1.15, ndgPercGB: 0.70, wishlistPct: 19.05,
    extraPointsNeeded: 5, extraPointsPerDay: 1.00,
  },
  {
    name: 'Nafisa Akram', tier1: 0, tier2: 2, tier3: 1, tier4_5: 0,
    untiered_lt14: 2, ut_14_55: 0, ut_gt55: 0,
    totalFTs: 5, totalFTCredits: 10, ftCreditAttn: 33.33, currentNDG: 3.24,
    quota: 30, currentPts: 10, expectedPts: 27.56, delta: -17.56,
    pctToQuota: 33.33, weeksLeft: 1.00, reqPtsPerWk: 20.00, currentPtsPerWk: 0.89,
    status: '❌', realistic: 'Risk',
    rfoPercGB: 4.31, adsPercGB: 1.08, ufoPercGB: 0.00, ndgPercGB: 0.00, wishlistPct: 40.00,
    extraPointsNeeded: 0, extraPointsPerDay: 4.00,
  },
  {
    name: 'Allen Hsu', tier1: 0, tier2: 0, tier3: 0, tier4_5: 0,
    untiered_lt14: 0, ut_14_55: 0, ut_gt55: 0,
    totalFTs: 0, totalFTCredits: 0, ftCreditAttn: 0, currentNDG: 0,
    quota: 0, currentPts: 0, expectedPts: 0, delta: 0,
    pctToQuota: 0, weeksLeft: 1.20, reqPtsPerWk: 0, currentPtsPerWk: 0,
    status: '—', realistic: '—',
    rfoPercGB: 0, adsPercGB: 0, ufoPercGB: 0, ndgPercGB: 0, wishlistPct: 0,
    extraPointsNeeded: 0, extraPointsPerDay: 0,
  },
  {
    name: 'Shawna Majidansari', tier1: 0, tier2: 0, tier3: 0, tier4_5: 0,
    untiered_lt14: 0, ut_14_55: 0, ut_gt55: 0,
    totalFTs: 0, totalFTCredits: 4, ftCreditAttn: 0, currentNDG: 2.44,
    quota: 0, currentPts: 4, expectedPts: 0, delta: 4,
    pctToQuota: 0, weeksLeft: 1.20, reqPtsPerWk: -3.33, currentPtsPerWk: 0.36,
    status: '✅', realistic: 'Recoverable',
    rfoPercGB: 1.88, adsPercGB: 0, ufoPercGB: 0.56, ndgPercGB: 0, wishlistPct: 0,
    extraPointsNeeded: -4, extraPointsPerDay: -0.80,
  },
];

// Team Level NDG — sourced from uploaded sheet NDG section
export const teamNDG = {
  totalRFO: 6684.54 + 1187.31 + 6636.15 + 81.85 + 49.00 + 0 + 7.25,
  totalUFO: 1728.47 + 424.28 + 12.97 + 5.00 + 12.25 + 0 + 0,
  totalAds: 5895.15 + 404.34 + 602.04 + 221.31 + 0 + 0 + 2.16,
  totalGBF28D: 71451.24 + 31384.50 + 41715.65 + 19247.41 + 1135.71 + 0 + 386.15,
  currentNDGPct: 11.85,
  f28dNdgPct: 11.85,
  currentPoints: 326,
  targetPoints: 344,
  pctToTarget: 94.77,
  todaysPace: 317,
  onPace: true,
  qStartDate: '1/5/2026',
  qEndDate: '3/31/2026',
  today: '3/24/26',
  totalDaysInQ: 86,
  daysElapsed: 79,
  pctQElapsed: 91.86,
};

export interface RepNDGData {
  name: RepName;
  rfo: number;
  ufo: number;
  ads: number;
  gbF28D: number;
  ndgPct: number;
  f28dNdgPct: number;
  rfoPercGB: number;
  adsPercGB: number;
  ufoPercGB: number;
}

export const repNDG: RepNDGData[] = [
  { name: 'Sarah Jang' as RepName, rfo: 6684.54, ufo: 1728.47, ads: 5895.15, gbF28D: 71451.24, ndgPct: 15.19, f28dNdgPct: 14.65, rfoPercGB: 9.36, adsPercGB: 2.42, ufoPercGB: 8.25 },
  { name: 'Camilia Pabelico' as RepName, rfo: 1187.31, ufo: 424.28, ads: 404.34, gbF28D: 31384.50, ndgPct: 3.72, f28dNdgPct: 3.28, rfoPercGB: 3.78, adsPercGB: 1.35, ufoPercGB: 1.29 },
  { name: 'Kendall Peters' as RepName, rfo: 6636.15, ufo: 12.97, ads: 602.04, gbF28D: 41715.65, ndgPct: 17.32, f28dNdgPct: 17.11, rfoPercGB: 15.91, adsPercGB: 0.03, ufoPercGB: 1.44 },
  { name: 'Sofia Boselli' as RepName, rfo: 81.85, ufo: 5.00, ads: 221.31, gbF28D: 19247.41, ndgPct: 1.55, f28dNdgPct: 0.70, rfoPercGB: 0.43, adsPercGB: 0.03, ufoPercGB: 1.15 },
  { name: 'Nafisa Akram' as RepName, rfo: 49.00, ufo: 12.25, ads: 0, gbF28D: 1135.71, ndgPct: 3.24, f28dNdgPct: 0.00, rfoPercGB: 4.31, adsPercGB: 1.08, ufoPercGB: 0.00 },
  { name: 'Allen Hsu' as RepName, rfo: 0, ufo: 0, ads: 0, gbF28D: 0, ndgPct: 0, f28dNdgPct: 0, rfoPercGB: 0, adsPercGB: 0, ufoPercGB: 0 },
  { name: 'Shawna Majidansari' as RepName, rfo: 7.25, ufo: 0, ads: 2.16, gbF28D: 386.15, ndgPct: 2.44, f28dNdgPct: 0, rfoPercGB: 1.88, adsPercGB: 0, ufoPercGB: 0.56 },
];

// ===== PAGE 2: L12D ACTIVITY =====
export const l12dDates = ['3/6', '3/9', '3/10', '3/11', '3/12', '3/13', '3/16', '3/17', '3/18', '3/19', '3/20', '3/23'];

export interface RepL12DActivity {
  name: RepName;
  calls: number[];
  talkTime: number[];
  emails: number[];
  sms: number[];
  meetings: number[];
  touchpoints: number[];
  brands: number[];
  totalCalls: number;
  totalTalkTime: number;
  totalEmails: number;
  totalTouchpoints: number;
}

export const repL12DActivity: RepL12DActivity[] = [
  {
    name: 'Sarah Jang',
    calls: [122,58,63,2,62,50,51,50,54,52,4,55], talkTime: [1.02,1.16,0.99,2.54,1.13,1.84,1.25,1.16,1.53,1.32,1.55,0.76],
    emails: [54,3,4,1,0,0,1,4,0,4,0,1], sms: [1,2,3,2,7,2,2,2,2,0,1,1], meetings: [0,0,0,3,0,1,0,0,1,0,3,0],
    touchpoints: [177,63,70,8,69,53,54,56,57,56,8,57], brands: [113,30,38,7,39,29,23,29,30,26,2,40],
    totalCalls: 623, totalTalkTime: 16, totalEmails: 72, totalTouchpoints: 728,
  },
  {
    name: 'Camilia Pabelico',
    calls: [43,42,32,44,32,39,0,2,6,4,0,4], talkTime: [1.13,0.63,1.01,3.37,0.56,1.93,0,0.02,0.91,0.03,1.50,0.05],
    emails: [8,4,1,1,1,1,0,0,2,0,0,0], sms: [1,1,0,2,0,0,0,0,1,0,0,0], meetings: [0,0,0,0,0,0,0,0,0,0,0,0],
    touchpoints: [52,47,33,47,33,40,0,2,9,4,0,4], brands: [27,28,18,26,22,27,1,4,7,5,0,1],
    totalCalls: 248, totalTalkTime: 11, totalEmails: 18, totalTouchpoints: 271,
  },
  {
    name: 'Kendall Peters',
    calls: [5,49,52,47,30,6,37,54,29,45,11,41], talkTime: [10.06,1.00,0.98,3.35,1.49,1.05,0.83,0.97,1.23,1.20,1.64,0.84],
    emails: [2,3,4,0,1,0,0,3,0,0,0,0], sms: [2,4,3,3,4,3,2,3,1,3,2,0], meetings: [8,0,0,1,0,0,0,0,3,0,1,0],
    touchpoints: [17,56,59,51,35,9,39,60,33,48,14,41], brands: [7,44,39,34,25,6,19,33,21,32,10,27],
    totalCalls: 406, totalTalkTime: 25, totalEmails: 13, totalTouchpoints: 462,
  },
  {
    name: 'Sofia Boselli',
    calls: [34,55,55,2,42,36,55,80,0,37,36,64], talkTime: [1.26,1.46,0.71,4.30,1.31,0.86,1.47,1.72,5.50,1.60,0.69,1.31],
    emails: [0,0,198,0,0,0,0,0,0,0,0,0], sms: [8,4,2,1,0,0,1,5,3,4,2,6], meetings: [0,0,0,8,0,0,0,0,4,0,0,0],
    touchpoints: [42,59,255,11,42,36,56,85,7,41,38,70], brands: [24,41,248,3,36,24,35,56,2,22,23,53],
    totalCalls: 496, totalTalkTime: 22, totalEmails: 198, totalTouchpoints: 742,
  },
  {
    name: 'Nafisa Akram',
    calls: [8,39,50,4,0,0,46,47,50,47,37,49], talkTime: [2.12,0.97,0.89,4.03,0,0,0.61,0.88,0.80,0.69,1.27,0.76],
    emails: [0,1,0,0,0,0,2,4,1,0,2,142], sms: [1,4,2,3,0,0,2,3,3,1,4,1], meetings: [1,0,0,7,0,0,0,0,0,0,1,0],
    touchpoints: [10,44,52,14,0,0,50,54,54,48,44,192], brands: [4,28,38,3,0,0,31,38,39,29,29,171],
    totalCalls: 377, totalTalkTime: 13, totalEmails: 152, totalTouchpoints: 562,
  },
  {
    name: 'Allen Hsu',
    calls: [0,56,56,59,41,0,78,60,0,0,0,52], talkTime: [0,0.74,0.86,0.73,0.71,0,1.07,0.79,2.50,2.25,0.75,1.65],
    emails: [0,6,3,0,9,0,32,4,0,0,0,0], sms: [0,0,0,0,0,0,5,1,0,0,0,2], meetings: [0,0,0,0,0,0,0,0,10,6,2,1],
    touchpoints: [0,62,59,59,50,0,115,65,10,6,2,55], brands: [0,55,51,46,43,0,83,57,1,0,0,52],
    totalCalls: 402, totalTalkTime: 12, totalEmails: 54, totalTouchpoints: 483,
  },
  {
    name: 'Shawna Majidansari',
    calls: [48,19,42,59,33,39,52,18,30,1,21,29], talkTime: [0.93,1.03,0.57,0.81,0.77,0.60,0.96,0.97,0.79,0.02,0.44,0.84],
    emails: [4,4,2,2,4,3,2,3,3,1,1,1], sms: [2,1,2,4,0,1,2,2,2,2,4,2], meetings: [0,0,0,0,0,0,0,0,0,0,0,0],
    touchpoints: [54,24,46,65,37,43,56,23,35,4,26,32], brands: [36,14,28,49,25,32,30,15,21,3,13,21],
    totalCalls: 391, totalTalkTime: 9, totalEmails: 30, totalTouchpoints: 445,
  },
];

export const teamL12DActivity = {
  totalCalls: 2943, medianTalkTime: 14, totalEmails: 537, totalTouchpoints: 3248,
  dailyCalls: [260,318,350,217,240,170,319,311,169,186,109,294],
  dailyTouchpoints: [298,331,528,190,229,138,314,322,170,203,106,419],
};

// ===== PAGE 3: L12W ACTIVITY =====
export const l12wWeeks = ['1/5','1/12','1/19','1/26','2/2','2/9','2/16','2/23','3/2','3/9','3/16','3/23'];

export interface RepL12WActivity {
  name: RepName;
  calls: number[];
  talkTime: number[];
  emails: number[];
  touchpoints: number[];
  brands: number[];
  totalCalls: number;
  totalTalkTime: number;
  totalEmails: number;
  totalTouchpoints: number;
}

export const repL12WActivity: RepL12WActivity[] = [
  {
    name: 'Sarah Jang',
    calls: [3,172,134,209,166,170,139,235,305,235,211,55],
    talkTime: [0.03,7.19,5.88,7.58,9.91,8.49,5.53,7.41,5.64,7.66,6.82,0.76],
    emails: [2,12,173,13,8,196,2,3,59,8,9,1],
    touchpoints: [8,197,321,238,204,387,158,248,377,263,231,56],
    brands: [7,93,275,96,66,266,57,117,162,85,71,38],
    totalCalls: 2034, totalTalkTime: 72.90, totalEmails: 486, totalTouchpoints: 2688,
  },
  {
    name: 'Camilia Pabelico',
    calls: [147,195,146,165,241,266,159,93,86,189,13,4],
    talkTime: [6.26,5.86,7.85,4.86,10.96,5.19,5.07,9.86,10.18,4.00,0.22,0.05],
    emails: [233,34,34,41,38,21,338,27,65,20,8,0],
    touchpoints: [393,238,195,223,299,295,505,138,163,212,22,4],
    brands: [216,74,50,67,119,109,326,52,44,78,15,1],
    totalCalls: 1704, totalTalkTime: 70.35, totalEmails: 859, totalTouchpoints: 2757,
  },
  {
    name: 'Kendall Peters',
    calls: [286,233,58,321,263,289,241,271,157,185,176,40],
    talkTime: [6.23,4.52,2.00,5.89,5.88,6.87,4.87,5.38,17.77,5.40,6.87,0.83],
    emails: [126,448,17,30,353,41,29,293,275,15,9,0],
    touchpoints: [422,696,87,378,633,357,280,578,461,218,202,40],
    brands: [185,477,49,151,430,144,112,133,313,118,80,27],
    totalCalls: 2520, totalTalkTime: 72.52, totalEmails: 1636, totalTouchpoints: 4352,
  },
  {
    name: 'Sofia Boselli',
    calls: [257,166,150,204,206,215,165,120,184,190,208,46],
    talkTime: [5.58,3.94,5.14,14.21,10.03,8.78,8.32,5.63,7.48,8.64,10.98,1.02],
    emails: [60,99,4,230,28,9,115,259,15,204,0,0],
    touchpoints: [318,267,158,436,250,234,296,394,235,404,227,46],
    brands: [214,181,87,301,113,91,76,196,84,304,89,37],
    totalCalls: 2111, totalTalkTime: 89.74, totalEmails: 1023, totalTouchpoints: 3265,
  },
  {
    name: 'Nafisa Akram',
    calls: [0,0,1,83,223,216,51,300,114,93,228,49],
    talkTime: [0,0,0.04,1.22,3.56,3.25,8.65,4.17,14.84,5.89,4.33,0.76],
    emails: [0,0,0,0,385,5,142,182,3,4,156,144],
    touchpoints: [0,0,2,83,611,223,196,491,136,107,401,193],
    brands: [0,0,1,59,314,119,37,295,69,64,138,163],
    totalCalls: 1358, totalTalkTime: 46.71, totalEmails: 1021, totalTouchpoints: 2443,
  },
  {
    name: 'Allen Hsu',
    calls: [0,0,0,37,86,277,165,305,53,212,138,52],
    talkTime: [0,0,0,0.48,0.82,3.29,2.44,4.20,1.06,3.04,7.35,2.40],
    emails: [0,0,0,0,0,6,10,17,12,57,41,0],
    touchpoints: [0,0,0,37,86,283,175,322,65,269,203,52],
    brands: [0,0,0,35,80,221,129,237,44,132,101,52],
    totalCalls: 1325, totalTalkTime: 25.07, totalEmails: 143, totalTouchpoints: 1492,
  },
  {
    name: 'Shawna Majidansari',
    calls: [0,0,0,0,0,0,54,321,222,192,122,27],
    talkTime: [0,0,0,0,0,0,1.10,5.87,5.15,3.78,3.19,0.73],
    emails: [0,0,0,0,0,0,0,2,12,10,7,2],
    touchpoints: [0,0,0,0,0,0,56,327,242,210,144,29],
    brands: [0,0,0,0,0,0,33,190,124,126,57,20],
    totalCalls: 938, totalTalkTime: 19.81, totalEmails: 33, totalTouchpoints: 1008,
  },
];

export const teamL12WActivity = {
  totalCalls: 11990,
  medianTalkTime: 5.76,
  totalEmails: 5201,
  totalTouchpoints: 17935,
  weeklyCalls: [693,766,489,1019,1185,1433,974,1645,1121,1296,1096,273],
  weeklyTouchpoints: [1141,1398,763,1395,2083,1779,1666,2498,1679,1683,1430,420],
  weeklyExpectations: { calls: 1250, medianTT: 5, emails: 500, touchpoints: 1750 },
};

// ===== PAGE 4: PIPELINE =====
export interface RepPipeline {
  name: RepName;
  totalOpen: number; createdLW: number; outreach: number; pitching: number;
  negotiation: number; cwToDate: number; cwThisWeek: number; outOfDate: number;
  l4wCreated: number[]; l4wOutreach: number[]; l4wPitching: number[];
  l4wNegotiation: number[]; l4wCW: number[];
  tierMix: { t1: number; t2: number; t3: number; t4_5: number; untiered: number };
}

export const repPipeline: RepPipeline[] = [
  {
    name: 'Sarah Jang', totalOpen: 60, createdLW: 11, outreach: 31, pitching: 6,
    negotiation: 23, cwToDate: 37, cwThisWeek: 40, outOfDate: 0,
    l4wCreated: [10,11,11,0], l4wOutreach: [4,5,1,0], l4wPitching: [1,0,1,0],
    l4wNegotiation: [0,0,4,0], l4wCW: [4,3,2,1],
    tierMix: { t1: 17, t2: 32, t3: 40, t4_5: 33, untiered: 29 },
  },
  {
    name: 'Camilia Pabelico', totalOpen: 41, createdLW: 3, outreach: 22, pitching: 6,
    negotiation: 13, cwToDate: 35, cwThisWeek: 2, outOfDate: 36,
    l4wCreated: [3,5,3,0], l4wOutreach: [0,2,0,0], l4wPitching: [0,0,0,0],
    l4wNegotiation: [0,0,0,0], l4wCW: [4,0,5,0],
    tierMix: { t1: 15, t2: 29, t3: 27, t4_5: 19, untiered: 19 },
  },
  {
    name: 'Kendall Peters', totalOpen: 49, createdLW: 12, outreach: 34, pitching: 5,
    negotiation: 10, cwToDate: 53, cwThisWeek: 10, outOfDate: 4,
    l4wCreated: [15,7,12,2], l4wOutreach: [9,1,3,0], l4wPitching: [1,1,1,0],
    l4wNegotiation: [2,0,2,0], l4wCW: [4,3,5,3],
    tierMix: { t1: 16, t2: 44, t3: 34, t4_5: 28, untiered: 16 },
  },
  {
    name: 'Sofia Boselli', totalOpen: 64, createdLW: 6, outreach: 40, pitching: 14,
    negotiation: 10, cwToDate: 31, cwThisWeek: 2, outOfDate: 63,
    l4wCreated: [11,11,6,0], l4wOutreach: [3,4,1,0], l4wPitching: [0,0,0,0],
    l4wNegotiation: [0,2,1,0], l4wCW: [5,2,3,1],
    tierMix: { t1: 19, t2: 15, t3: 42, t4_5: 36, untiered: 17 },
  },
  {
    name: 'Nafisa Akram', totalOpen: 29, createdLW: 14, outreach: 20, pitching: 2,
    negotiation: 7, cwToDate: 11, cwThisWeek: 9, outOfDate: 18,
    l4wCreated: [6,3,14,0], l4wOutreach: [0,1,10,0], l4wPitching: [0,1,0,0],
    l4wNegotiation: [2,1,1,0], l4wCW: [2,2,3,0],
    tierMix: { t1: 4, t2: 20, t3: 16, t4_5: 10, untiered: 9 },
  },
  {
    name: 'Allen Hsu', totalOpen: 29, createdLW: 5, outreach: 23, pitching: 2,
    negotiation: 4, cwToDate: 1, cwThisWeek: 5, outOfDate: 24,
    l4wCreated: [2,13,5,0], l4wOutreach: [1,13,4,0], l4wPitching: [0,0,1,0],
    l4wNegotiation: [0,0,0,0], l4wCW: [0,0,0,1],
    tierMix: { t1: 2, t2: 6, t3: 19, t4_5: 6, untiered: 1 },
  },
  {
    name: 'Shawna Majidansari', totalOpen: 15, createdLW: 9, outreach: 11, pitching: 0,
    negotiation: 4, cwToDate: 5, cwThisWeek: 12, outOfDate: 0,
    l4wCreated: [13,4,9,0], l4wOutreach: [6,2,3,0], l4wPitching: [0,0,0,0],
    l4wNegotiation: [0,1,2,0], l4wCW: [3,2,0,0],
    tierMix: { t1: 6, t2: 7, t3: 7, t4_5: 10, untiered: 2 },
  },
];

export const teamPipeline = {
  totalCreatedL4W: 150, totalOutreach: 62, totalPitching: 7,
  totalNegotiation: 15, totalCW: 53, cwConvPct: 35.33,
  l4wCreated: [47,50,51,2], l4wCW: [19,10,18,6],
};

// ===== PAGE 5: CWnFT =====
export interface RepCWnFT {
  name: RepName;
  totalCW: number; cwnft: number; pctNFT: number;
  obRiskIndex: number; f28dConv: number;
  cwnftByTier: { t1: number; t2: number; t3: number; t4_5: number; ut: number };
  potentialPts: { l7d: number; l14d: number; l30d: number; l60d: number };
  cwnftGt90d: number;
  avgDaysCWtoFT: number; gt7d: number; gt14d: number; gt28d: number;
}

export const repCWnFT: RepCWnFT[] = [
  {
    name: 'Sarah Jang', totalCW: 37, cwnft: 7, pctNFT: 13.51,
    obRiskIndex: 81.08, f28dConv: 77.14,
    cwnftByTier: { t1: 1, t2: 1, t3: 0, t4_5: 2, ut: 5 },
    potentialPts: { l7d: 0, l14d: 3, l30d: 7, l60d: 7 },
    cwnftGt90d: 36, avgDaysCWtoFT: 9.90, gt7d: 7, gt14d: 5, gt28d: 4,
  },
  {
    name: 'Camilia Pabelico', totalCW: 35, cwnft: 1, pctNFT: 2.86,
    obRiskIndex: 97.14, f28dConv: 96.30,
    cwnftByTier: { t1: 1, t2: 1, t3: 4, t4_5: 3, ut: 0 },
    potentialPts: { l7d: 10, l14d: 2, l30d: 0, l60d: 2 },
    cwnftGt90d: 33, avgDaysCWtoFT: 6.00, gt7d: 1, gt14d: 1, gt28d: 1,
  },
  {
    name: 'Kendall Peters', totalCW: 53, cwnft: 8, pctNFT: 15.09,
    obRiskIndex: 84.91, f28dConv: 70.59,
    cwnftByTier: { t1: 0, t2: 4, t3: 4, t4_5: 8, ut: 5 },
    potentialPts: { l7d: 2, l14d: 2, l30d: 9, l60d: 17 },
    cwnftGt90d: 1, avgDaysCWtoFT: 13.40, gt7d: 8, gt14d: 8, gt28d: 3,
  },
  {
    name: 'Sofia Boselli', totalCW: 31, cwnft: 5, pctNFT: 12.90,
    obRiskIndex: 83.87, f28dConv: 72.73,
    cwnftByTier: { t1: 0, t2: 0, t3: 2, t4_5: 1, ut: 4 },
    potentialPts: { l7d: 2, l14d: 1, l30d: 0, l60d: 2 },
    cwnftGt90d: 0, avgDaysCWtoFT: 8.40, gt7d: 5, gt14d: 4, gt28d: 3,
  },
  {
    name: 'Nafisa Akram', totalCW: 11, cwnft: 2, pctNFT: 18.18,
    obRiskIndex: 81.82, f28dConv: 66.67,
    cwnftByTier: { t1: 1, t2: 1, t3: 2, t4_5: 1, ut: 1 },
    potentialPts: { l7d: 2, l14d: 9, l30d: 2, l60d: 1 },
    cwnftGt90d: 0, avgDaysCWtoFT: 9.30, gt7d: 2, gt14d: 2, gt28d: 1,
  },
  {
    name: 'Allen Hsu', totalCW: 1, cwnft: 0, pctNFT: 0,
    obRiskIndex: 100, f28dConv: 0,
    cwnftByTier: { t1: 0, t2: 0, t3: 0, t4_5: 0, ut: 0 },
    potentialPts: { l7d: 0, l14d: 0, l30d: 0, l60d: 0 },
    cwnftGt90d: 0, avgDaysCWtoFT: 0, gt7d: 0, gt14d: 0, gt28d: 0,
  },
  {
    name: 'Shawna Majidansari', totalCW: 5, cwnft: 0, pctNFT: 0,
    obRiskIndex: 100, f28dConv: 0,
    cwnftByTier: { t1: 0, t2: 1, t3: 1, t4_5: 0, ut: 0 },
    potentialPts: { l7d: 0, l14d: 3, l30d: 3, l60d: 3 },
    cwnftGt90d: 2, avgDaysCWtoFT: 0, gt7d: 0, gt14d: 0, gt28d: 0,
  },
];

export const teamCWnFT = {
  totalCW: 173, cwnft: 23, pctNFT: 11.56,
  highPriority: { totalCW: 173, cwnft: 20, pctNFT: 11.56 },
  medPriority: { totalCW: 16, cwnft: 3, pctNFT: 18.75 },
  obRiskIndex: 88.14, f28dConv: 77.95,
};

// ===== PAGE 6: WEEKLY PACING =====
export interface WeekPacing {
  weekNum: number; weekStart: string; weekEnd: string;
  target: number; actual: number; gap: number;
  cumTarget: number; cumActual: number; cumGap: number;
  status: string;
}

export const weeklyPacing: WeekPacing[] = [
  { weekNum: 1, weekStart: '2/16/2026', weekEnd: '2/22/2026', target: 33.5, actual: 26, gap: -7.5, cumTarget: 176.5, cumActual: 169, cumGap: -7.5, status: '🛑 Behind' },
  { weekNum: 2, weekStart: '2/23/2026', weekEnd: '3/1/2026', target: 33.5, actual: 33, gap: -0.5, cumTarget: 210, cumActual: 202, cumGap: -8, status: '🛑 Behind' },
  { weekNum: 3, weekStart: '3/2/2026', weekEnd: '3/8/2026', target: 33.5, actual: 52, gap: 18.5, cumTarget: 243.5, cumActual: 254, cumGap: 10.5, status: '✅ Ahead' },
  { weekNum: 4, weekStart: '3/9/2026', weekEnd: '3/15/2026', target: 33.5, actual: 23, gap: -10.5, cumTarget: 277, cumActual: 277, cumGap: 0, status: '✅ Ahead' },
  { weekNum: 5, weekStart: '3/16/2026', weekEnd: '3/22/2026', target: 33.5, actual: 29, gap: -4.5, cumTarget: 310.5, cumActual: 306, cumGap: -4.5, status: '⚠️ Close' },
  { weekNum: 6, weekStart: '3/23/2026', weekEnd: '3/29/2026', target: 33.5, actual: 4, gap: -29.5, cumTarget: 344, cumActual: 310, cumGap: -34, status: '🛑 Behind' },
];

export const repWeeklyFTPoints = [
  { name: 'Sarah Jang' as RepName, weeks: [0,2,4,6,2,0], total: 14, weeklyTarget: 5, status: '🛑' },
  { name: 'Camilia Pabelico' as RepName, weeks: [0,7,10,8,1,0], total: 26, weeklyTarget: 10, status: '🛑' },
  { name: 'Kendall Peters' as RepName, weeks: [10,10,5,6,14,4], total: 49, weeklyTarget: 6.5, status: '✅' },
  { name: 'Sofia Boselli' as RepName, weeks: [13,10,10,1,10,0], total: 44, weeklyTarget: 7.2, status: '🛑' },
  { name: 'Nafisa Akram' as RepName, weeks: [3,3,6,0,2,0], total: 14, weeklyTarget: 5, status: '🛑' },
  { name: 'Allen Hsu' as RepName, weeks: [0,0,2,0,0,0], total: 2, weeklyTarget: 0, status: '✅' },
  { name: 'Shawna Majidansari' as RepName, weeks: [0,0,15,2,0,0], total: 17, weeklyTarget: 0, status: '✅' },
];

// ===== COACHING LOGIC =====
export type CoachingArea = 'Activity' | 'Pipeline Creation' | 'Conversion / Quality' | 'Hygiene' | 'Post-Close Follow Through' | 'Monetization / NDG' | 'Ramp / New Hire';

export interface RepCoaching {
  name: RepName;
  primaryArea: CoachingArea;
  secondaryArea?: CoachingArea;
  urgency: number; // 1-10
  insight: string;
  strengths: string[];
  weaknesses: string[];
  actions: string[];
}

export const repCoaching: RepCoaching[] = [
  {
    name: 'Sarah Jang',
    primaryArea: 'Hygiene',
    secondaryArea: 'Post-Close Follow Through',
    urgency: 3,
    insight: 'Sarah is above quota at 101.2% with strong NDG (15.3%). Her CWnFT count of 7 and avg 9.9 days CW→FT is a watch item. Wishlist at 46.9% is high — quality of pipeline opps may need attention.',
    strengths: ['Above quota attainment', 'Strong NDG performance', 'Consistent call volume', 'High wishlist rate — strong prospecting'],
    weaknesses: ['CWnFT aging — 7 deals not yet live', 'Dropping L12D touchpoints'],
    actions: ['Review CWnFT accounts for blockers', 'Push for FTs on 3 oldest CW accounts', 'Maintain wishlist momentum'],
  },
  {
    name: 'Camilia Pabelico',
    primaryArea: 'Activity',
    secondaryArea: 'Pipeline Creation',
    urgency: 7,
    insight: 'Camilia is slightly behind pace (89%) with 10 extra points needed. Recent L12D activity has collapsed — near zero calls and touchpoints last 4 days. 36 out-of-date opps is a hygiene red flag. NDG at 3.9% is weak.',
    strengths: ['Strong F28D conversion (96.4%)', 'Low CWnFT (2.86%)', 'Good talk time when active'],
    weaknesses: ['L12D activity cratered — 0 calls last 3 days', '36 out-of-date opportunities', 'Weak NDG (3.9%)', 'Low opp creation (3 last week)'],
    actions: ['Immediate check-in on activity drop', 'Clean up 36 stale opps', 'Coach on NDG attach', 'Push for 8+ points this week'],
  },
  {
    name: 'Kendall Peters',
    primaryArea: 'Post-Close Follow Through',
    secondaryArea: 'Monetization / NDG',
    urgency: 2,
    insight: 'Kendall leads the team at 114.5% attainment with strong pipeline creation (36 L4W). His weakness is CWnFT — 8 deals with avg 13.6 days to FT, worst on team. Ads attach is nearly zero (0.03%).',
    strengths: ['Highest attainment (114.5%)', 'Strong opp creation (36 L4W)', 'Consistent activity volume', 'Best NDG on team (17.4%)'],
    weaknesses: ['Worst CWnFT aging (13.6 days avg)', '8 deals closed but not live', 'Almost zero ads attach'],
    actions: ['Focus coaching on FT follow-through', 'Review 8 CWnFT accounts for launch blockers', 'Introduce ads pitch into sales motion'],
  },
  {
    name: 'Sofia Boselli',
    primaryArea: 'Hygiene',
    secondaryArea: 'Pipeline Creation',
    urgency: 6,
    insight: 'Sofia is behind pace (87.7%) with 7 extra points needed. Her biggest issue is 63 out-of-date opps — worst on team. Pipeline is large (64 open) but poorly maintained. NDG at 1.63% is second-worst. Strong talk time but weak conversion.',
    strengths: ['High call volume (432 L12D)', 'Strong talk time', 'Good tier 1 mix'],
    weaknesses: ['63 out-of-date opps (worst on team)', 'NDG at 1.63%', 'Behind pace — needs 7 more points', 'Low opp creation last week (6)'],
    actions: ['Urgent pipeline hygiene session — close or advance 63 stale opps', 'Coach on NDG/monetization', 'Drive higher-quality opp creation'],
  },
  {
    name: 'Nafisa Akram',
    primaryArea: 'Conversion / Quality',
    secondaryArea: 'Activity',
    urgency: 9,
    insight: 'Nafisa is at critical risk — 33.3% attainment with the team\'s worst pace gap. Despite ramping activity recently, conversion and FT output remain extremely weak. 18 out-of-date opps and only 5 total FTs this quarter.',
    strengths: ['Recent activity ramp is promising', 'Good recent opp creation (14 last week)', 'Decent CWnFT conversion when closing'],
    weaknesses: ['33% attainment — worst on team', 'Only 5 FTs total this quarter', '18 out-of-date opps', 'Needs 16.7 pts/wk — nearly impossible'],
    actions: ['Daily 1:1 check-ins', 'Focus on converting existing pipeline', 'Clean up 18 stale opps', 'Identify quick-win accounts for immediate FT'],
  },
  {
    name: 'Allen Hsu',
    primaryArea: 'Ramp / New Hire',
    urgency: 5,
    insight: 'Allen appears to be ramping — recent weeks show increasing activity but almost no closed business yet (1 CW total). Pipeline is building (29 open) but 24 are out of date. Focus on fundamentals and first wins.',
    strengths: ['Ramping activity trajectory', 'Building pipeline from scratch'],
    weaknesses: ['Only 1 CW total', '24 out-of-date opps', 'Low talk time efficiency', 'No NDG yet'],
    actions: ['Ride-along coaching sessions', 'Focus on first CW wins', 'Pipeline hygiene — update or close 24 stale opps', 'Set realistic ramp milestones'],
  },
  {
    name: 'Shawna Majidansari',
    primaryArea: 'Ramp / New Hire',
    secondaryArea: 'Conversion / Quality',
    urgency: 4,
    insight: 'Shawna is new to the team (started ~W7). Activity is solid when present but inconsistent. 5 CWs and 4 FT points so far. Pipeline is lean (15 open) but clean (0 out-of-date). NDG at 2.44% needs work.',
    strengths: ['Clean pipeline (0 stale opps)', 'Good activity when engaged', 'Strong opp creation pace (9 last week)'],
    weaknesses: ['Still ramping', 'Only 5 CWs', 'Low NDG (2.44%)', 'Inconsistent weekly output'],
    actions: ['Continue ramp coaching', 'Celebrate early wins', 'Build consistency in weekly rhythm', 'Introduce monetization coaching'],
  },
];

// ===== INSIGHT ENGINE =====
export const teamInsights = [
  "Team is ahead of pace at 324/344 points (94.2%) vs expected 317 — on track with 1.2 weeks left. Keep pushing to close out Q1 strong.",
  "Pipeline creation slowed dramatically this week (2 opps created vs 51 last week). If reps aren't building pipeline now, next quarter will start cold.",
  "Camilia's activity collapse is the #1 coaching priority today — near zero output last 4 days with 10 points still needed.",
  "Nafisa is at 33% attainment with almost no path to recovery. Shift focus to learning/development over quota pressure.",
  "Kendall is carrying the team but has 8 CWnFT deals — if those don't convert to FTs, the team loses critical points.",
  "Sofia has 63 out-of-date opps. This hygiene debt is creating forecast blindness — impossible to know real pipeline value.",
  "Team CWnFT rate is 11.6% — meaning ~1 in 9 closed deals isn't going live. This is a post-close process issue, not a sales issue.",
  "NDG is at 12.1% with only Sarah (15.3%) and Kendall (17.4%) meaningfully contributing. Monetization coaching is needed team-wide.",
];
