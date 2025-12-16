import React from 'react';
import { NavigationHeader } from "@/components/Landing/NavigationHeader";
import { HeroSection } from "@/components/Landing/HeroSection";
import { HowItWorksSection } from "@/components/Landing/HowItWorksSection";
import { FeaturesSection } from "@/components/Landing/FeaturesSection";
import { WhyChooseUsSection } from "@/components/Landing/WhyChooseUsSection";
import { AboutSection } from "@/components/Landing/AboutSection";
import { PricingSection } from "@/components/Landing/PricingSection";
import { TestimonialsSection } from "@/components/Landing/TestimonialsSection";
import { FAQSection } from "@/components/Landing/FAQSection";
import { CTASection } from "@/components/Landing/CTASection";
import { FooterSection } from "@/components/Landing/FooterSection";
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
        
        {/* How It Works */}
        <HowItWorksSection />
        
        {/* Features */}
        <FeaturesSection />

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
    </div>
  );
};

export default LandingWebsite;
