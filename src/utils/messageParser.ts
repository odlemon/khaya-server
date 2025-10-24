/**
 * Message Parser Utility
 * Parses message content to detect @mentions for targeted messaging
 */

interface ParsedMessage {
  content: string; // Original content with @mentions
  taggedUser: "landlord" | "tenant" | "admin" | null;
  hasTag: boolean;
}

/**
 * Parse message content to detect @landlord, @tenant, or @admin mentions
 * @param content - The message content
 * @returns ParsedMessage object with tagged user info
 */
export function parseMessageMentions(content: string): ParsedMessage {
  if (!content || typeof content !== 'string') {
    return {
      content: content || '',
      taggedUser: null,
      hasTag: false
    };
  }

  // Check for mentions (case-insensitive)
  const landlordRegex = /@landlord\b/i;
  const tenantRegex = /@tenant\b/i;
  const adminRegex = /@admin\b/i;

  const hasLandlordTag = landlordRegex.test(content);
  const hasTenantTag = tenantRegex.test(content);
  const hasAdminTag = adminRegex.test(content);

  // Count how many tags exist
  const tagCount = [hasLandlordTag, hasTenantTag, hasAdminTag].filter(Boolean).length;

  // If multiple tags exist, take the first one that appears
  if (tagCount > 1) {
    const landlordIndex = hasLandlordTag ? content.toLowerCase().indexOf('@landlord') : Infinity;
    const tenantIndex = hasTenantTag ? content.toLowerCase().indexOf('@tenant') : Infinity;
    const adminIndex = hasAdminTag ? content.toLowerCase().indexOf('@admin') : Infinity;
    
    const minIndex = Math.min(landlordIndex, tenantIndex, adminIndex);
    
    if (minIndex === landlordIndex) {
      return { content, taggedUser: 'landlord', hasTag: true };
    } else if (minIndex === tenantIndex) {
      return { content, taggedUser: 'tenant', hasTag: true };
    } else {
      return { content, taggedUser: 'admin', hasTag: true };
    }
  }

  // Single tag
  if (hasLandlordTag) {
    return { content, taggedUser: 'landlord', hasTag: true };
  }

  if (hasTenantTag) {
    return { content, taggedUser: 'tenant', hasTag: true };
  }

  if (hasAdminTag) {
    return { content, taggedUser: 'admin', hasTag: true };
  }

  // No tags - visible to all
  return {
    content,
    taggedUser: null,
    hasTag: false
  };
}

/**
 * Format message content for display with highlighted tags
 * @param content - The message content
 * @returns Content with formatted tags
 */
export function formatMessageTags(content: string): string {
  if (!content) return '';
  
  return content
    .replace(/@landlord\b/gi, '<span class="mention">@landlord</span>')
    .replace(/@tenant\b/gi, '<span class="mention">@tenant</span>')
    .replace(/@admin\b/gi, '<span class="mention">@admin</span>');
}

/**
 * Check if user can see a message based on visibleTo and their role
 * @param message - The message object
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @returns boolean - Can user see this message?
 */
export function canUserSeeMessage(
  message: any,
  userId: string,
  userRole: 'landlord' | 'tenant' | 'admin'
): boolean {
  // If no visibleTo restriction, everyone can see it
  if (!message.visibleTo || message.visibleTo.length === 0) {
    return true;
  }

  // Admin can always see all messages
  if (userRole === 'admin') {
    return true;
  }

  // Check if user is in visibleTo list
  const visibleToIds = message.visibleTo.map((id: any) => 
    id.toString ? id.toString() : id
  );
  
  return visibleToIds.includes(userId.toString());
}

