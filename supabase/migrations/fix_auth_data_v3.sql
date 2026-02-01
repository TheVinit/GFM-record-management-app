-- Fix PRN 28: Remove underscore from email as Supabase Auth might be rejecting it
UPDATE profiles 
SET email = 'teacher28@test.com' 
WHERE prn = '28';

-- Fix PRN 27: Ensure no underscores here either
UPDATE profiles 
SET email = 'teacher27@test.com' 
WHERE prn = '27';
