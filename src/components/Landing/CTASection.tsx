import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      navigate('/auth');
    }
  };

  return (
    <section 
      ref={sectionRef}
      className="py-24 relative overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B6B] via-[#e85555] to-[#2D3A5F]" />

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float-slow" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-float animation-delay-1000" />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-[#FFD93D]/20 rounded-full blur-2xl animate-float-slow animation-delay-500" />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-[#6BCB77]/10 rounded-full blur-2xl animate-float animation-delay-1500" />

        {/* Floating icons */}
        <div className="absolute top-20 right-20 animate-float">
          <Sparkles className="w-8 h-8 text-white/30" />
        </div>
        <div className="absolute bottom-20 left-20 animate-float-slow animation-delay-1000">
          <Sparkles className="w-6 h-6 text-white/20" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`max-w-4xl mx-auto text-center ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Join 500+ Successful Restaurants
          </span>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to Transform Your
            <br />
            <span className="text-[#FFD93D]">Restaurant Business?</span>
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Start your 14-day free trial today. No credit card required. 
            Join thousands of restaurants already growing with Swadeshi Solutions.
          </p>

          {/* Email Capture Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-8">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white text-[#2D3A5F] placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all"
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="px-8 py-4 bg-[#2D3A5F] hover:bg-[#3d4d7a] text-white rounded-2xl font-semibold group whitespace-nowrap"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-white/70 text-sm">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Free 14-day trial
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              24/7 support
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
