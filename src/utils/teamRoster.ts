export interface TeamMember {
  id: string;
  name: string;
  status: 'ramped' | 'ramping';
  start_date: string;
  role: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'team-members';

const nowIso = () => new Date().toISOString();

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'sarah-jang',
    name: 'Sarah Jang',
    status: 'ramped',
    start_date: '2025-09-15',
    role: 'AE',
    notes: 'Strong closer and NDG benchmark. Keep CWnFT hygiene tight.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 'camilia-pabelico',
    name: 'Camilia Pabelico',
    status: 'ramped',
    start_date: '2025-10-01',
    role: 'AE',
    notes: 'High conversion, but activity and hygiene need active coaching.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 'kendall-peters',
    name: 'Kendall Peters',
    status: 'ramped',
    start_date: '2025-08-20',
    role: 'AE',
    notes: 'Top attainment; use as a benchmark for pipeline balance.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 'sofia-boselli',
    name: 'Sofia Boselli',
    status: 'ramped',
    start_date: '2025-11-11',
    role: 'AE',
    notes: 'Solid pace; watch stale opps and follow-through.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 'nafisa-akram',
    name: 'Nafisa Akram',
    status: 'ramping',
    start_date: '2026-01-15',
    role: 'AE',
    notes: 'Needs a tighter activity cadence and stronger pipeline creation.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 'allen-hsu',
    name: 'Allen Hsu',
    status: 'ramping',
    start_date: '2026-02-10',
    role: 'AR',
    notes: 'Brand-new ramp. Focus on habits, shadowing, and first wins.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
  {
    id: 'shawna-majidansari',
    name: 'Shawna Majidansari',
    status: 'ramped',
    start_date: '2025-10-20',
    role: 'AE',
    notes: 'Stable ramped rep; good candidate for process discipline.',
    created_at: nowIso(),
    updated_at: nowIso(),
  },
];

function isTeamMember(value: unknown): value is TeamMember {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    'name' in value &&
    'status' in value &&
    'start_date' in value &&
    'role' in value &&
    'notes' in value &&
    'created_at' in value &&
    'updated_at' in value
  );
}

export function loadTeamMembers(): TeamMember[] {
  if (typeof window === 'undefined') return DEFAULT_TEAM_MEMBERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEAM_MEMBERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isTeamMember)) return parsed;
    return DEFAULT_TEAM_MEMBERS;
  } catch {
    return DEFAULT_TEAM_MEMBERS;
  }
}

export function saveTeamMembers(members: TeamMember[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

export function resetTeamMembers() {
  saveTeamMembers(DEFAULT_TEAM_MEMBERS);
}
