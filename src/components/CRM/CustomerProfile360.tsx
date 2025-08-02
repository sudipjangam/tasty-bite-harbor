
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer, CustomerOrder, CustomerNote, CustomerActivity } from "@/types/customer";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Star, 
  TrendingUp, 
  Heart, 
  Gift,
  MessageCircle,
  DollarSign,
  ShoppingBag,
  Clock,
  Plus,
  Send
} from "lucide-react";
import { format } from "date-fns";

interface CustomerProfile360Props {
  customer: Customer;
  orders: CustomerOrder[];
  notes: CustomerNote[];
  activities: CustomerActivity[];
  onAddNote: (customerId: string, content: string) => void;
  onAddTag: (customerId: string, tag: string) => void;
  onRemoveTag: (customerId: string, tag: string) => void;
  onUpdatePreferences: (customerId: string, preferences: string) => void;
}

const CustomerProfile360: React.FC<CustomerProfile360Props> = ({
  customer,
  orders,
  notes,
  activities,
  onAddNote,
  onAddTag,
  onRemoveTag,
  onUpdatePreferences
}) => {
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [preferences, setPreferences] = useState(customer.preferences || "");
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(customer.id, newNote);
      setNewNote("");
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(customer.id, newTag);
      setNewTag("");
    }
  };

  const handleSavePreferences = () => {
    onUpdatePreferences(customer.id, preferences);
    setIsEditingPreferences(false);
  };

  const getLoyaltyTierColor = (tier: string) => {
    switch (tier) {
      case 'Diamond': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Platinum': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Silver': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const recentOrders = orders.slice(0, 5);
  const averageOrderValue = orders.length > 0 ? orders.reduce((sum, order) => sum + order.amount, 0) / orders.length : 0;
  const favoriteItems = orders.flatMap(order => order.items).reduce((acc: any, item: any) => {
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {});
  const topItems = Object.entries(favoriteItems).sort(([,a]: any, [,b]: any) => b - a).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Customer Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  {customer.email && (
                    <div className="flex items-center space-x-1">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{customer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`${getLoyaltyTierColor(customer.loyalty_tier)} border`}>
                <Star className="w-3 h-3 mr-1" />
                {customer.loyalty_tier}
              </Badge>
              <div className="mt-2 text-sm text-gray-600">
                Customer since {format(new Date(customer.created_at), 'MMM yyyy')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">₹{customer.total_spent.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Visit Count</p>
                <p className="text-2xl font-bold text-blue-600">{customer.visit_count}</p>
              </div>
              <ShoppingBag className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-purple-600">₹{averageOrderValue.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Loyalty Points</p>
                <p className="text-2xl font-bold text-yellow-600">{customer.loyalty_points}</p>
              </div>
              <Gift className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{customer.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-900">{customer.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{customer.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Birthday</label>
                  <p className="text-gray-900">
                    {customer.birthday ? format(new Date(customer.birthday), 'MMM dd, yyyy') : 'Not provided'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Favorite Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>Favorite Items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topItems.length > 0 ? (
                  <div className="space-y-2">
                    {topItems.map(([item, count]: [string, any]) => (
                      <div key={item} className="flex justify-between items-center">
                        <span className="text-gray-900">{item}</span>
                        <Badge variant="outline">{count} orders</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No order history available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {customer.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                    <button
                      onClick={() => onRemoveTag(customer.id, tag)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add new tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Order #{order.order_id}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(order.date), 'MMM dd, yyyy')} • {order.source}
                        </p>
                        <p className="text-sm text-gray-500">{order.items.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{order.amount}</p>
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No orders found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingPreferences ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter customer preferences..."
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    rows={5}
                  />
                  <div className="flex space-x-2">
                    <Button onClick={handleSavePreferences}>Save</Button>
                    <Button variant="outline" onClick={() => setIsEditingPreferences(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-900 mb-4">
                    {customer.preferences || 'No preferences recorded'}
                  </p>
                  <Button onClick={() => setIsEditingPreferences(true)}>
                    Edit Preferences
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Add a note about this customer..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddNote} className="self-end">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg bg-gray-50">
                      <p className="text-gray-900">{note.content}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>By {note.created_by}</span>
                        <span>{format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No notes added yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      <div>
                        <p className="text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No activity recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerProfile360;
