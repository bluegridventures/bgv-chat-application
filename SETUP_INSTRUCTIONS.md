# Supabase Migration Setup Instructions

## Step 1: Run Database Schema in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `backend/supabase-schema.sql`
4. Click **Run** to create all tables

## Step 2: Run Database Functions

1. In the same **SQL Editor**
2. Copy and paste the contents of `backend/SUPABASE_FUNCTIONS.sql`
3. Click **Run** to create the `get_direct_chat` function

## Step 3: Configure Environment Variables

### Backend (.env)
Create `backend/.env` file with:
```env
NODE_ENV=development
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Frontend (.env)
Update `client/.env` file with:
```env
VITE_API_URL=http://localhost:8000
```

## Step 4: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../client
npm install
```

## Step 5: Start the Application

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd client
npm run dev
```

## Troubleshooting

### 500 Error when fetching chat
- **Check backend logs** for detailed error messages
- **Verify** that the `get_direct_chat` function was created successfully in Supabase
- **Ensure** all tables have proper foreign key relationships
- **Check** that chat participants were inserted correctly

### Connection Refused Error
- Verify backend is running on port 8000
- Check that `VITE_API_URL` in frontend `.env` is set to `http://localhost:8000`

### TypeScript Errors
- All `_id` references have been updated to `id`
- Run `npm run build` to check for any remaining type errors

## Database Schema Overview

### Tables Created:
1. **users** - User accounts with authentication
2. **chats** - Chat rooms (one-on-one and groups)
3. **chat_participants** - Many-to-many relationship between users and chats
4. **messages** - Chat messages with sender and reply relationships

### Functions Created:
1. **get_direct_chat** - Finds existing direct chat between two users

## Next Steps

After setup is complete:
1. Register a new user account
2. Create a chat with another user
3. Send messages
4. Test group chat functionality
