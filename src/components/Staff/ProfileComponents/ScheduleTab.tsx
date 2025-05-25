
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
import { Calendar } from "lucide-react";
import type { StaffShift } from "@/types/staff";

interface ScheduleTabProps {
  upcomingShifts: StaffShift[];
  formatDate: (dateString: string) => string;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ 
  upcomingShifts, 
  formatDate 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Schedule</CardTitle>
        <CardDescription>Upcoming shifts and schedule information.</CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingShifts.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No upcoming shifts</h3>
            <p className="text-muted-foreground">
              This staff member doesn't have any upcoming shifts scheduled.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingShifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">
                    {formatDate(shift.start_time)}
                  </TableCell>
                  <TableCell>{format(parseISO(shift.start_time), "h:mm a")}</TableCell>
                  <TableCell>{format(parseISO(shift.end_time), "h:mm a")}</TableCell>
                  <TableCell>{shift.location || "Main"}</TableCell>
                  <TableCell>
                    {format(parseISO(shift.end_time).getTime() - parseISO(shift.start_time).getTime(), "H")} hrs
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
