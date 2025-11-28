// @ts-nocheck
import { SendMailClient } from "zeptomail";
import { User } from "../models/User";

// Use existing ZeptoMail configuration
const zeptoUrl = "api.zeptomail.com/";
const zeptoToken = "Zoho-enczapikey wSsVR61/+xejCqZ6mzOpJuptkQxSVlmgER993FKmuHb7HKiT8MdvxELKDFWmTfJMFmZvRTRAorookUoIgGZa3dUszgsFASiF9mqRe1U4J3x17qnvhDzPX29dmxCAL4wPwQ1jmWVjFc8q+g==";
const zeptoClient = new SendMailClient({ url: zeptoUrl, token: zeptoToken });

export class EmailNotificationService {
  /**
   * Send payment confirmed email (in-app payment)
   */
  async sendPaymentConfirmed(data: {
    tenantEmail: string;
    tenantName: string;
    amount: number;
    deductions: {
      subscriptionFee: number;
      processingFee: number;
      insurancePremium: number;
      totalDeductions: number;
    };
    escrowStatus: string;
  }): Promise<void> {
    const subject = "Payment Confirmed - Khayalami";
    const htmlContent = this.getPaymentConfirmedTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.tenantEmail,
          name: data.tenantName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Send payment request submitted email (external payment)
   */
  async sendPaymentRequestSubmitted(data: {
    tenantEmail: string;
    tenantName: string;
    amount: number;
    requestId: string;
  }): Promise<void> {
    const subject = "Payment Request Submitted - Awaiting Review";
    const htmlContent = this.getPaymentRequestSubmittedTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.tenantEmail,
          name: data.tenantName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Send payment approved email (external payment approved)
   */
  async sendPaymentApproved(data: {
    tenantEmail: string;
    tenantName: string;
    amount: number;
    deductions: {
      subscriptionFee: number;
      processingFee: number;
      insurancePremium: number;
      netRentAmount: number;
    };
  }): Promise<void> {
    const subject = "Payment Approved - Processed Successfully";
    const htmlContent = this.getPaymentApprovedTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.tenantEmail,
          name: data.tenantName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Send payment rejected email
   */
  async sendPaymentRejected(data: {
    tenantEmail: string;
    tenantName: string;
    amount: number;
    rejectionReason: string;
  }): Promise<void> {
    const subject = "Payment Request Rejected";
    const htmlContent = this.getPaymentRejectedTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.tenantEmail,
          name: data.tenantName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Send distribution payout email (landlord receives money)
   */
  async sendDistributionPayout(data: {
    landlordEmail: string;
    landlordName: string;
    amount: number;
    transactionCount: number;
    subscriptionFee?: number;
    payoutId: string;
  }): Promise<void> {
    const subject = "Rent Payment Distributed - Khayalami";
    const htmlContent = this.getDistributionPayoutTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.landlordEmail,
          name: data.landlordName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Send rent deposited in escrow email (landlord)
   */
  async sendRentDepositedEscrow(data: {
    landlordEmail: string;
    landlordName: string;
    tenantName: string;
    amount: number;
    netRentAmount: number;
    propertyTitle: string;
  }): Promise<void> {
    const subject = "Rent Deposited in Escrow - Khayalami";
    const htmlContent = this.getRentDepositedEscrowTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.landlordEmail,
          name: data.landlordName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Send admin payment request notification
   */
  async sendAdminPaymentRequest(data: {
    adminEmail: string;
    tenantName: string;
    amount: number;
    requestId: string;
    proofUrl: string;
  }): Promise<void> {
    const subject = "New Payment Request - Review Required";
    const htmlContent = this.getAdminPaymentRequestTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.adminEmail,
          name: "Admin"
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  // Email Templates
  private getPaymentConfirmedTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .amount { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
          .deductions { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Confirmed</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.tenantName}</strong>,</p>
            <p>Your payment of <strong>$${data.amount}</strong> has been confirmed and processed successfully.</p>
            <div class="deductions">
              <h3>Payment Breakdown:</h3>
              <p>Total Amount: <strong>$${data.amount}</strong></p>
              ${data.deductions.subscriptionFee > 0 ? `<p>Subscription Fee: $${data.deductions.subscriptionFee}</p>` : ''}
              ${data.deductions.processingFee > 0 ? `<p>Processing Fee: $${data.deductions.processingFee}</p>` : ''}
              ${data.deductions.insurancePremium > 0 ? `<p>Insurance Premium: $${data.deductions.insurancePremium}</p>` : ''}
              <p><strong>Total Deductions: $${data.deductions.totalDeductions}</strong></p>
            </div>
            <p>Your payment has been deposited in escrow and will be distributed at the end of the month.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentRequestSubmittedTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📤 Payment Request Submitted</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.tenantName}</strong>,</p>
            <p>Your payment request of <strong>$${data.amount}</strong> has been submitted and is awaiting admin review.</p>
            <p>We will review your payment proof and notify you once it's processed (usually within 24-48 hours).</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentApprovedTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Approved</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>Payment Processed Successfully!</strong>
            </div>
            <p>Hello <strong>${data.tenantName}</strong>,</p>
            <p>Your payment of <strong>$${data.amount}</strong> has been approved and processed.</p>
            <p><strong>Net Rent Amount:</strong> $${data.deductions.netRentAmount}</p>
            <p>Your payment has been deposited in escrow and will be distributed at the end of the month.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentRejectedTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .rejection { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Payment Request Rejected</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.tenantName}</strong>,</p>
            <div class="rejection">
              <strong>Rejection Reason:</strong><br>
              ${data.rejectionReason}
            </div>
            <p>Please review the reason above and resubmit your payment with the correct information.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getRentDepositedEscrowTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .info { background: #e7f3ff; border: 1px solid #b3d9ff; color: #004085; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Rent Deposited in Escrow</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.landlordName}</strong>,</p>
            <div class="info">
              <p><strong>Tenant:</strong> ${data.tenantName}</p>
              <p><strong>Property:</strong> ${data.propertyTitle}</p>
              <p><strong>Total Payment:</strong> $${data.amount}</p>
              <p><strong>Net Rent (Your Portion):</strong> $${data.netRentAmount}</p>
            </div>
            <p>Rent has been deposited in escrow and will be distributed to you at the end of the month.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getAdminPaymentRequestTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Payment Request</h1>
          </div>
          <div class="content">
            <div class="alert">
              <strong>Action Required:</strong> Review payment request
            </div>
            <p><strong>Tenant:</strong> ${data.tenantName}</p>
            <p><strong>Amount:</strong> $${data.amount}</p>
            <p><strong>Request ID:</strong> ${data.requestId}</p>
            <p>Please review the payment proof and approve or reject the request.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send agreement created email
   */
  async sendAgreementCreated(data: {
    recipientEmail: string;
    recipientName: string;
    recipientRole: "landlord" | "tenant";
    agreementTitle: string;
    propertyTitle: string;
    landlordName: string;
    tenantName: string;
    agreementId: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
  }): Promise<void> {
    const subject = "New Rental Agreement Created - Khayalami";
    const htmlContent = this.getAgreementCreatedTemplate(data);

    await zeptoClient.sendMail({
      from: {
        address: "noreply@lysp.io",
        name: "Khayalami"
      },
      to: [{
        email_address: {
          address: data.recipientEmail,
          name: data.recipientName
        }
      }],
      subject,
      htmlbody: htmlContent
    });
  }

  /**
   * Get agreement created email template
   */
  private getAgreementCreatedTemplate(data: {
    recipientEmail: string;
    recipientName: string;
    recipientRole: "landlord" | "tenant";
    agreementTitle: string;
    propertyTitle: string;
    landlordName: string;
    tenantName: string;
    agreementId: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
  }): string {
    const startDate = new Date(data.startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const endDate = new Date(data.endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const rentAmount = data.rentAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });

    const roleMessage = data.recipientRole === "landlord" 
      ? `A new rental agreement has been created for your property. Please review and sign the agreement.`
      : `A new rental agreement has been created for you. Please review the terms and pay the agreement processing fee before signing.`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Agreement Created</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .alert { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .detail-row { margin: 10px 0; padding: 8px; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; color: #555; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Rental Agreement Created</h1>
          </div>
          <div class="content">
            <p>Hello ${data.recipientName},</p>
            <p>${roleMessage}</p>
            
            <div class="alert">
              <strong>Next Steps:</strong><br>
              ${data.recipientRole === "landlord" 
                ? "1. Review the agreement details<br>2. Sign the agreement<br>3. Wait for tenant to pay fee and sign"
                : "1. Review the agreement details<br>2. Pay the agreement processing fee ($30-50)<br>3. Sign the agreement after payment is verified"}
            </div>

            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Agreement Title:</span> ${data.agreementTitle}
              </div>
              <div class="detail-row">
                <span class="detail-label">Property:</span> ${data.propertyTitle}
              </div>
              <div class="detail-row">
                <span class="detail-label">Landlord:</span> ${data.landlordName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Tenant:</span> ${data.tenantName}
              </div>
              <div class="detail-row">
                <span class="detail-label">Rent Amount:</span> ${rentAmount}
              </div>
              <div class="detail-row">
                <span class="detail-label">Start Date:</span> ${startDate}
              </div>
              <div class="detail-row">
                <span class="detail-label">End Date:</span> ${endDate}
              </div>
              <div class="detail-row">
                <span class="detail-label">Agreement ID:</span> ${data.agreementId}
              </div>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://khayalami.com'}/agreements/${data.agreementId}" class="button">
                View Agreement
              </a>
            </p>

            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getDistributionPayoutTemplate(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .amount { font-size: 32px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
          .info-box { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payment Distributed</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.landlordName}</strong>,</p>
            <p>Great news! Your rent payment has been distributed to your account.</p>
            <div class="amount">$${data.amount.toFixed(2)}</div>
            <div class="info-box">
              <h3>Payment Details:</h3>
              <p><strong>Amount Received:</strong> $${data.amount.toFixed(2)}</p>
              <p><strong>Number of Transactions:</strong> ${data.transactionCount}</p>
              ${data.subscriptionFee && data.subscriptionFee > 0 ? `<p><strong>Subscription Fee Deducted:</strong> $${data.subscriptionFee.toFixed(2)}</p>` : ''}
              <p><strong>Payout ID:</strong> ${data.payoutId}</p>
              <p><strong>Status:</strong> Pending Processing</p>
            </div>
            <p>The funds have been credited to your Khayalami account balance and are available for withdrawal.</p>
            <p>You can now request a withdrawal through your landlord dashboard.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailNotificationService = new EmailNotificationService();

