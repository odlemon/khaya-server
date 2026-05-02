// @ts-nocheck
import crypto from "crypto";
import { User } from "../models/User";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { emailTransport, getFromAddress } from "../config/emailConfig";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * App-only password reset deep link (Capacitor / Android intent).
 * Hardcoded so reset emails never use a legacy web domain.
 * Change here + native app intent filters if this URI ever changes.
 */
const PASSWORD_RESET_APP_DEEP_LINK_BASE = "khayalami://reset-password";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function resetLink(plainToken: string): string {
  const trimmed = PASSWORD_RESET_APP_DEEP_LINK_BASE.replace(/\/$/, "");
  const sep = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${sep}token=${encodeURIComponent(plainToken)}`;
}

export class PasswordResetService {
  /**
   * Create token and send email. Returns whether an email was sent (false if user missing / blocked).
   */
  static async requestReset(email: string): Promise<{ sent: boolean }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { sent: false };
    }

    const user = await User.findOne({ email: normalized });
    if (!user) {
      return { sent: false };
    }
    if (user.adminTerminatedAt) {
      return { sent: false };
    }
    if (!user.isActive && user.isVerified) {
      return { sent: false };
    }

    const plainToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
    const tokenHash = hashToken(plainToken);

    await PasswordResetToken.updateMany({ userId: user._id, used: false }, { used: true });

    const expiresAt = new Date(Date.now() + EXPIRY_MS);
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false,
    });

    const from = getFromAddress("security");
    const link = resetLink(plainToken);
    const toName = `${user.firstName || ""} ${user.lastName || ""}`.trim();

    // Table-based "bulletproof" CTA: many clients strip background on <a> or ignore display:inline-block;
    // bgcolor on <td> + block <a> improves tap targets (Gmail, Outlook, Apple Mail). No target="_blank"
    // (can break custom-scheme links in webmail). Plain-text part gives a fallback when HTML is stripped.
    const intro = `
<p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Open the <strong>Khayalami</strong> app to set a new password. This link is valid for <strong>1 hour</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px auto;">
  <tr>
    <td align="center" bgcolor="#4f46e5" style="border-radius:8px;background-color:#4f46e5;">
      <a href="${link}" style="display:block;padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;text-align:center;line-height:1.35;border-radius:8px;mso-line-height-rule:exactly;">Open in app</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.5;">If the button does not respond, tap this link on your phone:</p>
<p style="word-break:break-all;font-size:14px;line-height:1.45;margin:0;"><a href="${link}" style="color:#1d4ed8;text-decoration:underline;">${link}</a></p>`;

    const greeting = user.firstName ? `Hello ${user.firstName},` : "Hello,";
    const textBody = `${greeting}

Reset your Khayalami password by opening this link on your phone (valid 1 hour):

${link}

If you did not request this, you can ignore this email.

— Khayalami`;

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: toName ? `${toName} <${user.email}>` : user.email,
      subject: "Reset your Khayalami password",
      text: textBody,
      html: `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 16px;">
          <p style="margin:0 0 16px;">${user.firstName ? `Hello <strong>${user.firstName}</strong>,` : "Hello,"}</p>
          ${intro}
          <p style="margin:24px 0 0;font-size:14px;">If you did not request this, you can ignore this email.</p>
          <p style="color:#666;font-size:13px;margin:16px 0 0;">Khayalami</p>
        </body></html>
      `,
    });

    return { sent: true };
  }

  static async confirmReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!token || typeof token !== "string" || !token.trim()) {
      return { success: false, message: "Reset token is required." };
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return { success: false, message: "Password must be at least 8 characters." };
    }

    const tokenHash = hashToken(token.trim());
    const record = await PasswordResetToken.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return {
        success: false,
        message: "Invalid or expired reset link. Please request a new password reset.",
      };
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return { success: false, message: "User not found." };
    }
    if (user.adminTerminatedAt) {
      return { success: false, message: "This account cannot be reset." };
    }
    if (!user.isActive && user.isVerified) {
      return { success: false, message: "This account cannot be reset." };
    }

    user.password = newPassword;
    await user.save();

    record.used = true;
    await record.save();

    await PasswordResetToken.updateMany(
      { userId: user._id, used: false, _id: { $ne: record._id } },
      { used: true }
    );

    return { success: true, message: "Password updated successfully. You can sign in with your new password." };
  }
}
