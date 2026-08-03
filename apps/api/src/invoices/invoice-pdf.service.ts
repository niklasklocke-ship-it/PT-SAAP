import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');

export interface InvoicePdfData {
  tenantName: string;
  tenantTaxId: string | null;
  customerName: string;
  customerEmail: string | null;
  invoiceNumber: string;
  serviceName: string | null;
  amount: string;
  taxRate: string;
  status: string;
  issuedAt: Date;
  dueAt: Date | null;
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Offen',
  PAID: 'Bezahlt',
  OVERDUE: 'Überfällig',
  CANCELLED: 'Storniert',
};

function formatEuro(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} €`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('de-DE');
}

@Injectable()
export class InvoicePdfService {
  generate(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const net = Number(data.amount);
      const taxRatePercent = Number(data.taxRate);
      const tax = net * (taxRatePercent / 100);
      const gross = net + tax;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Kopf: Trainer links, Rechnungsdaten rechts
      doc.fontSize(18).font('Helvetica-Bold').text(data.tenantName, { continued: false });
      if (data.tenantTaxId) {
        doc.fontSize(9).font('Helvetica').fillColor('#52525b').text(`USt-IdNr.: ${data.tenantTaxId}`);
      }
      doc.fillColor('#000000');

      const headerTop = doc.y > 90 ? 56 : 56;
      doc.fontSize(20).font('Helvetica-Bold').text('RECHNUNG', 0, headerTop, {
        width: pageWidth,
        align: 'right',
      });
      doc.fontSize(10).font('Helvetica').text(`Nr. ${data.invoiceNumber}`, { width: pageWidth, align: 'right' });
      doc.text(`Datum: ${formatDate(data.issuedAt)}`, { width: pageWidth, align: 'right' });
      if (data.dueAt) {
        doc.text(`Fällig am: ${formatDate(data.dueAt)}`, { width: pageWidth, align: 'right' });
      }
      doc.text(`Status: ${STATUS_LABEL[data.status] ?? data.status}`, { width: pageWidth, align: 'right' });

      doc.moveDown(2);

      // Kundenblock
      doc.fontSize(9).fillColor('#52525b').text('Rechnung an', { continued: false });
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold').text(data.customerName);
      if (data.customerEmail) {
        doc.font('Helvetica').fontSize(10).fillColor('#52525b').text(data.customerEmail);
        doc.fillColor('#000000');
      }

      doc.moveDown(2);

      // Positionstabelle
      const tableTop = doc.y;
      const descX = doc.page.margins.left;
      const amountX = doc.page.margins.left + pageWidth - 100;

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Beschreibung', descX, tableTop, { width: pageWidth - 110 });
      doc.text('Betrag', amountX, tableTop, { width: 100, align: 'right' });
      doc
        .moveTo(descX, tableTop + 16)
        .lineTo(descX + pageWidth, tableTop + 16)
        .strokeColor('#d4d4d8')
        .stroke();

      const rowY = tableTop + 24;
      doc.font('Helvetica').fontSize(10);
      doc.text(data.serviceName ?? 'Trainingsleistung', descX, rowY, { width: pageWidth - 110 });
      doc.text(formatEuro(net), amountX, rowY, { width: 100, align: 'right' });

      doc
        .moveTo(descX, rowY + 22)
        .lineTo(descX + pageWidth, rowY + 22)
        .strokeColor('#d4d4d8')
        .stroke();

      let summaryY = rowY + 34;
      doc.text('Zwischensumme', descX, summaryY, { width: pageWidth - 110, align: 'right' });
      doc.text(formatEuro(net), amountX, summaryY, { width: 100, align: 'right' });

      summaryY += 16;
      doc.text(`MwSt. (${taxRatePercent.toFixed(0)}%)`, descX, summaryY, {
        width: pageWidth - 110,
        align: 'right',
      });
      doc.text(formatEuro(tax), amountX, summaryY, { width: 100, align: 'right' });

      summaryY += 6;
      doc
        .moveTo(amountX, summaryY + 14)
        .lineTo(amountX + 100, summaryY + 14)
        .strokeColor('#000000')
        .stroke();

      summaryY += 20;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Gesamtbetrag', descX, summaryY, { width: pageWidth - 110, align: 'right' });
      doc.text(formatEuro(gross), amountX, summaryY, { width: 100, align: 'right' });

      doc.end();
    });
  }
}
