// @ts-nocheck
import { appNotificationService } from "./AppNotificationService";

type VerificationStatus = "verified" | "rejected";

class VerificationNotificationService {
  async notifyProfileResult(input: {
    userId: string;
    role: "tenant" | "landlord" | string;
    status: VerificationStatus;
    adminFeedback?: string;
    rejectionReason?: string;
  }): Promise<void> {
    const approved = input.status === "verified";

    await appNotificationService.notify({
      userId: input.userId,
      type: approved
        ? "document_verification_approved"
        : "document_verification_rejected",
      title: approved
        ? "Profile verification approved"
        : "Profile verification rejected",
      body: approved
        ? "Your profile and identity documents have been verified successfully."
        : `Your profile verification was rejected${
            input.rejectionReason ? `: ${input.rejectionReason}` : "."
          }`,
      data: {
        userId: input.userId,
        role: input.role,
        verificationType: "profile",
        status: input.status,
        adminFeedback: input.adminFeedback,
        rejectionReason: input.rejectionReason,
        path: "/verification",
      },
    });
  }

  async notifyPropertyResult(input: {
    landlordId: string;
    propertyId: string;
    propertyTitle: string;
    status: VerificationStatus;
    adminFeedback?: string;
    rejectionReason?: string;
  }): Promise<void> {
    const approved = input.status === "verified";

    await appNotificationService.notify({
      userId: input.landlordId,
      type: approved ? "property_verified" : "property_rejected",
      title: approved ? "Listing verified" : "Listing rejected",
      body: approved
        ? `Your property "${input.propertyTitle}" is now verified and live.`
        : `Your property "${input.propertyTitle}" was not approved${
            input.rejectionReason ? `: ${input.rejectionReason}` : "."
          }`,
      data: {
        propertyId: input.propertyId,
        role: "landlord",
        verificationType: "property",
        status: input.status,
        adminFeedback: input.adminFeedback,
        rejectionReason: input.rejectionReason,
        path: `/properties/${input.propertyId}`,
      },
    });
  }
}

export const verificationNotificationService =
  new VerificationNotificationService();
