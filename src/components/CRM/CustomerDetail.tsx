
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Plus, 
  X,
  MessageSquare,
  ShoppingBag,
  Activity,
  Tag,
  TrendingUp,
  Star,
  Clock
} from "lucide-react";
import { Customer, CustomerOrder, CustomerNote, CustomerActivity } from "@/types/customer";
import { cn } from "@/lib/utils";

interface CustomerDetailProps {
  customer: Customer | null;
  orders: CustomerOrder[];
  notes: CustomerNote[];
  activities: CustomerActivity[];
  loading?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onAddNote: (customerId: string, content: string) => void;
  onAddTag: (customerId: string, tag: string) => void;
  onRemoveTag: (customerId: string, tag: string) => void;
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customer,
  orders,
  notes,
  activities,
  loading = false,
  onEditCustomer,
  onAddNote,
  onAddTag,
  onRemoveTag,
}) => {
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);

  if (!customer) {
    return (
      <Card className="h-full flex items-center justify-center bg-background border-border">
        <CardContent className="text-center p-8">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">Select a Customer</h3>
          <p className="text-muted-foreground">
            Choose a customer from the list to view their details and history.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLoyaltyColor = (tier: string) => {
    switch (tier) {
      case "Diamond": return "bg-purple-600 text-white";
      case "Platinum": return "bg-gray-400 text-white";
      case "Gold": return "bg-yellow-500 text-white";
      case "Silver": return "bg-gray-300 text-gray-800";
      case "Bronze": return "bg-amber-600 text-white";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getOrderSourceColor = (source: string) => {
    switch (source) {
      case "pos": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "room_service": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "table": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
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

  return (
    <div className="h-full flex flex-col">
      {/* Customer Header */}
      <Card className="mb-6 bg-background border-border">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={cn("text-sm", getLoyaltyColor(customer.loyalty_tier))}>
                    <Star className="h-3 w-3 mr-1" />
                    {customer.loyalty_tier}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Customer since {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => onEditCustomer(customer)}
              variant="outline"
              size="sm"
              className="bg-background border-input text-foreground hover:bg-muted"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-background border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(customer.total_spent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-background border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold text-foreground">{customer.visit_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-background border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(customer.average_order_value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-background border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Last Visit</p>
                <p className="text-sm font-medium text-foreground">
                  {customer.last_visit_date ? formatDate(customer.last_visit_date) : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card className="flex-1 bg-background border-border">
        <Tabs defaultValue="overview" className="h-full flex flex-col">
          <CardHeader className="border-b border-border">
            <TabsList className="bg-muted">
              <TabsTrigger value="overview" className="data-[state=active]:bg-background">Overview</TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-background">Orders ({orders.length})</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-background">Notes ({notes.length})</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-background">Activity</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="flex-1 p-6">
            <TabsContent value="overview" className="h-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                {/* Contact Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {customer.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{customer.address}</span>
                        </div>
                      )}
                      {customer.birthday && (
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{formatDate(customer.birthday)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preferences */}
                  {customer.preferences && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4">Preferences</h3>
                      <p className="text-muted-foreground">{customer.preferences}</p>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Tags</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddTag(true)}
                      className="bg-background border-input text-foreground hover:bg-muted"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {customer.tags && customer.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 bg-secondary text-secondary-foreground"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button
                          onClick={() => onRemoveTag(customer.id, tag)}
                          className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  {showAddTag && (
                    <div className="flex gap-2 mt-4">
                      <Input
                        placeholder="Enter tag name"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                        className="bg-background border-input"
                      />
                      <Button onClick={handleAddTag} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Add
                      </Button>
                      <Button 
                        onClick={() => setShowAddTag(false)} 
                        size="sm" 
                        variant="outline"
                        className="bg-background border-input text-foreground hover:bg-muted"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="h-full">
              <ScrollArea className="h-full">
                {orders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No orders found</h3>
                    <p className="text-sm text-muted-foreground">This customer hasn't placed any orders yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-foreground">Order ID</TableHead>
                        <TableHead className="text-foreground">Date</TableHead>
                        <TableHead className="text-foreground">Source</TableHead>
                        <TableHead className="text-foreground">Amount</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-foreground">Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id} className="border-border">
                          <TableCell className="font-mono text-foreground">{order.order_id.slice(-8)}</TableCell>
                          <TableCell className="text-foreground">{formatDate(order.date)}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-xs", getOrderSourceColor(order.source || 'pos'))}>
                              {order.source === 'room_service' ? 'Room Service' : 
                               order.source === 'pos' ? 'POS' : 
                               order.source === 'table' ? 'Table Order' : 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-foreground">{formatCurrency(order.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground">
                            {order.items?.length || 0} items
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="notes" className="h-full">
              <div className="space-y-4">
                {/* Add Note */}
                <div className="border border-border rounded-lg p-4 bg-background">
                  <h4 className="font-medium text-foreground mb-3">Add New Note</h4>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Enter your note about this customer..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="bg-background border-input"
                    />
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim()}
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  </div>
                </div>

                {/* Notes List */}
                <ScrollArea className="h-96">
                  {notes.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No notes yet</h3>
                      <p className="text-sm text-muted-foreground">Add your first note about this customer.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="border border-border rounded-lg p-4 bg-background">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-foreground">{note.created_by}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(note.created_at)}</span>
                          </div>
                          <p className="text-foreground">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="h-full">
              <ScrollArea className="h-full">
                {activities.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No activity yet</h3>
                    <p className="text-sm text-muted-foreground">Customer activity will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border border-border rounded-lg p-4 bg-background">
                        <div className="flex items-start gap-3">
                          <Activity className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="text-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(activity.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default CustomerDetail;
