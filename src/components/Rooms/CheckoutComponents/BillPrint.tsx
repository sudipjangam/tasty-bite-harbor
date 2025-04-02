
import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface BillPrintProps {
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerPhone: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
  daysStayed: number;
  roomPrice: number;
  roomCharges: number;
  foodOrders: {
    id: string;
    created_at: string;
    items: any[];
    total: number;
  }[];
  additionalCharges: { name: string; amount: number; }[];
  serviceCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  billId: string;
  billDate: string;
}

const BillPrint = forwardRef<HTMLDivElement, BillPrintProps>(({
  restaurantName,
  restaurantAddress,
  customerName,
  customerPhone,
  roomName,
  checkInDate,
  checkOutDate,
  daysStayed,
  roomPrice,
  roomCharges,
  foodOrders,
  additionalCharges,
  serviceCharge,
  discount,
  grandTotal,
  paymentMethod,
  billId,
  billDate
}, ref) => {
  return (
    <div ref={ref} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Header */}
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold mb-1">{restaurantName || 'Hotel/Restaurant Name'}</h1>
        <p className="text-sm mb-2">{restaurantAddress || 'Address Line, City, State, PIN'}</p>
        <p className="text-sm">GSTIN: XXXXXXXXXXXX | Phone: +91 XXXXXXXXXX</p>
      </div>

      {/* Bill Info */}
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="font-bold mb-2">Bill To:</h2>
          <p className="text-sm">{customerName}</p>
          {customerPhone && <p className="text-sm">Phone: {customerPhone}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm">Invoice #: {billId}</p>
          <p className="text-sm">Date: {billDate}</p>
          <p className="text-sm">Payment Method: {paymentMethod.toUpperCase()}</p>
        </div>
      </div>

      {/* Room Details */}
      <div className="mb-6">
        <h2 className="font-bold mb-2">Room Details:</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1">Room:</td>
              <td className="py-1">{roomName}</td>
            </tr>
            <tr>
              <td className="py-1">Check-in Date:</td>
              <td className="py-1">{checkInDate}</td>
            </tr>
            <tr>
              <td className="py-1">Check-out Date:</td>
              <td className="py-1">{checkOutDate}</td>
            </tr>
            <tr>
              <td className="py-1">Days Stayed:</td>
              <td className="py-1">{daysStayed}</td>
            </tr>
            <tr>
              <td className="py-1">Room Rate:</td>
              <td className="py-1">₹{roomPrice.toFixed(2)} per day</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Charges Table */}
      <div className="mb-6">
        <h2 className="font-bold mb-2">Charges:</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">Room Charges ({daysStayed} day{daysStayed !== 1 ? 's' : ''})</td>
              <td className="text-right py-1">₹{roomCharges.toFixed(2)}</td>
            </tr>

            {/* Food Orders */}
            {foodOrders.length > 0 && (
              <>
                {foodOrders.map((order, index) => (
                  <tr key={order.id}>
                    <td className="py-1">
                      Food Order - {format(new Date(order.created_at), 'dd/MM/yyyy')}
                      <ul className="list-disc list-inside text-xs ml-4">
                        {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                          <li key={i}>{item.name} x {item.quantity}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="text-right py-1">₹{order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </>
            )}

            {/* Additional Charges */}
            {additionalCharges.map((charge, index) => (
              <tr key={index}>
                <td className="py-1">{charge.name}</td>
                <td className="text-right py-1">₹{charge.amount.toFixed(2)}</td>
              </tr>
            ))}

            {/* Service Charge */}
            <tr>
              <td className="py-1">Service Charge (5%)</td>
              <td className="text-right py-1">₹{serviceCharge.toFixed(2)}</td>
            </tr>

            {/* Discount if applicable */}
            {discount > 0 && (
              <tr>
                <td className="py-1">Discount</td>
                <td className="text-right py-1 text-green-600">-₹{discount.toFixed(2)}</td>
              </tr>
            )}

            {/* Total */}
            <tr className="border-t font-bold">
              <td className="py-2">Total Amount</td>
              <td className="text-right py-2">₹{grandTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm">
        <p className="mb-2">Thank you for your stay!</p>
        <p>We hope to see you again soon.</p>
      </div>
    </div>
  );
});

BillPrint.displayName = 'BillPrint';

export default BillPrint;
