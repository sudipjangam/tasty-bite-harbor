import QRCode from 'qrcode';

/**
 * Encodes QR data to base64 string for URL transmission
 */
export function encodeQRData(data: any): string {
  const jsonString = JSON.stringify(data);
  return btoa(jsonString);
}

/**
 * Decodes base64 QR token back to object
 */
export function decodeQRData(token: string): any {
  try {
    const jsonString = atob(token);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to decode QR data:', error);
    return null;
  }
}

/**
 * Generates a QR code image as data URL
 */
export async function generateQRCodeImage(
  data: string,
  options?: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }
): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: options?.errorCorrectionLevel || 'H',
      width: options?.width || 400,
      margin: options?.margin || 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw error;
  }
}

/**
 * Downloads a QR code image to the user's device
 */
export function downloadQRCode(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates UPI payment string for QR code
 */
export function generateUPIString(params: {
  upiId: string;
  name: string;
  amount: number;
  transactionNote?: string;
}): string {
  const { upiId, name, amount, transactionNote = 'Payment' } = params;
  
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
}

/**
 * Validates if a session is still active
 */
export function isSessionActive(expiresAt: string): boolean {
  return new Date(expiresAt) > new Date();
}

/**
 * Formats currency in Indian Rupees
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validates QR code data structure
 */
export function validateQRData(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    'restaurantId' in data &&
    'entityType' in data &&
    'entityId' in data &&
    'token' in data
  );
}
