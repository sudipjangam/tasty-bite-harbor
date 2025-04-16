
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MenuCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const MenuCategories = ({ selectedCategory, onSelectCategory }: MenuCategoriesProps) => {
  const { data: categories } = useQuery({
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
        .eq('restaurant_id', profile.restaurant_id)
        .is('is_available', true);

      if (error) throw error;

      // Get unique categories
      const uniqueCategories = Array.from(new Set(data.map(item => item.category)));
      return uniqueCategories;
    },
  });

  return (
    <div className="flex flex-wrap gap-2 p-4 border-b bg-white dark:bg-gray-800 overflow-x-auto">
      {categories?.map((category) => (
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
