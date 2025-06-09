
import React from 'react';
import { StandardizedCard } from '@/components/ui/standardized-card';
import { Badge } from '@/components/ui/badge';
import { Users, Star, Calendar, DollarSign } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_date: string;
  loyalty_tiers?: {
    name: string;
    points_required: number;
  };
  orders?: Array<{
    id: string;
    total: number;
    created_at: string;
  }>;
}

interface CustomerSegmentsProps {
  customers: Customer[];
}

const CustomerSegments: React.FC<CustomerSegmentsProps> = ({ customers }) => {
  // Segment customers
  const loyalCustomers = customers.filter(c => c.loyalty_points > 1000);
  const newCustomers = customers.filter(c => c.visit_count <= 2);
  const highValueCustomers = customers.filter(c => c.total_spent > 5000);
  const inactiveCustomers = customers.filter(c => {
    const lastVisit = new Date(c.last_visit_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastVisit < thirtyDaysAgo;
  });

  const segments = [
    {
      title: 'Loyal Customers',
      description: 'Customers with 1000+ loyalty points',
      count: loyalCustomers.length,
      customers: loyalCustomers,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'New Customers',
      description: 'Customers with 2 or fewer visits',
      count: newCustomers.length,
      customers: newCustomers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'High Value',
      description: 'Customers who spent ₹5000+',
      count: highValueCustomers.length,
      customers: highValueCustomers,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Inactive',
      description: 'No visits in the last 30 days',
      count: inactiveCustomers.length,
      customers: inactiveCustomers,
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {segments.map((segment, index) => {
          const Icon = segment.icon;
          return (
            <StandardizedCard key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${segment.bgColor}`}>
                  <Icon className={`h-6 w-6 ${segment.color}`} />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {segment.count}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {segment.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {segment.description}
              </p>
            </StandardizedCard>
          );
        })}
      </div>

      {/* Detailed Customer Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {segments.slice(0, 2).map((segment, index) => {
          const Icon = segment.icon;
          return (
            <StandardizedCard key={index} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${segment.bgColor}`}>
                  <Icon className={`h-5 w-5 ${segment.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {segment.title}
                </h3>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {segment.customers.slice(0, 10).map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {customer.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {customer.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        ₹{customer.total_spent}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {customer.visit_count} visits
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {segment.customers.length > 10 && (
                <p className="text-sm text-gray-500 mt-3 text-center">
                  +{segment.customers.length - 10} more customers
                </p>
              )}
            </StandardizedCard>
          );
        })}
      </div>
    </div>
  );
};

export default CustomerSegments;
