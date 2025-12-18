
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrencyContext } from '@/contexts/CurrencyContext';

interface RoomChargesTableProps {
  roomPrice: number;
  daysStayed: number;
  posTotal?: number; // Total of POS orders charged to room
}

const RoomChargesTable: React.FC<RoomChargesTableProps> = ({ roomPrice, daysStayed, posTotal = 0 }) => {
  const { symbol: currencySymbol } = useCurrencyContext();
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Room Charges</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount ({currencySymbol})</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Room charge ({daysStayed} day{daysStayed !== 1 ? 's' : ''})</TableCell>
            <TableCell className="text-right">{currencySymbol}{roomPrice * daysStayed}</TableCell>
          </TableRow>
          {posTotal > 0 && (
            <TableRow>
              <TableCell>POS Food & Beverage</TableCell>
              <TableCell className="text-right">{currencySymbol}{posTotal.toFixed(2)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default RoomChargesTable;
