-- Standardize check-in/check-out times in existing room policies
-- Replaces old/stale time values (02:00 PM, 11:00 AM) with current standardized times

UPDATE rooms
SET policies = REGEXP_REPLACE(
    policies,
    'Check-in:\s*02:00\s*PM\s*\|\s*Check-out:\s*11:00\s*AM',
    'Check-in: 2:00 PM | Check-out: 12:00 PM',
    'g'
)
WHERE policies ~* 'Check-in:\s*02:00\s*PM\s*\|\s*Check-out:\s*11:00\s*AM';

-- Also handle variations: comma separator, extra whitespace, missing AM/PM formatting
UPDATE rooms
SET policies = REGEXP_REPLACE(
    policies,
    'Check-in:\s*02:00\s*PM',
    'Check-in: 2:00 PM',
    'g'
)
WHERE policies ~* 'Check-in:\s*02:00\s*PM';

UPDATE rooms
SET policies = REGEXP_REPLACE(
    policies,
    'Check-out:\s*11:00\s*AM',
    'Check-out: 12:00 PM',
    'g'
)
WHERE policies ~* 'Check-out:\s*11:00\s*AM';
