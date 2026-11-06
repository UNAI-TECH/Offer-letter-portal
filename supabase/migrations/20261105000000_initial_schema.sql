-- UNAI TECH Virtual Internship Offer Letter Generation Portal
-- Initial Database Schema Migration

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Participants Table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    email TEXT NOT NULL,
    normalized_email TEXT NOT NULL UNIQUE,
    registration_status TEXT NOT NULL DEFAULT 'active' CHECK (registration_status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for normalized email search (primary verification lookup)
CREATE INDEX IF NOT EXISTS idx_participants_normalized_email ON public.participants (normalized_email);
CREATE INDEX IF NOT EXISTS idx_participants_normalized_name ON public.participants (normalized_name);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants (registration_status);

-- 3. Internship Domains Table
CREATE TABLE IF NOT EXISTS public.internship_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL,
    domain_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domains_code ON public.internship_domains (domain_code);

-- Seed Official Internship Domains
INSERT INTO public.internship_domains (domain_name, domain_code, status)
VALUES 
    ('FULL STACK DEVELOPMENT', 'FULL_STACK', 'active'),
    ('AI & AUTOMATION', 'AI_AUTOMATION', 'active'),
    ('APP DEVELOPMENT', 'APP_DEVELOPMENT', 'active'),
    ('WEB DEVELOPMENT', 'WEB_DEVELOPMENT', 'active')
ON CONFLICT (domain_code) DO UPDATE 
SET domain_name = EXCLUDED.domain_name, status = EXCLUDED.status;

-- 4. Participant Domains Table (Relational junction for multi-domain registrations)
CREATE TABLE IF NOT EXISTS public.participant_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    domain_id UUID NOT NULL REFERENCES public.internship_domains(id) ON DELETE CASCADE,
    source_file TEXT,
    registration_status TEXT NOT NULL DEFAULT 'active' CHECK (registration_status IN ('active', 'inactive', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_participant_domain UNIQUE (participant_id, domain_id)
);

CREATE INDEX IF NOT EXISTS idx_participant_domains_participant_id ON public.participant_domains (participant_id);
CREATE INDEX IF NOT EXISTS idx_participant_domains_domain_id ON public.participant_domains (domain_id);
CREATE INDEX IF NOT EXISTS idx_participant_domains_lookup ON public.participant_domains (participant_id, domain_id, registration_status);

-- 5. Verification Sessions Table (Opaque cryptographic session token storage)
CREATE TABLE IF NOT EXISTS public.verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verification_sessions_token_hash ON public.verification_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_expires_at ON public.verification_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_participant ON public.verification_sessions (participant_id);

-- 6. Offer Letter Templates Table
CREATE TABLE IF NOT EXISTS public.offer_letter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.internship_domains(id) ON DELETE SET NULL,
    template_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    field_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_domain_id ON public.offer_letter_templates (domain_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON public.offer_letter_templates (status);

-- 7. Offer Letters Table
CREATE TABLE IF NOT EXISTS public.offer_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_letter_id TEXT NOT NULL UNIQUE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
    domain_id UUID NOT NULL REFERENCES public.internship_domains(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES public.offer_letter_templates(id) ON DELETE SET NULL,
    college_name TEXT NOT NULL,
    generated_file_path TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT '2026-11-01',
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
    download_count INTEGER NOT NULL DEFAULT 0,
    downloaded_at TIMESTAMPTZ,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offer_letters_participant ON public.offer_letters (participant_id);
CREATE INDEX IF NOT EXISTS idx_offer_letters_domain ON public.offer_letters (domain_id);
CREATE INDEX IF NOT EXISTS idx_offer_letters_ref ON public.offer_letters (offer_letter_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_valid_offer_letter ON public.offer_letters (participant_id, domain_id) WHERE status = 'valid';

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID,
    action TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_participant ON public.audit_logs (participant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- 9. Import Batches Table
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    domain_id UUID REFERENCES public.internship_domains(id) ON DELETE SET NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    invalid_rows INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_domain ON public.import_batches (domain_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON public.import_batches (created_at DESC);

-- 10. Update Trigger for participants.updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_participants_updated_at ON public.participants;
CREATE TRIGGER set_participants_updated_at
    BEFORE UPDATE ON public.participants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 11. Row Level Security (RLS) Configuration
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- Anonymous/Public access rules:
-- Public can ONLY read active internship domains (for form dropdown).
CREATE POLICY "Public can view active internship domains"
    ON public.internship_domains FOR SELECT
    TO anon, authenticated
    USING (status = 'active');

-- Service role has full bypass access by default in Supabase.
-- Authenticated Administrators policies:
CREATE POLICY "Admins have full access to participants"
    ON public.participants FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to internship_domains"
    ON public.internship_domains FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to participant_domains"
    ON public.participant_domains FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to verification_sessions"
    ON public.verification_sessions FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to offer_letter_templates"
    ON public.offer_letter_templates FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to offer_letters"
    ON public.offer_letters FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to audit_logs"
    ON public.audit_logs FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to import_batches"
    ON public.import_batches FOR ALL
    TO authenticated
    USING (true) WITH CHECK (true);

-- 12. Storage Buckets Initialization (Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('offer-letter-templates', 'offer-letter-templates', false, 10485760, ARRAY['application/pdf']),
    ('generated-offer-letters', 'generated-offer-letters', false, 10485760, ARRAY['application/pdf']),
    ('participant-imports', 'participant-imports', false, 20971520, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'])
ON CONFLICT (id) DO UPDATE 
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Admin full access to buckets
CREATE POLICY "Admin full access to offer-letter-templates"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'offer-letter-templates')
    WITH CHECK (bucket_id = 'offer-letter-templates');

CREATE POLICY "Admin full access to generated-offer-letters"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'generated-offer-letters')
    WITH CHECK (bucket_id = 'generated-offer-letters');

CREATE POLICY "Admin full access to participant-imports"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'participant-imports')
    WITH CHECK (bucket_id = 'participant-imports');

