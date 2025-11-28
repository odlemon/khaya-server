// @ts-nocheck
import { Payment } from "../models/Payment";
import { Property } from "../models/Property";
import { RevenueSource } from "../models/RevenueSource";
import { Types } from "mongoose";
import { escrowService } from "./EscrowService";
import { revenueSourceService } from "./RevenueSourceService";

const BOOST_PRICING: Record<number, number> = {
  7: 10,
  30: 15,
  90: 25
};

export class PremiumBoostService {
  private getBoostPrice(duration: number): number {
    return BOOST_PRICING[duration] ?? 15;
  }

  private durationFromAmount(amount: number): number {
    if (amount === 10) return 7;
    if (amount === 15) return 30;
    if (amount === 25) return 90;
    return 30;
  }

  private parseDuration(notes?: string, amount?: number): number {
    if (notes) {
      const match = notes.match(/duration[:\s]+(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    if (amount) {
      return this.durationFromAmount(amount);
    }
    return 30;
  }

  private async ensurePropertyOwnership(propertyId: string, landlordId: string) {
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new Error("Property not found");
    }
    if (property.landlordId?.toString() !== landlordId.toString()) {
      throw new Error("Access denied. You don't own this property.");
    }
    return property;
  }

  async hasActiveBoost(propertyId: string): Promise<boolean> {
    const boosts = await RevenueSource.find({
      sourceType: "premium_boost",
      propertyId: new Types.ObjectId(propertyId),
      status: { $in: ["collected"] }
    }).sort({ createdAt: -1 });

    const now = new Date();
    for (const boost of boosts) {
      const duration = this.parseDuration(boost.notes, boost.amount);
      const start = boost.createdAt || boost.updatedAt || now;
      const expiresAt = new Date(start);
      expiresAt.setDate(expiresAt.getDate() + duration);
      if (expiresAt > now) {
        return true;
      }
    }

    return false;
  }

  async purchaseBoost(options: {
    propertyId: string;
    landlordId: string;
    duration: number;
    paymentMethod: "in_app" | "cash" | "external";
    gatewayResponse?: any;
  }) {
    if (options.paymentMethod !== "in_app") {
      throw new Error("Only in-app payments are supported for instant boosts");
    }

    await this.ensurePropertyOwnership(options.propertyId, options.landlordId);

    if (await this.hasActiveBoost(options.propertyId)) {
      throw new Error("An active boost already exists for this property");
    }

    const price = this.getBoostPrice(options.duration);

    const payment = await Payment.create({
      rentalId: null,
      agreementId: null,
      propertyId: new Types.ObjectId(options.propertyId),
      landlordId: new Types.ObjectId(options.landlordId),
      tenantId: new Types.ObjectId(options.landlordId), // landlord pays for boost
      paymentType: "service",
      amount: price,
      totalAmount: price,
      paymentMethod: "in_app",
      paymentDate: new Date(),
      dueDate: new Date(),
      status: "verified",
      verifiedAt: new Date(),
      gatewayResponse: options.gatewayResponse,
      notes: `Premium boost (${options.duration} days)`
    });

    const revenueSource = await revenueSourceService.createRevenueSource({
      sourceType: "premium_boost",
      amount: price,
      payerId: options.landlordId,
      recipientId: "khayalami",
      paymentId: payment._id.toString(),
      propertyId: options.propertyId,
      description: `Premium boost (${options.duration} days)`,
      notes: `duration:${options.duration}`,
      status: "collected"
    });

    await escrowService.addToEscrow(payment, {
      deductions: {
        subscriptionFee: 0,
        processingFee: 0,
        insurancePremium: 0
      },
      revenueSourceIds: [revenueSource._id.toString()]
    });
    await escrowService.updateEscrowStatus(payment._id.toString(), "held");

    return {
      payment,
      revenueSource
    };
  }

  async createBoostPaymentRequest(data: {
    propertyId: string;
    landlordId: string;
    duration: number;
    proofOfPayment: string;
    paymentMethod: "bank_transfer" | "cash" | "mobile_money" | "other";
    notes?: string;
  }) {
    await this.ensurePropertyOwnership(data.propertyId, data.landlordId);
    if (await this.hasActiveBoost(data.propertyId)) {
      throw new Error("An active boost already exists for this property");
    }

    const price = this.getBoostPrice(data.duration);

    const { paymentRequestService } = await import("./PaymentRequestService");
    return paymentRequestService.createPaymentRequest({
      tenantId: data.landlordId,
      landlordId: data.landlordId,
      propertyId: data.propertyId,
      amount: price,
      paymentMethod: data.paymentMethod,
      proofOfPayment: data.proofOfPayment,
      requestType: "premium_boost",
      notes: data.notes || `duration:${data.duration}`
    });
  }
}

export const premiumBoostService = new PremiumBoostService();


