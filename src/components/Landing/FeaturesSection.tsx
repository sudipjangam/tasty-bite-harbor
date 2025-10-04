import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Package, 
  CalendarDays, 
  DollarSign,
  Sparkles,
  Smartphone,
  Shield,
  Zap,
  Cloud,
  HeartHandshake
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Multi-Channel POS",
      description: "Unified POS for dine-in, QSR, delivery, and takeaway with seamless order management.",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "AI-Powered Analytics",
      description: "Real-time insights, predictive analytics, and AI assistant for data-driven decisions.",
      color: "from-purple-500 to-pink-600"
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: "Smart Inventory",
      description: "Automated stock tracking, low-stock alerts, and intelligent reordering system.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Staff Management",
      description: "Complete HR solution with time tracking, scheduling, payroll, and performance metrics.",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "Financial Suite",
      description: "Invoicing, expense tracking, P&L statements, GST reporting, and budget management.",
      color: "from-cyan-500 to-blue-600"
    },
    {
      icon: <CalendarDays className="w-8 h-8" />,
      title: "Reservations & CRM",
      description: "Table bookings, room management, guest profiles, and loyalty programs.",
      color: "from-violet-500 to-purple-600"
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Marketing Automation",
      description: "WhatsApp campaigns, customer segmentation, promotional tools, and engagement tracking.",
      color: "from-pink-500 to-rose-600"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Mobile & Web Access",
      description: "Access from anywhere with responsive design and native mobile experience.",
      color: "from-indigo-500 to-blue-600"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enterprise Security",
      description: "Bank-grade encryption, role-based access, audit logs, and data backup.",
      color: "from-red-500 to-orange-600"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Optimized performance with sub-second response times and real-time sync.",
      color: "from-yellow-500 to-orange-600"
    },
    {
      icon: <Cloud className="w-8 h-8" />,
      title: "Cloud-Based",
      description: "No servers to manage. Automatic updates, backups, and 99.9% uptime guaranteed.",
      color: "from-sky-500 to-cyan-600"
    },
    {
      icon: <HeartHandshake className="w-8 h-8" />,
      title: "24/7 Support",
      description: "Dedicated support team available round-the-clock to help you succeed.",
      color: "from-fuchsia-500 to-pink-600"
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Succeed
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            A comprehensive platform built specifically for Indian restaurants and hotels
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-2xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900"
            >
              <CardContent className="p-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            And many more features to help you grow your business
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>✓ Kitchen Display System</span>
            <span>✓ QR Code Menus</span>
            <span>✓ UPI Payments</span>
            <span>✓ Channel Management</span>
          </div>
        </div>
      </div>
    </section>
  );
};
