
import { Card } from "@/components/ui/card";
import ModernMenuGrid from "@/components/Menu/ModernMenuGrid";

const Menu = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Create and manage your restaurant's offerings</p>
        </div>
      </div>
      
      <Card className="p-6 rounded-xl">
        <ModernMenuGrid />
      </Card>
    </div>
  );
};

export default Menu;
