
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  color: string;
  gradient?: string;
  shadow?: string;
  onClick: () => void;
}

const StatCard = ({ title, value, icon: Icon, trend, color, gradient, shadow, onClick }: StatCardProps) => {
  return (
    <Card 
      className={`group relative overflow-hidden border-0 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ${shadow || 'shadow-lg'}`}
      onClick={onClick}
    >
      {/* 3D Gradient Background with Depth */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient || 'from-gray-500 to-gray-600'} opacity-100`} />
      
      {/* Texture overlay */}
      <div className="absolute inset-0 bg-white/5 opacity-10 mix-blend-overlay" />
      
      {/* 3D Lighting/Shine effect */}
      <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
      
      {/* Internal Glow for depth */}
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/20 blur-[50px] rounded-full pointing-events-none" />

      <CardContent className="relative z-10 p-6 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-2">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-inner border border-white/20 group-hover:bg-white/20 transition-all duration-300">
            <Icon className="w-6 h-6 text-white drop-shadow-md" />
          </div>
          <div className="px-2.5 py-1 rounded-xl backdrop-blur-md bg-black/10 border border-white/10 flex items-center gap-1 shadow-sm">
             <span className="text-xs font-bold text-white tracking-wide">{trend}</span>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-white/80 tracking-wide uppercase text-[10px] mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">
            {value}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
