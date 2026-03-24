import { useStyletron } from "baseui";
import { Tabs, Tab } from "baseui/tabs-motion";
import { HeadingSmall } from "baseui/typography";
import { Select } from "baseui/select";
import { Button, SIZE, KIND } from "baseui/button";
import { ReactNode, useState } from "react";
import { REPS, RepName } from "../data/dashboardData";
import UploadModal from "./UploadModal";
import ExportButton from "./ExportButton";
import ThresholdsModal from "./ThresholdsModal";
import AnalysisSidebar from "./AnalysisSidebar";

interface LayoutProps {
  children: ReactNode;
  activeTab: number;
  onTabChange: (tab: number) => void;
  selectedRep: RepName | 'all';
  onRepChange: (rep: RepName | 'all') => void;
}

const TAB_NAMES = [
  'Overview',
  'Q1 Attainment',
  'L12D Activity',
  'L12W Activity',
  'Pipeline',
  'CWnFT',
  'NDG / Monetization',
  'Scorecards',
  'Coaching',
  'Risk Monitor',
  'Team',
  'Manager Hub',
  'Summary',
];

export default function Layout({ children, activeTab, onTabChange, selectedRep, onRepChange }: LayoutProps) {
  const [css] = useStyletron();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const repOptions = [
    { label: 'All Reps', id: 'all' },
    ...REPS.map(r => ({ label: r, id: r })),
  ];

  return (
    <div className={css({
      minHeight: '100vh',
      backgroundColor: '#FAFAFA',
    })}>
      {/* Header */}
      <div className={css({
        backgroundColor: '#000000',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      })}>
        <HeadingSmall color="white" marginTop="0" marginBottom="0">
          Sabres Manager Hub
        </HeadingSmall>
        <div className={css({ display: 'flex', alignItems: 'center', gap: '12px' })}>
          <Button
            size={SIZE.compact}
            kind={KIND.secondary}
            onClick={() => setSidebarOpen(true)}
            overrides={{
              BaseButton: {
                style: {
                  backgroundColor: '#276EF1',
                  color: '#FFF',
                  ':hover': { backgroundColor: '#1E5BC6' },
                  fontSize: '12px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                },
              },
            }}
          >
            📐 Analyze
          </Button>
          <Button
            size={SIZE.compact}
            kind={KIND.secondary}
            onClick={() => setThresholdsOpen(true)}
            overrides={{
              BaseButton: {
                style: {
                  backgroundColor: '#333',
                  color: '#FFF',
                  ':hover': { backgroundColor: '#444' },
                  fontSize: '12px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                },
              },
            }}
          >
            ⚙️ Thresholds
          </Button>
          <ExportButton />
          <Button
            size={SIZE.compact}
            kind={KIND.secondary}
            onClick={() => setUploadOpen(true)}
            overrides={{
              BaseButton: {
                style: {
                  backgroundColor: '#333',
                  color: '#FFF',
                  ':hover': { backgroundColor: '#444' },
                  fontSize: '12px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                },
              },
            }}
          >
            📤 Upload Sheet
          </Button>
          <div className={css({ width: '200px' })}>
            <Select
              size="compact"
              options={repOptions}
              value={[repOptions.find(o => o.id === selectedRep) || repOptions[0]]}
              onChange={({ value }) => {
                if (value.length > 0) onRepChange(value[0].id as RepName | 'all');
              }}
              clearable={false}
              searchable={false}
              overrides={{
                Root: { style: { backgroundColor: '#333' } },
                ControlContainer: { style: { backgroundColor: '#333', borderColor: '#555', color: 'white' } },
                SingleValue: { style: { color: 'white' } },
                SelectArrow: { style: { color: 'white' } },
              }}
            />
          </div>
          <div className={css({
            color: '#999',
            fontSize: '12px',
            fontFamily: 'UberMoveText',
          })}>
            Updated: Mar 23, 2026 · 8:00 AM
          </div>
        </div>
      </div>

      {/* Tab Navigation - hidden when a specific rep is selected */}
      {selectedRep === 'all' && (
      <div className={css({
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E2E2',
        paddingLeft: '24px',
        paddingRight: '24px',
        overflowX: 'auto',
      })}>
        <Tabs
          activeKey={String(activeTab)}
          onChange={({ activeKey }) => onTabChange(Number(activeKey))}
          overrides={{
            TabList: { style: { gap: '0px' } },
            TabBorder: { style: { display: 'none' } },
            TabHighlight: { style: { backgroundColor: '#000' } },
          }}
        >
          {TAB_NAMES.map((name, i) => (
            <Tab
              key={i}
              title={name}
              overrides={{
                Tab: {
                  style: ({ $isActive }: { $isActive: boolean }) => ({
                    fontSize: '13px',
                    fontFamily: 'UberMoveText',
                    fontWeight: $isActive ? 500 : 400,
                    color: $isActive ? '#000' : '#666',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    whiteSpace: 'nowrap' as const,
                    ':hover': { color: '#000' },
                  }),
                },
              }}
            />
          ))}
        </Tabs>
      </div>
      )}

      {/* Content */}
      <div data-dashboard-content className={css({
        padding: '24px',
        maxWidth: '1400px',
        margin: '0 auto',
      })}>
        {children}
      </div>

      {/* Upload Modal */}
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <ThresholdsModal isOpen={thresholdsOpen} onClose={() => setThresholdsOpen(false)} />
      <AnalysisSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}
