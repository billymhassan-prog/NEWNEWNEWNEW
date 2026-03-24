import { useStyletron } from "baseui";
import { RepName } from "../data/dashboardData";
import { SectionHeader } from "../components/SharedUI";
import HeadCoach from "./HeadCoach";
import Attainment from "./Attainment";
import ActivityL12D from "./ActivityL12D";
import ActivityL12W from "./ActivityL12W";
import Pipeline from "./PipelinePage";
import CWnFTPage from "./CWnFTPage";
import NDGPage from "./NDGPage";
import ScorecardsPage from "./ScorecardsPage";
import CoachingPage from "./CoachingPage";
import RiskMonitor from "./RiskMonitor";

const SECTIONS = [
  { title: 'Overview', component: HeadCoach },
  { title: 'Q1 Attainment', component: Attainment },
  { title: 'L12D Activity', component: ActivityL12D },
  { title: 'L12W Activity', component: ActivityL12W },
  { title: 'Pipeline', component: Pipeline },
  { title: 'CWnFT', component: CWnFTPage },
  { title: 'NDG / Monetization', component: NDGPage },
  { title: 'Scorecards', component: ScorecardsPage },
  { title: 'Coaching', component: CoachingPage },
  { title: 'Risk Monitor', component: RiskMonitor },
];

export default function RepSinglePage({ selectedRep }: { selectedRep: RepName }) {
  const [css] = useStyletron();

  return (
    <div>
      <div className={css({
        fontFamily: 'UberMove', fontWeight: 700, fontSize: '24px', marginBottom: '8px',
      })}>
        {selectedRep} — Full Overview
      </div>
      <div className={css({ fontSize: '13px', fontFamily: 'UberMoveText', color: '#888', marginBottom: '24px' })}>
        All dashboard sections for {selectedRep} in one view
      </div>

      {SECTIONS.map(({ title, component: Component }, i) => (
        <div key={i} className={css({ marginBottom: '32px' })} id={`section-${i}`}>
          <div className={css({
            fontFamily: 'UberMove', fontWeight: 700, fontSize: '18px',
            padding: '12px 16px', backgroundColor: '#000', color: '#FFF',
            borderRadius: '8px 8px 0 0', marginBottom: '0',
          })}>
            {title}
          </div>
          <div className={css({
            border: '1px solid #E8E8E8', borderTop: 'none',
            borderRadius: '0 0 8px 8px', padding: '20px',
            backgroundColor: '#FAFAFA',
          })}>
            <Component selectedRep={selectedRep} />
          </div>
        </div>
      ))}
    </div>
  );
}
