import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { MessageViewer } from './MessageViewer';
import { LocationTracker } from './LocationTracker';

interface Child {
  id: string;
  username: string;
  age: number;
  status: 'online' | 'offline';
  location?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
}

interface SafetyLog {
  id: string;
  childId: string;
  childUsername: string;
  content: string;
  flags: string[];
  severity: string;
  timestamp: Date;
  chatWith: string;
}

interface ParentDashboardProps {
  socket: Socket;
  parentId: string;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ socket, parentId }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [safetyLogs, setSafetyLogs] = useState<SafetyLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'safety' | 'location' | 'messages'>('overview');
  const [selectedChildForMessages, setSelectedChildForMessages] = useState<string | null>(null);
  const [selectedChildForLocation, setSelectedChildForLocation] = useState<string | null>(null);

  useEffect(() => {
    // Fetch children on mount
    fetch(`/api/parent/${parentId}/children`)
      .then(res => res.json())
      .then(data => setChildren(data));

    // Listen for safety logs
    socket.on('parent:safetyLogs', (data) => {
      setSafetyLogs(data.logs);
    });

    return () => {
      socket.off('parent:locationData');
      socket.off('parent:safetyLogs');
    };
  }, [socket, parentId]);

  const refreshLocation = (childId: string) => {
    socket.emit('parent:getLocation', childId);
  };

  const viewSafetyLogs = (childId: string) => {
    setSelectedChild(childId);
    setActiveTab('safety');
    socket.emit('parent:getSafetyLogs', childId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E6] via-[#E8DCC8] to-[#C9B8A4]">
      {/* Header - Leather Style */}
      <div className="header-leather text-[#FDF8F3] p-4 shadow-lg border-b-4 border-[#B8935F]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#E8B87D] to-[#D4A366] rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-[#FDF8F3]">
              🐝
            </div>
            <div>
              <h1 className="text-xl font-bold">Parent Dashboard</h1>
              <p className="text-[#FDF8F3]/80 text-sm">BEEChat - Safe Messaging</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 stitched ${
                activeTab === 'overview' 
                  ? 'bg-gradient-to-br from-[#E8B87D] to-[#D4A366] text-[#5C4A3D]' 
                  : 'bg-[#F5F0E6]/20 hover:bg-[#F5F0E6]/30 text-[#FDF8F3]'
              }`}
            >
              👨‍👩‍👧 Children
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 stitched ${
                activeTab === 'messages' 
                  ? 'bg-gradient-to-br from-[#D4C4D4] to-[#B8A4B8] text-[#5C4A3D]' 
                  : 'bg-[#F5F0E6]/20 hover:bg-[#F5F0E6]/30 text-[#FDF8F3]'
              }`}
            >
              💬 Messages
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 stitched ${
                activeTab === 'location' 
                  ? 'bg-gradient-to-br from-[#C9B8A4] to-[#A8957E] text-[#5C4A3D]' 
                  : 'bg-[#F5F0E6]/20 hover:bg-[#F5F0E6]/30 text-[#FDF8F3]'
              }`}
            >
              📍 Location
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 stitched ${
                activeTab === 'safety' 
                  ? 'bg-gradient-to-br from-[#E8B87D] to-[#D97A3E] text-[#FDF8F3]' 
                  : 'bg-[#F5F0E6]/20 hover:bg-[#F5F0E6]/30 text-[#FDF8F3]'
              }`}
            >
              🛡️ Safety
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-6">
            <h2 className="text-2xl font-bold text-[#5C4A3D]">My Children</h2>
            
            {children.length === 0 ? (
              <div className="leather-card stitched p-8 text-center">
                <span className="text-6xl">👶</span>
                <p className="mt-4 text-[#8B7355]">No children registered yet</p>
                <p className="text-sm text-[#C9B8A4]">
                  Add a child from the mobile app
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <div key={child.id} className="leather-card stitched p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#D4C4D4] to-[#B8A4B8] rounded-full flex items-center justify-center text-2xl shadow-md border-2 border-[#FDF8F3]">
                          👤
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-[#5C4A3D]">{child.username}</h3>
                          <p className="text-[#8B7355] text-sm">{child.age} years old</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.status === 'online' ? (
                          <span className="status-online" />
                        ) : (
                          <span className="status-offline" />
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          child.status === 'online' 
                            ? 'bg-gradient-to-r from-[#90EE90] to-[#4CAF50] text-white' 
                            : 'bg-gradient-to-r from-[#C9B8A4] to-[#A8957E] text-[#5C4A3D]'
                        }`}>
                          {child.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Location Preview */}
                    {child.location && (
                      <div className="ostrich-card rounded-lg p-3 mb-4 stitched-gold">
                        <p className="text-sm text-[#5C4A3D] flex items-center gap-2">
                          <span>📍</span>
                          <span className="font-mono">
                            {child.location.lat.toFixed(4)}, {child.location.lng.toFixed(4)}
                          </span>
                        </p>
                        <p className="text-xs text-[#8B7355] mt-1">
                          Updated: {new Date(child.location.timestamp).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => refreshLocation(child.id)}
                        className="flex-1 btn-cream text-sm"
                      >
                        📍 Refresh Location
                      </button>
                      <button
                        onClick={() => viewSafetyLogs(child.id)}
                        className="flex-1 btn-orange-leather text-sm"
                      >
                        🛡️ View Alerts
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="grid gap-6">
            <h2 className="text-2xl font-bold text-[#5C4A3D]">Message Viewer</h2>
            
            {selectedChildForMessages ? (
              <>
                <button
                  onClick={() => setSelectedChildForMessages(null)}
                  className="text-[#D4A574] hover:text-[#B8935F] font-medium text-left flex items-center gap-2"
                >
                  ← Back to children
                </button>
                <MessageViewer
                  parentId={parentId}
                  childId={selectedChildForMessages}
                  childName={children.find(c => c.id === selectedChildForMessages)?.username || 'Child'}
                />
              </>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {children.length === 0 ? (
                  <p className="text-[#8B7355]">No children registered</p>
                ) : (
                  children.map((child) => (
                    <div key={child.id} className="leather-card stitched p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#D4C4D4] to-[#B8A4B8] rounded-full flex items-center justify-center text-2xl shadow-md border-2 border-[#FDF8F3]">
                          👤
                        </div>
                        <div>
                          <h3 className="font-bold text-[#5C4A3D]">{child.username}</h3>
                          <p className="text-[#8B7355] text-sm">{child.age} years old</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedChildForMessages(child.id)}
                        className="w-full btn-purple-leather"
                      >
                        💬 View Messages
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <div className="grid gap-6">
            <h2 className="text-2xl font-bold text-[#5C4A3D]">Location Tracker</h2>
            
            {selectedChildForLocation ? (
              <>
                <button
                  onClick={() => setSelectedChildForLocation(null)}
                  className="text-[#D4A574] hover:text-[#B8935F] font-medium text-left flex items-center gap-2"
                >
                  ← Back to children
                </button>
                <LocationTracker
                  socket={socket}
                  parentId={parentId}
                  childId={selectedChildForLocation}
                  childName={children.find(c => c.id === selectedChildForLocation)?.username || 'Child'}
                />
              </>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {children.length === 0 ? (
                  <p className="text-[#8B7355]">No children registered</p>
                ) : (
                  children.map((child) => (
                    <div key={child.id} className="leather-card stitched p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#C9B8A4] to-[#A8957E] rounded-full flex items-center justify-center text-2xl shadow-md border-2 border-[#FDF8F3]">
                          📍
                        </div>
                        <div>
                          <h3 className="font-bold text-[#5C4A3D]">{child.username}</h3>
                          <p className="text-[#8B7355] text-sm">{child.age} years old</p>
                        </div>
                      </div>
                      
                      {/* Quick Location Preview */}
                      {child.location && (
                        <div className="ostrich-card rounded-lg p-3 mb-4 stitched-gold">
                          <p className="text-sm text-[#5C4A3D] font-mono">
                            {child.location.lat.toFixed(4)}, {child.location.lng.toFixed(4)}
                          </p>
                          <p className="text-xs text-[#8B7355] mt-1">
                            Last seen: {new Date(child.location.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setSelectedChildForLocation(child.id)}
                        className="w-full btn-leather"
                      >
                        📍 Track Location
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Safety Tab */}
        {activeTab === 'safety' && (
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#5C4A3D]">Safety Log</h2>
              {selectedChild && (
                <button
                  onClick={() => setSelectedChild(null)}
                  className="text-[#D4A574] hover:text-[#B8935F] font-medium"
                >
                  View all children
                </button>
              )}
            </div>

            {safetyLogs.length === 0 ? (
              <div className="leather-card stitched p-8 text-center">
                <span className="text-6xl">✅</span>
                <p className="mt-4 text-[#5C4A3D] font-medium">
                  No safety alerts!
                </p>
                <p className="text-[#8B7355] text-sm">
                  Your child is using the app appropriately.
                </p>
              </div>
            ) : (
              <div className="leather-card stitched overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#E8DCC8] to-[#D4A574]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#5C4A3D]">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#5C4A3D]">Child</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#5C4A3D]">Content</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#5C4A3D]">Issue</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[#5C4A3D]">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C9B8A4]/30">
                    {safetyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#E8DCC8]/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-[#8B7355]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[#5C4A3D]">{log.childUsername}</td>
                        <td className="px-4 py-3 text-sm text-[#5C4A3D] max-w-xs truncate">
                          {log.content}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.flags.map((flag, i) => (
                            <span key={i} className="inline-block bg-gradient-to-r from-[#E8B87D] to-[#D97A3E] text-[#FDF8F3] px-2 py-1 rounded text-xs mr-1">
                              {flag}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            log.severity === 'high' 
                              ? 'bg-gradient-to-r from-[#E8B87D] to-[#D97A3E] text-[#FDF8F3]' 
                              : 'bg-gradient-to-r from-[#E8B87D] to-[#D4A366] text-[#5C4A3D]'
                          }`}>
                            {log.severity === 'high' ? '🔴 High' : '🟡 Medium'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
