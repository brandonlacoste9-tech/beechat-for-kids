# 🐝 BEEChat for Kids

**Safe messaging app for kids with parental controls**

[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-green)](https://render.com)
[![Database](https://img.shields.io/badge/Database-Supabase-blue)](https://supabase.com)

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
| Database | Supabase PostgreSQL |
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

### 2. Set up Supabase Database

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor → New query
4. Copy/paste `supabase-schema.sql` and run it
5. Go to Settings → API → Copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role secret` → `SUPABASE_SERVICE_KEY`

### 3. Environment Variables

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
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

### Option 1: Blueprint (Recommended)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Blueprint"
4. Connect your GitHub repo
5. Add environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
6. Deploy!

### Option 2: Manual

**Backend:**
- New → Web Service
- Connect repo, select `backend` folder
- Build: `npm install`
- Start: `npx tsx index.ts`
- Add env vars

**Frontend:**
- New → Static Site
- Connect repo, select `frontend` folder
- Build: `npm install && npm run build`
- Publish: `dist`

## Database Schema

```sql
users (id, username, email, type, parent_id, age, status)
messages (id, sender_id, recipient_id, content, type, safety_flags)
locations (id, user_id, lat, lng, accuracy)
safety_logs (id, child_id, content, flags, severity)
contacts (id, child_id, contact_name, approved, approved_by)
geofence_zones (id, child_id, name, lat, lng, radius, type)
geofence_alerts (id, child_id, zone_id, alert_type)
```

## Safety Features

### Content Filtering
- Automatic detection of swear words (English + French)
- Phone number/email detection
- 3-tier system: Allow / Warn / Block
- Parent notifications for violations

### Contact Approval
- Child requests to add friend
- Parent approves/denies from dashboard
- Child can only message approved contacts

### Location Tracking
- Real-time GPS updates
- 24-hour location history
- Geofencing with enter/exit alerts
- Home/School zone support

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

## Security

- All messages stored in PostgreSQL with RLS
- Parents can only access their children's data
- Location data encrypted at rest
- Socket authentication required
- No passwords stored for children (parent-code login)

## License

MIT - Made with ❤️ for safe family communication

## Support

For issues or feature requests, please open a GitHub issue.
