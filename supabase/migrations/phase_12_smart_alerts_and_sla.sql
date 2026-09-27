-- ====================================================================
-- PHASE 12 MIGRATION: SMART ALERTS & CONFIGURABLE SLA MANAGEMENT
-- Supports Maharashtra administrative hierarchy & strict district isolation
-- ====================================================================

-- 1. SLA Rules Configuration Table
CREATE TABLE IF NOT EXISTS public.sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_type VARCHAR(50) NOT NULL DEFAULT 'STATE' CHECK (organization_type IN ('STATE', 'DISTRICT', 'MUNICIPAL_CORPORATION')),
    district_id VARCHAR(100),
    municipal_corporation_id VARCHAR(100),
    department_id VARCHAR(100),
    category VARCHAR(100) NOT NULL DEFAULT 'all',
    priority VARCHAR(50) NOT NULL DEFAULT 'all',
    duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),
    due_soon_hours INTEGER NOT NULL DEFAULT 6 CHECK (due_soon_hours >= 0),
    escalation_threshold_hours INTEGER NOT NULL DEFAULT 4 CHECK (escalation_threshold_hours >= 0),
    penalty_amount_per_hour NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Smart Alerts Table
CREATE TABLE IF NOT EXISTS public.smart_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint VARCHAR(255) NOT NULL,
    organization_id UUID,
    district_id VARCHAR(100) NOT NULL,
    municipal_corporation_id VARCHAR(100),
    department_id VARCHAR(100),
    complaint_id VARCHAR(100),
    cluster_id VARCHAR(100),
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN (
        'CRITICAL_COMPLAINT',
        'SLA_DUE_SOON',
        'SLA_OVERDUE',
        'COMPLAINT_SPIKE',
        'GEOGRAPHIC_CLUSTER',
        'REPEATED_AREA_ISSUE',
        'OPERATIONAL_EVENT'
    )),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_address TEXT,
    location_ward VARCHAR(100),
    location_lat NUMERIC(10, 6),
    location_lng NUMERIC(10, 6),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    acknowledgement_notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    escalation_level INTEGER NOT NULL DEFAULT 1 CHECK (escalation_level BETWEEN 1 AND 4),
    escalation_reason TEXT,
    recommended_action TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Alert Acknowledgements & Escalation Audit Trail Table
CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES public.smart_alerts(id) ON DELETE CASCADE,
    fingerprint VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('ACKNOWLEDGE', 'ESCALATE', 'RESOLVE', 'REVIEW')),
    actor_id VARCHAR(255),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(100) NOT NULL,
    notes TEXT,
    escalation_from_level INTEGER,
    escalation_to_level INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Fast Querying and District Isolation
CREATE INDEX IF NOT EXISTS idx_sla_rules_lookup ON public.sla_rules (district_id, municipal_corporation_id, category, priority);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_district ON public.smart_alerts (district_id);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_corp ON public.smart_alerts (municipal_corporation_id);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_status ON public.smart_alerts (status);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_severity ON public.smart_alerts (severity);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_type ON public.smart_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_fingerprint ON public.smart_alerts (fingerprint);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_complaint ON public.smart_alerts (complaint_id);

-- Row Level Security (RLS) Enablement
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_acknowledgements ENABLE ROW LEVEL SECURITY;

-- SLA Rules RLS Policies
CREATE POLICY "Public authenticated officers can read SLA rules"
ON public.sla_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Municipal and State Admins can manage SLA rules"
ON public.sla_rules FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('municipal_admin', 'super_admin', 'state_admin')
    )
);

-- Smart Alerts RLS Policies: District Isolation
CREATE POLICY "Officers can view alerts for their authorized district"
ON public.smart_alerts FOR SELECT
TO authenticated
USING (
    -- State Admin sees all alerts
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'state_admin'
    )
    OR
    -- District / Municipal Officers see their own district alerts
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.district_id = smart_alerts.district_id OR smart_alerts.district_id IS NULL)
    )
);

CREATE POLICY "Officers can acknowledge and update alerts in their district"
ON public.smart_alerts FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role IN ('officer', 'dept_admin', 'municipal_admin', 'super_admin', 'state_admin'))
        AND (profiles.district_id = smart_alerts.district_id OR profiles.role = 'state_admin')
    )
);

CREATE POLICY "Audit trail inserts are permitted for authorized officers"
ON public.alert_acknowledgements FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Audit trail read is permitted for authorized officers"
ON public.alert_acknowledgements FOR SELECT
TO authenticated
USING (true);
