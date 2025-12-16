import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  FileText,
  CalendarDays
} from "lucide-react";
import { getFilingDueDates } from '@/hooks/useGSTData';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';

export const FilingCalendar: React.FC = () => {
  const filingDates = getFilingDueDates();
  const now = new Date();
  
  // Generate calendar for next 3 months
  const months = [0, 1, 2].map(offset => {
    const monthDate = addMonths(now, offset);
    return {
      month: format(monthDate, 'MMMM yyyy'),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
      gstr1Due: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 11),
      gstr3bDue: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 20)
    };
  });

  const getStatusIcon = (dueDate: Date) => {
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dueDate < now) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else if (daysRemaining <= 5) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else if (daysRemaining <= 15) {
      return <Clock className="h-5 w-5 text-blue-500" />;
    } else {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getStatusBadge = (dueDate: Date) => {
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dueDate < now) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (daysRemaining <= 5) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">{daysRemaining}d left</Badge>;
    } else if (daysRemaining <= 15) {
      return <Badge variant="secondary">{daysRemaining}d left</Badge>;
    } else {
      return <Badge variant="outline">{daysRemaining}d left</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
          <CalendarDays className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">GST Filing Calendar</h3>
          <p className="text-muted-foreground">Due dates and reminders for GST returns</p>
        </div>
      </div>

      {/* Current Month Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`border-2 ${filingDates.gstr1.isOverdue ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : filingDates.gstr1.daysRemaining <= 5 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-bold">GSTR-1</span>
              </div>
              {getStatusBadge(filingDates.gstr1.date)}
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Period:</span> {filingDates.gstr1.period}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Due:</span> {format(filingDates.gstr1.date, 'dd MMM yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                Details of outward supplies
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${filingDates.gstr3b.isOverdue ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : filingDates.gstr3b.daysRemaining <= 5 ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-bold">GSTR-3B</span>
              </div>
              {getStatusBadge(filingDates.gstr3b.date)}
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Period:</span> {filingDates.gstr3b.period}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Due:</span> {format(filingDates.gstr3b.date, 'dd MMM yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                Monthly summary return + payment
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-bold">GSTR-9</span>
              </div>
              {getStatusBadge(filingDates.gstr9.date)}
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Period:</span> {filingDates.gstr9.period}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Due:</span> {format(filingDates.gstr9.date, 'dd MMM yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                Annual return
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Months */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Filing Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {months.map((month, idx) => (
              <div key={idx} className="border rounded-xl p-4">
                <h4 className="font-semibold mb-3 text-lg">{month.month}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {getStatusIcon(month.gstr1Due)}
                    <div className="flex-1">
                      <p className="font-medium">GSTR-1</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(month.gstr1Due, 'dd MMM yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(month.gstr1Due)}
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {getStatusIcon(month.gstr3bDue)}
                    <div className="flex-1">
                      <p className="font-medium">GSTR-3B</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(month.gstr3bDue, 'dd MMM yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(month.gstr3bDue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200">Important Reminders</h4>
              <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                <li>• GSTR-1 is due on the <strong>11th</strong> of the following month</li>
                <li>• GSTR-3B is due on the <strong>20th</strong> of the following month</li>
                <li>• Late filing attracts ₹50/day penalty (₹20/day for nil returns)</li>
                <li>• Interest on late payment of tax is 18% per annum</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FilingCalendar;
