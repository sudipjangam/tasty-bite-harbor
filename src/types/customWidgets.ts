export type WidgetType = 'kpi' | 'chart' | 'table' | 'alert' | 'gauge';

export type SourceDomain = 
  | 'orders' 
  | 'inventory' 
  | 'customers' 
  | 'staff' 
  | 'finance' 
  | 'menu' 
  | 'tables';

export type AggregationType = 'sum' | 'count' | 'avg' | 'min' | 'max';

export type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_30_days' | 'all';

export interface QueryConfig {
  metric?: string;
  aggregation?: AggregationType;
  field?: string;
  filterField?: string;
  filterOperator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'ilike';
  filterValue?: any;
  dateRangePreset?: DateRangePreset;
  limit?: number;
  groupBy?: string;
  secondaryMetric?: string;
}

export interface VisualConfig {
  chartType?: 'column' | 'line' | 'pie' | 'bar' | 'area';
  colorScheme?: string;
  icon?: string;
  unit?: string;
  prefix?: string;
  suffix?: string;
  thresholdWarning?: number;
  thresholdDanger?: number;
  comparisonLabel?: string;
  columns?: { key: string; label: string }[];
}

export interface CustomWidget {
  id: string;
  restaurant_id: string;
  created_by?: string;
  title: string;
  description?: string;
  widget_type: WidgetType;
  source_domain: SourceDomain;
  query_config: QueryConfig;
  visual_config: VisualConfig;
  ai_prompt?: string;
  grid_size: 'sm' | 'md' | 'lg' | 'xl';
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomWidgetQuota {
  count: number;
  maxLimit: number;
  canCreate: boolean;
  featureUnlocked: boolean;
}
