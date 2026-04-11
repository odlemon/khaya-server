// @ts-nocheck
import mongoose from "mongoose";
import { Property } from "../models/Property";
import { Agreement } from "../models/Agreement";

export type InsurancePolicyPhase = "in_force" | "awaiting_signature" | "ended";

function coverStartDate(agreement: any): Date | null {
  if (agreement.signedAt) return new Date(agreement.signedAt);
  const landlordSigned = agreement.landlordSignature?.signedAt
    ? new Date(agreement.landlordSignature.signedAt).getTime()
    : null;
  const tenantSigned = agreement.tenantSignature?.signedAt
    ? new Date(agreement.tenantSignature.signedAt).getTime()
    : null;
  if (landlordSigned != null && tenantSigned != null) {
    return new Date(Math.max(landlordSigned, tenantSigned));
  }
  return null;
}

/**
 * Choose the single tenancy agreement that best represents the current
 * insurance-relevant state for a property.
 */
function pickPrimaryAgreement(agreements: any[]): any | null {
  if (!agreements?.length) return null;

  const byNewestStart = (a: any, b: any) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime();

  const current = agreements
    .filter((a) =>
      ["active", "signed", "pending_termination"].includes(a.status),
    )
    .sort(byNewestStart)[0];

  if (current) return current;

  const upcoming = agreements
    .filter((a) => ["draft", "pending"].includes(a.status))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

  if (upcoming) return upcoming;

  return agreements
    .filter((a) => ["expired", "terminated"].includes(a.status))
    .sort(
      (a, b) =>
        new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
    )[0];
}

function classifyPhase(agreement: any | null): InsurancePolicyPhase {
  if (!agreement) return "awaiting_signature";

  const st = agreement.status;

  if (st === "draft" || st === "pending") {
    return "awaiting_signature";
  }

  if (st === "expired" || st === "terminated") {
    return "ended";
  }

  const now = new Date();
  if (agreement.endDate && new Date(agreement.endDate) < now) {
    return "ended";
  }

  if (["signed", "active", "pending_termination"].includes(st)) {
    return "in_force";
  }

  return "awaiting_signature";
}

function publicLandlord(landlord: any) {
  if (!landlord) return null;
  return {
    userId: landlord._id,
    firstName: landlord.firstName,
    lastName: landlord.lastName,
    email: landlord.email,
    phone: landlord.phone ?? null,
    isVerified: landlord.isVerified,
    documentVerificationStatus:
      landlord.documentVerification?.status ?? "unverified",
  };
}

function publicTenant(tenant: any) {
  if (!tenant) return null;
  return {
    userId: tenant._id,
    firstName: tenant.firstName,
    lastName: tenant.lastName,
    email: tenant.email,
    phone: tenant.phone ?? null,
  };
}

function policyholderNote() {
  return {
    type: "landlord",
    description:
      "The landlord is the policyholder under Khayalami’s rental insurance program.",
  };
}

export class InsuranceAdminService {
  /**
   * Summary counts for policies tied to properties with insurance enabled.
   */
  async getSummary() {
    const properties = await Property.find({ "insurance.enabled": true })
      .select("_id")
      .lean();
    const propertyIds = properties.map((p) => p._id);

    if (propertyIds.length === 0) {
      return {
        totalPropertiesWithInsurance: 0,
        inForce: 0,
        awaitingSignature: 0,
        ended: 0,
        rules: {
          coverStartsAt: "fully_signed_agreement",
          policyScope: "one_row_per_property",
          policyholder: "landlord",
        },
      };
    }

    const agreements = await Agreement.find({
      propertyId: { $in: propertyIds },
      type: "tenancy",
    }).lean();

    const byProperty = new Map<string, any[]>();
    for (const a of agreements) {
      const key = a.propertyId.toString();
      if (!byProperty.has(key)) byProperty.set(key, []);
      byProperty.get(key)!.push(a);
    }

    let inForce = 0;
    let awaitingSignature = 0;
    let ended = 0;

    for (const pid of propertyIds) {
      const primary = pickPrimaryAgreement(byProperty.get(pid.toString()) || []);
      const phase = classifyPhase(primary);
      if (phase === "in_force") inForce++;
      else if (phase === "awaiting_signature") awaitingSignature++;
      else ended++;
    }

    return {
      totalPropertiesWithInsurance: propertyIds.length,
      inForce,
      awaitingSignature,
      ended,
      rules: {
        coverStartsAt: "fully_signed_agreement",
        policyScope: "one_row_per_property",
        policyholder: "landlord",
      },
    };
  }

  /**
   * Paginated list of insurance configurations per property (policy scope = property).
   */
  async listPolicies(params: {
    page: number;
    limit: number;
    status: InsurancePolicyPhase | "all";
  }) {
    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    const skip = (page - 1) * limit;

    const properties = await Property.find({ "insurance.enabled": true })
      .populate("landlordId", "-password")
      .sort({ updatedAt: -1 })
      .lean();

    const propertyIds = properties.map((p) => p._id);
    const agreements =
      propertyIds.length === 0
        ? []
        : await Agreement.find({
            propertyId: { $in: propertyIds },
            type: "tenancy",
          })
            .populate("tenantId", "-password")
            .lean();

    const byProperty = new Map<string, any[]>();
    for (const a of agreements) {
      const key = a.propertyId.toString();
      if (!byProperty.has(key)) byProperty.set(key, []);
      byProperty.get(key)!.push(a);
    }

    const rows: any[] = [];

    for (const prop of properties) {
      const pid = prop._id.toString();
      const primary = pickPrimaryAgreement(byProperty.get(pid) || []);
      const phase = classifyPhase(primary);
      const coverStart = primary ? coverStartDate(primary) : null;

      if (params.status !== "all" && phase !== params.status) continue;

      rows.push({
        propertyId: prop._id,
        propertyTitle: prop.title,
        propertyStatus: prop.status,
        address: {
          street: prop.address?.street,
          city: prop.address?.city,
          area: prop.address?.area ?? null,
          state: prop.address?.state ?? null,
          country: prop.address?.country,
        },
        propertyType: prop.propertyType,
        furnishingLevel: prop.furnishingLevel,
        phase,
        coverStartDate:
          phase === "in_force" && coverStart
            ? coverStart.toISOString()
            : null,
        insurance: prop.insurance
          ? {
              enabled: prop.insurance.enabled,
              coverageType: prop.insurance.coverageType,
              pricingModel: prop.insurance.pricingModel,
              monthlyPremium: prop.insurance.monthlyPremium,
              riskCategory: prop.insurance.riskCategory ?? null,
              propertyValue: prop.insurance.propertyValue ?? null,
            }
          : null,
        policyholder: {
          ...policyholderNote(),
          ...publicLandlord(prop.landlordId),
        },
        agreement: primary
          ? {
              agreementId: primary._id,
              status: primary.status,
              startDate: primary.startDate,
              endDate: primary.endDate,
              rentAmount: primary.rentAmount,
              depositAmount: primary.depositAmount,
              signedAt: primary.signedAt ?? null,
              tenant: publicTenant(primary.tenantId),
            }
          : null,
      });
    }

    const total = rows.length;
    const paginated = rows.slice(skip, skip + limit);

    return {
      policies: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /**
   * Single property insurance policy view (must have insurance enabled).
   */
  async getPolicyByPropertyId(propertyId: string) {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return { error: "invalid_id" as const };
    }

    const property = await Property.findById(propertyId)
      .populate("landlordId", "-password")
      .lean();

    if (!property) {
      return { error: "not_found" as const };
    }

    if (!property.insurance?.enabled) {
      return { error: "insurance_not_enabled" as const };
    }

    const agreements = await Agreement.find({
      propertyId: property._id,
      type: "tenancy",
    })
      .populate("tenantId", "-password")
      .sort({ updatedAt: -1 })
      .lean();

    const primary = pickPrimaryAgreement(agreements);
    const phase = classifyPhase(primary);
    const coverStart = primary ? coverStartDate(primary) : null;

    return {
      data: {
        propertyId: property._id,
        propertyTitle: property.title,
        propertyStatus: property.status,
        listingType: property.listingType,
        address: property.address,
        propertyType: property.propertyType,
        furnishingLevel: property.furnishingLevel,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        areaSqm: property.area,
        price: property.price,
        deposit: property.deposit,
        zeroDepositAvailable: property.zeroDepositAvailable,
        phase,
        coverStartDate:
          phase === "in_force" && coverStart
            ? coverStart.toISOString()
            : null,
        coverRules: {
          startsWhen:
            "Agreement is fully executed (both parties signed; `signedAt` set).",
          policyholder: policyholderNote(),
        },
        insurance: {
          enabled: property.insurance.enabled,
          coverageType: property.insurance.coverageType,
          pricingModel: property.insurance.pricingModel,
          monthlyPremium: property.insurance.monthlyPremium,
          riskCategory: property.insurance.riskCategory ?? null,
          propertyValue: property.insurance.propertyValue ?? null,
        },
        policyholder: {
          ...policyholderNote(),
          ...publicLandlord(property.landlordId),
        },
        primaryAgreement: primary
          ? {
              agreementId: primary._id,
              status: primary.status,
              title: primary.title,
              startDate: primary.startDate,
              endDate: primary.endDate,
              rentAmount: primary.rentAmount,
              depositAmount: primary.depositAmount,
              zeroDeposit: primary.zeroDeposit,
              signedAt: primary.signedAt ?? null,
              landlordSignedAt: primary.landlordSignature?.signedAt ?? null,
              tenantSignedAt: primary.tenantSignature?.signedAt ?? null,
              tenant: publicTenant(primary.tenantId),
            }
          : null,
        agreementHistory: agreements.map((a) => ({
          agreementId: a._id,
          status: a.status,
          startDate: a.startDate,
          endDate: a.endDate,
          signedAt: a.signedAt ?? null,
          createdAt: a.createdAt,
        })),
      },
    };
  }
}

export const insuranceAdminService = new InsuranceAdminService();
