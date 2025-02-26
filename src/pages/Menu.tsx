
import MenuGrid from "@/components/Menu/MenuGrid";

const Menu = () => {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Restaurant Menu
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your restaurant's menu items
        </p>
      </div>
      <MenuGrid />
    </div>
  );
};

export default Menu;
