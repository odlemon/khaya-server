// @ts-nocheck

/** Tenant-facing online rent payment method (EcoCash via ContiPay gateway). */
export function isEcoCashOnlinePayment(paymentMethod?: string): boolean {
  const m = (paymentMethod || "").toLowerCase();
  return m === "ecocash" || m === "contipay"; // contipay kept as legacy alias
}

export function isPaynowOnlinePayment(paymentMethod?: string): boolean {
  return (paymentMethod || "").toLowerCase() === "paynow";
}

/** Methods that require proof upload (admin approval), not instant gateway. */
export function isExternalProofPayment(paymentMethod?: string): boolean {
  const m = (paymentMethod || "").toLowerCase();
  return !!m && !isEcoCashOnlinePayment(m) && !isPaynowOnlinePayment(m) && m !== "in_app";
}
