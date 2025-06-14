
import React from "react";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Settings,
  RefreshCw
} from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  disabled?: boolean;
}

interface QuickActionsToolbarProps {
  actions: QuickAction[];
  className?: string;
}

/**
 * Quick actions toolbar for common tasks
 */
export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
  actions,
  className
}) => {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-sm font-medium text-gray-700 mr-2">Quick Actions:</span>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300
            ${action.variant === 'primary' 
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transform hover:-translate-y-0.5' 
              : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 shadow-sm hover:shadow-md'
            }
            ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </button>
      ))}
    </div>
  );
};

// Common quick actions presets
export const commonQuickActions = {
  create: (onClick: () => void): QuickAction => ({
    id: 'create',
    label: 'Create New',
    icon: Plus,
    onClick,
    variant: 'primary'
  }),
  search: (onClick: () => void): QuickAction => ({
    id: 'search',
    label: 'Search',
    icon: Search,
    onClick,
    variant: 'ghost'
  }),
  filter: (onClick: () => void): QuickAction => ({
    id: 'filter',
    label: 'Filter',
    icon: Filter,
    onClick,
    variant: 'ghost'
  }),
  export: (onClick: () => void): QuickAction => ({
    id: 'export',
    label: 'Export',
    icon: Download,
    onClick,
    variant: 'secondary'
  }),
  import: (onClick: () => void): QuickAction => ({
    id: 'import',
    label: 'Import',
    icon: Upload,
    onClick,
    variant: 'secondary'
  }),
  refresh: (onClick: () => void): QuickAction => ({
    id: 'refresh',
    label: 'Refresh',
    icon: RefreshCw,
    onClick,
    variant: 'ghost'
  }),
  settings: (onClick: () => void): QuickAction => ({
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    onClick,
    variant: 'ghost'
  })
};
