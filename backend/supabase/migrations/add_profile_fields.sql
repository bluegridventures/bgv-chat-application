-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS role VARCHAR(100);

-- Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Add comment
COMMENT ON COLUMN users.username IS 'Unique username for the user';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.role IS 'User role in the company';
