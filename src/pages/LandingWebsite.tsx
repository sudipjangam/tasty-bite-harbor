import React from 'react';
import { NavigationHeader } from "@/components/Landing/NavigationHeader";
import { HeroSection } from "@/components/Landing/HeroSection";
import { IntegrationsTicker } from "@/components/Landing/IntegrationsTicker";
import { PainPointsComparisonSection } from "@/components/Landing/PainPointsComparisonSection";
import { InteractiveExperienceSection } from "@/components/Landing/InteractiveExperienceSection";
import { HowItWorksSection } from "@/components/Landing/HowItWorksSection";
import { FeaturesSection } from "@/components/Landing/FeaturesSection";
import { CompetitorComparisonMatrix } from "@/components/Landing/CompetitorComparisonMatrix";
import { InteractiveRoiCalculator } from "@/components/Landing/InteractiveRoiCalculator";
import { TrustBadgesStrip } from "@/components/Landing/TrustBadgesStrip";
import { WhyChooseUsSection } from "@/components/Landing/WhyChooseUsSection";
import { AboutSection } from "@/components/Landing/AboutSection";
import { PricingSection } from "@/components/Landing/PricingSection";
import { TestimonialsSection } from "@/components/Landing/TestimonialsSection";
import { FAQSection } from "@/components/Landing/FAQSection";
import { CTASection } from "@/components/Landing/CTASection";
import { FooterSection } from "@/components/Landing/FooterSection";
import { FloatingWhatsAppButton } from "@/components/Landing/FloatingWhatsAppButton";
import { StickyDemoBanner } from "@/components/Landing/StickyDemoBanner";
import "@/styles/landing-animations.css";

const LandingWebsite = () => {
  return (
    <div className="landing-page-wrapper bg-white dark:bg-[#1A1A2E]">
      {/* Navigation - Fixed at top */}
      <NavigationHeader />
      
      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <HeroSection />

        {/* Integration Logos Marquee */}
        <IntegrationsTicker />

        {/* Pain Points: Leaky Bucket vs Own The Engine */}
        <PainPointsComparisonSection />

        {/* Live Interactive Sandbox / Demo Experience */}
        <InteractiveExperienceSection />
        
        {/* How It Works / Implementation Timeline */}
        <HowItWorksSection />
        
        {/* Features Deep-Dive */}
        <FeaturesSection />

        {/* Competitor Feature & Cost Comparison Matrix */}
        <CompetitorComparisonMatrix />

        {/* Interactive Cost & ROI Calculator */}
        <InteractiveRoiCalculator />

        {/* Trust Badges Strip */}
        <TrustBadgesStrip />

        {/* Why Choose Us - Competitive Advantages */}
        <WhyChooseUsSection />

        {/* About Swadeshi Solutions */}
        <AboutSection />
        
        {/* Pricing */}
        <PricingSection />
        
        {/* Testimonials */}
        <TestimonialsSection />
        
        {/* FAQ */}
        <FAQSection />
        
        {/* CTA */}
        <CTASection />
      </main>
      
      {/* Footer */}
      <FooterSection />

      {/* Floating WhatsApp Quick Connect */}
      <FloatingWhatsAppButton />

      {/* Sticky Bottom Demo Banner */}
      <StickyDemoBanner />
    </div>
  );
};

export default LandingWebsite;
