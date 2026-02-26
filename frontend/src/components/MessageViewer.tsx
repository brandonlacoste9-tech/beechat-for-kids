import React, { useState, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: Date;
  type: 'sent' | 'received';
  safetyFlags?: string[];
}

interface Contact {
  contactName: string;
  messageCount: number;
  lastMessage: Date;
  flaggedCount: number;
}

interface MessageViewerProps {
  parentId: string;
  childId: string;
  childName: string;
}

export const MessageViewer: React.FC<MessageViewerProps> = ({ parentId, childId, childName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetchMessages();
    fetchContacts();
    fetchSettings();
  }, [childId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `/api/parent/${parentId}/child/${childId}/messages?limit=100&search=${searchQuery}`
      );
      const data = await res.json();
      setMessages(data.messages || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`/api/parent/${parentId}/child/${childId}/contacts`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/parent/${parentId}/settings`);
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const toggleMessageViewing = async () => {
    try {
      await fetch(`/api/parent/${parentId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewMessages: !settings?.viewMessages })
      });
      fetchSettings();
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const filteredMessages = selectedContact
    ? messages.filter(m => m.sender === selectedContact || m.recipient === selectedContact)
    : messages;

  if (loading) return <div className="p-8 text-center">Loading messages...</div>;

  if (!settings?.viewMessages) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <span className="text-4xl">👁️</span>
        <h3 className="font-bold text-yellow-800 mt-2">Message Viewing is Off</h3>
        <p className="text-yellow-600 text-sm mt-1">
          You have disabled message viewing for this child.
        </p>
        <button
          onClick={toggleMessageViewing}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
          Turn On Message Viewing
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">{childName}'s Messages</h3>
          <p className="text-sm text-gray-500">
            {messages.length} messages • Last 30 days
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleMessageViewing}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3">
        {/* Contacts Sidebar */}
        <div className="border-r bg-gray-50">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchMessages();
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            <button
              onClick={() => setSelectedContact(null)}
              className={`w-full p-3 text-left hover:bg-gray-100 ${
                !selectedContact ? 'bg-blue-50 border-r-2 border-blue-500' : ''
              }`}
            >
              <p className="font-medium">All Messages</p>
              <p className="text-xs text-gray-500">{messages.length} total</p>
            </button>
            {contacts.map((contact) => (
              <button
                key={contact.contactName}
                onClick={() => setSelectedContact(contact.contactName)}
                className={`w-full p-3 text-left hover:bg-gray-100 border-t ${
                  selectedContact === contact.contactName ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{contact.contactName}</span>
                  {contact.flaggedCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                      {contact.flaggedCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {contact.messageCount} messages • Last: {new Date(contact.lastMessage).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 max-h-96 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No messages found
            </div>
          ) : (
            <div className="divide-y">
              {filteredMessages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{msg.sender}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{msg.recipient}</span>
                        {msg.safetyFlags && msg.safetyFlags.length > 0 && (
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                            ⚠️ Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 mt-1">{msg.content}</p>
                      {msg.safetyFlags && msg.safetyFlags.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Flags: {msg.safetyFlags.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-green-50 p-3 text-xs text-green-700 flex items-center gap-2">
        <span>🔒</span>
        <span>You are viewing your child's messages because message viewing is enabled in your settings.</span>
      </div>
    </div>
  );
};

export default MessageViewer;
