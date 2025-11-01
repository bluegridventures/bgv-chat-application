-- ============================================
-- Supabase Database Functions
-- Run this in your Supabase SQL Editor
-- ============================================

-- Function to get existing direct chat between two users
CREATE OR REPLACE FUNCTION get_direct_chat(user1_id uuid, user2_id uuid)
RETURNS TABLE (id uuid, created_at timestamptz)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.created_at
  FROM chats c
  JOIN chat_participants cp1 ON c.id = cp1.chat_id
  JOIN chat_participants cp2 ON c.id = cp2.chat_id
  WHERE 
    NOT c.is_group AND
    cp1.user_id = user1_id AND
    cp2.user_id = user2_id
  LIMIT 1;
END;
$$;
