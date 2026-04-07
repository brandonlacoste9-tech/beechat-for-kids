import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: 'text' | 'voice';
}

interface ChildChatProps {
  socket: Socket;
  childId: string;
  username: string;
  parentId: string;
}

export const ChildChat: React.FC<ChildChatProps> = ({ socket, childId, username }: ChildChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [beeMessage, setBeeMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Request location tracking
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          socket.emit('location:update', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => console.log('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [socket]);

  useEffect(() => {
    socket.on('message:received', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('message:sent', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('message:blocked', (data) => {
      setWarning(data.beeMessage);
      setTimeout(() => setWarning(null), 5000);
    });

    socket.on('message:warning', (data) => {
      setBeeMessage(data.beeMessage);
      setTimeout(() => setBeeMessage(null), 3000);
    });

    return () => {
      socket.off('message:received');
      socket.off('message:sent');
      socket.off('message:blocked');
      socket.off('message:warning');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    socket.emit('message:send', {
      content: inputValue,
      recipientId: 'test_recipient',
      type: 'text',
    });

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#F5F0E6] via-[#E8DCC8] to-[#C9B8A4]">
      {/* Header - Leather Style */}
      <div className="header-leather text-[#FDF8F3] p-4 shadow-lg border-b-4 border-[#B8935F]">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E8B87D] to-[#D4A366] rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-[#FDF8F3]">
              🐝
            </div>
            <div>
              <h1 className="font-bold text-xl">BEEChat</h1>
              <p className="text-xs text-[#FDF8F3]/80">Safe messaging • {username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm bg-[#F5F0E6]/20 px-3 py-1 rounded-full">
            <span className="w-2 h-2 bg-[#90EE90] rounded-full animate-pulse"></span>
            <span className="text-[#FDF8F3]/90">Parents can see your messages</span>
          </div>
        </div>
      </div>

      {/* BEE Warning */}
      {beeMessage && (
        <div className="bg-gradient-to-r from-[#E8B87D]/30 to-[#D4A366]/30 border-l-4 border-[#D4A366] p-4 animate-pulse">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <span className="text-3xl">🐝</span>
            <div>
              <p className="font-bold text-[#8B7355]">BEE says:</p>
              <p className="text-[#5C4A3D]">{beeMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Block Warning */}
      {warning && (
        <div className="bg-gradient-to-r from-[#E8B87D]/40 to-[#D97A3E]/40 border-l-4 border-[#D97A3E] p-4">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <span className="text-3xl">🚫</span>
            <div>
              <p className="font-bold text-[#5C4A3D]">Message Blocked</p>
              <p className="text-[#8B7355]">{warning}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#E8B87D] to-[#D4A366] rounded-full flex items-center justify-center text-4xl shadow-lg mb-4">
                👋
              </div>
              <p className="text-[#5C4A3D]">
                Welcome to BEEChat, {username}!
              </p>
              <p className="text-sm text-[#8B7355] mt-2">
                Send a message to your approved friends
              </p>
              <div className="mt-6 ostrich-card rounded-xl p-4 inline-block stitched">
                <p className="text-sm text-[#5C4A3D] flex items-center gap-2">
                  <span className="text-xl">🐝</span>
                  BEE is watching! Use kind words.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isMe = msg.senderId === childId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 ${
                    isMe ? 'message-sent' : 'message-received'
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs font-medium text-[#8B7355] mb-1">
                      {msg.senderName}
                    </p>
                  )}
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-[#5C4A3D]/70' : 'text-[#5C4A3D]/50'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gradient-to-r from-[#E8DCC8] to-[#C9B8A4] border-t-2 border-[#B8935F] p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a kind message..."
            className="input-leather flex-1"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className="btn-orange-leather disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-center text-xs text-[#8B7355] mt-2">
          🛡️ BEE monitors messages for your safety
        </p>
      </div>
    </div>
  );
};

export default ChildChat;
