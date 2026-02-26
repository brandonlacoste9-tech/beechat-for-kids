/**
 * 🗺️ Geofencing Module
 * Alert parents when child enters/leaves defined zones
 */

export interface GeofenceZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
  type: 'home' | 'school' | 'danger' | 'custom';
}

export interface GeofenceAlert {
  id: string;
  childId: string;
  zoneId: string;
  zoneName: string;
  type: 'entered' | 'left';
  timestamp: Date;
  location: { lat: number; lng: number };
}

// Store geofence zones per child
export const geofenceZones: Map<string, GeofenceZone[]> = new Map();

// Store geofence alerts
export const geofenceAlerts: Map<string, GeofenceAlert[]> = new Map();

// Calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Check if point is inside geofence
export function isInsideGeofence(
  lat: number, 
  lng: number, 
  zone: GeofenceZone
): boolean {
  const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
  return distance <= zone.radius;
}

// Check location against all geofences for a child
export function checkGeofences(
  childId: string,
  location: { lat: number; lng: number }
): GeofenceAlert[] {
  const zones = geofenceZones.get(childId) || [];
  const alerts: GeofenceAlert[] = [];
  const childAlerts = geofenceAlerts.get(childId) || [];
  
  zones.forEach(zone => {
    const currentlyInside = isInsideGeofence(location.lat, location.lng, zone);
    
    // Find last known state for this zone
    const lastAlert = childAlerts
      .filter(a => a.zoneId === zone.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    const wasInside = lastAlert ? lastAlert.type === 'entered' : false;
    
    // Check for transitions
    if (currentlyInside && !wasInside) {
      // Entered zone
      const alert: GeofenceAlert = {
        id: `alert_${Date.now()}_${Math.random()}`,
        childId,
        zoneId: zone.id,
        zoneName: zone.name,
        type: 'entered',
        timestamp: new Date(),
        location
      };
      alerts.push(alert);
      
      if (!geofenceAlerts.has(childId)) {
        geofenceAlerts.set(childId, []);
      }
      geofenceAlerts.get(childId)!.push(alert);
      
      console.log(`🗺️ GEOFENCE: Child ${childId} ENTERED ${zone.name}`);
    } else if (!currentlyInside && wasInside) {
      // Left zone
      const alert: GeofenceAlert = {
        id: `alert_${Date.now()}_${Math.random()}`,
        childId,
        zoneId: zone.id,
        zoneName: zone.name,
        type: 'left',
        timestamp: new Date(),
        location
      };
      alerts.push(alert);
      
      if (!geofenceAlerts.has(childId)) {
        geofenceAlerts.set(childId, []);
      }
      geofenceAlerts.get(childId)!.push(alert);
      
      console.log(`🗺️ GEOFENCE: Child ${childId} LEFT ${zone.name}`);
    }
  });
  
  return alerts;
}

// Add a geofence zone
export function addGeofenceZone(
  childId: string, 
  zone: Omit<GeofenceZone, 'id'>
): GeofenceZone {
  const newZone: GeofenceZone = {
    ...zone,
    id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  if (!geofenceZones.has(childId)) {
    geofenceZones.set(childId, []);
  }
  
  geofenceZones.get(childId)!.push(newZone);
  console.log(`🗺️ Added geofence: ${newZone.name} (${newZone.radius}m radius)`);
  
  return newZone;
}

// Remove a geofence zone
export function removeGeofenceZone(childId: string, zoneId: string): boolean {
  const zones = geofenceZones.get(childId);
  if (!zones) return false;
  
  const index = zones.findIndex(z => z.id === zoneId);
  if (index === -1) return false;
  
  zones.splice(index, 1);
  return true;
}

// Get all geofence alerts for a child
export function getGeofenceAlerts(
  childId: string, 
  limit: number = 50
): GeofenceAlert[] {
  const alerts = geofenceAlerts.get(childId) || [];
  return alerts
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

// Get current zone for a child
export function getCurrentZone(
  childId: string, 
  location: { lat: number; lng: number }
): GeofenceZone | null {
  const zones = geofenceZones.get(childId) || [];
  
  for (const zone of zones) {
    if (isInsideGeofence(location.lat, location.lng, zone)) {
      return zone;
    }
  }
  
  return null;
}

// Initialize default zones for a child (home, school)
export function initializeDefaultZones(
  childId: string,
  homeLocation?: { lat: number; lng: number },
  schoolLocation?: { lat: number; lng: number }
) {
  if (homeLocation) {
    addGeofenceZone(childId, {
      name: 'Home',
      lat: homeLocation.lat,
      lng: homeLocation.lng,
      radius: 200, // 200m radius
      type: 'home'
    });
  }
  
  if (schoolLocation) {
    addGeofenceZone(childId, {
      name: 'School',
      lat: schoolLocation.lat,
      lng: schoolLocation.lng,
      radius: 300, // 300m radius
      type: 'school'
    });
  }
}
