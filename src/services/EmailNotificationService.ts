// @ts-nocheck
import { User } from "../models/User";
import { emailTransport, getFromAddress } from "../config/emailConfig";

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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.tenantName} <${data.tenantEmail}>`,
      subject,
      html: htmlContent
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.tenantName} <${data.tenantEmail}>`,
      subject,
      html: htmlContent
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.tenantName} <${data.tenantEmail}>`,
      subject,
      html: htmlContent
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.tenantName} <${data.tenantEmail}>`,
      subject,
      html: htmlContent
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.landlordName} <${data.landlordEmail}>`,
      subject,
      html: htmlContent
    });
  }

  /**
   * Landlord: bank has confirmed the outbound transfer (mark-paid in bank admin).
   */
  async sendLandlordBankPayoutConfirmed(data: {
    landlordEmail: string;
    landlordName: string;
    amount: number;
    payoutId: string;
    externalReference?: string;
    processedAt: Date;
  }): Promise<void> {
    const subject = "Payout sent to your bank - Khayalami";
    const htmlContent = this.getLandlordBankPayoutConfirmedTemplate(data);
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.landlordName} <${data.landlordEmail}>`,
      subject,
      html: htmlContent,
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.landlordName} <${data.landlordEmail}>`,
      subject,
      html: htmlContent
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `Admin <${data.adminEmail}>`,
      subject,
      html: htmlContent
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
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.recipientName} <${data.recipientEmail}>`,
      subject,
      html: htmlContent
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
      : `A new rental agreement has been created for you. Please review the terms and sign when you are ready. The one-time agreement processing fee will be included in your first rent payment.`;

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
                ? "1. Review the agreement details<br>2. Sign the agreement<br>3. Wait for tenant to sign"
                : "1. Review the agreement details<br>2. Sign after your landlord has signed<br>3. Pay your first rent installment (includes the agreement fee)"}
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

  private getLandlordBankPayoutConfirmedTemplate(data: any): string {
    const refLine =
      data.externalReference != null && data.externalReference !== ""
        ? `<p><strong>Bank reference:</strong> ${String(data.externalReference)}</p>`
        : "";
    const when = new Date(data.processedAt).toLocaleString();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #0d6efd 0%, #6610f2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .amount { font-size: 28px; font-weight: bold; color: #0d6efd; text-align: center; margin: 20px 0; }
          .info-box { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payout confirmed</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.landlordName}</strong>,</p>
            <p>Your bank has recorded the transfer for your Khayalami landlord payout.</p>
            <div class="amount">$${Number(data.amount).toFixed(2)}</div>
            <div class="info-box">
              <p><strong>Payout ID:</strong> ${data.payoutId}</p>
              <p><strong>Confirmed at:</strong> ${when}</p>
              ${refLine}
            </div>
            <p>Depending on your bank, cleared funds may take a short time to appear. If anything looks wrong, contact support with your payout ID.</p>
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
   * Send rent payment reminder email to tenant
   */
  async sendRentReminder(data: {
    tenantEmail: string;
    tenantName: string;
    propertyAddress: string;
    rentAmount: number;
    dueDate: Date;
    daysUntilDue: number;
    reminderType: "7_days" | "3_days" | "1_day";
  }): Promise<void> {
    const subject = this.getRentReminderSubject(data.daysUntilDue, data.reminderType);
    const htmlContent = this.getRentReminderTemplate(data);
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.tenantName} <${data.tenantEmail}>`,
      subject,
      html: htmlContent
    });
  }

  /**
   * Get rent reminder email subject based on days until due
   */
  private getRentReminderSubject(daysUntilDue: number, reminderType: "7_days" | "3_days" | "1_day"): string {
    if (daysUntilDue === 1) {
      return "⏰ Reminder: Rent Payment Due Tomorrow - Khayalami";
    } else if (daysUntilDue === 3) {
      return "⏰ Reminder: Rent Payment Due in 3 Days - Khayalami";
    } else {
      return "⏰ Reminder: Rent Payment Due in 7 Days - Khayalami";
    }
  }

  /**
   * Get rent reminder email template
   */
  private getRentReminderTemplate(data: {
    tenantName: string;
    propertyAddress: string;
    rentAmount: number;
    dueDate: Date;
    daysUntilDue: number;
    reminderType: "7_days" | "3_days" | "1_day";
  }): string {
    const dueDateFormatted = new Date(data.dueDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const urgencyColor = data.daysUntilDue === 1 ? "#dc3545" : data.daysUntilDue === 3 ? "#ffc107" : "#17a2b8";
    const urgencyMessage = data.daysUntilDue === 1 
      ? "⚠️ Payment is due TOMORROW!" 
      : data.daysUntilDue === 3 
      ? "⏰ Payment due in 3 days" 
      : "📅 Payment due in 7 days";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert-box { background: ${urgencyColor}15; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .amount { font-size: 36px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
          .info-box { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e9ecef; }
          .info-row:last-child { border-bottom: none; }
          .info-label { font-weight: 600; color: #666; }
          .info-value { color: #333; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background: #f8f9fa; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Rent Payment Reminder</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${data.tenantName}</strong>,</p>
            
            <div class="alert-box">
              <h2 style="margin-top: 0; color: ${urgencyColor};">${urgencyMessage}</h2>
            </div>

            <p>This is a friendly reminder that your rent payment is coming up soon.</p>

            <div class="amount">K${data.rentAmount.toFixed(2)}</div>

            <div class="info-box">
              <h3 style="margin-top: 0;">Payment Details:</h3>
              <div class="info-row">
                <span class="info-label">Property:</span>
                <span class="info-value">${data.propertyAddress}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Rent Amount:</span>
                <span class="info-value"><strong>K${data.rentAmount.toFixed(2)}</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Due Date:</span>
                <span class="info-value"><strong>${dueDateFormatted}</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Days Remaining:</span>
                <span class="info-value"><strong>${data.daysUntilDue} day${data.daysUntilDue !== 1 ? 's' : ''}</strong></span>
              </div>
            </div>

            <p style="text-align: center;">
              <a href="https://khaya-portal.vercel.app/tenant/payments" class="button">Pay Rent Now</a>
            </p>

            <p>Please ensure your payment is submitted before the due date to avoid any late fees or issues.</p>
            
            <p>You can make your payment through the Khayalami app or upload proof of external payment.</p>

            <p>If you have already made the payment, please ignore this reminder.</p>

            <p>If you have any questions or concerns, please contact your landlord or our support team.</p>
          </div>
          <div class="footer">
            <p>© 2025 Khayalami. All rights reserved.</p>
            <p>This is an automated reminder. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Notify landlord when a tenant withdraws a pending connection / rental interest request.
   */
  async sendTenantCancelledConnectionRequest(data: {
    landlordEmail: string;
    landlordName: string;
    tenantName: string;
    propertyTitle: string;
    cancelReason?: string;
  }): Promise<void> {
    const subject = "Tenant withdrew a rental request - Khayalami";
    const reasonBlock =
      data.cancelReason &&
      `<p><strong>Note from tenant:</strong> ${data.cancelReason.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hello <strong>${data.landlordName}</strong>,</p>
        <p><strong>${data.tenantName}</strong> has cancelled their pending request for <strong>${data.propertyTitle}</strong>.</p>
        ${reasonBlock || ""}
        <p>You do not need to take action. If they are still interested, they may send a new request later.</p>
        <p style="color:#666;font-size:14px;">This is an automated message from Khayalami.</p>
      </body>
      </html>
    `;
    const from = getFromAddress("notifications");

    await emailTransport.sendMail({
      from: `${from.name} <${from.address}>`,
      to: `${data.landlordName} <${data.landlordEmail}>`,
      subject,
      html: htmlContent
    });
  }
}

export const emailNotificationService = new EmailNotificationService();

