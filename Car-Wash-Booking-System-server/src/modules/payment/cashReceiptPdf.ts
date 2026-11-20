import { Buffer } from 'node:buffer';

export type CashReceiptPdfData = {
  receiptId: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  carRegistration: string;
  serviceDate: string;
  serviceTime: string;
  amount: number;
  paidAt: string;
  collectorName: string;
};

const pdfText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

export const createCashReceiptPdf = (receipt: CashReceiptPdfData) => {
  const lines = [
    { text: 'CarWash - Cash Payment Receipt', size: 18 },
    { text: `Receipt ID: ${receipt.receiptId}` },
    { text: `Booking ID: ${receipt.bookingId}` },
    { text: `Customer: ${receipt.customerName || 'Customer'}` },
    { text: `Email: ${receipt.customerEmail || '-'}` },
    { text: `Service: ${receipt.serviceName || 'Car wash'}` },
    { text: `Vehicle: ${receipt.carRegistration || '-'}` },
    { text: `Service date: ${receipt.serviceDate} at ${receipt.serviceTime}` },
    { text: `Amount received: INR ${Number(receipt.amount).toFixed(2)}` },
    { text: 'Payment method: Cash' },
    { text: `Collected by: ${receipt.collectorName || 'CarWash team'}` },
    { text: `Payment recorded: ${receipt.paidAt}` },
    { text: 'Payment status: PAID' },
  ];
  const content = lines
    .map(({ text, size = 11 }, index) => {
      return `BT /F1 ${size} Tf 50 ${790 - index * 38} Td (${pdfText(text)}) Tj ET`;
    })
    .join('\n');
  const streamLength = Buffer.byteLength(content, 'ascii');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${streamLength} >>\nstream\n${content}\nendstream`,
  ];

  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, 'ascii'));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const crossReferenceOffset = Buffer.byteLength(document, 'ascii');
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets
    .slice(1)
    .map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('');
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF`;
  return Buffer.from(document, 'ascii');
};
