import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoyaltyBadge from "@/components/Customers/LoyaltyBadge";
import { Customer, CustomerNote, CustomerActivity } from "@/types/customer";
import { useCustomerData } from "@/hooks/useCustomerData";
import { cn } from "@/lib/utils";
import {
  User,
  Edit,
  Gift,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Hotel,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  Plus,
  Tag,
  X,
  MessageSquare,
  Star,
  CreditCard,
  Activity,
  Sparkles,
} from "lucide-react";

interface CustomerFullProfileProps {
  customer: Customer | null;
  notes: CustomerNote[];
  activities: CustomerActivity[];
  loading?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onAddNote: (customerId: string, content: string) => void;
  onAddTag: (customerId: string, tag: string) => void;
  onRemoveTag: (customerId: string, tag: string) => void;
  onUpdateCustomer: (customer: Customer, updates: Partial<Customer>) => void;
}

const CustomerFullProfile: React.FC<CustomerFullProfileProps> = ({
  customer,
  notes,
  activities,
  loading = false,
  onEditCustomer,
  onAddNote,
  onAddTag,
  onRemoveTag,
  onUpdateCustomer,
}) => {
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const { getCustomerComprehensiveData } = useCustomerData();

  // Fetch comprehensive data
  const { data: comprehensiveData, isLoading: isLoadingData } = useQuery({
    queryKey: ["customer-comprehensive", customer?.name],
    queryFn: () =>
      customer ? getCustomerComprehensiveData(customer.name) : null,
    enabled: !!customer,
  });

  if (!customer) {
    return (
      <Card className="h-full flex items-center justify-center bg-white/80 backdrop-blur-xl border-white/20 shadow-xl">
        <CardContent className="text-center p-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Select a Customer
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose a customer from the list to view their complete profile and
            history.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = comprehensiveData?.stats || {
    totalPosSpend: 0,
    totalRoomSpend: 0,
    totalRoomFoodSpend: 0,
    totalLifetimeValue: 0,
    posOrderCount: 0,
    roomFoodOrderCount: 0,
    roomStayCount: 0,
    reservationCount: 0,
    avgOrderValue: 0,
    lastVisit: null,
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(customer.id, newNote.trim());
      setNewNote("");
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(customer.id, newTag.trim());
      setNewTag("");
      setShowAddTag(false);
    }
  };

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case "Diamond":
        return "from-violet-600 to-purple-600";
      case "Platinum":
        return "from-gray-500 to-slate-600";
      case "Gold":
        return "from-yellow-500 to-amber-600";
      case "Silver":
        return "from-gray-400 to-slate-400";
      case "Bronze":
        return "from-amber-600 to-orange-700";
      default:
        return "from-gray-300 to-gray-400";
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Customer Header Card */}
      <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden">
        <div
          className={cn(
            "h-24 bg-gradient-to-r",
            getTierGradient(customer.loyalty_tier)
          )}
        />
        <CardHeader className="-mt-12 pb-4">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
                <User className="h-10 w-10 text-gray-600" />
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {customer.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <LoyaltyBadge tier={customer.loyalty_tier} showIcon />
                  <Badge variant="outline" className="text-xs bg-white/50">
                    <Gift className="h-3 w-3 mr-1" />
                    {customer.loyalty_points.toLocaleString()} pts
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Customer since {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => onEditCustomer(customer)}
              variant="outline"
              size="sm"
              className="bg-white/80"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>

        {/* Stats Grid */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {/* Total Lifetime Value */}
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium opacity-80">
                  Lifetime Value
                </span>
              </div>
              <CurrencyDisplay
                amount={stats.totalLifetimeValue}
                className="text-xl font-bold text-white"
              />
            </div>

            {/* POS Spend */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium opacity-80">
                  POS Spend
                </span>
              </div>
              <CurrencyDisplay
                amount={stats.totalPosSpend}
                className="text-xl font-bold text-white"
              />
            </div>

            {/* Room Spend */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Hotel className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium opacity-80">
                  Room Spend
                </span>
              </div>
              <CurrencyDisplay
                amount={stats.totalRoomSpend}
                className="text-xl font-bold text-white"
              />
            </div>

            {/* Total Orders */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <UtensilsCrossed className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium opacity-80">Orders</span>
              </div>
              <p className="text-xl font-bold">
                {stats.posOrderCount + stats.roomFoodOrderCount}
              </p>
            </div>

            {/* Avg Order Value */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium opacity-80">
                  Avg Order
                </span>
              </div>
              <CurrencyDisplay
                amount={stats.avgOrderValue}
                className="text-xl font-bold text-white"
              />
            </div>

            {/* Last Visit */}
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 opacity-80" />
                <span className="text-xs font-medium opacity-80">
                  Last Visit
                </span>
              </div>
              <p className="text-sm font-bold truncate">
                {formatDate(stats.lastVisit)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Card className="flex-1 bg-white/80 backdrop-blur-xl border-white/20 shadow-xl overflow-hidden flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="w-full justify-start border-b bg-transparent px-4 pt-4 gap-2">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="pos-orders"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg"
            >
              POS Orders ({stats.posOrderCount})
            </TabsTrigger>
            <TabsTrigger
              value="room-stays"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-500 data-[state=active]:text-white rounded-lg"
            >
              Room Stays ({stats.roomStayCount})
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-lg"
            >
              Notes ({notes.length})
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white rounded-lg"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-4 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-500" />
                    Contact Information
                  </h3>
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    {customer.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {customer.email}
                        </span>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {customer.phone}
                        </span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {customer.address}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Joined {formatDate(customer.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Tag className="h-5 w-5 text-pink-500" />
                      Tags
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddTag(!showAddTag)}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    {showAddTag && (
                      <div className="flex gap-2 mb-3">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Enter tag..."
                          className="bg-white"
                          onKeyPress={(e) =>
                            e.key === "Enter" && handleAddTag()
                          }
                        />
                        <Button onClick={handleAddTag} size="sm">
                          Add
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {customer.tags && customer.tags.length > 0 ? (
                        customer.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 dark:from-purple-900 dark:to-pink-900 dark:text-purple-300 group"
                          >
                            {tag}
                            <button
                              onClick={() => onRemoveTag(customer.id, tag)}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">
                          No tags yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activity Breakdown */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-500" />
                    Activity Breakdown
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                      <ShoppingBag className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-600">
                        {stats.posOrderCount}
                      </p>
                      <p className="text-xs text-blue-600/70">POS Orders</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                      <UtensilsCrossed className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-600">
                        {stats.roomFoodOrderCount}
                      </p>
                      <p className="text-xs text-green-600/70">Room Service</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                      <Hotel className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-600">
                        {stats.roomStayCount}
                      </p>
                      <p className="text-xs text-purple-600/70">Room Stays</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
                      <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-orange-600">
                        {stats.reservationCount}
                      </p>
                      <p className="text-xs text-orange-600/70">Reservations</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* POS Orders Tab */}
            <TabsContent value="pos-orders" className="p-4 m-0">
              {isLoadingData ? (
                <div className="text-center py-8 text-gray-500">
                  Loading orders...
                </div>
              ) : comprehensiveData?.posOrders &&
                comprehensiveData.posOrders.length > 0 ? (
                <div className="space-y-3">
                  {comprehensiveData.posOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Order #{order.order_id?.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDateTime(order.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <CurrencyDisplay
                          amount={order.amount}
                          className="font-bold text-gray-900 dark:text-white"
                        />
                        <Badge
                          variant="secondary"
                          className={cn(
                            "mt-1",
                            order.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No POS orders yet</p>
                </div>
              )}
            </TabsContent>

            {/* Room Stays Tab */}
            <TabsContent value="room-stays" className="p-4 m-0">
              {isLoadingData ? (
                <div className="text-center py-8 text-gray-500">
                  Loading room stays...
                </div>
              ) : comprehensiveData?.roomBillings &&
                comprehensiveData.roomBillings.length > 0 ? (
                <div className="space-y-3">
                  {comprehensiveData.roomBillings.map((billing: any) => (
                    <div
                      key={billing.id}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Hotel className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {billing.roomName}
                            </p>
                            <p className="text-sm text-gray-500">
                              Checkout: {formatDate(billing.checkoutDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <CurrencyDisplay
                            amount={billing.totalAmount}
                            className="font-bold text-gray-900 dark:text-white"
                          />
                          <Badge
                            variant="secondary"
                            className="mt-1 bg-green-100 text-green-700"
                          >
                            {billing.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
                          <p className="text-gray-500 dark:text-gray-400">
                            Days
                          </p>
                          <p className="font-semibold">{billing.daysStayed}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
                          <p className="text-gray-500 dark:text-gray-400">
                            Room Charges
                          </p>
                          <CurrencyDisplay
                            amount={billing.roomCharges}
                            className="font-semibold"
                          />
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 text-center">
                          <p className="text-gray-500 dark:text-gray-400">
                            Food Orders
                          </p>
                          <CurrencyDisplay
                            amount={billing.foodOrdersTotal}
                            className="font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Hotel className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No room stays yet</p>
                </div>
              )}
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-4 m-0">
              <div className="space-y-4">
                {/* Add Note */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this customer..."
                    className="mb-3 bg-white"
                    rows={3}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>

                {/* Notes List */}
                {notes.length > 0 ? (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 dark:text-white">
                              {note.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>{note.created_by}</span>
                              <span>•</span>
                              <span>{formatDateTime(note.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No notes yet. Add your first note above!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="p-4 m-0">
              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-1">
                          {activity.activity_type}
                        </Badge>
                        <p className="text-gray-900 dark:text-white">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No activity recorded yet</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </Card>
    </div>
  );
};

export default CustomerFullProfile;
