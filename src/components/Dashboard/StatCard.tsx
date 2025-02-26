
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  color: string;
  onClick: () => void;
}

const StatCard = ({ title, value, icon: Icon, trend, color, onClick }: StatCardProps) => {
  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="bg-secondary p-3 rounded-full">
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-green-500 mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
};

export default StatCard;
