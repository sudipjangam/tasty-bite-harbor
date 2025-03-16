
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from 'lucide-react';

interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

interface AdditionalChargesSectionProps {
  additionalCharges: AdditionalCharge[];
  newCharge: { name: string; amount: number };
  setNewCharge: (charge: { name: string; amount: number }) => void;
  handleAddCharge: () => void;
  handleRemoveCharge: (id: string) => void;
  includeServiceCharge: boolean;
  setIncludeServiceCharge: (include: boolean) => void;
  serviceCharge: number;
  setServiceCharge: (amount: number) => void;
}

const AdditionalChargesSection: React.FC<AdditionalChargesSectionProps> = ({
  additionalCharges,
  newCharge,
  setNewCharge,
  handleAddCharge,
  handleRemoveCharge,
  includeServiceCharge,
  setIncludeServiceCharge,
  serviceCharge,
  setServiceCharge
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">Additional Charges</h3>
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Service"
            className="w-32"
            value={newCharge.name}
            onChange={(e) => setNewCharge({...newCharge, name: e.target.value})}
          />
          <Input 
            type="number"
            placeholder="Amount"
            className="w-24"
            value={newCharge.amount || ''}
            onChange={(e) => setNewCharge({...newCharge, amount: parseFloat(e.target.value) || 0})}
          />
          <Button size="sm" variant="outline" onClick={handleAddCharge}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount (₹)</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {additionalCharges.map((charge) => (
            <TableRow key={charge.id}>
              <TableCell>{charge.name}</TableCell>
              <TableCell className="text-right">₹{charge.amount}</TableCell>
              <TableCell>
                {charge.id !== 'food-orders' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveCharge(charge.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="flex items-center gap-2">
              <Label htmlFor="include-service">Service Charge</Label>
              <input
                id="include-service"
                type="checkbox"
                checked={includeServiceCharge}
                onChange={(e) => setIncludeServiceCharge(e.target.checked)}
                className="mr-2"
              />
            </TableCell>
            <TableCell className="text-right">
              <Input
                type="number"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                className="w-24 ml-auto"
                disabled={!includeServiceCharge}
              />
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default AdditionalChargesSection;
