
import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface BillPrintProps {
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone?: string;
  restaurantEmail?: string;
  gstNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
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
  taxRate?: number;
  taxAmount?: number;
}

const BillPrint = forwardRef<HTMLDivElement, BillPrintProps>(({
  restaurantName,
  restaurantAddress,
  restaurantPhone,
  restaurantEmail,
  gstNumber,
  customerName,
  customerPhone,
  customerEmail,
  customerAddress,
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
  billDate,
  taxRate = 0,
  taxAmount = 0
}, ref) => {
  const subtotal = roomCharges + additionalCharges.reduce((sum, charge) => sum + charge.amount, 0) + foodOrders.reduce((sum, order) => sum + order.total, 0);
  const taxableAmount = subtotal + serviceCharge - discount;
  const finalTaxAmount = taxAmount || (taxRate > 0 ? (taxableAmount * taxRate / 100) : 0);
  const netTotal = taxableAmount + finalTaxAmount;
  return (
    <div ref={ref} className="relative p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 z-0">
        <div className="text-8xl font-bold transform rotate-45 text-gray-400 select-none">
          {restaurantName}
        </div>
      </div>

      {/* Content Container */}
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center border-2 border-gray-800 rounded-lg pb-6 mb-8 pt-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">
            {restaurantName || 'Hotel/Restaurant Name'}
          </h1>
          <p className="text-base mb-1 text-gray-700">{restaurantAddress || 'Complete Address, City, State, PIN Code'}</p>
          <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
            {restaurantPhone && <span>Ph: {restaurantPhone}</span>}
            {restaurantEmail && <span>Email: {restaurantEmail}</span>}
          </div>
          {gstNumber && (
            <p className="text-sm font-semibold mt-2 text-gray-800">GSTIN: {gstNumber}</p>
          )}
        </div>

        {/* Invoice Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 inline-block">
            {gstNumber ? 'TAX INVOICE' : 'HOTEL BILL RECEIPT'}
          </h2>
        </div>

        {/* Bill Info */}
        <div className="border-2 border-gray-400 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div>
              <h3 className="font-bold mb-3 text-lg border-b-2 border-gray-400 pb-2">Bill To:</h3>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-semibold">Name:</span> {customerName}</p>
                {customerPhone && <p className="text-sm"><span className="font-semibold">Phone:</span> {customerPhone}</p>}
                {customerEmail && <p className="text-sm"><span className="font-semibold">Email:</span> {customerEmail}</p>}
                {customerAddress && <p className="text-sm"><span className="font-semibold">Address:</span> {customerAddress}</p>}
              </div>
            </div>
            <div className="text-right">
              <h3 className="font-bold mb-3 text-lg border-b-2 border-gray-400 pb-2">Invoice Details:</h3>
              <div className="space-y-1">
                <p className="text-sm"><span className="font-semibold">Bill No:</span> {billId}</p>
                <p className="text-sm"><span className="font-semibold">Date:</span> {billDate}</p>
                <p className="text-sm"><span className="font-semibold">Payment Method:</span> {paymentMethod.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Guest Stay Details */}
          <div className="mb-6 border-2 border-gray-300 rounded-lg overflow-hidden">
            <h3 className="font-bold p-3 bg-gray-100 text-gray-800">Guest Stay Details</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-semibold bg-gray-50">Room Number:</td>
                  <td className="py-3 px-4">{roomName}</td>
                  <td className="py-3 px-4 font-semibold bg-gray-50">Room Type:</td>
                  <td className="py-3 px-4">Standard</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-semibold bg-gray-50">Check-in Date:</td>
                  <td className="py-3 px-4">{checkInDate}</td>
                  <td className="py-3 px-4 font-semibold bg-gray-50">Check-out Date:</td>
                  <td className="py-3 px-4">{checkOutDate}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-semibold bg-gray-50">No. of Days:</td>
                  <td className="py-3 px-4 font-bold text-blue-600">{daysStayed}</td>
                  <td className="py-3 px-4 font-semibold bg-gray-50">Room Rate:</td>
                  <td className="py-3 px-4">₹{roomPrice.toFixed(2)} per day</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing Details */}
        <div className="mb-8">
          <table className="w-full border-2 border-gray-400 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-200">
                <th className="text-left py-3 px-4 font-bold">Sr. No.</th>
                <th className="text-left py-3 px-4 font-bold">Description</th>
                <th className="text-center py-3 px-4 font-bold">Rate</th>
                <th className="text-center py-3 px-4 font-bold">No. of Days/Qty</th>
                <th className="text-right py-3 px-4 font-bold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {/* Room Charges */}
              <tr className="border-b">
                <td className="py-3 px-4">1</td>
                <td className="py-3 px-4">Room Charges - {roomName}</td>
                <td className="text-center py-3 px-4">₹{roomPrice.toFixed(2)}</td>
                <td className="text-center py-3 px-4">{daysStayed}</td>
                <td className="text-right py-3 px-4 font-semibold">₹{roomCharges.toFixed(2)}</td>
              </tr>

              {/* Food Orders */}
              {foodOrders.length > 0 && foodOrders.map((order, index) => (
                <tr key={order.id} className="border-b">
                  <td className="py-3 px-4">{index + 2}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold">Food Orders - {format(new Date(order.created_at), 'dd/MM/yyyy')}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
                        <div key={i}>{item.name} × {item.quantity} @ ₹{item.price?.toFixed(2) || '0.00'}</div>
                      ))}
                    </div>
                  </td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4">1</td>
                  <td className="text-right py-3 px-4 font-semibold">₹{order.total.toFixed(2)}</td>
                </tr>
              ))}

              {/* Additional Charges */}
              {additionalCharges.length > 0 && additionalCharges.map((charge, index) => (
                <tr key={index} className="border-b">
                  <td className="py-3 px-4">{foodOrders.length + index + 2}</td>
                  <td className="py-3 px-4">Additional Charges - {charge.name}</td>
                  <td className="text-center py-3 px-4">-</td>
                  <td className="text-center py-3 px-4">1</td>
                  <td className="text-right py-3 px-4 font-semibold">₹{charge.amount.toFixed(2)}</td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>

        {/* Bill Summary */}
        <div className="mb-8">
          <table className="w-full border-2 border-gray-400 rounded-lg overflow-hidden">
            <tbody>
              <tr className="bg-gray-100">
                <td className="py-3 px-4 font-bold text-right" colSpan={4}>Sub Total:</td>
                <td className="py-3 px-4 font-bold text-right">₹{subtotal.toFixed(2)}</td>
              </tr>
              
              {serviceCharge > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-4 text-right" colSpan={4}>Service Charge (5%):</td>
                  <td className="py-3 px-4 text-right font-semibold">₹{serviceCharge.toFixed(2)}</td>
                </tr>
              )}

              {discount > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-4 text-right" colSpan={4}>Discount:</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">-₹{discount.toFixed(2)}</td>
                </tr>
              )}

              {gstNumber && finalTaxAmount > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-4 text-right" colSpan={4}>CGST ({taxRate/2}%):</td>
                  <td className="py-3 px-4 text-right font-semibold">₹{(finalTaxAmount/2).toFixed(2)}</td>
                </tr>
              )}

              {gstNumber && finalTaxAmount > 0 && (
                <tr className="border-b">
                  <td className="py-3 px-4 text-right" colSpan={4}>SGST ({taxRate/2}%):</td>
                  <td className="py-3 px-4 text-right font-semibold">₹{(finalTaxAmount/2).toFixed(2)}</td>
                </tr>
              )}

              <tr className="bg-blue-100 border-2 border-blue-400">
                <td className="py-4 px-4 font-bold text-lg text-right" colSpan={4}>Total Amount:</td>
                <td className="py-4 px-4 font-bold text-lg text-right">₹{(netTotal || grandTotal).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-6 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
          <h3 className="font-bold mb-2">Terms & Conditions:</h3>
          <div className="text-xs space-y-1">
            <p>1. This is a computer-generated invoice and does not require a signature.</p>
            <p>2. All taxes are included as applicable.</p>
            <p>3. Payment received in full. No refund for early checkout.</p>
            <p>4. Any disputes should be settled within 7 days of checkout.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="border-t-2 border-gray-400 pt-4 mb-4">
            <p className="text-lg font-bold text-gray-800">Thank you for choosing {restaurantName}!</p>
            <p className="text-sm text-gray-600">We look forward to serving you again.</p>
            {gstNumber && (
              <p className="text-xs text-gray-500 mt-2">
                This is a computer generated invoice and authorized signature is not required.
              </p>
            )}
          </div>
          
          <div className="flex justify-between items-end">
            <div className="text-left text-xs text-gray-500">
              <p>Generated on: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
            </div>
            <div className="text-right">
              <div className="border border-gray-400 h-20 w-32 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <p className="text-xs font-semibold">Authorized Signature</p>
                  <p className="text-xs text-gray-500 mt-8">{restaurantName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BillPrint.displayName = 'BillPrint';

export default BillPrint;
