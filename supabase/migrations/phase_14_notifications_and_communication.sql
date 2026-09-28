-- ==============================================================================
-- CIVICRESOLVE — Phase 14: Feature 6 — Notifications & Multi-Channel Communication
-- Authoritative Schema for In-App, Push, Email & SMS Notifications with RLS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Centralized Notifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'citizen'
        CHECK (user_role IN ('citizen', 'officer', 'dept_admin', 'municipal_admin', 'state_admin', 'super_admin')),
    notification_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('complaints', 'sla', 'alerts', 'civic', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    marathi_title TEXT,
    marathi_message TEXT,
    hindi_title TEXT,
    hindi_message TEXT,
    entity_type TEXT DEFAULT 'complaint',
    entity_id TEXT,
    complaint_id TEXT,
    district_id TEXT NOT NULL,
    organization_id TEXT,
    severity TEXT NOT NULL DEFAULT 'info'
        CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    deep_link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    deduplication_hash TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 2. Notification Deliveries Audit Ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
    delivery_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED')),
    provider_message_id TEXT,
    failure_reason TEXT,
    district_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 3. User Devices Table (FCM & APNS Mobile Push Tokens)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    device_token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. User Notification Preferences Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id TEXT PRIMARY KEY,
    complaint_updates JSONB NOT NULL DEFAULT '{"inApp": true, "push": true, "email": false, "sms": false}'::jsonb,
    civic_updates JSONB NOT NULL DEFAULT '{"inApp": true, "push": true, "email": false, "sms": false}'::jsonb,
    operational_alerts JSONB NOT NULL DEFAULT '{"inApp": true, "push": true, "email": false, "sms": false}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. Indexes for Performance & Query Optimization
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_district_id ON public.notifications (district_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications (category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_complaint_id ON public.notifications (complaint_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_notification_id ON public.notification_deliveries (notification_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_district_id ON public.notification_deliveries (district_id);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.user_devices (user_id);

-- ------------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Users can only select their own notifications within district scope"
    ON public.notifications FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        (auth.jwt() ->> 'role' = 'state_admin' AND auth.jwt() ->> 'district_id' = district_id) OR
        auth.jwt() ->> 'role' = 'super_admin'
    );

CREATE POLICY "Users can mark their own notifications as read"
    ON public.notifications FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- User Devices Policies
CREATE POLICY "Users can manage their own device tokens"
    ON public.user_devices FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Notification Preferences Policies
CREATE POLICY "Users can read and update their own preferences"
    ON public.notification_preferences FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Deliveries Policies (Admin / Officer Read Only)
CREATE POLICY "District admins can view delivery audits"
    ON public.notification_deliveries FOR SELECT
    USING (
        auth.jwt() ->> 'district_id' = district_id OR
        auth.jwt() ->> 'role' = 'state_admin'
    );
