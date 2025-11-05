import LandingNavbar from '../components/landing/LandingNavbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import DashboardPreview from '../components/landing/DashboardPreview';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <DashboardPreview />
      <LandingFooter />
    </div>
  );
}
