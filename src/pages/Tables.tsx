
import ModernTableLayout from "@/components/Tables/ModernTableLayout";

const Tables = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tables</h1>
          <p className="text-muted-foreground">Manage your restaurant tables</p>
        </div>
      </div>
      
      <ModernTableLayout />
    </div>
  );
};

export default Tables;
