-- 🗄️ BEEChat Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (parents and children)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    socket_id TEXT UNIQUE,
    username TEXT NOT NULL,
    email TEXT,
    type TEXT NOT NULL CHECK (type IN ('parent', 'child')),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER CHECK (age >= 11 AND age <= 16),
    status TEXT DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice')),
    safety_flags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location tracking
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety logs
CREATE TABLE safety_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    flags TEXT[] NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    chat_with TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact approval system
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, contact_name)
);

-- Geofence zones
CREATE TABLE geofence_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    radius INTEGER NOT NULL, -- in meters
    type TEXT DEFAULT 'custom' CHECK (type IN ('home', 'school', 'danger', 'custom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Geofence alerts
CREATE TABLE geofence_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID REFERENCES users(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES geofence_zones(id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('entered', 'left')),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parent settings
CREATE TABLE parent_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    view_messages BOOLEAN DEFAULT TRUE,
    view_metadata_only BOOLEAN DEFAULT FALSE,
    real_time_alerts BOOLEAN DEFAULT TRUE,
    location_tracking BOOLEAN DEFAULT TRUE,
    time_limits_enabled BOOLEAN DEFAULT TRUE,
    daily_minutes INTEGER DEFAULT 120,
    allowed_hours_start INTEGER DEFAULT 7,
    allowed_hours_end INTEGER DEFAULT 21,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_parent_id ON users(parent_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_locations_created_at ON locations(created_at);
CREATE INDEX idx_safety_logs_child_id ON safety_logs(child_id);
CREATE INDEX idx_contacts_child_id ON contacts(child_id);
CREATE INDEX idx_geofence_zones_child_id ON geofence_zones(child_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text OR auth.uid()::text = parent_id::text);

-- Parents can see their children's messages
CREATE POLICY "Parents can view child messages" ON messages
    FOR SELECT USING (
        sender_id::text = auth.uid()::text 
        OR recipient_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users WHERE id = sender_id AND parent_id::text = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = recipient_id AND parent_id::text = auth.uid()::text
        )
    );

-- Parents can see their children's locations
CREATE POLICY "Parents can view child locations" ON locations
    FOR SELECT USING (
        user_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users WHERE id = user_id AND parent_id::text = auth.uid()::text
        )
    );

-- Parents can see their children's safety logs
CREATE POLICY "Parents can view child safety logs" ON safety_logs
    FOR SELECT USING (
        child_id::text = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM users WHERE id = child_id AND parent_id::text = auth.uid()::text
        )
    );
