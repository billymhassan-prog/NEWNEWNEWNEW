import { useState } from "react";
import Layout from "../components/Layout";
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
import TeamPage from "./TeamPage";
import ManagerHub from "./ManagerHub";
import SummaryPage from "./SummaryPage";
import RepSinglePage from "./RepSinglePage";
import { RepName } from "../data/dashboardData";

const Index = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRep, setSelectedRep] = useState<RepName | 'all'>('all');

  const pages = [
    <HeadCoach selectedRep={selectedRep} />,
    <Attainment selectedRep={selectedRep} />,
    <ActivityL12D selectedRep={selectedRep} />,
    <ActivityL12W selectedRep={selectedRep} />,
    <Pipeline selectedRep={selectedRep} />,
    <CWnFTPage selectedRep={selectedRep} />,
    <NDGPage selectedRep={selectedRep} />,
    <ScorecardsPage selectedRep={selectedRep} />,
    <CoachingPage selectedRep={selectedRep} />,
    <RiskMonitor selectedRep={selectedRep} />,
    <TeamPage />,
    <ManagerHub />,
    <SummaryPage selectedRep={selectedRep} />,
  ];

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedRep={selectedRep}
      onRepChange={setSelectedRep}
    >
      {selectedRep !== 'all' ? (
        <RepSinglePage selectedRep={selectedRep} />
      ) : (
        pages[activeTab]
      )}
    </Layout>
  );
};

export default Index;
