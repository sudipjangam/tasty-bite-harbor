
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
      {/* Header with border and styling */}
      <div className="text-center border-2 border-gray-400 rounded-lg pb-4 mb-6 pt-4 bg-yellow-50">
        <h1 className="text-3xl font-bold mb-1">{restaurantName || 'Hotel/Restaurant Name'}</h1>
        <p className="text-sm mb-1">{restaurantAddress || 'Address Line, City, State, PIN'}</p>
        <p className="text-sm">GSTIN: XXXXXXXXXXXX | Phone: +91 XXXXXXXXXX</p>
      </div>

      {/* Bill Info with structured table layout */}
      <div className="border-2 border-gray-300 rounded p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h2 className="font-bold mb-2 text-lg border-b border-gray-300 pb-1">Bill To:</h2>
            <p className="text-sm">Name: <span className="font-medium">{customerName}</span></p>
            {customerPhone && <p className="text-sm">Phone: <span className="font-medium">{customerPhone}</span></p>}
          </div>
          <div className="text-right">
            <h2 className="font-bold mb-2 text-lg border-b border-gray-300 pb-1 text-right">Bill Details:</h2>
            <p className="text-sm">Invoice #: <span className="font-medium">{billId}</span></p>
            <p className="text-sm">Date: <span className="font-medium">{billDate}</span></p>
            <p className="text-sm">Payment: <span className="font-medium">{paymentMethod.toUpperCase()}</span></p>
          </div>
        </div>

        {/* Room Details in structured table */}
        <div className="mb-6 border rounded">
          <h2 className="font-bold p-2 bg-yellow-100 border-b">Room Details:</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Room:</td>
                <td className="py-2 px-3">{roomName}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Check-in:</td>
                <td className="py-2 px-3">{checkInDate}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Check-out:</td>
                <td className="py-2 px-3">{checkOutDate}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3 font-medium">Days Stayed:</td>
                <td className="py-2 px-3">{daysStayed}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Room Rate:</td>
                <td className="py-2 px-3">₹{roomPrice.toFixed(2)} per day</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Charges Table with better styling */}
        <div className="mb-6">
          <h2 className="font-bold p-2 bg-yellow-100 border rounded-t border-gray-300">Bill Summary:</h2>
          <table className="w-full text-sm border-x border-b rounded-b">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 border-b">Description</th>
                <th className="text-right py-2 px-3 border-b">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3">Room Charges ({daysStayed} day{daysStayed !== 1 ? 's' : ''})</td>
                <td className="text-right py-2 px-3 font-medium">₹{roomCharges.toFixed(2)}</td>
              </tr>

              {/* Food Orders with structured format */}
              {foodOrders.length > 0 && (
                <>
                  <tr className="border-b bg-gray-50">
                    <td colSpan={2} className="py-2 px-3 font-medium">Food Orders:</td>
                  </tr>
                  {foodOrders.map((order, index) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2 px-3">
                        <div className="font-medium">{format(new Date(order.created_at), 'dd/MM/yyyy')}</div>
                        <ul className="list-disc list-inside text-xs ml-4">
                          {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                            <li key={i}>{item.name} x {item.quantity} @ ₹{item.price?.toFixed(2) || '0.00'}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="text-right py-2 px-3 align-top font-medium">₹{order.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Additional Charges */}
              {additionalCharges.length > 0 && (
                <>
                  <tr className="border-b bg-gray-50">
                    <td colSpan={2} className="py-2 px-3 font-medium">Additional Charges:</td>
                  </tr>
                  {additionalCharges.map((charge, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-3">{charge.name}</td>
                      <td className="text-right py-2 px-3 font-medium">₹{charge.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Service Charge */}
              <tr className="border-b">
                <td className="py-2 px-3">Service Charge (5%)</td>
                <td className="text-right py-2 px-3 font-medium">₹{serviceCharge.toFixed(2)}</td>
              </tr>

              {/* Discount if applicable */}
              {discount > 0 && (
                <tr className="border-b">
                  <td className="py-2 px-3">Discount</td>
                  <td className="text-right py-2 px-3 text-green-600 font-medium">-₹{discount.toFixed(2)}</td>
                </tr>
              )}

              {/* Total */}
              <tr className="bg-yellow-50 font-bold">
                <td className="py-3 px-3">Total Amount</td>
                <td className="text-right py-3 px-3">₹{grandTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms and conditions */}
        <div className="text-xs mt-4 p-2 border-t">
          <p>Terms & Conditions:</p>
          <p>1. This is a computer-generated invoice and does not require a signature.</p>
          <p>2. All taxes are included as applicable.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-sm border-t pt-4">
        <p className="mb-2 font-medium">Thank you for your stay!</p>
        <p>We look forward to your next visit.</p>
      </div>

      {/* QR Code placeholder */}
      <div className="absolute bottom-8 right-8 border border-gray-300 h-24 w-24 flex items-center justify-center">
        <p className="text-xs text-center">QR Code</p>
      </div>
    </div>
  );
});

BillPrint.displayName = 'BillPrint';

export default BillPrint;
