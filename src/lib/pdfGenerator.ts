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

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Rupees symbol - using "Rs. " for PDF compatibility
  const rupeeSymbol = 'Rs. ';
  
  // Define colors
  const primaryColor = [41, 128, 185]; // Professional blue
  const accentColor = [52, 73, 94]; // Dark blue-gray
  const lightGray = [242, 245, 247];
  const borderColor = [200, 210, 220];
  const textDark = [33, 47, 61];
  const successGreen = [46, 204, 113]; // For paid status
  
  // Background - subtle gradient effect with rectangles
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Top decorative bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Organization name and logo area
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('CARE HOME', 20, 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Care Management System', 20, 28);
  
  // Receipt label on the right
  doc.setFillColor(...accentColor);
  doc.rect(pageWidth - 80, 5, 75, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', pageWidth - 42, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`#${data.receiptNumber}`, pageWidth - 42, 25, { align: 'center' });
  
  // Reset to black text
  doc.setTextColor(...textDark);
  
  // Main content area with subtle background
  const contentStartY = 45;
  doc.setFillColor(...lightGray);
  doc.rect(15, contentStartY - 5, pageWidth - 30, pageHeight - contentStartY - 50, 'F');
  
  // Resident Information Section
  let y = contentStartY + 10;
  
  // Section title
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('RESIDENT INFORMATION', 20, y);
  
  y += 8;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.5);
  doc.line(20, y - 2, pageWidth - 20, y - 2);
  
  y += 8;
  doc.setTextColor(...textDark);
  doc.setFontSize(10);
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Resident Name:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.residentName, 60, y);
  
  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Date:', pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.paymentDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }), pageWidth - 40, y);
  
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Billing Period:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.monthYear, 60, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Method:', pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod.replace(/_/g, ' ').toUpperCase(), pageWidth - 40, y);
  
  // Charges Section
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('CHARGES BREAKDOWN', 20, y);
  
  y += 8;
  doc.setDrawColor(...borderColor);
  doc.line(20, y - 2, pageWidth - 20, y - 2);
  
  // Table header
  y += 8;
  doc.setFillColor(...primaryColor);
  doc.rect(20, y - 6, pageWidth - 40, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, y);
  doc.text('Date', 90, y);
  doc.text('Amount', pageWidth - 45, y, { align: 'right' });
  
  // Base Rent Row
  y += 12;
  doc.setFillColor(255, 255, 255);
  doc.rect(20, y - 6, pageWidth - 40, 10, 'F');
  
  doc.setTextColor(...textDark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Rent/Base Charges', 25, y);
  doc.setFont('helvetica', 'normal');
  doc.text('—', 90, y);
  doc.text(`${rupeeSymbol}${data.baseAmount.toLocaleString('en-IN')}`, pageWidth - 45, y, { align: 'right' });
  
  // Extra Charges
  if (data.extraCharges.length > 0) {
    y += 12;
    doc.setFillColor(...lightGray);
    doc.rect(20, y - 6, pageWidth - 40, 10, 'F');
    
    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL CHARGES', 25, y);
    
    data.extraCharges.forEach((charge) => {
      y += 10;
      doc.setFillColor(255, 255, 255);
      doc.rect(20, y - 6, pageWidth - 40, 10, 'F');
      
      doc.setTextColor(...textDark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      const categoryLabel = charge.category.charAt(0).toUpperCase() + charge.category.slice(1);
      const displayText = `${charge.description} (${categoryLabel})`;
      doc.text(displayText, 25, y);
      doc.text(new Date(charge.date_charged).toLocaleDateString('en-IN'), 90, y);
      doc.text(`${rupeeSymbol}${Number(charge.amount).toLocaleString('en-IN')}`, pageWidth - 45, y, { align: 'right' });
    });
  }
  
  // Total Section - Professional Summary Box
  y += 18;
  
  // Summary box background
  doc.setFillColor(...primaryColor);
  doc.rect(pageWidth - 120, y - 8, 100, 28, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 115, y);
  doc.text(`${rupeeSymbol}${data.baseAmount.toLocaleString('en-IN')}`, pageWidth - 25, y, { align: 'right' });
  
  y += 8;
  if (data.extraCharges.length > 0) {
    const extraTotal = data.extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
    doc.text('Additional Charges:', pageWidth - 115, y);
    doc.text(`${rupeeSymbol}${extraTotal.toLocaleString('en-IN')}`, pageWidth - 25, y, { align: 'right' });
    y += 8;
  }
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL PAYABLE:', pageWidth - 115, y);
  doc.setFontSize(14);
  doc.text(`${rupeeSymbol}${data.totalAmount.toLocaleString('en-IN')}`, pageWidth - 25, y, { align: 'right' });
  
  // Payment Status Badge
  y += 18;
  doc.setFillColor(...successGreen);
  doc.rect(20, y - 6, 50, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('✓ PAID', 45, y, { align: 'center' });
  
  // Notes section
  if (data.notes) {
    y += 15;
    doc.setTextColor(...textDark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    
    // Notes box
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.rect(20, y - 8, pageWidth - 40, 15, 'S');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Notes:', 23, y - 3);
    doc.setFont('helvetica', 'italic');
    doc.text(data.notes, 23, y + 3);
  }
  
  // Footer with decorative line
  const footerY = pageHeight - 25;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(20, footerY - 8, pageWidth - 20, footerY - 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 130, 140);
  doc.text('This is a computer-generated receipt. No signature required.', pageWidth / 2, footerY, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')} | Receipt System v1.0`, pageWidth / 2, footerY + 6, { align: 'center' });
  
  return doc;
}

export function downloadReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  doc.save(`Receipt_${data.receiptNumber}.pdf`);
}

export function printReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
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

