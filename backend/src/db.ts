/**
 * 🗄️ BEEChat Database Module
 * Supabase PostgreSQL integration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface User {
  id: string;
  username: string;
  email?: string;
  type: 'parent' | 'child';
  parent_id?: string;
  age?: number;
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
  content: string;
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
  approved_by: string;
  approved_at?: string;
}

// Database operations
export async function createUser(user: Omit<User, 'created_at'>): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export async function getChildrenByParent(parentId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('type', 'child')
    .eq('parent_id', parentId);
  
  if (error) {
    console.error('Error fetching children:', error);
    return [];
  }
  return data || [];
}

export async function storeMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert([message])
    .select()
    .single();
  
  if (error) {
    console.error('Error storing message:', error);
    return null;
  }
  return data;
}

export async function getMessagesForParent(
  childId: string,
  limit: number = 50
): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${childId},recipient_id.eq.${childId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return data || [];
}

export async function storeLocation(location: Omit<Location, 'id' | 'created_at'>): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .insert([location])
    .select()
    .single();
  
  if (error) {
    console.error('Error storing location:', error);
    return null;
  }
  return data;
}

export async function getLatestLocation(userId: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error) return null;
  return data;
}

export async function getLocationHistory(
  userId: string,
  hours: number = 24
): Promise<Location[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching location history:', error);
    return [];
  }
  return data || [];
}

export async function logSafetyEvent(log: Omit<SafetyLog, 'id' | 'created_at'>): Promise<SafetyLog | null> {
  const { data, error } = await supabase
    .from('safety_logs')
    .insert([log])
    .select()
    .single();
  
  if (error) {
    console.error('Error logging safety event:', error);
    return null;
  }
  return data;
}

export async function getSafetyLogs(childId: string): Promise<SafetyLog[]> {
  const { data, error } = await supabase
    .from('safety_logs')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching safety logs:', error);
    return [];
  }
  return data || [];
}

// Contact approval system
export async function addContact(contact: Omit<Contact, 'id' | 'approved_at'>): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .insert([contact])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding contact:', error);
    return null;
  }
  return data;
}

export async function approveContact(contactId: string, parentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('contacts')
    .update({ 
      approved: true, 
      approved_by: parentId,
      approved_at: new Date().toISOString()
    })
    .eq('id', contactId);
  
  if (error) {
    console.error('Error approving contact:', error);
    return false;
  }
  return true;
}

export async function getApprovedContacts(childId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('child_id', childId)
    .eq('approved', true);
  
  if (error) {
    console.error('Error fetching contacts:', error);
    return [];
  }
  return data || [];
}

export async function isContactApproved(childId: string, contactName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('child_id', childId)
    .eq('contact_name', contactName)
    .eq('approved', true)
    .single();
  
  if (error || !data) return false;
  return true;
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}
