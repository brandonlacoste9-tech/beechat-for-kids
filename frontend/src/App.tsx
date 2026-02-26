import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ParentDashboard } from './components/ParentDashboard';
import { ChildChat } from './components/ChildChat';

const SOCKET_URL = 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userType, setUserType] = useState<'none' | 'parent' | 'child'>('none');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [parentId, setParentId] = useState('');
  const [userId, setUserId] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('✅ Connected to BEEChat');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('child:registered', (data) => {
      setUserId(data.id);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const registerParent = () => {
    if (!socket || !username) return;
    
    socket.emit('parent:register', {
      username,
      email: `${username}@example.com`,
    });
    
    setUserId(socket.id);
    setUserType('parent');
  };

  const registerChild = () => {
    if (!socket || !username || !age || !parentId) return;
    
    socket.emit('child:register', {
      username,
      age: Number(age),
      parentId,
      restrictions: {
        timeLimit: 120,
        allowedHours: { start: 7, end: 21 },
        contentFilter: true,
      }
    });
    
    setUserType('child');
  };

  // Parent Dashboard
  if (userType === 'parent' && socket) {
    return <ParentDashboard socket={socket} parentId={userId} />;
  }

  // Child Chat
  if (userType === 'child' && socket && userId) {
    return (
      <ChildChat 
        socket={socket} 
        childId={userId} 
        username={username}
        parentId={parentId}
      />
    );
  }

  // Landing / Registration - Leather Theme
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F0E6] via-[#E8DCC8] to-[#C9B8A4] flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235C4A3D' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      
      <div className="leather-card stitched relative max-w-md w-full p-8 z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#E8B87D] to-[#D4A366] rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-[#F5F0E6]">
            🐝
          </div>
          <h1 className="text-3xl font-bold text-[#5C4A3D] mt-4">BEEChat</h1>
          <p className="text-[#8B7355] mt-2">
            Safe messaging for kids
          </p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-[#B8935F]">
            <span>🔒</span>
            <span>Parent-approved</span>
          </div>
        </div>

        {!isConnected && (
          <div className="bg-[#E8B87D]/20 border border-[#D4A366] text-[#8B7355] rounded-lg p-3 mb-4 text-center">
            ⏳ Connecting to server...
          </div>
        )}

        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setUserType('none')}
            className={`p-4 rounded-xl border-2 transition-all duration-200 stitched ${
              userType === 'none' 
                ? 'border-[#D4A574] bg-gradient-to-br from-[#E8B87D]/30 to-[#D4A366]/30' 
                : 'border-[#C9B8A4] hover:border-[#D4A574] bg-[#F5F0E6]/50'
            }`}
          >
            <span className="text-2xl">👨‍👩‍👧</span>
            <p className="font-medium mt-2 text-[#5C4A3D]">I'm a Parent</p>
          </button>
          <button
            onClick={() => setUserType('none')}
            className={`p-4 rounded-xl border-2 transition-all duration-200 stitched ${
              userType === 'none' 
                ? 'border-[#D4C4D4] bg-gradient-to-br from-[#D4C4D4]/30 to-[#B8A4B8]/30' 
                : 'border-[#C9B8A4] hover:border-[#D4C4D4] bg-[#F5F0E6]/50'
            }`}
          >
            <span className="text-2xl">👦👧</span>
            <p className="font-medium mt-2 text-[#5C4A3D]">I'm a Kid</p>
          </button>
        </div>

        {/* Registration Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5C4A3D] mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              className="input-leather"
            />
          </div>

          {/* Child-specific fields */}
          {(
            <>
              <div>
                <label className="block text-sm font-medium text-[#5C4A3D] mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="11-16"
                  min={11}
                  max={16}
                  className="input-leather"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5C4A3D] mb-1">
                  Parent ID (ask your parents)
                </label>
                <input
                  type="text"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  placeholder="e.g., parent_123"
                  className="input-leather"
                />
              </div>
              <button
                onClick={registerChild}
                disabled={!username || !age || !parentId || !isConnected}
                className="w-full btn-orange-leather disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🚀 Start Chatting!
              </button>
            </>
          ) }

          {/* Parent registration */}
          {(
            <button
              onClick={registerParent}
              disabled={!username || !isConnected}
              className="w-full btn-purple-leather disabled:opacity-50 disabled:cursor-not-allowed"
            >
              👨‍👩‍👧 Create Parent Account
            </button>
          )}
        </div>

        {/* Safety Info */}
        <div className="mt-6 ostrich-card stitched p-4 text-sm text-[#5C4A3D]">
          <p className="flex items-center gap-2 font-medium mb-2">
            <span>🛡️</span>
            Safety First!
          </p>
          <ul className="space-y-1 text-[#8B7355]">
            <li>• Parents approve all contacts</li>
            <li>• Automatic language filtering</li>
            <li>• Message history visible to parents</li>
            <li>• GPS location sharing</li>
          </ul>
        </div>

        {/* Decorative Stitching */}
        <div className="absolute -bottom-2 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-[#D4A574] to-transparent opacity-50" />
      </div>
    </div>
  );
}

export default App;
