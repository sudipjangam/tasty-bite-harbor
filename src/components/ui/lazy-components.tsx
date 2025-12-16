import React, { Suspense, lazy, ComponentType } from 'react';
import { ChartSkeleton, PageLoading } from './loading';

// ============================================
// LAZY LOADED CHART COMPONENTS
// ============================================

// Lazy load Highcharts modules to reduce initial bundle size
const HighchartsReact = lazy(() => 
  import('highcharts-react-official').then(mod => ({ default: mod.default }))
);

// Lazy load Recharts components
const RechartsModule = {
  LineChart: lazy(() => import('recharts').then(mod => ({ default: mod.LineChart }))),
  BarChart: lazy(() => import('recharts').then(mod => ({ default: mod.BarChart }))),
  PieChart: lazy(() => import('recharts').then(mod => ({ default: mod.PieChart }))),
  AreaChart: lazy(() => import('recharts').then(mod => ({ default: mod.AreaChart }))),
};

// ============================================
// LAZY HIGHCHARTS WRAPPER
// ============================================

interface LazyHighchartsProps {
  options: any;
  highcharts?: any;
  containerProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const LazyHighcharts: React.FC<LazyHighchartsProps> = (props) => {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HighchartsReact {...props} />
    </Suspense>
  );
};

// ============================================
// LAZY RECHARTS WRAPPERS
// ============================================

export const LazyLineChart: React.FC<any> = (props) => {
  const Chart = RechartsModule.LineChart;
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart {...props} />
    </Suspense>
  );
};

export const LazyBarChart: React.FC<any> = (props) => {
  const Chart = RechartsModule.BarChart;
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart {...props} />
    </Suspense>
  );
};

export const LazyPieChart: React.FC<any> = (props) => {
  const Chart = RechartsModule.PieChart;
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart {...props} />
    </Suspense>
  );
};

export const LazyAreaChart: React.FC<any> = (props) => {
  const Chart = RechartsModule.AreaChart;
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart {...props} />
    </Suspense>
  );
};

// ============================================
// LAZY PDF GENERATION
// ============================================

// Export PDF generation functions as lazy-loaded utilities
export const generatePDF = async (
  filename: string, 
  contentGenerator: (jsPDF: any, autoTable: any) => void
) => {
  // Dynamically import jsPDF and autoTable only when needed
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  contentGenerator(doc, autoTable);
  doc.save(filename);
};

// ============================================
// LAZY EXCEL GENERATION
// ============================================

export const generateExcel = async (
  filename: string,
  data: any[],
  sheetName: string = 'Sheet1'
) => {
  // Dynamically import xlsx only when needed
  const XLSX = await import('xlsx');
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
};

// ============================================
// LAZY HTML2CANVAS FOR SCREENSHOTS
// ============================================

export const captureElementAsImage = async (
  element: HTMLElement,
  options?: any
): Promise<string> => {
  // Dynamically import html2canvas only when needed
  const html2canvas = (await import('html2canvas')).default;
  
  const canvas = await html2canvas(element, options);
  return canvas.toDataURL('image/png');
};

// ============================================
// LAZY MODULE LOADER UTILITY
// ============================================

type LazyModuleLoader<T> = () => Promise<{ default: ComponentType<T> }>;

export function createLazyComponent<T extends object>(
  loader: LazyModuleLoader<T>,
  fallback: React.ReactNode = <PageLoading />
): React.FC<T> {
  const LazyComponent = lazy(loader);
  
  return (props: T) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  );
}
