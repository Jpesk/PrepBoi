-- =============================================================================
-- PrepPro — Database Schema Extensions (v0.3.0)
-- Checklist Scheduling, Multi-Signature, Conditional Logic support, and Revisions
-- =============================================================================

-- Add schedule and signature settings to checklists
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'daily'; -- 'daily', 'weekly', 'monthly', 'on_demand'
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS schedule_day INT; -- day of week (1-7) or day of month (1-31)
ALTER TABLE checklists ADD COLUMN IF NOT EXISTS signature_mode TEXT NOT NULL DEFAULT 'employee'; -- 'none', 'employee', 'dual'

-- Add columns for dual signature validation to submissions
ALTER TABLE checklist_submissions ADD COLUMN IF NOT EXISTS manager_signature_data TEXT;
ALTER TABLE checklist_submissions ADD COLUMN IF NOT EXISTS manager_signed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE checklist_submissions ADD COLUMN IF NOT EXISTS manager_signed_at TIMESTAMPTZ;

-- Drop the unique constraint from checklist_submissions to allow multiple submissions per day if desired
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'checklist_submissions' 
          AND constraint_type = 'UNIQUE'
    ) LOOP
        EXECUTE 'ALTER TABLE checklist_submissions DROP CONSTRAINT ' || r.constraint_name;
    END LOOP;
END;
$$;

-- Create revisions table for tracking soft-locked form changes
CREATE TABLE IF NOT EXISTS checklist_submission_revisions (
  id              UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id   UUID              NOT NULL REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  updated_by      UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  draft_data      JSONB             NOT NULL,
  signature_data  TEXT,
  manager_signature_data TEXT,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT now()
);

-- Enable RLS on revisions
ALTER TABLE checklist_submission_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rev_read" ON checklist_submission_revisions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM checklist_submissions s 
    WHERE s.id = submission_id AND s.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "rev_insert" ON checklist_submission_revisions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklist_submissions s 
    WHERE s.id = submission_id AND s.org_id = (SELECT org_id FROM profiles WHERE id = auth.uid())
  ));

-- Create form-attachments storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('form-attachments', 'form-attachments', true, 10485760, '{"image/png", "image/jpeg", "image/gif", "image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- Storage policies for form-attachments
CREATE POLICY "attachments_upload" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'form-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "attachments_read" ON storage.objects FOR SELECT 
  USING (bucket_id = 'form-attachments');

CREATE POLICY "attachments_delete" ON storage.objects FOR DELETE 
  USING (bucket_id = 'form-attachments' AND auth.uid() IS NOT NULL);
