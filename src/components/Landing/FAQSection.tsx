import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, MessageCircle } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');
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

  const faqs = [
    {
      category: 'Getting Started',
      question: 'How long does it take to set up Swadeshi Solutions?',
      answer: 'Most restaurants are up and running within 30 minutes! Our onboarding wizard guides you through the setup process, and our support team is available to help if needed. You can import your existing menu and start taking orders the same day.',
    },
    {
      category: 'Getting Started',
      question: 'Do I need any special hardware?',
      answer: 'No special hardware is required. Swadeshi Solutions works on any device with a web browser - tablets, laptops, desktops, or even smartphones. If you need hardware like thermal printers or kitchen displays, we can recommend compatible options.',
    },
    {
      category: 'Pricing',
      question: 'Is there a free trial available?',
      answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card is required to start. You can explore everything and decide which plan works best for your business.',
    },
    {
      category: 'Pricing',
      question: 'Can I switch plans later?',
      answer: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features. When downgrading, the change takes effect at the start of your next billing cycle.',
    },
    {
      category: 'Features',
      question: 'Does it work offline?',
      answer: 'Yes! Our offline mode ensures you can continue taking orders even when your internet connection is unstable. Orders are automatically synced when connectivity is restored.',
    },
    {
      category: 'Features',
      question: 'Can I manage multiple restaurant locations?',
      answer: 'Yes, our Professional and Enterprise plans support multi-location management. You get a centralized dashboard to monitor all locations, consolidated reporting, and the ability to manage inventory across outlets.',
    },
    {
      category: 'Support',
      question: 'What kind of support do you offer?',
      answer: 'We offer email support for Starter plans and 24/7 priority support for Professional and Enterprise plans. Enterprise customers also get a dedicated account manager. Our help center includes video tutorials and documentation.',
    },
    {
      category: 'Security',
      question: 'How secure is my data?',
      answer: 'We use bank-grade 256-bit SSL encryption for all data transmission. Your data is stored in secure cloud servers with regular backups. We are compliant with industry standards and never share your data with third parties.',
    },
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section 
      id="faq" 
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-[#FFF8F0] to-white dark:from-[#2D3A5F]/20 dark:to-[#1A1A2E] relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-1/4 right-0 w-72 h-72 bg-[#6BCB77]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-[#FF6B6B]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-2 bg-[#2D3A5F]/10 dark:bg-[#2D3A5F]/30 text-[#2D3A5F] dark:text-white text-sm font-semibold rounded-full mb-4">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-6">
            Frequently Asked <span className="landing-gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Find answers to common questions about Swadeshi Solutions
          </p>
        </div>

        {/* Search Bar */}
        <div className={`max-w-2xl mx-auto mb-12 ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2D3A5F]/30 text-[#2D3A5F] dark:text-white placeholder-gray-400 focus:border-[#FF6B6B] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className={`max-w-3xl mx-auto ${isVisible ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-[#2D3A5F]/30 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <span 
                      className="px-3 py-1 text-xs font-medium rounded-full"
                      style={{ 
                        backgroundColor: faq.category === 'Getting Started' ? '#FF6B6B20' : 
                                        faq.category === 'Pricing' ? '#6BCB7720' :
                                        faq.category === 'Features' ? '#FFD93D20' :
                                        faq.category === 'Support' ? '#2D3A5F20' : '#FF6B6B20',
                        color: faq.category === 'Getting Started' ? '#FF6B6B' : 
                               faq.category === 'Pricing' ? '#6BCB77' :
                               faq.category === 'Features' ? '#c9a520' :
                               faq.category === 'Support' ? '#2D3A5F' : '#FF6B6B'
                      }}
                    >
                      {faq.category}
                    </span>
                    <span className="font-semibold text-[#2D3A5F] dark:text-white">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-500 transition-transform duration-300 flex-shrink-0 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No matching questions found. Try a different search term.</p>
            </div>
          )}
        </div>

        {/* Still have questions CTA */}
        <div className={`mt-16 text-center ${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <div className="landing-glass-card inline-flex items-center gap-4 px-8 py-6 rounded-2xl">
            <div className="w-12 h-12 rounded-full landing-coral-gradient flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#2D3A5F] dark:text-white">Still have questions?</p>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Our team is here to help. <a href="#contact" className="text-[#FF6B6B] hover:underline">Contact us</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
