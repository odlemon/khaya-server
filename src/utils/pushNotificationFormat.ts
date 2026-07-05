// @ts-nocheck

export function getSenderDisplayName(sender: {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
} | null | undefined): string {
  if (!sender) return "New message";

  const first = sender.firstName || sender.first_name || "";
  const last = sender.lastName || sender.last_name || "";
  const name = `${first} ${last}`.trim();
  if (name) return name;

  if (sender.role === "admin") return "Khayalami Support";
  if (sender.role === "landlord") return "Your landlord";
  if (sender.role === "tenant") return "Your tenant";
  return "New message";
}

export function getMessagePreview(
  content: string | undefined | null,
  messageType: string = "text"
): string {
  if (messageType === "image") return "📷 Photo";
  if (messageType === "document") return "📎 Document";
  if (messageType === "viewing_request") return "📅 Viewing request";
  if (messageType === "move_in_request") return "🏠 Move-in request";

  if (!content) return "Tap to view message";

  const text = String(content).trim();
  if (!text) return "Tap to view message";

  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}
