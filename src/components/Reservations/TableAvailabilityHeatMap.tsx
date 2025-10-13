import { useState } from 'react';
import { useTableAvailability } from '@/hooks/useTableAvailability';
import { useTables } from '@/hooks/useTables';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export const TableAvailabilityHeatMap = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { availabilityData, isLoading, generateTimeSlots } = useTableAvailability(selectedDate);
  const { tables } = useTables();

  const handleGenerateSlots = () => {
    const tableIds = tables.map(t => t.id);
    const dateStr = selectedDate.toISOString().split('T')[0];
    generateTimeSlots.mutate({ date: dateStr, tableIds });
  };

  // Group availability by table
  const availabilityByTable = availabilityData.reduce((acc: any, slot: any) => {
    const tableId = slot.table_id;
    if (!acc[tableId]) {
      acc[tableId] = {
        table: slot.restaurant_tables,
        slots: []
      };
    }
    acc[tableId].slots.push(slot);
    return acc;
  }, {});

  // Generate time labels (9 AM to 9 PM)
  const timeLabels = [];
  for (let hour = 9; hour < 21; hour++) {
    timeLabels.push(`${hour}:00`);
    timeLabels.push(`${hour}:30`);
  }

  if (isLoading) return <div>Loading availability...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Table Availability Heat Map</h2>
          <p className="text-muted-foreground">Visual overview of table availability</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleGenerateSlots}>
            Generate Slots
          </Button>
        </div>
      </div>

      {availabilityData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No availability slots generated for this date.
            </p>
            <Button onClick={handleGenerateSlots}>
              Generate Availability Slots
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                {/* Header row with time slots */}
                <div className="flex gap-1 mb-2">
                  <div className="w-32 flex-shrink-0"></div>
                  {timeLabels.map((time, idx) => (
                    <div key={idx} className="w-8 text-xs text-center text-muted-foreground">
                      {idx % 2 === 0 ? time.split(':')[0] : ''}
                    </div>
                  ))}
                </div>

                {/* Table rows */}
                {Object.entries(availabilityByTable).map(([tableId, data]: [string, any]) => (
                  <div key={tableId} className="flex gap-1 mb-1">
                    <div className="w-32 flex-shrink-0 text-sm font-medium flex items-center">
                      {data.table.name} ({data.table.capacity})
                    </div>
                    {data.slots.map((slot: any, idx: number) => {
                      const availabilityPercentage = slot.is_available ? 100 : 0;
                      const color = availabilityPercentage === 100 
                        ? 'bg-green-500' 
                        : 'bg-red-500';
                      
                      return (
                        <div
                          key={idx}
                          className={`w-8 h-8 ${color} rounded transition-opacity hover:opacity-80 cursor-pointer`}
                          title={`${slot.time_slot} - ${slot.is_available ? 'Available' : 'Booked'}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Booked</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
