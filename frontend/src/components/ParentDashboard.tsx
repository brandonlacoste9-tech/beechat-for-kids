import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { MessageViewer } from './MessageViewer';

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
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'safety' | 'location' | 'messages'>('overview');
  const [selectedChildForMessages, setSelectedChildForMessages] = useState<string | null>(null);

  useEffect(() => {
    // Fetch children on mount
    fetch(`/api/parent/${parentId}/children`)
      .then(res => res.json())
      .then(data => setChildren(data));

    // Listen for location updates
    socket.on('parent:locationData', (data) => {
      setLocationHistory(data.history);
    });

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-800 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐝</span>
            <div>
              <h1 className="text-xl font-bold">Tableau de bord parent</h1>
              <p className="text-green-200 text-sm">BEEChat - Messagerie sécurisée</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'overview' ? 'bg-green-600' : 'hover:bg-green-700'
              }`}
            >
              👨‍👩‍👧 My Children
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'messages' ? 'bg-blue-600' : 'hover:bg-green-700'
              }`}
            >
              💬 View Messages
            </button>
            <button
              onClick={() => setActiveTab('safety')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'safety' ? 'bg-red-600' : 'hover:bg-green-700'
              }`}
            >
              🛡️ Safety Alerts
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid gap-6">
            <h2 className="text-2xl font-bold text-gray-800">Mes enfants</h2>
            
            {children.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <span className="text-6xl">👶</span>
                <p className="mt-4 text-gray-600">Aucun enfant enregistré</p>
                <p className="text-sm text-gray-400">
                  Ajoutez un enfant depuis l'application mobile
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <div key={child.id} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                          👤
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{child.username}</h3>
                          <p className="text-gray-500 text-sm">{child.age} ans</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        child.status === 'online' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {child.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}
                      </span>
                    </div>

                    {/* Location */}
                    {child.location && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-blue-800 flex items-center gap-2">
                          📍 Position actuelle:
                          <span className="font-mono">
                            {child.location.lat.toFixed(4)}, {child.location.lng.toFixed(4)}
                          </span>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Mis à jour: {new Date(child.location.timestamp).toLocaleString('fr-CA')}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => refreshLocation(child.id)}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                      >
                        📍 Actualiser position
                      </button>
                      <button
                        onClick={() => viewSafetyLogs(child.id)}
                        className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 transition"
                      >
                        🛡️ Voir alertes
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
            <h2 className="text-2xl font-bold text-gray-800">
              💬 Message Viewer
            </h2>
            
            {selectedChildForMessages ? (
              <>
                <button
                  onClick={() => setSelectedChildForMessages(null)}
                  className="text-blue-600 hover:underline text-left"
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
                  <p className="text-gray-500">No children registered</p>
                ) : (
                  children.map((child) => (
                    <div key={child.id} className="bg-white rounded-xl shadow-md p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                          👤
                        </div>
                        <div>
                          <h3 className="font-bold">{child.username}</h3>
                          <p className="text-gray-500 text-sm">{child.age} years old</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedChildForMessages(child.id)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
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

        {/* Safety Tab */}
        {activeTab === 'safety' && (
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                🛡️ Journal de sécurité
              </h2>
              {selectedChild && (
                <button
                  onClick={() => setSelectedChild(null)}
                  className="text-blue-600 hover:underline"
                >
                  Voir tous les enfants
                </button>
              )}
            </div>

            {safetyLogs.length === 0 ? (
              <div className="bg-green-50 rounded-xl p-8 text-center">
                <span className="text-6xl">✅</span>
                <p className="mt-4 text-green-800 font-medium">
                  Aucune alerte de sécurité!
                </p>
                <p className="text-green-600 text-sm">
                  Votre enfant utilise l'application de manière appropriée.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Enfant</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Contenu</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Problème</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Gravité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {safetyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(log.timestamp).toLocaleString('fr-CA')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{log.childUsername}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                          {log.content}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.flags.map((flag, i) => (
                            <span key={i} className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded text-xs mr-1">
                              {flag}
                            </span>
                          ))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            log.severity === 'high' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {log.severity === 'high' ? '🔴 Élevée' : '🟡 Moyenne'}
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
