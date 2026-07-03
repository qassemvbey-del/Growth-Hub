-- 1. Drop the old check constraint on inbox_reports
ALTER TABLE inbox_reports DROP CONSTRAINT IF EXISTS inbox_reports_type_check;

-- 2. Add the new constraint with all 21 allowed types
ALTER TABLE inbox_reports ADD CONSTRAINT inbox_reports_type_check CHECK (
  type IN (
    'daily_brief',
    'deadline_alert',
    'mission_complete',
    'weekly_review',
    'squad_join_request',
    'squad_join_approved',
    'squad_join_rejected',
    'squad_request',
    'squad_accept',
    'squad_reject',
    'squad_promote',
    'squad_demote',
    'custom_alert',
    'rank_up',
    'squad_invite',
    'system',
    'squad_request_pending',
    'join_approved',
    'join_rejected',
    'squad_member_joined',
    'squad_member_left'
  )
);
