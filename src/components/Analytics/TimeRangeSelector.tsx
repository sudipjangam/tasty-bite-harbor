
import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface TimeRangeSelectorProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
}

const TimeRangeSelector = ({ timeRange, setTimeRange }: TimeRangeSelectorProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex flex-col space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Time Range</h3>
          <RadioGroup 
            value={timeRange} 
            onValueChange={setTimeRange}
            className="flex flex-wrap space-x-2 md:space-x-4"
          >
            <div className="flex items-center space-x-2 bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md cursor-pointer">
              <RadioGroupItem value="7" id="r1" />
              <Label htmlFor="r1" className="cursor-pointer">7 Days</Label>
            </div>
            <div className="flex items-center space-x-2 bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md cursor-pointer">
              <RadioGroupItem value="30" id="r2" />
              <Label htmlFor="r2" className="cursor-pointer">30 Days</Label>
            </div>
            <div className="flex items-center space-x-2 bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md cursor-pointer">
              <RadioGroupItem value="90" id="r3" />
              <Label htmlFor="r3" className="cursor-pointer">90 Days</Label>
            </div>
            <div className="flex items-center space-x-2 bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-md cursor-pointer">
              <RadioGroupItem value="365" id="r4" />
              <Label htmlFor="r4" className="cursor-pointer">1 Year</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeRangeSelector;
