import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Rajesh Sharma",
      role: "Owner, The Spice Route",
      location: "Mumbai, Maharashtra",
      rating: 5,
      text: "Swadeshi Solutions transformed our restaurant operations completely. The AI analytics helped us reduce food waste by 30% and increase profits by 25%. The team is responsive and the system is incredibly easy to use.",
      avatar: "RS"
    },
    {
      name: "Priya Patel",
      role: "Manager, Coastal Delights",
      location: "Goa",
      rating: 5,
      text: "We've been using Swadeshi Solutions for over a year now. The inventory management and staff scheduling features have saved us countless hours. The WhatsApp integration for customer engagement is a game-changer!",
      avatar: "PP"
    },
    {
      name: "Vikram Singh",
      role: "CEO, Heritage Hotels Group",
      location: "Delhi NCR",
      rating: 5,
      text: "Managing 5 properties was a nightmare before Swadeshi Solutions. Now we have real-time visibility across all locations. The revenue management system has increased our ADR by 18%. Highly recommended!",
      avatar: "VS"
    },
    {
      name: "Anjali Reddy",
      role: "Owner, South Indian Express",
      location: "Bangalore, Karnataka",
      rating: 5,
      text: "The QSR POS module is perfect for our quick-service restaurant. Orders are processed in seconds, and the kitchen display system keeps our team coordinated. Customer satisfaction has improved significantly.",
      avatar: "AR"
    },
    {
      name: "Mohammed Khan",
      role: "Director, Khan's Biryani House",
      location: "Hyderabad, Telangana",
      rating: 5,
      text: "Best investment we've made! The loyalty program features helped us retain customers and the financial reporting is excellent for GST filing. The support team is always available when we need help.",
      avatar: "MK"
    },
    {
      name: "Sneha Kapoor",
      role: "GM, Mountain View Resort",
      location: "Shimla, Himachal Pradesh",
      rating: 5,
      text: "As a boutique resort, we needed something comprehensive yet easy to use. Swadeshi Solutions exceeded our expectations. The guest management and housekeeping modules are fantastic. Our operational efficiency has doubled!",
      avatar: "SK"
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Loved by{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Restaurant Owners
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            See what our customers have to say about transforming their businesses
          </p>
        </div>

        {/* Overall Rating */}
        <div className="flex justify-center mb-12">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-8 text-center max-w-md">
            <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
              4.9
            </div>
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Based on 500+ reviews
            </p>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900"
            >
              <CardContent className="p-6">
                <Quote className="w-10 h-10 text-indigo-600 dark:text-indigo-400 mb-4 opacity-50" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial text */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author info */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {testimonial.location}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
