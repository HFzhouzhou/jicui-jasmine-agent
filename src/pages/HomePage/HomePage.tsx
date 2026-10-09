import HeroSection from './HeroSection';
import FeaturesEntrySection from './FeaturesEntrySection';
import BrandIntroSection from './BrandIntroSection';
import BrandPromotions from './BrandPromotions';
import GuessYouLike from '@/components/GuessYouLike';
import { useMenu } from '@/hooks/useMenu';

export default function HomePage() {
  const { drinks, loading, error, refresh } = useMenu();
  const storeDrinks = drinks.filter((drink) => drink.catalogStatus !== 'legacy');
  return <div className="min-h-screen bg-[#f7f7ef]"><HeroSection drinks={storeDrinks} loading={loading} error={error} /><GuessYouLike drinks={storeDrinks} loading={loading} error={error} onRetry={() => void refresh()} /><BrandPromotions /><FeaturesEntrySection /><BrandIntroSection /></div>;
}
