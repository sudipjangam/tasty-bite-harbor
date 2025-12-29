import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { exportToExcel } from "@/utils/exportUtils";
import {
  Search,
  Plus,
  Filter,
  Users,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Star,
  ArrowUpDown,
  X,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
  Download,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";
import { Customer, CustomerLoyaltyTier } from "@/types/customer";
import { cn } from "@/lib/utils";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import LoyaltyBadge from "@/components/Customers/LoyaltyBadge";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";

interface CustomerFilters {
  tier: CustomerLoyaltyTier | "all";
  minSpend: number | null;
  maxSpend: number | null;
  hasEmail: boolean | null;
  hasPhone: boolean | null;
  tag: string;
}

interface CustomerListProps {
  customers: Customer[];
  loading?: boolean;
  selectedCustomerId?: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onFilterCustomers: (filters: any) => void;
  onBulkDelete?: (customerIds: string[]) => void;
}

type SortOption =
  | "name"
  | "total_spent"
  | "visit_count"
  | "last_visit"
  | "loyalty_points";

const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  loading = false,
  selectedCustomerId,
  onSelectCustomer,
  onAddCustomer,
  onFilterCustomers,
  onBulkDelete,
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<CustomerFilters>({
    tier: "all",
    minSpend: null,
    maxSpend: null,
    hasEmail: null,
    hasPhone: null,
    tag: "",
  });

  // Pagination state - show 25 customers at a time
  const PAGE_SIZE = 25;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.tier !== "all") count++;
    if (filters.minSpend !== null) count++;
    if (filters.maxSpend !== null) count++;
    if (filters.hasEmail !== null) count++;
    if (filters.hasPhone !== null) count++;
    if (filters.tag) count++;
    return count;
  }, [filters]);

  // Get unique tags from all customers
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    customers.forEach((c) => c.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [customers]);

  // Filter and sort customers using debounced search
  const filteredCustomers = useMemo(() => {
    let result = customers.filter((customer) => {
      // Search filter - using debounced search term
      const matchesSearch =
        customer.name
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        customer.email
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        customer.phone?.includes(debouncedSearchTerm);

      if (!matchesSearch) return false;

      // Tier filter
      if (filters.tier !== "all" && customer.loyalty_tier !== filters.tier)
        return false;

      // Spending filter
      if (filters.minSpend !== null && customer.total_spent < filters.minSpend)
        return false;
      if (filters.maxSpend !== null && customer.total_spent > filters.maxSpend)
        return false;

      // Contact filters
      if (filters.hasEmail === true && !customer.email) return false;
      if (filters.hasEmail === false && customer.email) return false;
      if (filters.hasPhone === true && !customer.phone) return false;
      if (filters.hasPhone === false && customer.phone) return false;

      // Tag filter
      if (filters.tag && !customer.tags?.includes(filters.tag)) return false;

      return true;
    });

    // Sort customers
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "total_spent":
          comparison = a.total_spent - b.total_spent;
          break;
        case "visit_count":
          comparison = a.visit_count - b.visit_count;
          break;
        case "last_visit":
          const aDate = a.last_visit_date
            ? new Date(a.last_visit_date).getTime()
            : 0;
          const bDate = b.last_visit_date
            ? new Date(b.last_visit_date).getTime()
            : 0;
          comparison = aDate - bDate;
          break;
        case "loyalty_points":
          comparison = a.loyalty_points - b.loyalty_points;
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [customers, debouncedSearchTerm, filters, sortBy, sortOrder]);

  const clearFilters = () => {
    setFilters({
      tier: "all",
      minSpend: null,
      maxSpend: null,
      hasEmail: null,
      hasPhone: null,
      tag: "",
    });
    setVisibleCount(PAGE_SIZE); // Reset pagination when filters are cleared
  };

  // Reset pagination when filters/search/sort changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setVisibleCount(PAGE_SIZE);
  };

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(0, visibleCount);
  }, [filteredCustomers, visibleCount]);

  const hasMoreCustomers = visibleCount < filteredCustomers.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Bulk selection helpers
  const toggleSelectCustomer = (customerId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(paginatedCustomers.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    if (bulkMode) {
      setSelectedIds(new Set()); // Clear selections when exiting bulk mode
    }
  };

  // Export customers to Excel
  const exportToCSV = useCallback(() => {
    const customersToExport =
      selectedIds.size > 0
        ? filteredCustomers.filter((c) => selectedIds.has(c.id))
        : filteredCustomers;

    if (customersToExport.length === 0) {
      toast({
        title: "No customers to export",
        description: "Apply filters or select customers to export.",
        variant: "destructive",
      });
      return;
    }

    // Format data for Excel
    const exportData = customersToExport.map((customer) => ({
      Name: customer.name,
      Email: customer.email || "",
      Phone: customer.phone || "",
      Address: customer.address || "",
      Birthday: customer.birthday || "",
      "Loyalty Tier": customer.loyalty_tier,
      "Loyalty Points": customer.loyalty_points,
      "Total Spent": parseFloat(customer.total_spent.toFixed(2)),
      "Visit Count": customer.visit_count,
      "Last Visit": customer.last_visit_date
        ? new Date(customer.last_visit_date).toLocaleDateString()
        : "",
      Tags: customer.tags?.join(", ") || "",
      "Created At": new Date(customer.created_at).toLocaleDateString(),
    }));

    const filename = `customers_export_${
      new Date().toISOString().split("T")[0]
    }`;
    const success = exportToExcel(exportData, filename, "Customers");

    if (success) {
      toast({
        title: "Export successful",
        description: `Exported ${customersToExport.length} customers to Excel.`,
      });
    } else {
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
        variant: "destructive",
      });
    }
  }, [filteredCustomers, selectedIds, toast]);

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case "Diamond":
        return "bg-gradient-to-r from-purple-600 to-pink-600 text-white";
      case "Platinum":
        return "bg-gradient-to-r from-gray-400 to-gray-600 text-white";
      case "Gold":
        return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case "Silver":
        return "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800";
      case "Bronze":
        return "bg-gradient-to-r from-amber-600 to-amber-700 text-white";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && customers.length === 0) {
    return (
      <div className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-xl">
        <div className="p-6 border-b border-white/30 dark:border-gray-700/50">
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-white/50 dark:bg-gray-700/50 rounded w-3/4"></div>
            <div className="h-4 bg-white/50 dark:bg-gray-700/50 rounded w-1/2"></div>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="p-4 border border-white/20 dark:border-gray-700/50 rounded-2xl"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-white/50 dark:bg-gray-700/50 rounded w-3/4"></div>
                  <div className="h-3 bg-white/50 dark:bg-gray-700/50 rounded w-1/2"></div>
                  <div className="h-3 bg-white/50 dark:bg-gray-700/50 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-xl flex flex-col">
      <div className="p-6 border-b border-white/30 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Customers
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {filteredCustomers.length} of {customers.length} customers
            </p>
          </div>
          <div className="flex gap-2">
            {/* Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300"
              title={
                selectedIds.size > 0
                  ? `Export ${selectedIds.size} selected`
                  : "Export all filtered"
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Export {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>

            {/* Bulk Select Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleBulkMode}
              className={cn(
                "bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 text-gray-700 dark:text-gray-300",
                bulkMode &&
                  "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
              )}
            >
              {bulkMode ? (
                <CheckSquare className="h-4 w-4 mr-1" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              {bulkMode ? "Done" : "Select"}
            </Button>

            {/* Add Customer Button */}
            <Button
              onClick={onAddCustomer}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllVisible}
                className="text-purple-600"
              >
                Select All ({paginatedCustomers.length})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                className="text-purple-600"
              >
                Deselect All
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="bg-white border-green-300 text-green-700 hover:bg-green-50"
              >
                <Download className="h-4 w-4 mr-1" />
                Export Selected
              </Button>
              {onBulkDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkDelete(Array.from(selectedIds))}
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 rounded-xl focus:bg-white dark:focus:bg-gray-800 focus:border-purple-300"
            />
          </div>

          {/* Sort Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:border-purple-300 rounded-xl"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Sort by</Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as SortOption)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="total_spent">Total Spent</SelectItem>
                    <SelectItem value="visit_count">Visit Count</SelectItem>
                    <SelectItem value="last_visit">Last Visit</SelectItem>
                    <SelectItem value="loyalty_points">
                      Loyalty Points
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    variant={sortOrder === "asc" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSortOrder("asc")}
                  >
                    Asc
                  </Button>
                  <Button
                    variant={sortOrder === "desc" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSortOrder("desc")}
                  >
                    Desc
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Filter Dropdown */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "bg-white/50 dark:bg-gray-800/50 border-white/30 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:border-purple-300 rounded-xl relative",
                  activeFilterCount > 0 &&
                    "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs h-6"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Tier Filter */}
                <div className="space-y-2">
                  <Label className="text-sm">Loyalty Tier</Label>
                  <Select
                    value={filters.tier}
                    onValueChange={(v) =>
                      setFilters({
                        ...filters,
                        tier: v as CustomerLoyaltyTier | "all",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="Diamond">Diamond</SelectItem>
                      <SelectItem value="Platinum">Platinum</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Bronze">Bronze</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Spending Range */}
                <div className="space-y-2">
                  <Label className="text-sm">Spending Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min ₹"
                      value={filters.minSpend ?? ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minSpend: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full"
                    />
                    <Input
                      type="number"
                      placeholder="Max ₹"
                      value={filters.maxSpend ?? ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          maxSpend: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Tag Filter */}
                {allTags.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Tag</Label>
                    <Select
                      value={filters.tag || "all"}
                      onValueChange={(v) =>
                        setFilters({ ...filters, tag: v === "all" ? "" : v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Contact Filters */}
                <div className="space-y-2">
                  <Label className="text-sm">Contact Info</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        filters.hasEmail === true ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          hasEmail: filters.hasEmail === true ? null : true,
                        })
                      }
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Has Email
                    </Button>
                    <Button
                      variant={
                        filters.hasPhone === true ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() =>
                        setFilters({
                          ...filters,
                          hasPhone: filters.hasPhone === true ? null : true,
                        })
                      }
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Has Phone
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.tier !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Tier: {filters.tier}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters({ ...filters, tier: "all" })}
                />
              </Badge>
            )}
            {filters.minSpend !== null && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Min: ₹{filters.minSpend.toLocaleString()}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters({ ...filters, minSpend: null })}
                />
              </Badge>
            )}
            {filters.maxSpend !== null && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Max: ₹{filters.maxSpend.toLocaleString()}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters({ ...filters, maxSpend: null })}
                />
              </Badge>
            )}
            {filters.tag && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Tag: {filters.tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters({ ...filters, tag: "" })}
                />
              </Badge>
            )}
            {filters.hasEmail && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Has Email
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters({ ...filters, hasEmail: null })}
                />
              </Badge>
            )}
            {filters.hasPhone && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Has Phone
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters({ ...filters, hasPhone: null })}
                />
              </Badge>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No customers found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {searchTerm || activeFilterCount > 0
                  ? "Try adjusting your search or filters"
                  : "Add your first customer to get started"}
              </p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {paginatedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => {
                    if (bulkMode) {
                      toggleSelectCustomer(customer.id);
                    } else {
                      onSelectCustomer(customer);
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02]",
                    selectedCustomerId === customer.id && !bulkMode
                      ? "border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 shadow-lg scale-[1.02]"
                      : selectedIds.has(customer.id) && bulkMode
                      ? "border-purple-400 bg-purple-50 dark:bg-purple-900/30"
                      : "border-white/30 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60"
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 flex items-start gap-3">
                        {/* Checkbox for bulk selection */}
                        {bulkMode && (
                          <div
                            className="pt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectCustomer(customer.id);
                            }}
                          >
                            <Checkbox
                              checked={selectedIds.has(customer.id)}
                              className="h-5 w-5 rounded-md border-purple-300"
                            />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {customer.name}
                            </h3>
                            {(customer.loyalty_tier === "Diamond" ||
                              customer.loyalty_tier === "Platinum" ||
                              customer.loyalty_tier === "Gold") && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <LoyaltyBadge
                              tier={customer.loyalty_tier}
                              showIcon={true}
                            />
                            <Badge
                              variant="outline"
                              className="text-xs border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30"
                            >
                              {customer.loyalty_points.toLocaleString()} pts
                            </Badge>
                            {customer.tags && customer.tags.length > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30"
                              >
                                +{customer.tags.length} tags
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          <CurrencyDisplay amount={customer.total_spent} />
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {customer.visit_count} orders
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-purple-500" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-purple-500" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 col-span-2">
                        <Calendar className="h-3 w-3 text-purple-500" />
                        <span>
                          Last visit: {formatDate(customer.last_visit_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {hasMoreCustomers && (
                <div className="flex flex-col items-center py-4 gap-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {paginatedCustomers.length} of{" "}
                    {filteredCustomers.length} customers
                  </p>
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="w-full max-w-xs bg-white/50 dark:bg-gray-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                  >
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load More (
                    {Math.min(
                      PAGE_SIZE,
                      filteredCustomers.length - visibleCount
                    )}{" "}
                    more)
                  </Button>
                </div>
              )}

              {/* All loaded indicator */}
              {!hasMoreCustomers && filteredCustomers.length > PAGE_SIZE && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                  All {filteredCustomers.length} customers loaded
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CustomerList;
