import React from 'react';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FooterSection: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: 'POS System', href: '#features' },
    { name: 'Inventory Management', href: '#features' },
    { name: 'Staff Management', href: '#features' },
    { name: 'CRM & Loyalty', href: '#features' },
    { name: 'Analytics & Reports', href: '#features' },
    { name: 'Revenue Management', href: '#features' },
  ];

  const supportLinks = [
    { name: 'Help Center', href: '#' },
    { name: 'Documentation', href: '#' },
    { name: 'Video Tutorials', href: '#' },
    { name: 'API Reference', href: '#' },
    { name: 'System Status', href: '#' },
    { name: 'Contact Support', href: '#' },
  ];

  const companyLinks = [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Partners', href: '#' },
    { name: 'Press Kit', href: '#' },
  ];

  const socialLinks = [
    { icon: <Facebook className="w-5 h-5" />, href: '#', label: 'Facebook' },
    { icon: <Twitter className="w-5 h-5" />, href: '#', label: 'Twitter' },
    { icon: <Instagram className="w-5 h-5" />, href: '#', label: 'Instagram' },
    { icon: <Linkedin className="w-5 h-5" />, href: '#', label: 'LinkedIn' },
    { icon: <Youtube className="w-5 h-5" />, href: '#', label: 'YouTube' },
  ];

  const scrollToSection = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="bg-[#1A1A2E] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl landing-coral-gradient flex items-center justify-center shadow-lg">
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
                <span className="text-2xl font-bold">Swadeshi</span>
                <span className="text-2xl font-bold text-[#FF6B6B]"> Solutions</span>
              </div>
            </div>
            
            <p className="text-gray-400 mb-6 leading-relaxed max-w-md">
              India's most comprehensive restaurant and hotel management platform. 
              Built for Indian businesses, by Indian innovators. Trusted by 500+ restaurants nationwide.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <a href="tel:+919876543210" className="flex items-center gap-3 text-gray-400 hover:text-[#FF6B6B] transition-colors">
                <Phone className="w-5 h-5" />
                <span>+91 98765 43210</span>
              </a>
              <a href="mailto:info@swadeshisolutions.com" className="flex items-center gap-3 text-gray-400 hover:text-[#FF6B6B] transition-colors">
                <Mail className="w-5 h-5" />
                <span>info@swadeshisolutions.com</span>
              </a>
              <div className="flex items-start gap-3 text-gray-400">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>123 Business Park, Mumbai, Maharashtra 400001</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-[#FF6B6B] flex items-center justify-center transition-all duration-300 hover:scale-110"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Products</h3>
            <ul className="space-y-3">
              {productLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-gray-400 hover:text-[#FF6B6B] transition-colors text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Support</h3>
            <ul className="space-y-3">
              {supportLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-[#FF6B6B] transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-[#FF6B6B] transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>

            {/* Newsletter signup */}
            <div className="mt-8">
              <h4 className="font-semibold mb-3 text-white">Stay Updated</h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B6B] transition-colors text-sm"
                />
                <button className="px-4 py-2 bg-[#FF6B6B] hover:bg-[#e85555] rounded-xl transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Swadeshi Solutions. All rights reserved.
            </p>
            
            <div className="flex flex-wrap gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-[#FF6B6B] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#FF6B6B] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[#FF6B6B] transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-[#FF6B6B] transition-colors">Refund Policy</a>
            </div>

            {/* Made in India badge */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Made with</span>
              <span className="text-[#FF6B6B]">❤️</span>
              <span className="text-gray-400">in India</span>
              <span className="text-lg">🇮🇳</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
