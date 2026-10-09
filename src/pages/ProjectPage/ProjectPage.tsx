import ProjectHeroSection from './ProjectHeroSection';
import BrandMissionSection from './BrandMissionSection';
import PainPointsSection from './PainPointsSection';
import JourneySection from './JourneySection';
import HighlightsSection from './HighlightsSection';
import DemoTimelineSection from './DemoTimelineSection';
import TeamSection from './TeamSection';
import ContactSection from './ContactSection';

export default function ProjectPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="space-y-0">
        <ProjectHeroSection />
        <BrandMissionSection />
        <PainPointsSection />
        <JourneySection />
        <HighlightsSection />
        <DemoTimelineSection />
        <TeamSection />
        <ContactSection />
      </main>
    </div>
  );
}
