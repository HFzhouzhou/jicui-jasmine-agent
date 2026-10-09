import HeroSection from './HeroSection';
import FeaturesEntrySection from './FeaturesEntrySection';
import BrandIntroSection from './BrandIntroSection';
import NewUserGuide from '@/components/NewUserGuide';
import DailyTeaSign from '@/components/DailyTeaSign';
import GuessYouLike from '@/components/GuessYouLike';
import YoungScenesStrip from '@/components/YoungScenesStrip';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="space-y-0">
        <HeroSection />
        <section className="w-full bg-gradient-to-b from-primary/5 to-transparent py-4">
          <div className="max-w-3xl mx-auto px-4">
            <YoungScenesStrip variant="home" />
          </div>
        </section>
        <DailyTeaSign />
        <GuessYouLike count={3} />
        <FeaturesEntrySection />
        <BrandIntroSection />
      </main>
      <NewUserGuide />
    </div>
  );
}
