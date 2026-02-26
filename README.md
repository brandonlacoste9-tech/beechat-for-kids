# 🐝 BEEChat for Kids

**Safe messaging app for kids with parental controls**

[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-green)](https://render.com)
[![Database](https://img.shields.io/badge/Database-Neon-blue)](https://neon.tech)

## Features

- 🔒 **Parent-approved contacts** - Kids can only chat with parent-approved friends
- 👁️ **Message monitoring** - Parents can view their child's messages
- 📍 **GPS tracking** - Real-time location with geofencing alerts
- 🛡️ **Content filtering** - Automatic detection of inappropriate language
- 🐝 **BEE mascot** - Friendly safety companion for kids
- 🎨 **Luxury leather theme** - Premium UI with tans, beige, ostrich textures

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express + Socket.io |
| Database | Neon Serverless PostgreSQL |
| Real-time | WebSockets |
| Hosting | Render |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/brandonlacoste9-tech/beechat-for-kids.git
cd beechat-for-kids

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up Neon Database

1. Create free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from Dashboard
4. It looks like: `postgresql://user:password@ep-xxx.neon.tech/beechat?sslmode=require`

### 3. Environment Variables

```bash
cp .env.example .env
# Edit .env:
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/beechat?sslmode=require
```

### 4. Run Locally

```bash
# Terminal 1: Backend
cd backend
npx tsx index.ts

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## Deploy to Render

### Step 1: Create Neon Database

1. Go to [neon.tech](https://neon.tech) → New Project
2. Copy the connection string
3. Keep it for Render setup

### Step 2: Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Name**: beechat-api
   - **Root Directory**: backend
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx index.ts`
5. Add Environment Variable:
   - `DATABASE_URL` = your Neon connection string
6. Deploy!

### Step 3: Deploy Frontend

1. New → Static Site
2. Connect same repo
3. Settings:
   - **Name**: beechat-app
   - **Root Directory**: frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL` = your backend URL (e.g., `https://beechat-api.onrender.com`)
5. Deploy!

## Database Schema

Neon automatically creates tables on first run via `initDatabase()`.

```sql
users (id, username, email, type, parent_id, age, status)
messages (id, sender_id, recipient_id, content, type, safety_flags)
locations (id, user_id, lat, lng, accuracy)
safety_logs (id, child_id, content, flags, severity)
contacts (id, child_id, contact_name, approved, approved_by)
```

## Why Neon + Render?

| Feature | Benefit |
|---------|---------|
| **Serverless Postgres** | Scales to zero, pay only for usage |
| **Connection pooling** | Built-in PgBouncer (no connection limits) |
| **Branching** | Create DB branches for dev/staging |
| **Free tier** | 500 MB storage, 190 compute hours/month |
| **Render integration** | Same data center = fast queries |

## API Endpoints

```
GET  /api/health                           # Health check
GET  /api/parent/:id/children              # List children
GET  /api/parent/:id/child/:id/messages    # View messages
GET  /api/parent/:id/child/:id/contacts    # List contacts
POST /api/parent/:id/child/:id/geofences   # Add geofence
GET  /api/parent/:id/child/:id/geofence-alerts  # Get alerts
```

## WebSocket Events

### From Client:
- `parent:register` - Create parent account
- `child:register` - Create child account
- `message:send` - Send message
- `location:update` - Update GPS location
- `child:addContact` - Request new contact
- `parent:approveContact` - Approve contact

### From Server:
- `message:received` - New message
- `message:blocked` - Content blocked
- `parent:locationData` - Location update
- `parent:safetyLogs` - Safety alerts
- `parent:geofenceAlert` - Geofence breach

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | development / production | No |
| `VITE_API_URL` | Backend URL for frontend | For deploy |

## Development

```bash
# Run tests
cd backend && npm test

# Build for production
cd frontend && npm run build

# Deploy
git add .
git commit -m "Your changes"
git push origin master
```

## Troubleshooting

### Database Connection Issues
```bash
# Test Neon connection
psql $DATABASE_URL -c "SELECT 1"

# Check SSL mode is enabled (required for Neon)
```

### Render Deployment Issues
- Make sure `DATABASE_URL` is set in Render Environment Variables
- Ensure `sslmode=require` is in the connection string
- Check Render logs for connection errors

## License

MIT - Made with ❤️ for safe family communication

## Support

For issues or feature requests, please open a GitHub issue.
