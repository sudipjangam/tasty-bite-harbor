import { QSRCategory } from '@/hooks/useQSRMenuItems';

interface CategoryListProps {
  categories: QSRCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryList = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryListProps) => {
  return (
    <div className="bg-background border-r border-border h-full overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Menu Categories</h2>
      </div>
      <div className="p-2 space-y-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`w-full p-4 rounded-lg text-left transition-all touch-manipulation ${
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card hover:bg-accent text-card-foreground'
            }`}
          >
            <span className="text-2xl mr-3">{category.emoji}</span>
            <span className="font-medium">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
