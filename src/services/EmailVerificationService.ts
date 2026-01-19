// @ts-nocheck
import { EmailVerification, IEmailVerification } from "../models/EmailVerification";
import { User } from "../models/User";
import { Types } from "mongoose";
import { emailTransport, getFromAddress } from "../config/emailConfig";

export interface EmailVerificationData {
  email: string;
  firstName: string;
  lastName: string;
  role: "tenant" | "landlord" | "admin";
}

export class EmailVerificationService {
  /**
   * Generate a 6-digit PIN
   */
  private static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification email with 6-digit PIN
   */
  static async sendVerificationEmail(data: EmailVerificationData): Promise<{ success: boolean; pin: string; expiresAt: Date }> {
    try {
      // Generate 6-digit PIN
      const pin = this.generatePin();
      
      // Set expiration time (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Invalidate any existing verification for this email
      await EmailVerification.updateMany(
        { email: data.email, isUsed: false },
        { isUsed: true }
      );

      // Create new verification record
      const verification = new EmailVerification({
        email: data.email,
        pin,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        expiresAt
      });

      await verification.save();

      // Send verification email
      await this.sendVerificationEmailToUser(data, pin);

      console.log(`✅ Verification email sent to ${data.email} with PIN: ${pin}`);

      return {
        success: true,
        pin, // Return PIN for testing purposes
        expiresAt
      };
    } catch (error) {
      console.error("❌ Error sending verification email:", error);
      throw error;
    }
  }

  /**
   * Verify PIN and activate user account
   */
  static async verifyPin(email: string, pin: string): Promise<{ success: boolean; user?: any; message: string }> {
    try {
      // Find verification record
      const verification = await EmailVerification.findOne({
        email: email.toLowerCase(),
        pin,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verification) {
        // Check if verification exists but is expired
        const expiredVerification = await EmailVerification.findOne({
          email: email.toLowerCase(),
          pin,
          isUsed: false
        });

        if (expiredVerification) {
          return {
            success: false,
            message: "Verification PIN has expired. Please request a new one."
          };
        }

        return {
          success: false,
          message: "Invalid verification PIN. Please check and try again."
        };
      }

      // Check attempt limit
      if (verification.attempts >= 3) {
        return {
          success: false,
          message: "Too many failed attempts. Please request a new verification PIN."
        };
      }

      // Find the user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return {
          success: false,
          message: "User not found. Please register again."
        };
      }

      // Mark verification as used
      verification.isUsed = true;
      verification.verifiedAt = new Date();
      await verification.save();

      // Activate user account
      user.isVerified = true;
      user.isActive = true;
      await user.save();

      // Send welcome email
      await this.sendWelcomeEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });

      console.log(`✅ Email verified and account activated for ${email}`);

      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isVerified: user.isVerified
        },
        message: "Email verified successfully! Welcome to Khayalami!"
      };
    } catch (error) {
      console.error("❌ Error verifying PIN:", error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return {
          success: false,
          message: "User not found. Please register first."
        };
      }

      if (user.isVerified) {
        return {
          success: false,
          message: "Email is already verified."
        };
      }

      // Send new verification email
      await this.sendVerificationEmail({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });

      return {
        success: true,
        message: "Verification email sent successfully!"
      };
    } catch (error) {
      console.error("❌ Error resending verification email:", error);
      throw error;
    }
  }

  /**
   * Send verification email to user
   */
  private static async sendVerificationEmailToUser(data: EmailVerificationData, pin: string): Promise<void> {
    const subject = "Verify Your Email - Khayalami";
    const htmlContent = this.getVerificationEmailTemplate(data, pin);
    const from = getFromAddress("verification");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.firstName} ${data.lastName} <${data.email}>`,
      subject: subject,
      html: htmlContent
    });
  }

  /**
   * Send welcome email after verification
   */
  private static async sendWelcomeEmail(data: EmailVerificationData): Promise<void> {
    const subject = "Welcome to Khayalami!";
    const htmlContent = this.getWelcomeEmailTemplate(data);
    const from = getFromAddress("verification");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.firstName} ${data.lastName} <${data.email}>`,
      subject: subject,
      html: htmlContent
    });
  }

  /**
   * Get verification email template
   */
  private static getVerificationEmailTemplate(data: EmailVerificationData, pin: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Khayalami</title>
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
          .button { 
            background: #667eea; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block; 
            font-weight: bold;
            margin: 20px 0;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verify Your Email</h1>
            <p>Welcome to Khayalami!</p>
          </div>
          <div class="content">
            <p>Hello <strong>${data.firstName} ${data.lastName}</strong>,</p>
            
            <p>Thank you for registering with Khayalami! To complete your registration and start using your ${data.role} account, please verify your email address using the 6-digit PIN below:</p>
            
            <div class="pin-container">
              <h3>Your Verification PIN</h3>
              <div class="pin">${pin}</div>
              <p><strong>This PIN expires in 15 minutes</strong></p>
            </div>
            
            <p>Enter this PIN in the app to verify your email address and activate your account.</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This PIN is valid for 15 minutes only</li>
                <li>Do not share this PIN with anyone</li>
                <li>If you didn't request this verification, please ignore this email</li>
              </ul>
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              ${data.role === 'tenant' ? `
                <li>Browse and search for rental properties</li>
                <li>Chat with landlords and schedule viewings</li>
                <li>Sign digital rental agreements</li>
                <li>Make secure rental payments</li>
                <li>Request maintenance and book services</li>
              ` : data.role === 'landlord' ? `
                <li>List and manage your properties</li>
                <li>Connect with verified tenants</li>
                <li>Create digital rental agreements</li>
                <li>Track payments and manage finances</li>
                <li>Access landlord dashboard and analytics</li>
              ` : `
                <li>Access admin dashboard and analytics</li>
                <li>Manage users and properties</li>
                <li>Oversee platform operations</li>
                <li>Generate reports and insights</li>
              `}
            </ul>
            
            <p>Welcome to the Khayalami community!</p>
            
            <p>Best regards,<br><strong>The Khayalami Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
            <p>If you have any questions, contact us at support@khayalami.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get welcome email template
   */
  private static getWelcomeEmailTemplate(data: EmailVerificationData): string {
    const roleSpecificContent = data.role === 'tenant' ? {
      title: "Welcome to Khayalami - Your Rental Journey Starts Here!",
      features: [
        "🏠 Browse verified rental properties in your area",
        "💬 Chat directly with landlords and schedule viewings",
        "📝 Sign digital rental agreements with e-signature",
        "💳 Make secure rental payments online or cash",
        "🔧 Request maintenance and book cleaning services",
        "📱 Track your rental history and payments"
      ],
      cta: "Start browsing properties now!",
      nextSteps: "Complete your profile to get personalized property recommendations."
    } : data.role === 'landlord' ? {
      title: "Welcome to Khayalami - Your Property Management Partner!",
      features: [
        "🏘️ List and manage your rental properties",
        "👥 Connect with verified tenants and leads",
        "📋 Create digital rental agreements",
        "💰 Track payments and manage your finances",
        "📊 Access detailed analytics and reports",
        "🔧 Coordinate maintenance and services"
      ],
      cta: "List your first property!",
      nextSteps: "Complete your landlord profile to start receiving tenant applications."
    } : {
      title: "Welcome to Khayalami - Admin Dashboard Access!",
      features: [
        "📊 Access comprehensive platform analytics",
        "👥 Manage users, landlords, and tenants",
        "🏠 Oversee property listings and approvals",
        "💰 Monitor payments and commissions",
        "📈 Generate detailed reports and insights",
        "⚙️ Configure platform settings and features"
      ],
      cta: "Access your admin dashboard!",
      nextSteps: "Review platform metrics and user activity."
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Khayalami!</title>
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
            font-size: 32px; 
            font-weight: bold;
          }
          .content { 
            padding: 40px 30px; 
            background: #ffffff; 
          }
          .welcome-badge {
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: bold;
            margin: 20px 0;
          }
          .feature-list {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            margin: 30px 0;
          }
          .feature-list ul {
            margin: 0;
            padding-left: 20px;
          }
          .feature-list li {
            margin: 10px 0;
            font-size: 16px;
          }
          .button { 
            background: #667eea; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            display: inline-block; 
            font-weight: bold;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #666; 
            font-size: 14px; 
            background: #f8f9fa;
          }
          .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Khayalami!</h1>
            <p>Your account has been successfully verified</p>
          </div>
          <div class="content">
            <div class="success">
              <strong>✅ Email Verified Successfully!</strong><br>
              Your ${data.role} account is now active and ready to use.
            </div>
            
            <p>Hello <strong>${data.firstName} ${data.lastName}</strong>,</p>
            
            <p>Welcome to Khayalami! We're excited to have you join our community of ${data.role}s. Your email has been verified and your account is now fully activated.</p>
            
            <div class="welcome-badge">
              🎯 ${data.role.toUpperCase()} ACCOUNT ACTIVATED
            </div>
            
            <h2>${roleSpecificContent.title}</h2>
            
            <div class="feature-list">
              <h3>What you can do now:</h3>
              <ul>
                ${roleSpecificContent.features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            
            <p><strong>Next Steps:</strong> ${roleSpecificContent.nextSteps}</p>
            
            <p>If you have any questions or need assistance, our support team is here to help!</p>
            
            <p>Welcome to the Khayalami community!</p>
            
            <p>Best regards,<br><strong>The Khayalami Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
            <p>This email was sent to ${data.email}</p>
            <p>Need help? Contact us at support@khayalami.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
