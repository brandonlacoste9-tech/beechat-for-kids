import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface LocationUpdate {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number;
}

interface LocationTrackerProps {
  socket: Socket;
  parentId: string;
  childId: string;
  childName: string;
}

export const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  socket, 
  childId, 
  childName,
}: LocationTrackerProps) => {
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [geofenceAlerts, setGeofenceAlerts] = useState<string[]>([]);

  useEffect(() => {
    // Request initial location
    refreshLocation();

    // Listen for location updates
    socket.on('parent:locationData', (data) => {
      setCurrentLocation(data.current);
      setLocationHistory(data.history || []);
      setLoading(false);
      
      // Check geofence (simple example - school zone)
      checkGeofence(data.current);
    });

    // Auto refresh every 30 seconds if enabled
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(refreshLocation, 30000);
    }

    return () => {
      socket.off('parent:locationData');
      if (interval !== undefined) clearInterval(interval);
    };
  }, [socket, childId, autoRefresh]);

  const refreshLocation = () => {
    setLoading(true);
    socket.emit('parent:getLocation', childId);
  };

  const checkGeofence = (location: LocationUpdate | null) => {
    if (!location) return;
    
    // Example geofence check - Montreal city center
    const MONTREAL_CENTER = { lat: 45.5017, lng: -73.5673 };
    const distance = calculateDistance(
      location.lat, 
      location.lng, 
      MONTREAL_CENTER.lat, 
      MONTREAL_CENTER.lng
    );
    
    // If more than 50km from center, alert
    if (distance > 50) {
      setGeofenceAlerts(prev => [...prev, `Child is ${distance.toFixed(1)}km from home area`]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  if (loading && !currentLocation) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <div className="animate-spin text-4xl mb-4">📍</div>
        <p className="text-gray-600">Getting location...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">📍 {childName}'s Location</h3>
            <p className="text-blue-200 text-sm">
              Real-time GPS tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (30s)
            </label>
            <button
              onClick={refreshLocation}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-sm transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Current Location */}
        <div className="p-6 border-r">
          <h4 className="font-semibold text-gray-700 mb-4">Current Position</h4>
          
          {currentLocation ? (
            <div className="space-y-4">
              {/* Map Link */}
              <a
                href={getGoogleMapsUrl(currentLocation.lat, currentLocation.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-100 rounded-lg p-4 hover:bg-gray-200 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🗺️</span>
                  <div>
                    <p className="font-medium">View on Google Maps</p>
                    <p className="text-sm text-gray-500">
                      {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </a>

              {/* Coordinates */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Latitude</p>
                    <p className="font-mono font-medium">{currentLocation.lat.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Longitude</p>
                    <p className="font-mono font-medium">{currentLocation.lng.toFixed(6)}</p>
                  </div>
                </div>
              </div>

              {/* Accuracy & Time */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  📡 Accuracy: ±{currentLocation.accuracy?.toFixed(0) || '?'}m
                </span>
                <span>
                  🕐 Updated: {formatTime(currentLocation.timestamp)}
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-medium">Tracking Active</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <span className="text-4xl">📍</span>
              <p className="mt-2">No location data available</p>
              <p className="text-sm">Make sure your child has location enabled</p>
            </div>
          )}

          {/* Geofence Alerts */}
          {geofenceAlerts.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-800 flex items-center gap-2">
                ⚠️ Geofence Alerts
              </h5>
              <ul className="mt-2 space-y-1">
                {geofenceAlerts.map((alert, i) => (
                  <li key={i} className="text-sm text-yellow-700">{alert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Location History */}
        <div className="p-6">
          <h4 className="font-semibold text-gray-700 mb-4">Location History (24h)</h4>
          
          {locationHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <span className="text-4xl">📋</span>
              <p className="mt-2">No history available</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {locationHistory.map((loc, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">#{locationHistory.length - index}</span>
                    <div>
                      <p className="font-mono text-sm">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </p>
                      <p className="text-xs text-gray-500">
                        ±{loc.accuracy?.toFixed(0) || '?'}m accuracy
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatTime(loc.timestamp)}</p>
                    <a
                      href={getGoogleMapsUrl(loc.lat, loc.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Map
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{locationHistory.length}</p>
              <p className="text-xs text-gray-600">Updates</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {currentLocation ? '🟢' : '⚫'}
              </p>
              <p className="text-xs text-gray-600">Status</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round((locationHistory.filter(l => l.accuracy && l.accuracy < 50).length / Math.max(locationHistory.length, 1)) * 100)}%
              </p>
              <p className="text-xs text-gray-600">Precision</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 p-3 text-xs text-gray-600 flex items-center justify-between">
        <span>🔒 Location data is encrypted and only visible to you</span>
        <span>Last updated: {currentLocation ? formatTime(currentLocation.timestamp) : 'Never'}</span>
      </div>
    </div>
  );
};

export default LocationTracker;
