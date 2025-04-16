
import { cn } from "@/lib/utils";

interface MenuCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const MenuCategories = ({ selectedCategory, onSelectCategory }: MenuCategoriesProps) => {
  const categories = ["Appetizers", "Mains", "Sides", "Drinks", "Desserts"];

  return (
    <div className="flex flex-wrap gap-2 p-4 border-b bg-white dark:bg-gray-800 overflow-x-auto">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={cn(
            "px-4 py-2 rounded-md transition-colors whitespace-nowrap",
            selectedCategory === category
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default MenuCategories;
