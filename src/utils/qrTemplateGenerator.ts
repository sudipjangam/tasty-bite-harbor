/**
 * QR Code Branded Template Generator
 * Generates professional, branded QR code cards for restaurant tables/rooms
 */

export interface QRTemplateConfig {
  qrCodeDataUrl: string;
  tableName: string;
  restaurantName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

/**
 * Generates a branded QR code card with restaurant branding
 * @param config Template configuration
 * @returns Data URL of the generated card image
 */
export async function generateBrandedQRCard(
  config: QRTemplateConfig
): Promise<string> {
  const {
    qrCodeDataUrl,
    tableName,
    restaurantName,
    primaryColor = '#14B8A6', // Teal - fresh and calming
    secondaryColor = '#84CC16', // Lime green - appetite appeal
    logoUrl,
  } = config;

  // Create high-resolution canvas for print quality
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Template dimensions (optimized for printing)
  const width = 800;
  const height = 1200;
  canvas.width = width;
  canvas.height = height;

  // Create a temporary canvas for the 3D card effect
  const cardMargin = 30; // Margin for 3D shadow effect
  const cardWidth = width - cardMargin * 2;
  const cardHeight = height - cardMargin * 2;
  const cardRadius = 35; // Larger corner radius for smoother edges

  // Draw 3D shadow/depth effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;

  // Create rounded rectangle path for the card
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Draw main card background with gradient
  const bgGradient = ctx.createLinearGradient(cardMargin, cardMargin, cardMargin, cardMargin + cardHeight);
  bgGradient.addColorStop(0, primaryColor);
  bgGradient.addColorStop(0.5, secondaryColor);
  bgGradient.addColorStop(1, primaryColor);
  
  drawRoundedRect(cardMargin, cardMargin, cardWidth, cardHeight, cardRadius);
  ctx.fillStyle = bgGradient;
  ctx.fill();
  
  // Reset shadow for inner elements
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Add subtle pattern overlay for texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = cardMargin; i < cardMargin + cardWidth; i += 40) {
    for (let j = cardMargin; j < cardMargin + cardHeight; j += 40) {
      ctx.fillRect(i, j, 20, 20);
    }
  }

  // Decorative white border inside the card
  const innerBorderWidth = 5;
  const innerBorderMargin = 15;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = innerBorderWidth;
  drawRoundedRect(
    cardMargin + innerBorderMargin,
    cardMargin + innerBorderMargin,
    cardWidth - innerBorderMargin * 2,
    cardHeight - innerBorderMargin * 2,
    cardRadius - innerBorderMargin
  );
  ctx.stroke();

  // Restaurant name with shadow effect
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(restaurantName, width / 2, 115);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Call-to-action section
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  ctx.fillText('SCAN TO ORDER', width / 2, 220);

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '18px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Point your camera at the QR code', width / 2, 255);

  // QR Code section with WHITE border (matching reference)
  const qrBoxX = 150;
  const qrBoxY = 310;
  const qrBoxSize = 500;
  const qrBoxRadius = 30;

  // White border for QR box (not colored gradient)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 12;
  drawRoundedRect(qrBoxX - 6, qrBoxY - 6, qrBoxSize + 12, qrBoxSize + 12, qrBoxRadius + 6);
  ctx.stroke();

  // Inner white border for extra depth
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  drawRoundedRect(qrBoxX - 10, qrBoxY - 10, qrBoxSize + 20, qrBoxSize + 20, qrBoxRadius + 10);
  ctx.stroke();

  // White rounded rectangle for QR code background
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
  ctx.fill();

  // Load and draw QR code
  await new Promise<void>((resolve, reject) => {
    const qrImage = new Image();
    qrImage.onload = () => {
      const qrPadding = 35;
      const qrSize = qrBoxSize - qrPadding * 2;
      
      // Clip to rounded rectangle for QR code
      ctx.save();
      drawRoundedRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, qrBoxRadius);
      ctx.clip();
      
      ctx.drawImage(
        qrImage,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrSize,
        qrSize
      );
      
      ctx.restore();
      resolve();
    };
    qrImage.onerror = reject;
    qrImage.src = qrCodeDataUrl;
  });

  // Table number section with semi-transparent background
  const tableY = 890;
  const tableBoxWidth = 350;
  const tableBoxHeight = 110;
  const tableBoxX = (width - tableBoxWidth) / 2;
  const tableBoxRadius = 20;
  
  // Table box background with gradient
  const tableBoxGradient = ctx.createLinearGradient(0, tableY - 20, 0, tableY + tableBoxHeight - 20);
  tableBoxGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  tableBoxGradient.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
  
  ctx.fillStyle = tableBoxGradient;
  drawRoundedRect(tableBoxX, tableY - 20, tableBoxWidth, tableBoxHeight, tableBoxRadius);
  ctx.fill();
  
  // Table label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '24px "Segoe UI", Arial, sans-serif';
  ctx.fillText('TABLE', width / 2, tableY + 10);

  // Table number - Large and bold with shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 70px "Segoe UI", Arial, sans-serif';
  ctx.fillText(tableName, width / 2, tableY + 60);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Footer section
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Powered by UPI Payments', width / 2, 1080);

  // Decorative circular corner elements (matching reference)
  const cornerRadius = 60;
  const cornerPosition = 50;
  
  // Top-right circular decoration
  ctx.fillStyle = secondaryColor; // Lime green
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(width - cardMargin - cornerPosition, cardMargin + cornerPosition, cornerRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Smaller inner circle
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(width - cardMargin - cornerPosition, cardMargin + cornerPosition, cornerRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // Bottom-left circular decoration
  ctx.fillStyle = secondaryColor;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(cardMargin + cornerPosition, height - cardMargin - cornerPosition, cornerRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Smaller inner circle
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(cardMargin + cornerPosition, height - cardMargin - cornerPosition, cornerRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // Reset alpha
  ctx.globalAlpha = 1.0;

  // Convert canvas to data URL
  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Generates a compact variant for tent cards
 */
export async function generateCompactQRCard(
  config: QRTemplateConfig
): Promise<string> {
  const {
    qrCodeDataUrl,
    tableName,
    restaurantName,
    primaryColor = '#14B8A6', // Teal - matches main template
    secondaryColor = '#84CC16', // Lime green - matches main template
  } = config;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Compact dimensions (4:3 ratio)
  const width = 600;
  const height = 800;
  canvas.width = width;
  canvas.height = height;

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Restaurant name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(restaurantName, width / 2, 60);

  // "Scan to Order"
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText('SCAN TO ORDER', width / 2, 140);

  // QR Code
  const qrBoxX = 100;
  const qrBoxY = 200;
  const qrBoxSize = 400;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

  await new Promise<void>((resolve, reject) => {
    const qrImage = new Image();
    qrImage.onload = () => {
      const qrPadding = 20;
      const qrSize = qrBoxSize - qrPadding * 2;
      ctx.drawImage(
        qrImage,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrSize,
        qrSize
      );
      resolve();
    };
    qrImage.onerror = reject;
    qrImage.src = qrCodeDataUrl;
  });

  // Table number
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.fillText(tableName, width / 2, 700);

  return canvas.toDataURL('image/png', 1.0);
}
