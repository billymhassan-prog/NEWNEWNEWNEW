import { useState, useEffect } from "react";
import { useStyletron } from "baseui";
import { Button, SIZE, KIND } from "baseui/button";
import { Input } from "baseui/input";
import { Select } from "baseui/select";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from "baseui/modal";
import { SectionHeader } from "../components/SharedUI";
import { DEFAULT_TEAM_MEMBERS, loadTeamMembers, saveTeamMembers, TeamMember } from "../utils/teamRoster";

function getTenure(startDate: string): { days: number; weeks: number; months: number; label: string } {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(days / 7);
  const totalMonths = Math.floor(days / 30.44);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  let label = '';
  if (years >= 1) {
    label = `${years} yr${years > 1 ? 's' : ''}, ${months} mon`;
  } else if (totalMonths >= 1) {
    label = `${totalMonths} mon`;
  } else if (weeks >= 1) {
    label = `${weeks}w ${days % 7}d`;
  } else {
    label = `${days}d`;
  }
  return { days, weeks, months: totalMonths, label };
}

function getRampBadgeColor(status: string, tenure: { months: number }) {
  if (status === 'ramped') return { bg: '#E6F4EA', color: '#05944F' };
  if (tenure.months < 3) return { bg: '#E8F0FE', color: '#276EF1' };
  if (tenure.months < 6) return { bg: '#FEF7E0', color: '#EA8600' };
  return { bg: '#FFEBEE', color: '#E11900' };
}

function makeId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `member-${Date.now()}`;
}

export default function TeamPage() {
  const [css] = useStyletron();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm] = useState({ name: '', status: 'ramping' as 'ramped' | 'ramping', start_date: '', role: 'AE', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = loadTeamMembers();
    setMembers(stored.length > 0 ? stored : DEFAULT_TEAM_MEMBERS);
    setLoading(false);
  }, []);

  const persist = (next: TeamMember[]) => {
    setMembers(next);
    saveTeamMembers(next);
  };

  const openAdd = () => {
    setEditingMember(null);
    setForm({ name: '', status: 'ramping', start_date: new Date().toISOString().split('T')[0], role: 'AE', notes: '' });
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingMember(m);
    setForm({ name: m.name, status: m.status, start_date: m.start_date, role: m.role || 'AE', notes: m.notes || '' });
    setModalOpen(true);
  };

  const saveMember = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    if (editingMember) {
      persist(
        members.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                name: form.name,
                status: form.status,
                start_date: form.start_date,
                role: form.role,
                notes: form.notes,
                updated_at: now,
              }
            : m
        )
      );
    } else {
      const next: TeamMember = {
        id: makeId(form.name),
        name: form.name,
        status: form.status,
        start_date: form.start_date,
        role: form.role,
        notes: form.notes,
        created_at: now,
        updated_at: now,
      };
      persist([next, ...members]);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const deleteMember = async (id: string) => {
    persist(members.filter((m) => m.id !== id));
  };

  const toggleStatus = async (m: TeamMember) => {
    const newStatus = m.status === 'ramped' ? 'ramping' : 'ramped';
    persist(members.map((member) => (member.id === m.id ? { ...member, status: newStatus, updated_at: new Date().toISOString() } : member)));
  };

  const rampedCount = members.filter(m => m.status === 'ramped').length;
  const rampingCount = members.filter(m => m.status === 'ramping').length;
  const avgTenureDays = members.length > 0 ? Math.round(members.reduce((s, m) => s + getTenure(m.start_date).days, 0) / members.length) : 0;

  return (
    <div>
      <SectionHeader title="Team Roster" subtitle="Manage your team members, track ramp status and tenure" />

      <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' })}>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>Total Members</div>
          <div className={css({ fontSize: '28px', fontFamily: 'UberMove', fontWeight: 700 })}>{members.length}</div>
        </div>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>Ramped</div>
          <div className={css({ fontSize: '28px', fontFamily: 'UberMove', fontWeight: 700, color: '#05944F' })}>{rampedCount}</div>
        </div>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>Ramping</div>
          <div className={css({ fontSize: '28px', fontFamily: 'UberMove', fontWeight: 700, color: '#276EF1' })}>{rampingCount}</div>
        </div>
        <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '16px' })}>
          <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '4px' })}>Avg Tenure</div>
          <div className={css({ fontSize: '28px', fontFamily: 'UberMove', fontWeight: 700 })}>{Math.round(avgTenureDays / 30)}mo</div>
        </div>
      </div>

      <div className={css({ marginBottom: '16px' })}>
        <Button size={SIZE.compact} kind={KIND.primary} onClick={openAdd}>+ Add Team Member</Button>
      </div>

      <div className={css({ backgroundColor: '#FFF', borderRadius: '8px', border: '1px solid #E8E8E8', padding: '24px' })}>
        {loading ? (
          <div className={css({ textAlign: 'center' as const, padding: '40px', color: '#888', fontFamily: 'UberMoveText' })}>Loading team...</div>
        ) : members.length === 0 ? (
          <div className={css({ textAlign: 'center' as const, padding: '40px', color: '#888', fontFamily: 'UberMoveText' })}>
            No team members yet. Click "Add Team Member" to get started.
          </div>
        ) : (
          <table className={css({ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'UberMoveText' } as any)}>
            <thead>
              <tr style={{ backgroundColor: '#F8F8F8' }}>
                {['Name', 'Role', 'Status', 'Start Date', 'Tenure', 'Notes', 'Actions'].map(h => (
                  <th key={h} className={css({ padding: '10px 12px', textAlign: 'left' as const, fontWeight: 600, color: '#666', borderBottom: '1px solid #E8E8E8', fontSize: '12px' } as any)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map(m => {
                const tenure = getTenure(m.start_date);
                const badge = getRampBadgeColor(m.status, tenure);
                return (
                  <tr key={m.id} className={css({ ':hover': { backgroundColor: '#FAFAFA' } })}>
                    <td className={css({ padding: '12px', fontWeight: 600 } as any)}>{m.name}</td>
                    <td className={css({ padding: '12px', color: '#666' } as any)}>{m.role || 'AE'}</td>
                    <td className={css({ padding: '8px 12px' } as any)}>
                      <select
                        value={m.status}
                        onChange={async (e) => toggleStatus({ ...m, status: e.target.value as 'ramped' | 'ramping' })}
                        className={css({
                          padding: '4px 8px', borderRadius: '6px', border: '1px solid #E8E8E8', fontSize: '12px',
                          fontFamily: 'UberMoveText', fontWeight: 600, cursor: 'pointer', outline: 'none',
                          backgroundColor: badge.bg, color: badge.color,
                        })}
                      >
                        <option value="ramping">🔄 Ramping</option>
                        <option value="ramped">✅ Ramped</option>
                      </select>
                    </td>
                    <td className={css({ padding: '12px', color: '#666' } as any)}>{m.start_date}</td>
                    <td className={css({ padding: '12px', fontWeight: 600 } as any)}>{tenure.label}</td>
                    <td className={css({ padding: '12px', color: '#666', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const } as any)}>
                      {m.notes || '—'}
                    </td>
                    <td className={css({ padding: '12px' } as any)}>
                      <div className={css({ display: 'flex', gap: '6px' })}>
                        <button
                          onClick={() => openEdit(m)}
                          className={css({ padding: '4px 10px', borderRadius: '4px', border: '1px solid #E8E8E8', backgroundColor: '#FFF', fontSize: '11px', cursor: 'pointer', fontFamily: 'UberMoveText', ':hover': { backgroundColor: '#F0F0F0' } })}
                        >✏️ Edit</button>
                        <button
                          onClick={() => { if (confirm(`Remove ${m.name}?`)) deleteMember(m.id); }}
                          className={css({ padding: '4px 10px', borderRadius: '4px', border: '1px solid #FFCDD2', backgroundColor: '#FFF', fontSize: '11px', cursor: 'pointer', fontFamily: 'UberMoveText', color: '#E11900', ':hover': { backgroundColor: '#FFEBEE' } })}
                        >🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} overrides={{ Dialog: { style: { width: '500px', borderRadius: '12px' } } }}>
        <ModalHeader>{editingMember ? 'Edit Team Member' : 'Add Team Member'}</ModalHeader>
        <ModalBody>
          <div className={css({ display: 'grid', gap: '16px' })}>
            <div>
              <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px' })}>Name</div>
              <Input size="compact" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Smith" />
            </div>
            <div>
              <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px' })}>Role</div>
              <Select
                size="compact"
                options={[{ label: 'AR', id: 'AR' }, { label: 'AE', id: 'AE' }]}
                value={[{ label: form.role, id: form.role }]}
                onChange={({ value }) => { if (value.length > 0) setForm({ ...form, role: value[0].id as string }); }}
                clearable={false}
              />
            </div>
            <div>
              <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px' })}>Status</div>
              <Select
                size="compact"
                options={[{ label: '🔄 Ramping', id: 'ramping' }, { label: '✅ Ramped', id: 'ramped' }]}
                value={[{ label: form.status === 'ramped' ? '✅ Ramped' : '🔄 Ramping', id: form.status }]}
                onChange={({ value }) => { if (value.length > 0) setForm({ ...form, status: value[0].id as 'ramped' | 'ramping' }); }}
                clearable={false}
              />
            </div>
            <div>
              <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px' })}>Start Date</div>
              <Input size="compact" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', fontWeight: 600, marginBottom: '4px' })}>Notes</div>
              <Input size="compact" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Coaching notes..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalButton kind={KIND.tertiary} onClick={() => setModalOpen(false)}>Cancel</ModalButton>
          <ModalButton kind={KIND.primary} onClick={saveMember} isLoading={saving} disabled={!form.name.trim() || !form.start_date}>
            {editingMember ? 'Save Changes' : 'Add Member'}
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
