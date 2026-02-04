import jsPDF from 'jspdf';

interface ExtraCharge {
  description: string;
  category: string;
  amount: number;
  date_charged: string;
}

interface ReceiptData {
  receiptNumber: string;
  residentName: string;
  paymentDate: string;
  monthYear: string;
  paymentMethod: string;
  baseAmount: number;
  extraCharges: ExtraCharge[];
  totalAmount: number;
  notes?: string;
}

const ORG_NAME = 'NANDA GOKULA LUXURY RETIREMENT HOME';

const loadLogoDataUrl = async (): Promise<string | null> => {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const drawRow = (
  doc: jsPDF,
  startX: number,
  startY: number,
  widths: number[],
  height: number,
  values: string[],
  options?: { fillColor?: number[]; textColor?: number[]; fontSize?: number; bold?: boolean; align?: ('left' | 'center' | 'right')[] }
) => {
  const { fillColor, textColor, fontSize = 9, bold = false, align = [] } = options || {};
  let x = startX;
  if (fillColor) {
    doc.setFillColor(...fillColor);
    doc.rect(startX, startY, widths.reduce((a, b) => a + b, 0), height, 'F');
  }
  doc.setDrawColor(180, 190, 200);
  widths.forEach((w, i) => {
    doc.rect(x, startY, w, height, 'S');
    const textAlign = align[i] || 'left';
    doc.setTextColor(...(textColor || [33, 47, 61]));
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const textX = textAlign === 'left' ? x + 2 : textAlign === 'center' ? x + w / 2 : x + w - 2;
    doc.text(values[i] ?? '', textX, startY + height / 2 + 2, { align: textAlign });
    x += w;
  });
};

export async function generateReceiptPDF(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Rupees symbol - using "Rs. " for PDF compatibility
  const rupeeSymbol = 'Rs. ';
  
  // Define colors
  const headerFill = [225, 235, 245];
  const textDark = [33, 47, 61];
  const successGreen = [46, 204, 113];

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  const margin = 15;
  const tableWidth = pageWidth - margin * 2;
  let y = 12;

  // Header row (logo + org name + receipt number)
  const logoDataUrl = await loadLogoDataUrl();
  const headerHeights = 18;
  const headerWidths = [22, tableWidth - 22 - 50, 50];
  drawRow(doc, margin, y, headerWidths, headerHeights, ['', ORG_NAME, `Receipt #${data.receiptNumber}`], {
    fillColor: headerFill,
    textColor: textDark,
    fontSize: 10,
    bold: true,
    align: ['center', 'left', 'right'],
  });

  if (logoDataUrl) {
    const logoSize = 14;
    doc.addImage(logoDataUrl, 'PNG', margin + 4, y + 2, logoSize, logoSize);
  }

  y += headerHeights + 4;

  // Resident info table
  const infoRowHeight = 8;
  const infoWidths = [35, tableWidth - 35];
  const paymentDate = new Date(data.paymentDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  drawRow(doc, margin, y, infoWidths, infoRowHeight, ['Resident Name', data.residentName], { bold: true });
  y += infoRowHeight;
  drawRow(doc, margin, y, infoWidths, infoRowHeight, ['Payment Date', paymentDate]);
  y += infoRowHeight;
  drawRow(doc, margin, y, infoWidths, infoRowHeight, ['Billing Period', data.monthYear]);
  y += infoRowHeight;
  drawRow(doc, margin, y, infoWidths, infoRowHeight, ['Payment Method', data.paymentMethod.replace(/_/g, ' ').toUpperCase()]);
  y += infoRowHeight + 6;

  // Charges table (Excel-like grid)
  const chargeWidths = [tableWidth * 0.55, tableWidth * 0.2, tableWidth * 0.25];
  const chargeRowHeight = 8;
  drawRow(doc, margin, y, chargeWidths, chargeRowHeight, ['Description', 'Date', 'Amount'], {
    fillColor: headerFill,
    bold: true,
    align: ['left', 'center', 'right'],
  });
  y += chargeRowHeight;

  drawRow(doc, margin, y, chargeWidths, chargeRowHeight, ['Monthly Rent/Base Charges', '—', `${rupeeSymbol}${data.baseAmount.toLocaleString('en-IN')}`], {
    align: ['left', 'center', 'right'],
  });
  y += chargeRowHeight;

  if (data.extraCharges.length > 0) {
    data.extraCharges.forEach((charge) => {
      const categoryLabel = charge.category.charAt(0).toUpperCase() + charge.category.slice(1);
      const displayText = `${charge.description} (${categoryLabel})`;
      drawRow(doc, margin, y, chargeWidths, chargeRowHeight, [
        displayText,
        new Date(charge.date_charged).toLocaleDateString('en-IN'),
        `${rupeeSymbol}${Number(charge.amount).toLocaleString('en-IN')}`
      ], { align: ['left', 'center', 'right'] });
      y += chargeRowHeight;
    });
  }

  y += 4;

  // Totals rows
  const totalWidths = [tableWidth * 0.7, tableWidth * 0.3];
  drawRow(doc, margin, y, totalWidths, chargeRowHeight, ['Subtotal', `${rupeeSymbol}${data.baseAmount.toLocaleString('en-IN')}`], {
    align: ['left', 'right'],
  });
  y += chargeRowHeight;

  if (data.extraCharges.length > 0) {
    const extraTotal = data.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
    drawRow(doc, margin, y, totalWidths, chargeRowHeight, ['Additional Charges', `${rupeeSymbol}${extraTotal.toLocaleString('en-IN')}`], {
      align: ['left', 'right'],
    });
    y += chargeRowHeight;
  }

  drawRow(doc, margin, y, totalWidths, chargeRowHeight, ['TOTAL PAYABLE', `${rupeeSymbol}${data.totalAmount.toLocaleString('en-IN')}`], {
    fillColor: headerFill,
    bold: true,
    align: ['left', 'right'],
  });
  y += chargeRowHeight + 4;

  // Payment status
  doc.setFillColor(...successGreen);
  doc.rect(margin, y, 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAID', margin + 20, y + 6, { align: 'center' });

  // Notes section
  if (data.notes) {
    y += 12;
    drawRow(doc, margin, y, [tableWidth], chargeRowHeight, [`Notes: ${data.notes}`], { fontSize: 8 });
  }

  // Footer
  const footerY = pageHeight - 18;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 130, 140);
  doc.text('This is a computer-generated receipt. No signature required.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} | Receipt System v1.0`, pageWidth / 2, footerY + 5, { align: 'center' });
  
  return doc;
}

export async function downloadReceiptPDF(data: ReceiptData) {
  const doc = await generateReceiptPDF(data);
  doc.save(`Receipt_${data.receiptNumber}.pdf`);
}

export async function printReceiptPDF(data: ReceiptData) {
  const doc = await generateReceiptPDF(data);
  // Use hidden iframe printing to avoid popup blockers on desktop browsers
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = pdfUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // Cleanup after print call
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
        document.body.removeChild(iframe);
      }, 1000);
    }
  };
}

