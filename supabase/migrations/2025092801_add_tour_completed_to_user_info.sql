-- Add tour_completed column to user_info table
ALTER TABLE user_info
ADD COLUMN tour_completed BOOLEAN DEFAULT false;

-- Update existing users to have tour_completed as false (they haven't seen the tour yet)
UPDATE user_info
SET tour_completed = false
WHERE tour_completed IS NULL;
