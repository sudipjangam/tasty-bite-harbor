import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTheme } from "@/hooks/useTheme";
import { HighchartComponent } from "@/components/ui/highcharts";
import { Options } from "highcharts";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";

interface StatDetailsProps {
  title: string | null;
  data: any;
  type: "sales" | "orders" | "customers" | "revenue";
  onClose: () => void;
}

const StatDetails = ({ title, data, type, onClose }: StatDetailsProps) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { symbol, formatCurrency: formatCurrencyFromContext } = useCurrencyContext();
  
  const formatCurrency = (value: number) => formatCurrencyFromContext(value);

  // Theme-aware colors
  const backgroundColor = 'transparent';
  const textColor = isDarkMode ? '#F7FAFC' : '#374151';
  const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(226, 232, 240, 0.8)';

  // Gradient colors based on stat type
  const getChartColors = () => {
    switch (type) {
      case "sales":
        return {
          line: '#10B981',
          gradient: ['rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0.05)'],
          shadow: 'rgba(16, 185, 129, 0.3)'
        };
      case "revenue":
        return {
          line: '#F59E0B',
          gradient: ['rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0.05)'],
          shadow: 'rgba(245, 158, 11, 0.3)'
        };
      default:
        return {
          line: '#8B5CF6',
          gradient: ['rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.05)'],
          shadow: 'rgba(139, 92, 246, 0.3)'
        };
    }
  };

  // Icon based on type
  const getIcon = () => {
    switch (type) {
      case "sales": return <DollarSign className="h-6 w-6 text-white" />;
      case "revenue": return <TrendingUp className="h-6 w-6 text-white" />;
      case "orders": return <ShoppingBag className="h-6 w-6 text-white" />;
      case "customers": return <Users className="h-6 w-6 text-white" />;
    }
  };

  const getGradientClass = () => {
    switch (type) {
      case "sales": return "from-emerald-500 to-teal-600";
      case "revenue": return "from-amber-500 to-orange-600";
      case "orders": return "from-blue-500 to-indigo-600";
      case "customers": return "from-purple-500 to-pink-600";
    }
  };

  const renderContent = () => {
    const colors = getChartColors();
    
    switch (type) {
      case "sales":
      case "revenue": {
        const isSales = type === 'sales';
        const chartOptions: Options = {
          chart: {
            type: isSales ? 'column' : 'areaspline',
            backgroundColor: backgroundColor,
            style: {
              fontFamily: 'Inter, system-ui, sans-serif'
            },
            height: 380,
            spacingTop: 20,
            spacingBottom: 10,
          },
          title: {
            text: null
          },
          xAxis: {
            categories: data.chart.map((item: any) => item.date || item.time),
            labels: {
              style: {
                color: textColor,
                fontSize: '11px',
                fontWeight: '600'
              },
              rotation: -45
            },
            lineColor: gridColor,
            tickColor: 'transparent',
            crosshair: {
              width: 1,
              color: colors.line,
              dashStyle: 'Dash' as const
            }
          },
          yAxis: {
            title: {
              text: `Amount (${symbol})`,
              style: {
                color: textColor,
                fontSize: '12px',
                fontWeight: '500'
              }
            },
            labels: {
              style: {
                color: textColor,
                fontSize: '11px'
              },
              formatter: function(this: Highcharts.AxisLabelsFormatterContextObject) {
                return symbol + Number(this.value).toLocaleString();
              }
            },
            gridLineColor: gridColor,
            gridLineDashStyle: 'Dash' as const
          },
          legend: {
            enabled: false
          },
          credits: {
            enabled: false
          },
          tooltip: {
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: colors.line,
            borderRadius: 12,
            borderWidth: 2,
            shadow: {
              color: colors.shadow,
              offsetX: 0,
              offsetY: 4,
              width: 10
            },
            style: {
              color: textColor,
              fontSize: '13px'
            },
            headerFormat: '<div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">{point.key}</div>',
            pointFormat: `<div style="font-size: 16px; font-weight: 600; color: ${colors.line};">${symbol}{point.y:,.2f}</div>`,
            useHTML: true,
            padding: 12
          },
          plotOptions: {
            areaspline: {
              fillColor: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, colors.gradient[0]],
                  [1, colors.gradient[1]]
                ]
              },
              lineWidth: 3,
              lineColor: colors.line,
              marker: {
                enabled: true,
                radius: 5,
                fillColor: isDarkMode ? '#1e293b' : '#ffffff',
                lineWidth: 3,
                lineColor: colors.line,
                symbol: 'circle',
                states: {
                  hover: {
                    radius: 8,
                    lineWidth: 3
                  }
                }
              },
              states: {
                hover: {
                  lineWidth: 4
                }
              },
              animation: {
                duration: 1500,
                easing: 'easeOutBounce'
              }
            },
            column: {
              borderRadius: isSales ? 8 : 0,
              pointWidth: 40,
              color: {
                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                stops: [
                  [0, colors.line],
                  [1, colors.gradient[0]] // darker/lighter shade for gradient bar
                ]
              },
              states: {
                hover: {
                  brightness: 0.1
                }
              },
              animation: {
                duration: 1000
              }
            }
          },
          series: [{
            type: isSales ? 'column' : 'areaspline',
            name: 'Amount',
            data: data.chart.map((item: any) => item.amount),
          }]
        };

        return (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-4 sm:p-6">
            <div className="h-[380px] w-full">
              <HighchartComponent options={chartOptions} />
            </div>
          </div>
        );
      }

      case "orders":
        return (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700">
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Customer</TableHead>
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Items</TableHead>
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Total</TableHead>
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((order: any) => (
                  <TableRow key={order.id} className="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                    <TableCell className="font-medium">{order.customer_name}</TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">{order.items.join(", ")}</TableCell>
                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        order.status === 'completed' 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                          : order.status === 'pending'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : order.status === 'preparing'
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      }`}>
                        {order.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      case "customers":
        return (
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700">
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Customer Name</TableHead>
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Orders</TableHead>
                  <TableHead className="font-bold text-gray-900 dark:text-gray-100">Total Spent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((customer: any, index: number) => (
                  <TableRow key={index} className="hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-sm">
                        {customer.orders}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(customer.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={!!title} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2.5 bg-gradient-to-br ${getGradientClass()} rounded-xl shadow-lg`}>
              {getIcon()}
            </div>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatDetails;
