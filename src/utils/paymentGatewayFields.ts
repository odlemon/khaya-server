// @ts-nocheck

/** Shared gateway field shape for Payment.create / save */
export function buildGatewayPaymentFields(
  reference: string,
  metadata: Record<string, unknown>,
  pollUrl?: string | null
) {
  return {
    gatewayReference: reference,
    gatewayMetadata: metadata,
    paynowReference: reference,
    paynowMetadata: metadata,
    pollUrl: pollUrl ?? null,
  };
}

/** Read payment purpose metadata (new or legacy field names) */
export function getPaymentGatewayMetadata(payment: {
  gatewayMetadata?: { paymentPurpose?: string; [key: string]: unknown };
  paynowMetadata?: { paymentPurpose?: string; [key: string]: unknown };
}) {
  return payment.gatewayMetadata || payment.paynowMetadata;
}

/** Resolve merchant reference from payment record */
export function getPaymentGatewayReference(payment: {
  gatewayReference?: string;
  paynowReference?: string;
}) {
  return payment.gatewayReference || payment.paynowReference;
}
