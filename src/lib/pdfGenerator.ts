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
  
  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #${data.receiptNumber}`, pageWidth / 2, 32, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Resident and Date Info
  let y = 55;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Resident:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.residentName, 55, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(data.paymentDate).toLocaleDateString('en-IN'), pageWidth - 55, y);
  
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('For Month:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.monthYear, 55, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Method:', pageWidth - 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.paymentMethod.replace('_', ' ').toUpperCase(), pageWidth - 55, y);
  
  // Divider
  y += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  
  // Charges Table Header
  y += 15;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 5, pageWidth - 40, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Description', 25, y);
  doc.text('Date', 100, y);
  doc.text('Amount', pageWidth - 45, y, { align: 'right' });
  
  // Base Rent
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.text('Monthly Rent/Charges', 25, y);
  doc.text('-', 100, y);
  doc.text(`₹${data.baseAmount.toLocaleString('en-IN')}`, pageWidth - 45, y, { align: 'right' });
  
  // Extra Charges
  if (data.extraCharges.length > 0) {
    y += 5;
    doc.setDrawColor(230, 230, 230);
    doc.line(20, y, pageWidth - 20, y);
    
    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL CHARGES', 25, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    data.extraCharges.forEach((charge) => {
      y += 10;
      const categoryLabel = charge.category.charAt(0).toUpperCase() + charge.category.slice(1);
      doc.text(`${charge.description} (${categoryLabel})`, 25, y);
      doc.text(new Date(charge.date_charged).toLocaleDateString('en-IN'), 100, y);
      doc.text(`₹${Number(charge.amount).toLocaleString('en-IN')}`, pageWidth - 45, y, { align: 'right' });
    });
  }
  
  // Total Section
  y += 15;
  doc.setDrawColor(100, 100, 100);
  doc.line(20, y, pageWidth - 20, y);
  
  y += 12;
  doc.setFillColor(59, 130, 246);
  doc.rect(pageWidth - 100, y - 8, 80, 14, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', pageWidth - 95, y);
  doc.text(`₹${data.totalAmount.toLocaleString('en-IN')}`, pageWidth - 25, y, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  
  // Notes
  if (data.notes) {
    y += 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Notes: ${data.notes}`, 20, y);
  }
  
  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128, 128, 128);
  doc.text('This is a computer-generated receipt.', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, footerY + 8, { align: 'center' });
  
  return doc;
}

export function downloadReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  doc.save(`Receipt_${data.receiptNumber}.pdf`);
}

export function printReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data);
  // Open PDF in new window for printing
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
