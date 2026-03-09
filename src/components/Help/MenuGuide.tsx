import React from "react";
import { Menu, Plus, Tag, DollarSign, Image, Star, Search } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const MenuGuide = () => {
  const features = [
    {
      title: "Add Menu Items",
      icon: <Plus className="w-5 h-5" />,
      description: "Create new dishes and beverages for your menu",
      steps: [
        "Click 'Add New Item' button",
        "Enter item name and description",
        "Set price and category",
        "Upload item image",
        "Add ingredients and allergen information",
        "Set availability status and save",
      ],
    },
    {
      title: "Menu Categories",
      icon: <Tag className="w-5 h-5" />,
      description: "Organize menu items into logical categories",
      steps: [
        "Create categories (Appetizers, Mains, Desserts, etc.)",
        "Assign items to appropriate categories",
        "Set category display order",
        "Enable/disable categories by time of day",
        "Create special menu sections",
      ],
    },
    {
      title: "Pricing Management",
      icon: <DollarSign className="w-5 h-5" />,
      description: "Manage item pricing and special offers",
      steps: [
        "Set base prices for all items",
        "Create size/portion variations",
        "Set up happy hour pricing",
        "Configure seasonal price changes",
        "Add promotional discounts",
      ],
    },
  ];

  const menuCategories = [
    {
      name: "Appetizers",
      color: "from-orange-400 to-amber-500",
      items: "Starters, Snacks, Small Plates",
    },
    {
      name: "Main Courses",
      color: "from-red-400 to-rose-500",
      items: "Entrees, Primary Dishes",
    },
    {
      name: "Desserts",
      color: "from-pink-400 to-fuchsia-500",
      items: "Sweet Treats, After-dinner",
    },
    {
      name: "Beverages",
      color: "from-blue-400 to-indigo-500",
      items: "Drinks, Cocktails, Coffee",
    },
    {
      name: "Specials",
      color: "from-purple-400 to-violet-500",
      items: "Chef's Specials, Daily Offers",
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Menu Management System"
          description="Create, organize, and maintain your restaurant's digital menu. Manage items, categories, pricing, and availability all in one place."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCallout
              icon={<Menu className="w-4 h-4" />}
              title="Key Features"
              gradient="emerald"
            >
              Digital menu creation, category organization, price management,
              image uploads, and availability control.
            </InfoCallout>
            <InfoCallout
              icon={<DollarSign className="w-4 h-4" />}
              title="Benefits"
              gradient="emerald"
            >
              Easy menu updates, consistent pricing, better item presentation,
              real-time availability, and analytics insights.
            </InfoCallout>
          </div>
        </OverviewCard>
      ),
    },
    {
      value: "features",
      label: "Features",
      content: (
        <div className="space-y-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} gradient="emerald" />
          ))}
        </div>
      ),
    },
    {
      value: "categories",
      label: "Categories",
      content: (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Menu Categories
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Organize your menu items into logical categories for better customer
            navigation.
          </p>
          <div className="space-y-3">
            {menuCategories.map((cat, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50"
              >
                <div
                  className={`w-3 h-8 rounded-full bg-gradient-to-b ${cat.color}`}
                />
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {cat.name}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {cat.items}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      value: "tips",
      label: "Best Practices",
      content: (
        <div className="space-y-4">
          <InfoCallout
            icon={<Image className="w-4 h-4" />}
            title="Photo Guidelines"
            gradient="emerald"
          >
            Use high-quality, well-lit photos. Maintain consistent image sizes.
            Show actual portion sizes accurately.
          </InfoCallout>
          <InfoCallout
            icon={<Star className="w-4 h-4" />}
            title="Description Writing"
            gradient="teal"
          >
            Write clear, appetizing descriptions. Include key ingredients and
            cooking methods. Mention allergens and dietary information.
          </InfoCallout>
          <InfoCallout
            icon={<DollarSign className="w-4 h-4" />}
            title="Pricing Strategy"
            gradient="amber"
          >
            Research competitor pricing regularly. Consider food cost
            percentages. Use psychological pricing ($9.99 vs $10.00).
          </InfoCallout>
          <InfoCallout
            icon={<Search className="w-4 h-4" />}
            title="Menu Optimization"
            gradient="blue"
          >
            Track item popularity and profitability. Remove or revise
            poor-performing items. Highlight signature dishes.
          </InfoCallout>
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<Menu className="w-6 h-6" />}
      title="Menu Management Guide"
      subtitle="Organize your offerings"
      gradient="emerald"
      tabs={tabs}
    />
  );
};

export default MenuGuide;
