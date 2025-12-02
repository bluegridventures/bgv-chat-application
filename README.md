BGV Chat Application
A modern real-time messenger with 1:1 and group chats, media sharing, online presence, typing indicators, and audio/video calling. Built with React + TypeScript, Express, Prisma (PostgreSQL), and Socket.IO. 1:1 calls use native WebRTC with TURN; group calls use LiveKit.

Key Features
✅ Secure auth with httpOnly cookies (JWT, HS256)
🔌 Real-time messaging (Socket.IO)
💬 1:1 and group chats
🟢 Online presence, ✍️ typing indicators
↩️ Reply threads, 😀 reactions
📷 Image and 🎤 voice note uploads (Cloudinary)
📞 1:1 audio/video calling (WebRTC + TURN)
👥 Group audio/video calls (LiveKit)
🌗 Light/dark mode UI (Tailwind v4 + shadcn/ui)
⚡ TypeScript end to end
Tech Stack
Frontend: React, TypeScript, Vite, Tailwind v4, shadcn/ui, Zustand, Axios, Socket.IO client, LiveKit components
Backend: Node/Express, TypeScript, Socket.IO, Prisma ORM (PostgreSQL), Passport-JWT, Zod, Cloudinary, Twilio, LiveKit server SDK
Database: PostgreSQL via Prisma
Calling:
1:1: WebRTC + ICE/TURN (Twilio Network Traversal)
Group: LiveKit (cloud or self-host)
Repository Structure
backend
src/config: env, prisma, passport, cloudinary, CORS
src/controllers: auth, chat, group, user, rtc, ice
src/lib/socket.ts: Socket.IO events (messages, typing, calls)
prisma/schema.prisma: DB models (User, Chat, ChatParticipant, Message, MessageReaction)
client
src/hooks: use-auth, use-chat, use-socket, use-calls, use-group-call
src/components: chat UI, call overlays, UI primitives
src/lib/axios-client: API client (uses VITE_API_URL)
Environment Variables
Set these via .env files for local dev and via your hosting dashboard for prod.

Backend (.env)

NODE_ENV=development|production
PORT=8000
FRONTEND_ORIGIN=http://localhost:5173 (dev) or your Vercel URL in prod (e.g., https://your-app.vercel.app)
DATABASE_URL=postgres connection string
DIRECT_URL=postgres direct connection string (if using Prisma Accelerate/proxy)
JWT_SECRET=your_strong_secret
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=…
CLOUDINARY_API_KEY=…
CLOUDINARY_API_SECRET=…
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=…
LIVEKIT_API_SECRET=…
TWILIO_ACCOUNT_SID=…
TWILIO_AUTH_TOKEN=… or TWILIO_API_KEY_SID and TWILIO_API_KEY_SECRET
Client (.env)

VITE_API_URL=http://localhost:8000 (dev) or https://your-backend.onrender.com (prod)
Important

Never commit .env files. Rotate any secrets that were previously committed and set them only in Vercel/Render environment settings.
Local Development
Prerequisites

Node 18+ and npm
PostgreSQL (or Prisma Data Proxy/Accelerate)
Cloudinary account (for images/audio)
Optional: LiveKit and Twilio TURN credentials for calls
Backend

cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
Server listens on PORT (default 8000). Health check: GET /health
Frontend

cd client
npm ci
npm run dev
VITE_API_URL must point to the backend (default http://localhost:8000)
Dev tips: multi-user testing

In development, this app supports per-tab header auth so you can log in as different users in two tabs of the same browser.
On login/register, a dev-only token is issued and stored in sessionStorage as DEV_ACCESS_TOKEN per tab.
If you switch users, logout and hard refresh each tab so it reconnects with the correct token.
Deployment
Frontend (Vercel)

Project: client folder
Env: VITE_API_URL=https://your-backend.onrender.com
Build command: npm run build
Output directory: dist
Backend (Render)

Service: Web Service from backend folder
Build command: npm ci && npm run prisma:generate && npm run build
Start command: npx prisma migrate deploy && node dist/index.js
Env vars: all backend variables (see above)
FRONTEND_ORIGIN must be set to your Vercel URL (e.g., https://your-app.vercel.app)
Cross-domain cookies and sockets

Backend sets SameSite=None; Secure cookies in production so auth works across Vercel and Render.
CORS and Socket.IO are configured to allow credentials and custom headers.
Ensure both front and back are served over HTTPS in production.
Data Model (Prisma)
User: profile info and timestamps
Chat: 1:1 or group metadata and last message tracking
ChatParticipant: many-to-many mapping
Message: content, image/audio, reply threading
MessageReaction: per-user per-message unique reaction
Migrations

Local dev: npm run prisma:migrate
Render (prod): npx prisma migrate deploy (included before server start)
Realtime and Calls
Socket.IO events

Rooms per chat and per user, online presence, typing indicators
message:new, message:updated, message:deleted
call:invite/offer/answer/candidate/accept/reject/end
group:call:started/ended
TURN (Twilio)

Backend exposes GET /api/ice/twilio to fetch ICE/TURN servers.
Configure Twilio credentials in backend env.
LiveKit (group calls)

Backend issues tokens at POST /api/rtc/token.
Client joins with using the returned token and url.
Security Notes
Use long, random JWT_SECRET in production.
Serve only over HTTPS in production.
Rotate secrets that were ever committed to Git.
Limit FRONTEND_ORIGIN to exact production domain(s).
Validate uploads and size limits (Cloudinary already used).
Scripts
Backend

npm run dev: start with nodemon
npm run build: compile TypeScript
npm run start: node dist/index.js
prisma: prisma:generate, prisma:migrate, prisma:studio
Frontend

npm run dev, build, preview
Troubleshooting
401 in prod: ensure FRONTEND_ORIGIN matches Vercel domain exactly; cookies must be SameSite=None; Secure; both over HTTPS.
Socket fails to connect: confirm VITE_API_URL is your Render HTTPS URL and Socket is allowed by CORS.
LiveKit error: ensure LIVEKIT_URL/API credentials set on backend.
TURN error: set Twilio creds or expect STUN-only fallback for 1:1 calls.
License
Add your license of choice here (e.g., MIT, Apache-2.0, or Proprietary). Ensure any upstream licenses are respected if applicable.