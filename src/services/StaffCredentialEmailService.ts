// @ts-nocheck
import { emailTransport, getFromAddress } from "../config/emailConfig";
import type { PortalType } from "../config/portalPermissions";

const PORTAL_LABELS: Record<PortalType, string> = {
  khayalami: "Khayalami Admin Portal",
  bank: "Bank Dashboard",
  insurance: "Insurance Dashboard",
};

export class StaffCredentialEmailService {
  static async sendCredentials(data: {
    email: string;
    firstName: string;
    lastName: string;
    portal: PortalType;
    roleName: string;
    temporaryPassword: string;
  }): Promise<void> {
    const portalLabel = PORTAL_LABELS[data.portal] || data.portal;
    const subject = `Your ${portalLabel} account — Khayalami`;
    const from = getFromAddress("verification");

    const html = `
      <!DOCTYPE html>
      <html><body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to ${portalLabel}</h2>
        <p>Hi ${data.firstName},</p>
        <p>An administrator created a staff account for you with the role <strong>${data.roleName}</strong>.</p>
        <p><strong>Login email:</strong> ${data.email}</p>
        <p><strong>Temporary password:</strong> <code style="background:#f4f4f4;padding:4px 8px;">${data.temporaryPassword}</code></p>
        <p>Please log in and change your password when prompted.</p>
        <p style="color:#666;font-size:12px;">If you did not expect this email, contact your administrator.</p>
      </body></html>
    `;

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.firstName} ${data.lastName} <${data.email}>`,
      subject,
      html,
    });
  }
}
