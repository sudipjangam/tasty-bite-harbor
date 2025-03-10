
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
      className="hover:shadow-card-hover border border-border/40 bg-white dark:bg-brand-deep-blue/80 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${color} animate-scale-in`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${trend.includes('+') ? 'text-brand-success-green' : trend.includes('-') ? 'text-red-500' : 'text-brand-warm-orange'} mt-1 font-medium`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
};

export default StatCard;
