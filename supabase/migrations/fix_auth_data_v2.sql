-- Fix PRN 27: Password too short
UPDATE profiles 
SET password = 'password123' 
WHERE prn = '27';

-- Fix PRN 28: Invalid email (potential hidden chars)
UPDATE profiles 
SET email = 'teacher_28@test.com' 
WHERE prn = '28';
