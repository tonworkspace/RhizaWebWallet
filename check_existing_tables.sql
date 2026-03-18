-- Check what tables currently exist in the database
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if we have any user-related tables
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND (
  table_name LIKE '%user%' OR 
  table_name LIKE '%profile%' OR 
  table_name LIKE '%wallet%' OR
  table_name LIKE '%account%'
)
ORDER BY table_name;