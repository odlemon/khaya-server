// @ts-nocheck

function formatDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-ZW", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMoney(value: unknown): string | null {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return `USD ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function stripCurrency(value: string): string {
  return value.replace(/^USD\s*/, "");
}

function describeEmployment(value: unknown): string | null {
  switch (value) {
    case "employed":
      return "I'm currently employed";
    case "self-employed":
      return "I'm self-employed";
    case "student":
      return "I'm a student";
    case "unemployed":
      return "I'm between jobs at the moment";
    case "retired":
      return "I'm retired";
    default:
      return null;
  }
}

function toCount(value: unknown): number | null {
  const count = Number(value);
  return Number.isFinite(count) ? count : null;
}

/**
 * Build the first-person message automatically sent from the tenant when a
 * landlord accepts their rental request. Only fields the tenant actually filled
 * in are mentioned, written as prose so it reads like the tenant typed it.
 */
export function buildAcceptedRentalRequestMessage(
  connection: any,
  property: any
): string {
  const propertyName = property?.title;
  const paragraphs: string[] = [
    propertyName
      ? `Hi, thanks for accepting my request on ${propertyName}.`
      : "Hi, thanks for accepting my request.",
  ];

  if (connection.message) {
    paragraphs.push(String(connection.message).trim());
  }

  const sentences: string[] = [];

  const viewingDate = formatDate(connection.proposedViewingDate);
  const moveInDate = formatDate(connection.expectedMoveInDate);
  if (viewingDate && moveInDate) {
    sentences.push(
      `I was hoping to come and see the place on ${viewingDate}, and I'd like to move in around ${moveInDate}.`
    );
  } else if (viewingDate) {
    sentences.push(
      `I was hoping to come and see the place on ${viewingDate}, if that works for you.`
    );
  } else if (moveInDate) {
    sentences.push(`I'd like to move in around ${moveInDate}.`);
  }

  const occupants = toCount(connection.numberOfOccupants);
  const employment = describeEmployment(connection.employmentStatus);
  if (occupants === 1) {
    sentences.push(
      employment ? `It would just be me, and ${employment}.` : "It would just be me."
    );
  } else if (occupants !== null) {
    sentences.push(
      employment
        ? `There would be ${occupants} of us living there, and ${employment}.`
        : `There would be ${occupants} of us living there.`
    );
  } else if (employment) {
    sentences.push(`${employment.charAt(0).toUpperCase()}${employment.slice(1)}.`);
  }

  const months = toCount(connection.leaseDurationMonths);
  const budgetMin = formatMoney(connection.expectedBudgetMin);
  const budgetMax = formatMoney(connection.expectedBudgetMax);
  let budgetPhrase: string | null = null;
  if (budgetMin && budgetMax && budgetMin !== budgetMax) {
    budgetPhrase = `${budgetMin} to ${stripCurrency(budgetMax)} a month`;
  } else if (budgetMin || budgetMax) {
    budgetPhrase = `around ${budgetMin || budgetMax} a month`;
  }

  const leasePhrase = months !== null ? `a ${months}-month lease` : null;
  if (leasePhrase && budgetPhrase) {
    sentences.push(`I'm looking at ${leasePhrase}, with a budget of ${budgetPhrase}.`);
  } else if (leasePhrase) {
    sentences.push(`I'm looking at ${leasePhrase}.`);
  } else if (budgetPhrase) {
    sentences.push(`My budget is ${budgetPhrase}.`);
  }

  if (connection.hasPets) {
    const petDetails = connection.petDetails
      ? String(connection.petDetails).trim()
      : "";
    sentences.push(
      petDetails ? `I do have pets: ${petDetails}.` : "I do have pets."
    );
  } else if (connection.hasPets === false) {
    sentences.push("I don't have any pets.");
  }

  if (sentences.length) {
    paragraphs.push(sentences.join(" "));
  }

  if (connection.specialRequirements) {
    paragraphs.push(
      `One thing worth mentioning: ${String(connection.specialRequirements).trim()}`
    );
  }

  paragraphs.push("Let me know what works best for you.");
  return paragraphs.join("\n\n");
}
