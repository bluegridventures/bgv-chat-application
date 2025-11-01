-- Add group admin and description fields to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS group_description TEXT,
ADD COLUMN IF NOT EXISTS group_avatar VARCHAR(500),
ADD COLUMN IF NOT EXISTS group_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for group admin lookup
CREATE INDEX IF NOT EXISTS idx_chats_group_admin ON chats(group_admin_id);

-- Add comments
COMMENT ON COLUMN chats.group_description IS 'Description of the group chat';
COMMENT ON COLUMN chats.group_avatar IS 'Avatar/logo URL for the group';
COMMENT ON COLUMN chats.group_admin_id IS 'User ID of the group administrator';

-- Update existing group chats to set created_by as admin
UPDATE chats 
SET group_admin_id = created_by 
WHERE is_group = true AND group_admin_id IS NULL;
