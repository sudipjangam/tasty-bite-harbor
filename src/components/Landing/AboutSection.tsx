import React, { useEffect, useRef, useState } from 'react';
import { Linkedin, Twitter, Mail, Heart, Users, Target, Lightbulb } from 'lucide-react';

export const AboutSection: React.FC = () => {
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

  const founders = [
    {
      name: 'Sudip Jangam',
      role: 'Founder & CEO',
      bio: 'Visionary entrepreneur with a passion for transforming the Indian hospitality industry through technology. Leading Swadeshi Solutions towards becoming India\'s #1 restaurant tech platform.',
      avatar: 'SJ',
      color: '#FF6B6B',
      linkedin: '#',
      twitter: '#',
    },
    {
      name: 'Rohan Jadhav',
      role: 'Co-Founder & CTO',
      bio: 'Tech innovator driving the cutting-edge development of RMS Pro. Expert in scalable cloud architectures and AI-driven solutions for the hospitality sector.',
      avatar: 'RJ',
      color: '#2D3A5F',
      linkedin: '#',
      twitter: '#',
    },
  ];

  const values = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Made in India',
      description: 'Built by Indians, for Indian businesses. We understand the unique needs of the Indian hospitality industry.',
      color: '#FF6B6B',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Customer First',
      description: 'Every feature we build is driven by real feedback from restaurant owners across the country.',
      color: '#6BCB77',
    },
    {
      icon: <Lightbulb className="w-8 h-8" />,
      title: 'Innovation',
      description: 'Constantly pushing boundaries with AI, analytics, and automation to keep you ahead of competition.',
      color: '#FFD93D',
    },
  ];

  return (
    <section 
      id="about" 
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-white to-[#FFF8F0] dark:from-[#1A1A2E] dark:to-[#2D3A5F]/20 relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF6B6B]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#2D3A5F]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-2 bg-[#FF6B6B]/10 text-[#FF6B6B] text-sm font-semibold rounded-full mb-4">
            ABOUT US
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-6">
            Meet <span className="landing-gradient-text">Swadeshi Solutions</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            We're on a mission to digitize and transform India's hospitality industry. 
            Our homegrown technology empowers restaurants and hotels to compete in the digital age.
          </p>
        </div>

        {/* Founders Section */}
        <div className={`mb-20 ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <h3 className="text-2xl font-bold text-center text-[#2D3A5F] dark:text-white mb-12">
            <Users className="inline-block w-8 h-8 mr-2 text-[#FF6B6B]" />
            Leadership Team
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {founders.map((founder, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-[#2D3A5F]/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 dark:border-gray-700 relative overflow-hidden"
              >
                {/* Decorative gradient */}
                <div 
                  className="absolute top-0 left-0 w-full h-1.5"
                  style={{ background: `linear-gradient(90deg, ${founder.color}, ${founder.color}80)` }}
                />
                
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300"
                    style={{ background: `linear-gradient(135deg, ${founder.color}, ${founder.color}cc)` }}
                  >
                    {founder.avatar}
                  </div>

                  {/* Name & Role */}
                  <h4 className="text-2xl font-bold text-[#2D3A5F] dark:text-white mb-1">
                    {founder.name}
                  </h4>
                  <p 
                    className="text-sm font-semibold mb-4"
                    style={{ color: founder.color }}
                  >
                    {founder.role}
                  </p>

                  {/* Bio */}
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                    {founder.bio}
                  </p>

                  {/* Social Links */}
                  <div className="flex gap-3">
                    <a 
                      href={founder.linkedin}
                      className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-[#0077B5] hover:text-white text-gray-600 dark:text-gray-400 transition-all duration-300"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a 
                      href={founder.twitter}
                      className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-[#1DA1F2] hover:text-white text-gray-600 dark:text-gray-400 transition-all duration-300"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                    <a 
                      href={`mailto:${founder.name.toLowerCase().replace(' ', '.')}@swadeshisolutions.com`}
                      className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-[#FF6B6B] hover:text-white text-gray-600 dark:text-gray-400 transition-all duration-300"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Our Values */}
        <div className={`${isVisible ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
          <h3 className="text-2xl font-bold text-center text-[#2D3A5F] dark:text-white mb-12">
            Our Core Values
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center group"
              >
                <div 
                  className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                  style={{ background: `linear-gradient(135deg, ${value.color}, ${value.color}cc)` }}
                >
                  {value.icon}
                </div>
                <h4 className="text-xl font-bold text-[#2D3A5F] dark:text-white mb-3">
                  {value.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Company Stats */}
        <div className={`mt-20 ${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <div className="bg-gradient-to-r from-[#2D3A5F] to-[#3d4d7a] rounded-3xl p-12 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { number: '2023', label: 'Founded' },
                { number: '500+', label: 'Restaurants' },
                { number: '50+', label: 'Cities' },
                { number: '24/7', label: 'Support' },
              ].map((stat, index) => (
                <div key={index}>
                  <div className="text-4xl font-bold text-[#FFD93D] mb-2">{stat.number}</div>
                  <div className="text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
