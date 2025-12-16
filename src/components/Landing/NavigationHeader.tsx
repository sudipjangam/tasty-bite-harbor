import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NavigationHeader: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      
      setIsScrolled(scrollTop > 50);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Why Us', href: '#why-choose-us' },
    { name: 'About', href: '#about' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'FAQ', href: '#faq' },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 z-[60] landing-scroll-progress"
        style={{ width: `${scrollProgress}%` }}
      />

      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'landing-nav-scrolled py-3' 
            : 'bg-transparent py-5'
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => scrollToSection('#hero')}>
              <div className="w-12 h-12 rounded-2xl landing-coral-gradient flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 11V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8"></path>
                  <path d="m12 12 4 4"></path>
                  <path d="M20 12h-8"></path>
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-[#2D3A5F] dark:text-white">
                  Swadeshi
                </span>
                <span className="text-xl font-bold text-[#FF6B6B]"> Solutions</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="text-[#2D3A5F] dark:text-gray-200 hover:text-[#FF6B6B] font-medium transition-colors duration-300 relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#FF6B6B] group-hover:w-full transition-all duration-300" />
                </button>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-[#2D3A5F] dark:text-gray-200 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10 font-medium"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button
                className="landing-btn-primary px-6 py-2.5 rounded-xl font-semibold"
                onClick={() => navigate('/auth')}
              >
                Start Free Trial
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-xl bg-[#FF6B6B]/10 text-[#FF6B6B] hover:bg-[#FF6B6B]/20 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div 
          className={`lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-[#1A1A2E] shadow-xl transition-all duration-300 overflow-hidden ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="container mx-auto px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.href)}
                className="block w-full text-left text-[#2D3A5F] dark:text-gray-200 hover:text-[#FF6B6B] font-medium py-2 transition-colors"
              >
                {link.name}
              </button>
            ))}
            <hr className="border-gray-200 dark:border-gray-700" />
            <div className="space-y-3 pt-2">
              <Button
                variant="outline"
                className="w-full border-[#2D3A5F] text-[#2D3A5F] hover:bg-[#2D3A5F] hover:text-white"
                onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}
              >
                Sign In
              </Button>
              <Button
                className="w-full landing-btn-primary rounded-xl font-semibold"
                onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
