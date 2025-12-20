
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

// Category color mapping for vibrant chips
const getCategoryColor = (category: string, isSelected: boolean) => {
  const colors: Record<string, { bg: string; selected: string; text: string }> = {
    'All': { 
      bg: 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 hover:from-purple-200 hover:to-indigo-200',
      selected: 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30',
      text: 'text-purple-700 dark:text-purple-300'
    },
    'Beverages': { 
      bg: 'bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/40 dark:to-blue-900/40 hover:from-cyan-200 hover:to-blue-200',
      selected: 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30',
      text: 'text-cyan-700 dark:text-cyan-300'
    },
    'Desserts': { 
      bg: 'bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/40 dark:to-rose-900/40 hover:from-pink-200 hover:to-rose-200',
      selected: 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg shadow-pink-500/30',
      text: 'text-pink-700 dark:text-pink-300'
    },
    'Soups': { 
      bg: 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 hover:from-amber-200 hover:to-orange-200',
      selected: 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30',
      text: 'text-amber-700 dark:text-amber-300'
    },
    'Salads': { 
      bg: 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 hover:from-green-200 hover:to-emerald-200',
      selected: 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/30',
      text: 'text-green-700 dark:text-green-300'
    },
  };
  
  // Default color for categories not in the list
  const defaultColor = { 
    bg: 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800 hover:from-gray-200 hover:to-slate-200',
    selected: 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30',
    text: 'text-gray-700 dark:text-gray-300'
  };
  
  return colors[category] || defaultColor;
};

const MenuCategories = ({ selectedCategory, onSelectCategory }: MenuCategoriesProps) => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.restaurant_id) {
        throw new Error("No restaurant found for user");
      }

      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('restaurant_id', profile.restaurant_id);

      if (error) throw error;

      // Get unique categories and sort them
      const uniqueCategories = Array.from(new Set(data.map(item => item.category))).filter(Boolean).sort();
      return uniqueCategories;
    },
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="w-20 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {/* All Category Button */}
      <button
        onClick={() => onSelectCategory("All")}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap",
          selectedCategory === "All"
            ? `${getCategoryColor("All", true).selected} text-white`
            : `${getCategoryColor("All", false).bg} ${getCategoryColor("All", false).text} border border-purple-200 dark:border-purple-700`
        )}
      >
        ✨ All
      </button>
      
      {categories?.length ? (
        categories.map((category) => {
          const colors = getCategoryColor(category, selectedCategory === category);
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap",
                selectedCategory === category
                  ? `${colors.selected} text-white`
                  : `${colors.bg} ${colors.text} border border-gray-200 dark:border-gray-700`
              )}
            >
              {category}
            </button>
          );
        })
      ) : (
        <div className="text-muted-foreground text-sm">No categories available</div>
      )}
    </div>
  );
};

export default MenuCategories;
