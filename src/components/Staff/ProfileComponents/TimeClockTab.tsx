
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
import { Clock } from "lucide-react";
import type { StaffTimeClockEntry } from "@/types/staff";
import { calculateHourMinuteDuration } from "../utilities/staffUtils";

interface TimeClockTabProps {
  timeClockEntries: StaffTimeClockEntry[];
  formatDate: (dateString: string) => string;
  onClockInOut: () => void;
}

export const TimeClockTab: React.FC<TimeClockTabProps> = ({
  timeClockEntries,
  formatDate,
  onClockInOut,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <CardTitle>Time Clock</CardTitle>
          <CardDescription>Recent clock in/out records.</CardDescription>
        </div>
        <Button onClick={onClockInOut}>Clock In/Out</Button>
      </CardHeader>
      <CardContent>
        {timeClockEntries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-lg font-medium">No time clock entries</h3>
            <p className="text-muted-foreground">
              This staff member doesn't have any recorded time clock entries.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeClockEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatDate(entry.clock_in)}
                  </TableCell>
                  <TableCell>{format(parseISO(entry.clock_in), "h:mm a")}</TableCell>
                  <TableCell>
                    {entry.clock_out 
                      ? format(parseISO(entry.clock_out), "h:mm a") 
                      : <Badge variant="outline" className="text-amber-600">Active</Badge>}
                  </TableCell>
                  <TableCell>
                    {entry.clock_out 
                      ? calculateHourMinuteDuration(entry.clock_in, entry.clock_out)
                      : "—"
                    }
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.notes || "—"}
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
