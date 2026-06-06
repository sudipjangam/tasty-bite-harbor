import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  TrendingUp,
  ChefHat,
  Sparkles,
  Zap,
  Activity,
  Cpu,
  ArrowRight,
  Database,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const LangChainDashboard = () => {
  const navigate = useNavigate();

  // Mock performance metrics
  const performanceData = [
    { name: "Mon", latency: 2.1, tokens: 420 },
    { name: "Tue", latency: 1.8, tokens: 380 },
    { name: "Wed", latency: 2.4, tokens: 510 },
    { name: "Thu", latency: 1.5, tokens: 310 },
    { name: "Fri", latency: 1.9, tokens: 440 },
    { name: "Sat", latency: 2.2, tokens: 490 },
    { name: "Sun", latency: 2.0, tokens: 450 },
  ];

  const agentCards = [
    {
      title: "AI Waiter",
      subtitle: "Ordering Assistant (Module 1)",
      description: "Guest ordering agent flow. Interfaces with menu, verifies ingredient stock levels via recipes, and submits orders directly to the kitchen queue.",
      icon: Bot,
      status: "Active",
      statusColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      gradient: "from-violet-500 to-indigo-600",
      path: "/langchain/ordering",
      features: ["Stock availability check", "Automatic kitchen routing", "UPI Deep-Link payment intent"],
    },
    {
      title: "Analytics Agent",
      subtitle: "Manager Analytics Assistant (Module 2)",
      description: "Business intelligence agent flow. Executes read-only SQL queries on financial records, aggregates P&L metrics, and suggests menu improvements.",
      icon: TrendingUp,
      status: "Configuring",
      statusColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      gradient: "from-pink-500 to-rose-600",
      path: "/langchain/analytics",
      features: ["Natural language database querying", "Revenue & P&L forecasting", "Menu performance suggestions"],
    },
    {
      title: "Kitchen Bot",
      subtitle: "Kitchen Coordinator Agent (Module 3)",
      description: "Operational control flow agent. Estimates prep times, balances cook load across stations, and triggers emails when ingredient stock drops.",
      icon: ChefHat,
      status: "Planned",
      statusColor: "bg-slate-500/10 text-slate-500 border-slate-500/20",
      gradient: "from-blue-500 to-teal-600",
      path: "/langchain/kitchen",
      features: ["Prep duration balancing", "Low-stock automated alerts", "Multi-station order routing"],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Overview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent flex items-center gap-2">
            <Cpu className="h-8 w-8 text-violet-600" />
            AI Orchestrator Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg">
            Track execution graphs, check latencies, and simulate multi-agent systems.
          </p>
        </div>
      </div>

      {/* Quick stats banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-violet-100/30 dark:border-violet-900/10 rounded-2xl p-5 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-violet-500/10 text-violet-600 rounded-xl">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Average Prompt Latency</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5 block">1.95s</span>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-violet-100/30 dark:border-violet-900/10 rounded-2xl p-5 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Graph compilation status</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">Healthy</span>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-violet-100/30 dark:border-violet-900/10 rounded-2xl p-5 flex items-center gap-4 shadow-md">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Active Tool Declarations</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5 block">3 Tools</span>
          </div>
        </div>
      </div>

      {/* Agent Profiles List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Active Sub-Agents</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {agentCards.map((agent) => {
            const Icon = agent.icon;
            return (
              <Card
                key={agent.title}
                className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col group"
              >
                {/* Visual Header */}
                <div className={`bg-gradient-to-r ${agent.gradient} p-5 relative overflow-hidden shrink-0`}>
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Icon className="h-20 w-20 text-white rotate-12" />
                  </div>
                  <div className="inline-flex p-2.5 rounded-xl bg-white/20 border border-white/10 shadow-inner text-white mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-white font-bold text-lg">{agent.title}</h3>
                  <span className="text-white/80 text-xs mt-0.5 block">{agent.subtitle}</span>
                </div>

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    {agent.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Key features</span>
                    {agent.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
                        <Sparkles className="h-3 w-3 text-violet-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="outline" className={`text-[10px] rounded-full border ${agent.statusColor}`}>
                      {agent.status}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => navigate(agent.path)}
                      className="bg-slate-100 hover:bg-violet-600 hover:text-white dark:bg-slate-800 dark:hover:bg-violet-600 text-slate-700 dark:text-slate-200 transition-all rounded-xl text-xs"
                    >
                      Open Tester
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Latency & Token usage statistics chart */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-violet-100 dark:bg-violet-500/20 rounded-lg">
              <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            Graph Performance Metrics
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Visual trace tracking prompt latencies over the last week.
          </p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} unit="s" />
              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="latency"
                stroke="#8b5cf6"
                strokeWidth={3}
                fill="url(#colorLatency)"
                name="Latency"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default LangChainDashboard;
