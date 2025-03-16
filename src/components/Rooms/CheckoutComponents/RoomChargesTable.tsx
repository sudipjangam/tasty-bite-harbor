
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RoomChargesTableProps {
  roomPrice: number;
  daysStayed: number;
}

const RoomChargesTable: React.FC<RoomChargesTableProps> = ({ roomPrice, daysStayed }) => {
  return (
    <div>
      <h3 className="text-lg font-medium mb-2">Room Charges</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount (₹)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Room charge ({daysStayed} day{daysStayed !== 1 ? 's' : ''})</TableCell>
            <TableCell className="text-right">₹{roomPrice * daysStayed}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default RoomChargesTable;
