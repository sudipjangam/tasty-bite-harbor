import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageSquare, 
  Brain, 
  IndianRupee, 
  Shield, 
  Zap, 
  Clock, 
  Smartphone, 
  Cloud,
  HeadphonesIcon,
  TrendingUp,
  RefreshCw,
  Globe
} from 'lucide-react';

export const WhyChooseUsSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const advantages = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'WhatsApp Integration',
      description: 'Native WhatsApp for order updates, customer engagement, and marketing campaigns. No extra apps needed.',
      highlight: 'Unique Feature',
      color: '#25D366',
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: 'AI-Powered Insights',
      description: 'Smart analytics predict demand, optimize inventory, and suggest menu improvements. Reduce waste by up to 30%.',
      highlight: 'AI Inside',
      color: '#FF6B6B',
    },
    {
      icon: <IndianRupee className="w-8 h-8" />,
      title: '50% Lower Cost',
      description: 'Premium features at half the price of Petpooja, Restroworks, and Square. No hidden fees, ever.',
      highlight: 'Best Value',
      color: '#6BCB77',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Made in India',
      description: 'Built by Indians for Indian businesses. GST-ready, UPI integrated, local payment gateways supported.',
      highlight: 'Local First',
      color: '#FF9933',
    },
    {
      icon: <Cloud className="w-8 h-8" />,
      title: '100% Cloud-Based',
      description: 'Access from anywhere, any device. No hardware requirements. Automatic backups and updates.',
      highlight: 'Zero Maintenance',
      color: '#2D3A5F',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Lightning Fast',
      description: 'Modern React-based interface loads instantly. Process orders in seconds, not minutes.',
      highlight: 'Blazing Speed',
      color: '#FFD93D',
    },
    {
      icon: <HeadphonesIcon className="w-8 h-8" />,
      title: '24/7 Indian Support',
      description: 'Real humans in your timezone. Call, chat, or WhatsApp. Average response time under 5 minutes.',
      highlight: 'Always Available',
      color: '#FF6B6B',
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Works on Any Device',
      description: 'Use your existing tablets, phones, or laptops. No expensive proprietary hardware needed.',
      highlight: 'BYOD Friendly',
      color: '#6BCB77',
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: 'Zomato/Swiggy Ready',
      description: 'Direct integration with food aggregators, ONDC, and all major platforms. Orders sync automatically.',
      highlight: 'All Channels',
      color: '#E23744',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Revenue Optimization',
      description: 'Dynamic pricing, table turnover analytics, and upsell suggestions to boost your bottom line.',
      highlight: 'Grow Revenue',
      color: '#2D3A5F',
    },
    {
      icon: <RefreshCw className="w-8 h-8" />,
      title: 'Free Lifetime Updates',
      description: 'New features added monthly at no extra cost. Your software always stays current.',
      highlight: 'Always Fresh',
      color: '#FFD93D',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Setup in 24 Hours',
      description: 'Go live in a single day. Free onboarding, data migration, and staff training included.',
      highlight: 'Quick Start',
      color: '#FF6B6B',
    },
  ];

  const competitorComparison = [
    { feature: 'Annual Cost (Starter)', us: '₹7,999', petpooja: '₹10,000+', restroworks: '₹25,000+', square: '₹48,000+' },
    { feature: 'WhatsApp Integration', us: '✓ Native', petpooja: '✓ Limited', restroworks: '✗', square: '✗' },
    { feature: 'AI Analytics', us: '✓ Included', petpooja: '✓ Basic', restroworks: '✓ Extra cost', square: '✗' },
    { feature: 'Hardware Required', us: '✗ Use any device', petpooja: '✓ Android tablet', restroworks: '✓ KDS screens', square: '✓ Square kit' },
    { feature: 'Setup Fee', us: '₹0 Free', petpooja: '₹2,000-5,000', restroworks: '₹5,000-10,000', square: 'Included' },
    { feature: '24/7 Phone Support', us: '✓ Free', petpooja: '✓ Paid', restroworks: '✓ Enterprise only', square: '✓' },
    { feature: 'Multi-location', us: '✓ From Growth', petpooja: 'Extra cost', restroworks: '✓', square: '✓' },
  ];

  return (
    <section 
      id="why-choose-us" 
      ref={sectionRef}
      className="py-24 bg-white dark:bg-[#1A1A2E] relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-[#6BCB77]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-[#FF6B6B]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9933]/10 text-[#FF9933] text-sm font-semibold rounded-full mb-4">
            <span className="w-2 h-3 bg-[#FF9933]" />
            <span className="w-2 h-3 bg-white border border-gray-300" />
            <span className="w-2 h-3 bg-[#138808]" />
            PROUDLY MADE IN INDIA
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-6">
            Why Restaurants <span className="landing-gradient-text">Choose Us</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            We're not just another POS system. We're your technology partner built for Indian hospitality.
          </p>
        </div>

        {/* Advantages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
          {advantages.map((advantage, index) => (
            <div
              key={index}
              className={`group relative bg-white dark:bg-[#2D3A5F]/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-transparent transition-all duration-500 hover:shadow-xl hover:-translate-y-2 ${
                isVisible ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Highlight badge */}
              <span 
                className="absolute -top-3 right-4 px-3 py-1 text-xs font-bold text-white rounded-full shadow-md"
                style={{ backgroundColor: advantage.color }}
              >
                {advantage.highlight}
              </span>

              {/* Icon */}
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300"
                style={{ background: `linear-gradient(135deg, ${advantage.color}, ${advantage.color}cc)` }}
              >
                {advantage.icon}
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-[#2D3A5F] dark:text-white mb-2">
                {advantage.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {advantage.description}
              </p>
            </div>
          ))}
        </div>

        {/* Competitor Comparison Table */}
        <div className={`${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <h3 className="text-2xl font-bold text-center text-[#2D3A5F] dark:text-white mb-8">
            See How We Compare
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full max-w-5xl mx-auto bg-white dark:bg-[#2D3A5F]/30 rounded-2xl shadow-xl overflow-hidden">
              <thead>
                <tr className="bg-[#2D3A5F] text-white">
                  <th className="px-6 py-4 text-left font-semibold">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold bg-[#FF6B6B]">
                    <div className="flex flex-col items-center">
                      <span className="text-xs opacity-75">OUR</span>
                      <span>Swadeshi</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center font-semibold opacity-75">Petpooja</th>
                  <th className="px-6 py-4 text-center font-semibold opacity-75">Restroworks</th>
                  <th className="px-6 py-4 text-center font-semibold opacity-75">Square</th>
                </tr>
              </thead>
              <tbody>
                {competitorComparison.map((row, index) => (
                  <tr 
                    key={index}
                    className={`border-b border-gray-100 dark:border-gray-700 ${
                      index % 2 === 0 ? 'bg-gray-50 dark:bg-[#2D3A5F]/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-medium text-[#2D3A5F] dark:text-white">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#6BCB77] bg-[#6BCB77]/5">
                      {row.us}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                      {row.petpooja}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                      {row.restroworks}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                      {row.square}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
