import React from "react";
import { ChefHat, BookOpen, Scale, Calculator } from "lucide-react";
import HelpGuideShell, {
  FeatureCard,
  InfoCallout,
  OverviewCard,
  GuideTab,
} from "./HelpGuideShell";

const RecipesGuide = () => {
  const features = [
    {
      title: "Recipe Creation",
      icon: <BookOpen className="w-5 h-5" />,
      description:
        "Document exactly how each menu item is made to ensure consistency.",
      steps: [
        "Click 'Add Recipe'",
        "Enter the recipe name and select the associated menu item",
        "Add step-by-step preparation instructions",
      ],
    },
    {
      title: "Ingredients Formulation",
      icon: <Scale className="w-5 h-5" />,
      description:
        "Link specific inventory items to the recipe by precise quantities.",
      steps: [
        "Search for raw ingredients from your inventory",
        "Specify the exact measurement needed (e.g., 50g of Cheese)",
        "The system will now track this usage against your stock levels",
      ],
    },
    {
      title: "Costing & Margins",
      icon: <Calculator className="w-5 h-5" />,
      description:
        "Automatically calculate profit margins based on ingredient costs.",
      steps: [
        "Ensure all inventory items have an updated purchase cost",
        "The Recipe module calculates the exact cost per plate",
        "Use this data to adjust menu selling price to maintain healthy margins",
      ],
    },
  ];

  const tabs: GuideTab[] = [
    {
      value: "overview",
      label: "Overview",
      content: (
        <OverviewCard
          title="Mastering Your Recipes"
          description="The Recipe Management module handles the 'behind the scenes' of your menu. It ensures that your dishes taste exactly the same no matter who is cooking, and connects directly to inventory to calculate real profit margins."
        >
          <InfoCallout
            icon={<Scale className="w-4 h-4" />}
            title="Why is this important?"
            gradient="orange"
          >
            By linking raw ingredients (like beef and buns) to a recipe (like a
            Burger), the system will automatically deduct the correct amount of
            inventory every time a burger is sold on the POS. This prevents
            waste and keeps stock accurate!
          </InfoCallout>
        </OverviewCard>
      ),
    },
    {
      value: "workflow",
      label: "How to Use",
      content: (
        <div className="space-y-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} gradient="orange" />
          ))}
        </div>
      ),
    },
  ];

  return (
    <HelpGuideShell
      icon={<ChefHat className="w-6 h-6" />}
      title="Recipe & Costing Guide"
      subtitle="Standardize and price your dishes"
      gradient="orange"
      tabs={tabs}
    />
  );
};

export default RecipesGuide;
