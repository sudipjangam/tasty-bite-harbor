
import MenuGrid from "@/components/Menu/MenuGrid";
import { Card } from "@/components/ui/card";

const Menu = () => {
  return (
    <div className="p-6 animate-fade-in">
      <Card variant="glass" className="p-6 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Restaurant Menu
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your restaurant's menu items
        </p>
      </Card>
      <Card variant="default" className="p-6 rounded-xl">
        <MenuGrid />
      </Card>
    </div>
  );
};

export default Menu;
