// @ts-nocheck
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { IAgreement } from "../models/Agreement";
import { getPublicApiBaseUrl as publicApiBaseUrl } from "../utils/publicUrl";

function formatDate(value: Date | string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(amount: number | undefined): string {
  const n = Number(amount || 0);
  return `USD ${n.toFixed(2)}`;
}

function partyName(party: any): string {
  if (!party) return "—";
  const name = `${party.firstName || ""} ${party.lastName || ""}`.trim();
  return name || party.email || "—";
}

function propertyAddress(property: any): string {
  if (!property) return "—";
  const addr = property.address;
  if (addr) {
    const line = [addr.street, addr.city, addr.state, addr.country]
      .filter(Boolean)
      .join(", ");
    if (line) return line;
  }
  return property.title || "—";
}

function wrapText(text: string, maxChars: number): string[] {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Build a tenancy agreement PDF buffer from a populated agreement document.
 */
export async function buildAgreementPdfBuffer(agreement: IAgreement & Record<string, any>): Promise<Buffer> {
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

  const drawLine = (text: string, opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    const usedFont = opts.bold ? fontBold : font;
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: usedFont,
      color: rgb(0, 0, 0),
      maxWidth: maxTextWidth,
    });
    y -= lineHeight + (opts.gap ?? 2);
  };

  const drawParagraph = (text: string, opts: { bold?: boolean; size?: number } = {}) => {
    const size = opts.size ?? 11;
    const charsPerLine = Math.floor(maxTextWidth / (size * 0.5));
    for (const line of wrapText(text, charsPerLine)) {
      drawLine(line, opts);
    }
  };

  const landlord = agreement.landlordId;
  const tenant = agreement.tenantId;
  const property = agreement.propertyId;

  drawLine("TENANCY AGREEMENT", { bold: true, size: 16, gap: 8 });
  drawLine(agreement.title || "Residential Tenancy Agreement", { bold: true, size: 12, gap: 6 });
  drawParagraph(
    agreement.description ||
      "This agreement sets out the terms and conditions between the landlord and tenant for the rental property listed below."
  );

  drawLine("PARTIES", { bold: true, size: 12, gap: 4 });
  drawLine(`Landlord: ${partyName(landlord)}`);
  drawLine(`Tenant: ${partyName(tenant)}`);
  drawLine(`Property: ${property?.title || "Rental Property"}`);
  drawLine(`Address: ${propertyAddress(property)}`, { gap: 6 });

  drawLine("RENTAL TERMS", { bold: true, size: 12, gap: 4 });
  drawLine(`Monthly Rent: ${formatMoney(agreement.rentAmount)}`);
  drawLine(`Security Deposit: ${formatMoney(agreement.depositAmount)}`);
  drawLine(`Zero Deposit Plan: ${agreement.zeroDeposit ? "Yes" : "No"}`);
  drawLine(`Lease Start: ${formatDate(agreement.startDate)}`);
  drawLine(`Lease End: ${formatDate(agreement.endDate)}`);
  drawLine(`Agreement Status: ${(agreement.status || "pending").toUpperCase()}`, { gap: 6 });

  if (agreement.serviceFeePayer) {
    drawLine(
      `Platform Service Fee ($${agreement.serviceFeeAmount ?? 10}): Paid by ${agreement.serviceFeePayer}`,
      { gap: 6 }
    );
  }

  const terms = agreement.terms?.length
    ? agreement.terms
    : [
        "The tenant shall pay rent on or before the due date each month.",
        "The tenant shall keep the property in good condition and report maintenance issues promptly.",
        "The landlord shall provide quiet enjoyment of the premises subject to this agreement.",
      ];

  drawLine("TERMS AND CONDITIONS", { bold: true, size: 12, gap: 4 });
  terms.forEach((term, index) => {
    drawParagraph(`${index + 1}. ${term}`);
  });

  if (agreement.specialConditions?.length) {
    drawLine("SPECIAL CONDITIONS", { bold: true, size: 12, gap: 4 });
    agreement.specialConditions.forEach((condition, index) => {
      drawParagraph(`${index + 1}. ${condition}`);
    });
  }

  drawLine("SIGNATURES", { bold: true, size: 12, gap: 4 });
  drawLine(
    `Landlord: ${agreement.landlordSignature?.signedAt ? `Signed on ${formatDate(agreement.landlordSignature.signedAt)}` : "Not yet signed"}`
  );
  drawLine(
    `Tenant: ${agreement.tenantSignature?.signedAt ? `Signed on ${formatDate(agreement.tenantSignature.signedAt)}` : "Not yet signed"}`,
    { gap: 8 }
  );

  drawLine(`Document ID: ${agreement._id}`, { size: 9 });
  drawLine(`Generated: ${formatDate(new Date())}`, { size: 9 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function getAgreementPdfFilename(agreement: IAgreement & Record<string, any>): string {
  const id = agreement._id?.toString?.() || "agreement";
  const date = new Date().toISOString().split("T")[0];
  return `Agreement_${id}_${date}.pdf`;
}

/**
 * Public API origin for email download links.
 * Re-exported so existing callers keep working; the resolution itself is shared
 * with the password-reset link so the two can never point at different hosts.
 */
export { getPublicApiBaseUrl } from "../utils/publicUrl";

export function buildPublicAgreementPdfUrl(publicPdfToken: string): string {
  return `${publicApiBaseUrl()}/api/agreements/public/${publicPdfToken}/pdf`;
}
