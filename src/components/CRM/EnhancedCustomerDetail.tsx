
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, CustomerOrder, CustomerNote, CustomerActivity } from "@/types/customer";
import CustomerProfile360 from "./CustomerProfile360";
import { Edit, ArrowLeft } from "lucide-react";

interface EnhancedCustomerDetailProps {
  customer: Customer | null;
  orders: CustomerOrder[];
  notes: CustomerNote[];
  activities: CustomerActivity[];
  loading: boolean;
  onEditCustomer: (customer: Customer) => void;
  onAddNote: (customerId: string, content: string) => void;
  onAddTag: (customerId: string, tag: string) => void;
  onRemoveTag: (customerId: string, tag: string) => void;
  onUpdatePreferences: (customerId: string, preferences: string) => void;
  onBack?: () => void;
}

const EnhancedCustomerDetail: React.FC<EnhancedCustomerDetailProps> = ({
  customer,
  orders,
  notes,
  activities,
  loading,
  onEditCustomer,
  onAddNote,
  onAddTag,
  onRemoveTag,
  onUpdatePreferences,
  onBack
}) => {
  if (!customer) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-8">
          <div className="text-gray-400 mb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Select a Customer
          </h3>
          <p className="text-gray-500">
            Choose a customer from the list to view their detailed profile and activity.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-xl font-bold">Customer Profile</h2>
          </div>
          <Button onClick={() => onEditCustomer(customer)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>

      <div className="p-6">
        <CustomerProfile360
          customer={customer}
          orders={orders}
          notes={notes}
          activities={activities}
          onAddNote={onAddNote}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onUpdatePreferences={onUpdatePreferences}
        />
      </div>
    </div>
  );
};

export default EnhancedCustomerDetail;
