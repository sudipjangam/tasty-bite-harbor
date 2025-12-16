import React, { useEffect, useRef, useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export const TestimonialsSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const testimonials = [
    {
      name: 'Rajesh Sharma',
      role: 'Owner, The Spice Route',
      location: 'Mumbai, Maharashtra',
      rating: 5,
      text: 'Swadeshi Solutions transformed our restaurant operations completely. The AI analytics helped us reduce food waste by 30% and increase profits by 25%. The team is responsive and the system is incredibly easy to use.',
      avatar: 'RS',
      highlight: 'Reduced waste by 30%',
    },
    {
      name: 'Priya Patel',
      role: 'Manager, Coastal Delights',
      location: 'Goa',
      rating: 5,
      text: "We've been using Swadeshi Solutions for over a year now. The inventory management and staff scheduling features have saved us countless hours. The WhatsApp integration for customer engagement is a game-changer!",
      avatar: 'PP',
      highlight: 'Saved countless hours',
    },
    {
      name: 'Vikram Singh',
      role: 'CEO, Heritage Hotels Group',
      location: 'Delhi NCR',
      rating: 5,
      text: 'Managing 5 properties was a nightmare before Swadeshi Solutions. Now we have real-time visibility across all locations. The revenue management system has increased our ADR by 18%. Highly recommended!',
      avatar: 'VS',
      highlight: 'Increased ADR by 18%',
    },
    {
      name: 'Anjali Reddy',
      role: 'Owner, South Indian Express',
      location: 'Bangalore, Karnataka',
      rating: 5,
      text: 'The QSR POS module is perfect for our quick-service restaurant. Orders are processed in seconds, and the kitchen display system keeps our team coordinated. Customer satisfaction has improved significantly.',
      avatar: 'AR',
      highlight: 'Orders in seconds',
    },
    {
      name: 'Mohammed Khan',
      role: 'Director, Khan\'s Biryani House',
      location: 'Hyderabad, Telangana',
      rating: 5,
      text: 'Best investment we\'ve made! The loyalty program features helped us retain customers and the financial reporting is excellent for GST filing. The support team is always available when we need help.',
      avatar: 'MK',
      highlight: 'Best investment made',
    },
  ];

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(() => {
      nextTestimonial();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section 
      id="testimonials" 
      ref={sectionRef}
      className="py-24 bg-white dark:bg-[#1A1A2E] relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD93D]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF6B6B]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-2 bg-[#FFD93D]/20 text-[#2D3A5F] dark:text-[#FFD93D] text-sm font-semibold rounded-full mb-4">
            TESTIMONIALS
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-6">
            Loved by <span className="landing-gradient-text">Restaurant Owners</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            See what our customers have to say about transforming their businesses
          </p>
        </div>

        {/* Overall Rating */}
        <div className={`flex justify-center mb-16 ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <div className="landing-glass-card rounded-2xl px-12 py-8 text-center">
            <div className="text-6xl font-bold landing-stat-number mb-2">4.9</div>
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-[#FFD93D] text-[#FFD93D]" />
              ))}
            </div>
            <p className="text-gray-600 dark:text-gray-400">Based on 500+ reviews</p>
          </div>
        </div>

        {/* Testimonials Carousel */}
        <div className={`relative max-w-4xl mx-auto ${isVisible ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
          {/* Main Testimonial Card */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <div className="landing-testimonial-card rounded-3xl p-8 md:p-12 shadow-xl">
                    {/* Quote icon */}
                    <Quote className="w-12 h-12 text-[#FF6B6B] opacity-30 mb-6" />

                    {/* Rating */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-[#FFD93D] text-[#FFD93D]" />
                      ))}
                    </div>

                    {/* Highlight badge */}
                    <span className="inline-block px-4 py-1.5 bg-[#6BCB77]/10 text-[#6BCB77] text-sm font-semibold rounded-full mb-4">
                      {testimonial.highlight}
                    </span>

                    {/* Testimonial text */}
                    <p className="text-xl md:text-2xl text-[#2D3A5F] dark:text-white mb-8 leading-relaxed font-medium">
                      "{testimonial.text}"
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14">
                        <AvatarFallback className="landing-coral-gradient text-white font-bold text-lg">
                          {testimonial.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-[#2D3A5F] dark:text-white text-lg">
                          {testimonial.name}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          {testimonial.role}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          {testimonial.location}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="w-12 h-12 rounded-full border-2 border-[#2D3A5F] dark:border-gray-600 hover:bg-[#2D3A5F] hover:text-white dark:hover:bg-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === activeIndex 
                      ? 'bg-[#FF6B6B] w-8' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="w-12 h-12 rounded-full border-2 border-[#2D3A5F] dark:border-gray-600 hover:bg-[#2D3A5F] hover:text-white dark:hover:bg-gray-600"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
