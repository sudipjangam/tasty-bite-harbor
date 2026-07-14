import React from "react";
import { StandardizedCard } from "@/components/ui/standardized-card";
import { PermissionGuard } from "@/components/Auth/PermissionGuard";
import { StandardizedButton } from "@/components/ui/standardized-button";
import { Permission } from "@/types/auth";
import HelpProvider from "@/components/Help/HelpProvider";
import { useRestaurantId } from "@/hooks/useRestaurantId";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: "primary" | "secondary" | "success" | "danger";
    permission?: Permission;
  };
  breadcrumb?: React.ReactNode;
}

/**
 * Standardized page header component
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actionButton,
  breadcrumb,
}) => {
  const { restaurantName } = useRestaurantId();

  return (
    <StandardizedCard className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
          {restaurantName && (
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-0.5">
              {restaurantName}
            </p>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              {title}
            </h1>
            <HelpProvider />
          </div>
          {description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>

        {actionButton && (
          <PermissionGuard permission={actionButton.permission}>
            <StandardizedButton
              variant={actionButton.variant || "primary"}
              onClick={actionButton.onClick}
              icon={actionButton.icon}
            >
              {actionButton.label}
            </StandardizedButton>
          </PermissionGuard>
        )}
      </div>
    </StandardizedCard>
  );
};
