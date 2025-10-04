import { HeroSection } from "@/components/Landing/HeroSection";
import { FeaturesSection } from "@/components/Landing/FeaturesSection";
import { PricingSection } from "@/components/Landing/PricingSection";
import { TestimonialsSection } from "@/components/Landing/TestimonialsSection";
import { PortfolioSection } from "@/components/Landing/PortfolioSection";
import { FooterSection } from "@/components/Landing/FooterSection";

const LandingWebsite = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <PortfolioSection />
      <FooterSection />
    </div>
  );
};

export default LandingWebsite;
