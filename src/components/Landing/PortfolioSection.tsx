import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";

export const PortfolioSection = () => {
  const caseStudies = [
    {
      name: "The Spice Route",
      type: "Fine Dining Restaurant",
      location: "Mumbai",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
      results: [
        { icon: <TrendingUp />, label: "Revenue Growth", value: "+35%" },
        { icon: <Users />, label: "Customer Retention", value: "+45%" },
        { icon: <Clock />, label: "Time Saved", value: "20hrs/week" }
      ],
      description: "Reduced food waste by 30% and streamlined operations across 2 locations"
    },
    {
      name: "Coastal Delights",
      type: "Multi-Cuisine Restaurant",
      location: "Goa",
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop",
      results: [
        { icon: <DollarSign />, label: "Cost Reduction", value: "-25%" },
        { icon: <Users />, label: "Staff Efficiency", value: "+40%" },
        { icon: <TrendingUp />, label: "Order Volume", value: "+60%" }
      ],
      description: "Improved order accuracy and customer satisfaction with integrated POS"
    },
    {
      name: "Heritage Hotels",
      type: "Boutique Hotel Chain",
      location: "Delhi NCR",
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop",
      results: [
        { icon: <TrendingUp />, label: "RevPAR Increase", value: "+28%" },
        { icon: <Users />, label: "Occupancy Rate", value: "85%" },
        { icon: <DollarSign />, label: "ADR Growth", value: "+18%" }
      ],
      description: "Centralized management of 5 properties with unified revenue system"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Success{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Stories
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Real results from real businesses across India
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {caseStudies.map((study, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 group"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={study.image}
                  alt={study.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {study.name}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {study.type} • {study.location}
                  </p>
                </div>
              </div>

              <CardContent className="p-6">
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {study.description}
                </p>

                <div className="grid grid-cols-3 gap-4">
                  {study.results.map((result, idx) => (
                    <div key={idx} className="text-center">
                      <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                        {result.icon}
                      </div>
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                        {result.value}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {result.label}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Industry Stats */}
        <div className="mt-20 bg-white dark:bg-slate-800 rounded-3xl p-12 shadow-xl">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Industry-Leading Results
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                30%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Average Cost Reduction
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                40%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Increase in Efficiency
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent mb-2">
                25%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Revenue Growth
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                95%
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Customer Satisfaction
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
