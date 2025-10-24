// @ts-nocheck
import { SendMailClient } from "zeptomail";
import { TwoFactorAuth, ITwoFactorAuth } from "../models/TwoFactorAuth";
import { User } from "../models/User";
import { Types } from "mongoose";

// ZeptoMail configuration
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";

const zeptoClient = new SendMailClient({ url: zeptoUrl, token: zeptoToken });

export class TwoFactorAuthService {
  /**
   * Generate a 6-digit PIN
   */
  private static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send 2FA verification email
   */
  static async send2FAEmail(userId: string, email: string, firstName: string): Promise<{ success: boolean; pin: string; expiresAt: Date }> {
    try {
      // Generate 6-digit PIN
      const pin = this.generatePin();
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Invalidate any existing 2FA for this user
      await TwoFactorAuth.updateMany(
        { userId: new Types.ObjectId(userId), isUsed: false },
        { isUsed: true }
      );

      // Create new 2FA record
      const twoFA = new TwoFactorAuth({
        userId: new Types.ObjectId(userId),
        email: email,
        pin,
        expiresAt
      });

      await twoFA.save();

      // Send 2FA email
      await this.send2FAEmailToUser(email, firstName, pin);

      console.log(`✅ 2FA email sent to ${email} with PIN: ${pin}`);

      return {
        success: true,
        pin, // Return PIN for testing purposes
        expiresAt
      };
    } catch (error) {
      console.error("❌ Error sending 2FA email:", error);
      throw error;
    }
  }

  /**
   * Verify 2FA PIN
   */
  static async verify2FAPin(userId: string, pin: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find 2FA record
      const twoFA = await TwoFactorAuth.findOne({
        userId: new Types.ObjectId(userId),
        pin,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!twoFA) {
        // Check if 2FA exists but is expired
        const expired2FA = await TwoFactorAuth.findOne({
          userId: new Types.ObjectId(userId),
          pin,
          isUsed: false
        });

        if (expired2FA) {
          return {
            success: false,
            message: "2FA PIN has expired. Please request a new one."
          };
        }

        return {
          success: false,
          message: "Invalid 2FA PIN. Please check and try again."
        };
      }

      // Check attempt limit
      if (twoFA.attempts >= 3) {
        return {
          success: false,
          message: "Too many failed attempts. Please request a new 2FA PIN."
        };
      }

      // Mark 2FA as used
      twoFA.isUsed = true;
      twoFA.verifiedAt = new Date();
      await twoFA.save();

      console.log(`✅ 2FA verified for user ${userId}`);

      return {
        success: true,
        message: "2FA verification successful!"
      };
    } catch (error) {
      console.error("❌ Error verifying 2FA PIN:", error);
      throw error;
    }
  }

  /**
   * Send 2FA email to user
   */
  private static async send2FAEmailToUser(email: string, firstName: string, pin: string): Promise<void> {
    const subject = "Your 2FA Verification Code - Khayalami";
    const htmlContent = this.get2FAEmailTemplate(firstName, pin);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami Security"
      },
      to: [
        {
          email_address: {
            address: email,
            name: firstName
          }
        }
      ],
      subject: subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Get 2FA email template
   */
  private static get2FAEmailTemplate(firstName: string, pin: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA Verification - Khayalami</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: bold;
          }
          .content { 
            padding: 40px 30px; 
            background: #ffffff; 
          }
          .pin-container {
            background: #f8f9fa;
            border: 2px dashed #667eea;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          .pin {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
            letter-spacing: 8px;
            margin: 10px 0;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #666; 
            font-size: 14px; 
            background: #f8f9fa;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .security {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Two-Factor Authentication</h1>
            <p>Security Verification Code</p>
          </div>
          <div class="content">
            <p>Hello <strong>${firstName}</strong>,</p>
            
            <p>You've requested to enable Two-Factor Authentication (2FA) for your Khayalami account. To complete the setup, please use the verification code below:</p>
            
            <div class="pin-container">
              <h3>Your 2FA Verification Code</h3>
              <div class="pin">${pin}</div>
              <p><strong>This code expires in 10 minutes</strong></p>
            </div>
            
            <p>Enter this code in the app to complete your 2FA setup and secure your account.</p>
            
            <div class="security">
              <strong>🛡️ Security Benefits:</strong>
              <ul>
                <li>Extra layer of protection for your account</li>
                <li>Prevents unauthorized access even if password is compromised</li>
                <li>Required for all future logins</li>
                <li>Protects your personal and financial information</li>
              </ul>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important Security Notes:</strong>
              <ul>
                <li>This code is valid for 10 minutes only</li>
                <li>Do not share this code with anyone</li>
                <li>Khayalami will never ask for your 2FA code via email or phone</li>
                <li>If you didn't request this 2FA setup, please contact support immediately</li>
              </ul>
            </div>
            
            <p>Once 2FA is enabled, you'll need to enter a verification code every time you log in.</p>
            
            <p>Stay secure!<br><strong>The Khayalami Security Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
            <p>This email was sent for security purposes</p>
            <p>Need help? Contact us at security@khayalami.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
