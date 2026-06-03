-- =============================================================================
-- PrepPro — Database Schema Extensions (v0.2.0)
-- Adaptable RedBook daily summary metrics and business type configuration
-- =============================================================================

-- Add metrics column to manager logs to store structured daily numbers (sales, labor %, etc.)
ALTER TABLE manager_logs ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add business type to organization settings to configure active layout formats
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'restaurant';
