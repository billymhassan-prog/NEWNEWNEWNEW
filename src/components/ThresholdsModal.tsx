import { useStyletron } from "baseui";
import { useState, useEffect } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from "baseui/modal";
import { Input } from "baseui/input";
import { LabelSmall } from "baseui/typography";
import { Button, SIZE, KIND } from "baseui/button";
import { useThresholds, DEFAULT_THRESHOLDS, Thresholds } from "../context/ThresholdsContext";

export default function ThresholdsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [css] = useStyletron();
  const { thresholds, updateThresholds, resetThresholds } = useThresholds();
  const [draft, setDraft] = useState<Thresholds>({ ...thresholds });

  useEffect(() => {
    if (isOpen) setDraft({ ...thresholds });
  }, [isOpen, thresholds]);

  const handleSave = () => {
    updateThresholds(draft);
    onClose();
  };

  const fieldRow = (label: string, key: keyof Thresholds, suffix: string) => (
    <div className={css({ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' })}>
      <LabelSmall className={css({ width: '180px', fontSize: '12px', fontFamily: 'UberMoveText' } as any)}>
        {label}
      </LabelSmall>
      <div className={css({ width: '90px' })}>
        <Input
          size="compact"
          type="number"
          value={String(draft[key])}
          onChange={e => setDraft(prev => ({ ...prev, [key]: Number((e.target as HTMLInputElement).value) }))}
          overrides={{ Root: { style: { width: '90px' } } }}
        />
      </div>
      <span className={css({ fontSize: '11px', color: '#999', fontFamily: 'UberMoveText' })}>{suffix}</span>
    </div>
  );

  const sectionHeader = (title: string) => (
    <div className={css({ fontSize: '13px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px', color: '#333', borderBottom: '1px solid #E8E8E8', paddingBottom: '4px' })}>
      {title}
    </div>
  );

  const calcRow = (label: string, daily: number, unit: string) => (
    <div className={css({ display: 'flex', gap: '16px', fontSize: '11px', fontFamily: 'UberMoveText', color: '#666', marginBottom: '4px', paddingLeft: '4px' })}>
      <span className={css({ width: '100px' })}>{label}:</span>
      <span><strong>{daily}</strong>/day</span>
      <span><strong>{(daily * 5).toLocaleString()}</strong>/wk</span>
      <span><strong>{(daily * 22).toLocaleString()}</strong>/mo</span>
      <span className={css({ color: '#999' })}>{unit}</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} overrides={{ Dialog: { style: { width: '520px', borderRadius: '12px', maxHeight: '85vh', overflow: 'auto' } } }}>
      <ModalHeader>
        <span className={css({ fontFamily: 'UberMove', fontWeight: 700 })}>⚙️ Metric Thresholds & Targets</span>
      </ModalHeader>
      <ModalBody>
        <div className={css({ fontSize: '12px', fontFamily: 'UberMoveText', color: '#666', marginBottom: '16px' })}>
          Set targets and thresholds. Daily metrics auto-calculate to weekly (×5) and monthly (×22).
        </div>

        {/* FT Points & CW */}
        <div className={css({ marginBottom: '16px' })}>
        {sectionHeader('FT Points & CW (Weekly)')}
          {fieldRow('Total FT/Week', 'weeklyFTTarget', 'FT/wk')}
          {fieldRow('Weekly CW Deals Target', 'cwTarget', 'deals/wk')}
        </div>

        {/* NDG */}
        <div className={css({ marginBottom: '16px' })}>
          {sectionHeader('NDG')}
          {fieldRow('NDG Target (≥)', 'ndgTarget', '%')}
        </div>

        {/* Daily Metric Inputs */}
        <div className={css({ marginBottom: '16px' })}>
          {sectionHeader('Daily Activity Targets')}
          <div className={css({ fontSize: '11px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '10px' })}>
            Enter daily expectations per rep — weekly and monthly are auto-calculated.
          </div>
          {fieldRow('Daily Dials', 'dailyDials', '/day')}
          {fieldRow('Daily Talk Time', 'dailyTalkTimeMins', 'min/day')}
          {fieldRow('Daily Emails', 'dailyEmails', '/day')}
          {fieldRow('Daily Touchpoints', 'dailyTouchpoints', '/day')}

          <div className={css({ marginTop: '12px', padding: '10px 12px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #E8E8E8' })}>
            <div className={css({ fontSize: '12px', fontFamily: 'UberMove', fontWeight: 700, marginBottom: '8px', color: '#333' })}>
              📊 Calculated Targets
            </div>
            {calcRow('Dials', draft.dailyDials, '')}
            {calcRow('Talk Time', draft.dailyTalkTimeMins, 'min')}
            {calcRow('Emails', draft.dailyEmails, '')}
            {calcRow('Touchpoints', draft.dailyTouchpoints, '')}
            <div className={css({ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #E0E0E0' })}>
              {calcRow('CW Deals', draft.cwTarget, '')}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button size={SIZE.compact} kind={KIND.tertiary} onClick={() => { resetThresholds(); setDraft({ ...DEFAULT_THRESHOLDS }); }}>
          Reset Defaults
        </Button>
        <ModalButton size={SIZE.compact} kind={KIND.tertiary} onClick={onClose}>Cancel</ModalButton>
        <ModalButton size={SIZE.compact} onClick={handleSave}>Save</ModalButton>
      </ModalFooter>
    </Modal>
  );
}
