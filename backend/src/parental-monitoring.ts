/**
 * 👨‍👩‍👧 Parental Monitoring Module
 * Parents can view kids' messages (optional setting)
 */

import { safetyLogs } from "./safety";

// Message storage for parent review
export interface StoredMessage {
  id: string;
  childId: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: Date;
  type: 'sent' | 'received';
  safetyFlags?: string[];
}

// Store all messages (encrypted at rest in production)
export const messageHistory: Map<string, StoredMessage[]> = new Map();

// Parent viewing preferences
export interface ParentSettings {
  parentId: string;
  viewMessages: boolean;      // Can see message content
  viewMetadataOnly: boolean;  // Only who/when, not content
  realTimeAlerts: boolean;    // Get notified of flagged content
  locationTracking: boolean;  // GPS tracking enabled
  timeLimits: {
    enabled: boolean;
    dailyMinutes: number;
    allowedHours: { start: number; end: number };
  };
}

export const parentSettings: Map<string, ParentSettings> = new Map();

// Store message for parent review
export function storeMessageForParent(message: StoredMessage) {
  if (!messageHistory.has(message.childId)) {
    messageHistory.set(message.childId, []);
  }
  
  const history = messageHistory.get(message.childId)!;
  history.push(message);
  
  // Keep last 1000 messages per child (30 days worth)
  if (history.length > 1000) {
    history.shift();
  }
}

// Get messages for parent dashboard
export function getChildMessages(
  parentId: string, 
  childId: string,
  options?: {
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    searchQuery?: string;
  }
): StoredMessage[] | null {
  // Verify parent has access to this child
  const settings = parentSettings.get(parentId);
  if (!settings || !settings.viewMessages) {
    return null; // Parent doesn't have permission
  }
  
  let messages = messageHistory.get(childId) || [];
  
  // Filter by date range
  if (options?.startDate) {
    messages = messages.filter(m => m.timestamp >= options.startDate!);
  }
  if (options?.endDate) {
    messages = messages.filter(m => m.timestamp <= options.endDate!);
  }
  
  // Filter by search query
  if (options?.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    messages = messages.filter(m => 
      m.content.toLowerCase().includes(query) ||
      m.sender.toLowerCase().includes(query)
    );
  }
  
  // Sort by date (newest first)
  messages = messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  
  // Apply limit
  if (options?.limit) {
    messages = messages.slice(0, options.limit);
  }
  
  return messages;
}

// Get conversation summary (who they talk to most)
export function getConversationSummary(parentId: string, childId: string) {
  const settings = parentSettings.get(parentId);
  if (!settings) return null;
  
  const messages = messageHistory.get(childId) || [];
  
  const contacts = new Map<string, {
    contactName: string;
    messageCount: number;
    lastMessage: Date;
    flaggedCount: number;
  }>();
  
  messages.forEach(msg => {
    const contact = msg.type === 'sent' ? msg.recipient : msg.sender;
    
    if (!contacts.has(contact)) {
      contacts.set(contact, {
        contactName: contact,
        messageCount: 0,
        lastMessage: msg.timestamp,
        flaggedCount: 0
      });
    }
    
    const data = contacts.get(contact)!;
    data.messageCount++;
    if (msg.safetyFlags && msg.safetyFlags.length > 0) {
      data.flaggedCount++;
    }
    if (msg.timestamp > data.lastMessage) {
      data.lastMessage = msg.timestamp;
    }
  });
  
  return Array.from(contacts.values())
    .sort((a, b) => b.messageCount - a.messageCount);
}

// Export conversation (for parent records)
export function exportConversation(
  parentId: string,
  childId: string,
  contactId: string
): string | null {
  const settings = parentSettings.get(parentId);
  if (!settings || !settings.viewMessages) return null;
  
  const messages = messageHistory.get(childId) || [];
  const filtered = messages.filter(m => 
    m.sender === contactId || m.recipient === contactId
  );
  
  // Generate text export
  let export_text = `BEEChat Message Export\n`;
  export_text += `Child: ${childId}\n`;
  export_text += `Contact: ${contactId}\n`;
  export_text += `Exported: ${new Date().toISOString()}\n`;
  export_text += `----------------------------------------\n\n`;
  
  filtered.forEach(msg => {
    export_text += `[${msg.timestamp.toLocaleString()}] `;
    export_text += `${msg.sender} → ${msg.recipient}: `;
    export_text += `${msg.content}\n`;
    if (msg.safetyFlags?.length) {
      export_text += `  ⚠️ Flags: ${msg.safetyFlags.join(', ')}\n`;
    }
  });
  
  return export_text;
}

// Toggle parent viewing permissions
export function updateParentSettings(
  parentId: string, 
  updates: Partial<ParentSettings>
): boolean {
  const current = parentSettings.get(parentId);
  if (!current) return false;
  
  parentSettings.set(parentId, { ...current, ...updates });
  return true;
}

// Initialize default settings for new parent
export function initializeParentSettings(parentId: string): ParentSettings {
  const defaults: ParentSettings = {
    parentId,
    viewMessages: true,        // Default: parents CAN see messages
    viewMetadataOnly: false,   // Default: full content visible
    realTimeAlerts: true,      // Default: alerts on
    locationTracking: true,    // Default: GPS on
    timeLimits: {
      enabled: true,
      dailyMinutes: 120,       // 2 hours per day
      allowedHours: { start: 7, end: 21 } // 7AM - 9PM
    }
  };
  
  parentSettings.set(parentId, defaults);
  return defaults;
}
