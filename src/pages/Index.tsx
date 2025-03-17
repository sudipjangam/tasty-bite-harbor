
import Stats from "@/components/Dashboard/Stats";
import TodaysReservations from "@/components/Dashboard/TodaysReservations";
import WeeklySalesChart from "@/components/Dashboard/WeeklySalesChart";
import QuickStats from "@/components/Dashboard/QuickStats";

const Index = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      
      <Stats />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeeklySalesChart />
        </div>
        <div>
          <TodaysReservations />
        </div>
      </div>
      
      <QuickStats />
    </div>
  );
};

export default Index;
