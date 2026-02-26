/**
 * 🗄️ BEEChat Database Module
 * Neon PostgreSQL (serverless) - Optimized for Render
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';

// Initialize Neon client
let sql: NeonQueryFunction<any, any>;

try {
  sql = neon(DATABASE_URL);
  console.log('✅ Neon database connected');
} catch (error) {
  console.error('❌ Failed to connect to Neon:', error);
  // Create dummy sql function for development without DB
  sql = async () => [] as any;
}

// Types
export interface User {
  id: string;
  socket_id?: string;
  username: string;
  email?: string;
  type: 'parent' | 'child';
  parent_id?: string;
  age?: number;
  status: 'online' | 'offline';
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  type: 'text' | 'voice';
  safety_flags?: string[];
  created_at: string;
}

export interface Location {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  created_at: string;
}

export interface SafetyLog {
  id: string;
  child_id: string;
  content?: string;
  flags: string[];
  severity: 'low' | 'medium' | 'high';
  chat_with?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  child_id: string;
  contact_name: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

// Initialize database tables (run once)
export async function initDatabase(): Promise<void> {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        socket_id TEXT UNIQUE,
        username TEXT NOT NULL,
        email TEXT,
        type TEXT NOT NULL CHECK (type IN ('parent', 'child')),
        parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
        age INTEGER CHECK (age >= 11 AND age <= 16),
        status TEXT DEFAULT 'offline',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice')),
        safety_flags TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Location tracking
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        lat DECIMAL(10, 8) NOT NULL,
        lng DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(10, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Safety logs
    await sql`
      CREATE TABLE IF NOT EXISTS safety_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        flags TEXT[] NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
        chat_with TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Contact approval system
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        child_id UUID REFERENCES users(id) ON DELETE CASCADE,
        contact_name TEXT NOT NULL,
        approved BOOLEAN DEFAULT FALSE,
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(child_id, contact_name)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_type ON users(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_safety_logs_child_id ON safety_logs(child_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_child_id ON contacts(child_id)`;

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
  }
}

// Database operations
export async function createUser(user: Omit<User, 'id' | 'created_at' | 'status'>): Promise<User | null> {
  try {
    const [result] = await sql`
      INSERT INTO users (socket_id, username, email, type, parent_id, age)
      VALUES (${user.socket_id}, ${user.username}, ${user.email}, ${user.type}, ${user.parent_id}, ${user.age})
      RETURNING *
    `;
    return result as User;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const [result] = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result as User || null;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getUserBySocketId(socketId: string): Promise<User | null> {
  try {
    const [result] = await sql`SELECT * FROM users WHERE socket_id = ${socketId}`;
    return result as User || null;
  } catch (error) {
    console.error('Error fetching user by socket:', error);
    return null;
  }
}

export async function updateUserSocket(userId: string, socketId: string): Promise<void> {
  try {
    await sql`UPDATE users SET socket_id = ${socketId} WHERE id = ${userId}`;
  } catch (error) {
    console.error('Error updating socket:', error);
  }
}

export async function updateUserStatus(userId: string, status: 'online' | 'offline'): Promise<void> {
  try {
    await sql`UPDATE users SET status = ${status} WHERE id = ${userId}`;
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

export async function getChildrenByParent(parentId: string): Promise<User[]> {
  try {
    const result = await sql`SELECT * FROM users WHERE type = 'child' AND parent_id = ${parentId}`;
    return result as User[];
  } catch (error) {
    console.error('Error fetching children:', error);
    return [];
  }
}

export async function storeMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
  try {
    const safetyFlagsJson = message.safety_flags ? JSON.stringify(message.safety_flags) : null;
    const [result] = await sql`
      INSERT INTO messages (sender_id, recipient_id, content, type, safety_flags)
      VALUES (${message.sender_id}, ${message.recipient_id}, ${message.content}, ${message.type}, ${safetyFlagsJson}::jsonb)
      RETURNING *
    `;
    return result as Message;
  } catch (error) {
    console.error('Error storing message:', error);
    return null;
  }
}

export async function getMessagesForParent(
  childId: string,
  limit: number = 50
): Promise<Message[]> {
  try {
    const result = await sql`
      SELECT * FROM messages 
      WHERE sender_id = ${childId} OR recipient_id = ${childId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return result as Message[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function storeLocation(location: Omit<Location, 'id' | 'created_at'>): Promise<Location | null> {
  try {
    const [result] = await sql`
      INSERT INTO locations (user_id, lat, lng, accuracy)
      VALUES (${location.user_id}, ${location.lat}, ${location.lng}, ${location.accuracy})
      RETURNING *
    `;
    return result as Location;
  } catch (error) {
    console.error('Error storing location:', error);
    return null;
  }
}

export async function getLatestLocation(userId: string): Promise<Location | null> {
  try {
    const [result] = await sql`
      SELECT * FROM locations 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return result as Location || null;
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
}

export async function getLocationHistory(
  userId: string,
  hours: number = 24
): Promise<Location[]> {
  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const result = await sql`
      SELECT * FROM locations 
      WHERE user_id = ${userId} AND created_at >= ${cutoff}
      ORDER BY created_at DESC
    `;
    return result as Location[];
  } catch (error) {
    console.error('Error fetching location history:', error);
    return [];
  }
}

export async function logSafetyEvent(log: Omit<SafetyLog, 'id' | 'created_at'>): Promise<SafetyLog | null> {
  try {
    const flagsJson = JSON.stringify(log.flags);
    const [result] = await sql`
      INSERT INTO safety_logs (child_id, content, flags, severity, chat_with)
      VALUES (${log.child_id}, ${log.content}, ${flagsJson}::jsonb, ${log.severity}, ${log.chat_with})
      RETURNING *
    `;
    return result as SafetyLog;
  } catch (error) {
    console.error('Error logging safety event:', error);
    return null;
  }
}

export async function getSafetyLogs(childId: string): Promise<SafetyLog[]> {
  try {
    const result = await sql`
      SELECT * FROM safety_logs 
      WHERE child_id = ${childId}
      ORDER BY created_at DESC
    `;
    return result as SafetyLog[];
  } catch (error) {
    console.error('Error fetching safety logs:', error);
    return [];
  }
}

// Contact approval system
export async function addContact(contact: Omit<Contact, 'id' | 'created_at' | 'approved_at'>): Promise<Contact | null> {
  try {
    const [result] = await sql`
      INSERT INTO contacts (child_id, contact_name, approved, approved_by)
      VALUES (${contact.child_id}, ${contact.contact_name}, ${contact.approved}, ${contact.approved_by})
      ON CONFLICT (child_id, contact_name) DO NOTHING
      RETURNING *
    `;
    return result as Contact;
  } catch (error) {
    console.error('Error adding contact:', error);
    return null;
  }
}

export async function approveContact(contactId: string, parentId: string): Promise<boolean> {
  try {
    await sql`
      UPDATE contacts 
      SET approved = TRUE, approved_by = ${parentId}, approved_at = NOW()
      WHERE id = ${contactId}
    `;
    return true;
  } catch (error) {
    console.error('Error approving contact:', error);
    return false;
  }
}

export async function getApprovedContacts(childId: string): Promise<Contact[]> {
  try {
    const result = await sql`
      SELECT * FROM contacts 
      WHERE child_id = ${childId} AND approved = TRUE
    `;
    return result as Contact[];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
}

export async function getPendingContacts(childId: string): Promise<Contact[]> {
  try {
    const result = await sql`
      SELECT * FROM contacts 
      WHERE child_id = ${childId} AND approved = FALSE
    `;
    return result as Contact[];
  } catch (error) {
    console.error('Error fetching pending contacts:', error);
    return [];
  }
}

export async function isContactApproved(childId: string, contactName: string): Promise<boolean> {
  try {
    const [result] = await sql`
      SELECT * FROM contacts 
      WHERE child_id = ${childId} AND contact_name = ${contactName} AND approved = TRUE
    `;
    return !!result;
  } catch (error) {
    console.error('Error checking contact:', error);
    return false;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
