
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from 'lucide-react';

interface AdditionalChargesSectionProps {
  charges: { name: string; amount: number; }[];
  onChargesChange: (charges: { name: string; amount: number; }[]) => void;
}

const AdditionalChargesSection: React.FC<AdditionalChargesSectionProps> = ({
  charges,
  onChargesChange
}) => {
  const [newCharge, setNewCharge] = useState<{ name: string; amount: number }>({
    name: '',
    amount: 0
  });

  const handleAddCharge = () => {
    if (newCharge.name.trim() === '' || newCharge.amount <= 0) return;
    
    const chargeToAdd = {
      name: newCharge.name.trim(),
      amount: newCharge.amount
    };
    
    onChargesChange([...charges, chargeToAdd]);
    setNewCharge({ name: '', amount: 0 });
  };

  const handleRemoveCharge = (index: number) => {
    const updatedCharges = [...charges];
    updatedCharges.splice(index, 1);
    onChargesChange(updatedCharges);
  };

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

      {charges.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge, index) => (
              <TableRow key={index}>
                <TableCell>{charge.name}</TableCell>
                <TableCell className="text-right">₹{charge.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRemoveCharge(index)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdditionalChargesSection;
