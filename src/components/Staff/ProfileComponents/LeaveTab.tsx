
import React from "react";
import { format, parseISO } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import type { StaffLeaveBalance, StaffLeaveRequest } from "@/types/staff";

interface LeaveTabProps {
  leaveBalances: StaffLeaveBalance[];
  upcomingLeave: StaffLeaveRequest[];
  formatDate: (dateString: string) => string;
  calculateDuration: (startDateStr: string, endDateStr: string) => number;
  onRequestLeave: () => void;
}

export const LeaveTab: React.FC<LeaveTabProps> = ({
  leaveBalances,
  upcomingLeave,
  formatDate,
  calculateDuration,
  onRequestLeave,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <CardTitle>Leave Management</CardTitle>
          <CardDescription>Leave balances and requests.</CardDescription>
        </div>
        <Button onClick={onRequestLeave}>
          Request Leave
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Leave Balances</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {leaveBalances.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No leave balances available</p>
                </CardContent>
              </Card>
            ) : (
              leaveBalances.map((balance) => (
                <Card key={balance.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base capitalize">{balance.leave_type} Leave</CardTitle>
                    <CardDescription className="text-xs">
                      Updated {format(parseISO(balance.updated_at), "MMM dd, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {balance.total_days - balance.used_days} <span className="text-sm font-normal text-muted-foreground">/ {balance.total_days} days</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {balance.used_days} days used
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Upcoming Leave</h3>
          {upcomingLeave.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No upcoming leave</h3>
              <p className="text-muted-foreground">
                This staff member doesn't have any upcoming approved leave.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingLeave.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell className="font-medium capitalize">
                      {leave.leave_type || "Regular"}
                    </TableCell>
                    <TableCell>{formatDate(leave.start_date)}</TableCell>
                    <TableCell>{formatDate(leave.end_date)}</TableCell>
                    <TableCell>
                      {calculateDuration(leave.start_date, leave.end_date)} days
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={leave.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : leave.status === 'denied'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'}
                      >
                        {leave.status || "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
