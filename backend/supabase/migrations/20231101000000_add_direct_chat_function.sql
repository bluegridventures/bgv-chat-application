-- Function to get existing direct chat between two users
create or replace function get_direct_chat(user1_id uuid, user2_id uuid)
returns table (id uuid, created_at timestamptz)
language plpgsql
as $$
begin
  return query
  select c.id, c.created_at
  from chats c
  join chat_participants cp1 on c.id = cp1.chat_id
  join chat_participants cp2 on c.id = cp2.chat_id
  where 
    not c.is_group and
    cp1.user_id = user1_id and
    cp2.user_id = user2_id
  limit 1;
end;
$$;
