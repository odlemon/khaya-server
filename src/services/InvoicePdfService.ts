// @ts-nocheck
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IInvoice } from "../models/Invoice";

/**
 * Server-rendered invoice PDF, built with pdf-lib the same way the agreement
 * PDF is. The app could already draw an invoice client-side via html2canvas,
 * but that one cannot be emailed, fetched by a landlord, or kept as a record —
 * it only exists on the handset that rendered it.
 */

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(amount: number | undefined): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `$${n.toFixed(2)}`;
}

/**
 * `property.fullAddress` is stored as an object on some invoices and a plain
 * string on others, and `address` varies the same way — so flatten whatever is
 * there rather than trusting either shape.
 */
function addressText(property: any): string {
  const candidates = [property?.fullAddress, property?.address];
  for (const value of candidates) {
    if (!value) continue;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const parts = [value.street, value.city, value.province, value.postalCode, value.country]
        .filter((p) => typeof p === "string" && p.trim().length > 0);
      if (parts.length > 0) return parts.join(", ");
    }
  }
  return "";
}

function statusLabel(status: string): string {
  switch (status) {
    case "fully_paid":
      return "PAID";
    case "partially_paid":
      return "PARTIALLY PAID";
    case "overdue":
      return "OVERDUE";
    case "cancelled":
      return "CANCELLED";
    default:
      return "UNPAID";
  }
}

export function getInvoicePdfFilename(invoice: IInvoice & Record<string, any>): string {
  const number = (invoice.invoiceNumber || invoice._id?.toString() || "invoice").replace(
    /[^A-Za-z0-9_-]/g,
    "_"
  );
  return `Invoice_${number}.pdf`;
}

export async function buildInvoicePdfBuffer(
  invoice: IInvoice & Record<string, any>
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const lineHeight = 14;
  const maxTextWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawLine = (text: unknown, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    const usedFont = opts.bold ? fontBold : font;
    // pdf-lib throws on anything that is not a string, and invoice records carry
    // a few loosely-typed fields, so coerce rather than take the whole PDF down.
    const safeText = typeof text === "string" ? text : String(text ?? "");
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(safeText, {
      x: margin,
      y,
      size,
      font: usedFont,
      color: rgb(0, 0, 0),
      maxWidth: maxTextWidth,
    });
    y -= lineHeight + (opts.gap ?? 2);
  };

  /** Label on the left, value right-aligned — for the money column. */
  const drawRow = (label: string, value: string, opts: { bold?: boolean } = {}) => {
    const size = 11;
    const usedFont = opts.bold ? fontBold : font;
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(label, { x: margin, y, size, font: usedFont, color: rgb(0, 0, 0) });
    const valueWidth = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, {
      x: pageWidth - margin - valueWidth,
      y,
      size,
      font: usedFont,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight + 2;
  };

  const rule = () => {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawLine({
      start: { x: margin, y: y + 8 },
      end: { x: pageWidth - margin, y: y + 8 },
      thickness: 0.7,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 6;
  };

  drawLine("INVOICE", { bold: true, size: 16, gap: 6 });
  drawLine(`Invoice number: ${invoice.invoiceNumber || "—"}`, { gap: 0 });
  drawLine(`Issued: ${formatDate(invoice.invoiceDate)}`, { gap: 0 });
  drawLine(`Due: ${formatDate(invoice.dueDate)}`, { gap: 0 });
  drawLine(`Status: ${statusLabel(invoice.status)}`, { bold: true, gap: 8 });

  rule();
  drawLine("PROPERTY", { bold: true, size: 12, gap: 4 });
  drawLine(invoice.property?.title || "—", { gap: 0 });
  const address = addressText(invoice.property);
  if (address) drawLine(address, { gap: 6 });

  rule();
  drawLine("BILLED TO", { bold: true, size: 12, gap: 4 });
  drawLine(invoice.tenant?.name || "—", { gap: 0 });
  if (invoice.tenant?.email) drawLine(invoice.tenant.email, { gap: 0 });
  if (invoice.tenant?.phone) drawLine(invoice.tenant.phone, { gap: 6 });

  drawLine("LANDLORD", { bold: true, size: 12, gap: 4 });
  drawLine(invoice.landlord?.name || "—", { gap: 0 });
  if (invoice.landlord?.email) drawLine(invoice.landlord.email, { gap: 6 });

  if (invoice.rentalPeriod?.startDate || invoice.rentalPeriod?.endDate) {
    rule();
    drawLine("RENTAL PERIOD", { bold: true, size: 12, gap: 4 });
    drawLine(
      `${formatDate(invoice.rentalPeriod.startDate)} to ${formatDate(invoice.rentalPeriod.endDate)}`,
      { gap: 6 }
    );
  }

  rule();
  drawLine("ITEMS", { bold: true, size: 12, gap: 4 });
  const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  if (items.length === 0) {
    drawRow("Monthly rent", formatMoney(invoice.subtotal));
  } else {
    for (const item of items) {
      const qty = item.quantity && item.quantity !== 1 ? ` x${item.quantity}` : "";
      drawRow(`${item.description || "Item"}${qty}`, formatMoney(item.amount));
    }
  }

  rule();
  drawRow("Subtotal", formatMoney(invoice.subtotal));
  if (invoice.lateFee) drawRow("Late fee", formatMoney(invoice.lateFee));
  drawRow("Total", formatMoney(invoice.total), { bold: true });
  if (invoice.amountPaid) drawRow("Paid", formatMoney(invoice.amountPaid));
  drawRow("Amount due", formatMoney(invoice.amountDue), { bold: true });

  y -= 10;
  drawLine(
    "This invoice was generated by Khayalami. Keep it for your records.",
    { size: 9 }
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
