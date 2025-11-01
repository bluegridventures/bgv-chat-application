# Supabase Migration Guide

## ✅ Migration Complete!

The codebase has been successfully migrated from MongoDB to Supabase. All functionality remains the same, but now uses PostgreSQL via Supabase.

## 🚀 Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and service role key

### 2. Setup Database Schema
1. Go to your Supabase dashboard → SQL Editor
2. Copy and paste the contents of `backend/supabase-schema.sql`
3. Run the SQL to create all tables and relationships

### 3. Environment Variables
1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Keep your existing JWT_SECRET and Cloudinary settings

### 4. Install Dependencies
```bash
cd backend
npm install
```

### 5. Start the Application
```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd client
npm install
npm run dev
```

## 🔄 What Changed

### Backend Changes
- ✅ Added `@supabase/supabase-js` dependency
- ✅ Created `src/config/supabase.config.ts` with types
- ✅ Migrated all services to use Supabase:
  - `auth.service.ts` - User registration/login
  - `user.service.ts` - User queries
  - `chat.service.ts` - Chat creation and management
  - `message.service.ts` - Message sending
- ✅ Updated environment configuration
- ✅ Replaced MongoDB connection with Supabase

### Database Schema
- ✅ `users` table (replaces User collection)
- ✅ `chats` table (replaces Chat collection)
- ✅ `chat_participants` table (replaces embedded participants array)
- ✅ `messages` table (replaces Message collection)
- ✅ Proper foreign key relationships
- ✅ Indexes for performance
- ✅ Auto-updating timestamps

### API Compatibility
- ✅ All API endpoints remain the same
- ✅ Request/response formats unchanged
- ✅ Frontend requires no changes
- ✅ Socket.IO events work identically
- ✅ Authentication flow preserved

## 🧪 Testing

1. **Registration/Login**: Create new accounts and login
2. **User List**: View other users to chat with
3. **Create Chats**: Start one-on-one and group conversations
4. **Send Messages**: Text messages, images, and replies
5. **Real-time**: Test WebSocket events (online status, new messages)
6. **Chat History**: Verify message persistence and loading

## 🔧 Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`

2. **Database connection errors**
   - Verify your Supabase project is active
   - Check that the SQL schema was applied correctly

3. **Authentication issues**
   - Ensure `JWT_SECRET` is set and consistent
   - Check that users table exists and has correct structure

4. **Message/Chat not working**
   - Verify all foreign key relationships are created
   - Check Supabase logs for any constraint violations

### Performance Notes
- Supabase automatically handles connection pooling
- Indexes are created for optimal query performance
- UUID primary keys provide better distribution than ObjectIds

## 📊 Benefits of Migration

1. **Better Performance**: PostgreSQL with proper indexes
2. **ACID Compliance**: Full transaction support
3. **SQL Queries**: More powerful query capabilities
4. **Real-time**: Built-in real-time subscriptions (future enhancement)
5. **Backup**: Automatic backups and point-in-time recovery
6. **Scaling**: Better horizontal scaling options

## 🔮 Future Enhancements

With Supabase, you can now easily add:
- Real-time message subscriptions (replace Socket.IO)
- Advanced search with full-text search
- Message reactions and threading
- File attachments with Supabase Storage
- User presence with Supabase Realtime
- Advanced analytics and reporting

## 🆘 Support

If you encounter any issues:
1. Check the Supabase dashboard logs
2. Verify environment variables are correct
3. Ensure database schema is properly applied
4. Check network connectivity to Supabase

The migration preserves all existing functionality while providing a more robust and scalable foundation for future development.
