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
  discountPercentage?: number;
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
  discountPercentage,
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
    <div ref={ref} className="bg-white text-black" style={{ width: '58mm', padding: '0.5mm', fontSize: '13px', fontFamily: 'monospace' }}>
      {/* Header */}
      <div className="text-center mb-1">
        <h1 className="font-bold mb-0.5" style={{ fontSize: '18px', lineHeight: '1.2' }}>
          {restaurantName || 'Hotel/Restaurant Name'}
        </h1>
        <p className="mb-0.5" style={{ fontSize: '11px', lineHeight: '1.3' }}>
          {restaurantAddress || 'Address, City, State, PIN'}
        </p>
        {restaurantPhone && (
          <p className="mb-0.5" style={{ fontSize: '11px' }}>Ph: {restaurantPhone}</p>
        )}
        {gstNumber && (
          <p className="font-semibold" style={{ fontSize: '11px' }}>GSTIN: {gstNumber}</p>
        )}
      </div>
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Invoice Title */}
      <div className="text-center mb-1">
        <h2 className="font-bold" style={{ fontSize: '14px' }}>
          {gstNumber ? 'TAX INVOICE' : 'BILL RECEIPT'}
        </h2>
      </div>
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Bill Info */}
      <div className="mb-1">
        <p style={{ fontSize: '12px' }}><span className="font-semibold">Bill#:</span> {billId}</p>
        <p style={{ fontSize: '12px' }}><span className="font-semibold">To:</span> {roomName}</p>
        <p style={{ fontSize: '12px' }}><span className="font-semibold">Date:</span> {format(new Date(billDate), 'dd MMM yyyy')}</p>
        <p style={{ fontSize: '12px' }}><span className="font-semibold">Time:</span> {format(new Date(billDate), 'hh:mm a')}</p>
      </div>
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>
      
      {/* Guest Details */}
      <div className="mb-1">
        <p style={{ fontSize: '12px' }}><span className="font-semibold">Guest:</span> {customerName}</p>
        {customerPhone && <p style={{ fontSize: '12px' }}><span className="font-semibold">Phone:</span> {customerPhone}</p>}
        <p style={{ fontSize: '12px' }}>
          <span className="font-semibold">Stay:</span> {format(new Date(checkInDate), 'dd MMM')} - {format(new Date(checkOutDate), 'dd MMM')} ({daysStayed}d)
        </p>
      </div>
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Billing Details Header */}
      <div className="mb-1">
        <h3 className="font-bold text-center mb-1" style={{ fontSize: '13px' }}>Particulars</h3>
      </div>
      
      {/* Items Table Header */}
      <div className="flex justify-between border-t border-b border-gray-400 py-0.5" style={{ fontSize: '11px' }}>
        <span className="font-semibold flex-1">Item</span>
        <span className="font-semibold w-8 text-center">Qty</span>
        <span className="font-semibold w-16 text-right">Rate</span>
        <span className="font-semibold w-16 text-right">Amount</span>
      </div>
      
      {/* Room Charges */}
      <div className="flex justify-between py-0.5" style={{ fontSize: '12px' }}>
        <span className="flex-1">{roomName}</span>
        <span className="w-8 text-center">{daysStayed}</span>
        <span className="w-16 text-right">{roomPrice.toFixed(2)}</span>
        <span className="w-16 text-right">{roomCharges.toFixed(2)}</span>
      </div>

      {/* Food Orders */}
      {foodOrders.map((order) => (
        <React.Fragment key={order.id}>
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between py-0.5" style={{ fontSize: '12px' }}>
              <span className="flex-1">{item.name}</span>
              <span className="w-8 text-center">{item.quantity}</span>
              <span className="w-16 text-right">{item.price.toFixed(2)}</span>
              <span className="w-16 text-right">{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </React.Fragment>
      ))}

      {/* Additional Charges */}
      {additionalCharges.map((charge, index) => (
        <div key={`charge-${index}`} className="flex justify-between py-0.5" style={{ fontSize: '12px' }}>
          <span className="flex-1">{charge.name}</span>
          <span className="w-8 text-center">1</span>
          <span className="w-16 text-right">{charge.amount.toFixed(2)}</span>
          <span className="w-16 text-right">{charge.amount.toFixed(2)}</span>
        </div>
      ))}
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Bill Summary */}
      <div className="space-y-0.5" style={{ fontSize: '12px' }}>
        <div className="flex justify-between">
          <span>Sub Total:</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        {serviceCharge > 0 && (
          <div className="flex justify-between">
            <span>Service Charge:</span>
            <span>{serviceCharge.toFixed(2)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between">
            <span>Discount{discountPercentage ? ` (${discountPercentage}%)` : ''}:</span>
            <span>-{discount.toFixed(2)}</span>
          </div>
        )}
        {finalTaxAmount > 0 && (
          <>
            <div className="flex justify-between">
              <span>CGST @ {(taxRate / 2).toFixed(1)}%:</span>
              <span>{(finalTaxAmount / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST @ {(taxRate / 2).toFixed(1)}%:</span>
              <span>{(finalTaxAmount / 2).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>
      
      {/* Net Amount */}
      <div className="flex justify-between font-bold mb-2" style={{ fontSize: '13px' }}>
        <span>Net Amount:</span>
        <span>₹{netTotal.toFixed(2)}</span>
      </div>
      
      {/* Divider */}
      <div className="border-t border-dashed border-gray-400 my-1"></div>

      {/* Footer */}
      <div className="text-center mt-2">
        <p className="font-bold mb-1" style={{ fontSize: '11px' }}>Thank You!</p>
        <p style={{ fontSize: '8px' }}>Please visit again</p>
      </div>
    </div>
  );
});

BillPrint.displayName = 'BillPrint';

export default BillPrint;
