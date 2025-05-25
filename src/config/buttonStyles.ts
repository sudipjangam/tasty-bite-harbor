
/**
 * Standard button style configurations to ensure consistency across the application
 * 
 * Use these configurations when creating buttons to maintain UI consistency
 */
export const buttonStyles = {
  // Primary action buttons (Create, Add, Save, etc.)
  primary: "bg-primary text-white hover:bg-primary/90",
  
  // Secondary action buttons (Apply, Update, etc.)
  secondary: "bg-brand-success-green text-white hover:bg-brand-success-green/90",
  
  // Destructive action buttons (Delete, Remove, etc.)
  destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
  
  // Warning action buttons (Warning-related actions)
  warning: "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400",
  
  // Cancel buttons
  cancel: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300",

  // View or detail buttons
  view: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
  
  // Edit buttons
  edit: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
  
  // Filter buttons
  filter: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
  
  // Activate buttons
  activate: "bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200",
  
  // Deactivate buttons
  deactivate: "bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200",
  
  // Refresh/reload buttons
  refresh: "border-primary/30 text-primary hover:bg-primary/10",
  
  // Dashboard card buttons
  card: "bg-white hover:bg-gray-50 border-gray-200 text-gray-700",
};
