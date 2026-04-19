# UEL Survival System

A complete student productivity SaaS-style platform with:

- React + Vite frontend
- Express backend API
- Token-based authentication (register/login)
- Persistent local storage (JSON-based database for users, preferences, focus history)
- Synthetic analytics and recommendations engine

## Features

- Dashboard with risk status, priority task, weekly progress, alerts
- Smart Assistant recommendation endpoint and UI
- Modules, deadlines, and insights pages
- Focus Mode with API-backed timer + session history
- Per-user preferences (selected module)
- Protected API routes
- UEL Moodle connector (admin): test + import courses

## Project Structure

- `src/` - frontend application
- `server/` - backend API
- `server/storage/db.json` - generated persistent local database file

## Local Development

1. Install dependencies:
   - `npm install`
2. Run frontend + backend together:
   - `npm run dev:full`
3. Open:
   - `http://localhost:5173` (or next available Vite port)

You can also run separately:

- Frontend only: `npm run dev`
- Backend only: `npm run dev:server`

## Authentication

Create an account using the UI, then sign in.  
The frontend stores JWT in localStorage and sends it as `Authorization: Bearer <token>`.

## Moodle Connector (UEL)

In Admin page:

1. Open **Admin > UEL Moodle Connector**
2. Set Moodle base URL (example: `https://moodle.uel.ac.uk`)
3. Paste a Moodle Web Service token
4. Click **Test Connection**
5. Click **Import Moodle Courses** to bring Moodle courses into modules

Supported backend routes:

- `GET /api/admin/moodle/config`
- `PUT /api/admin/moodle/config`
- `POST /api/admin/moodle/test`
- `POST /api/admin/moodle/import-courses`

## Production Build

1. Build frontend:
   - `npm run build`
2. Start server:
   - `npm start`
3. App runs on:
   - `http://localhost:3001`

In production mode, Express serves the built frontend from `dist/`.

## Environment Variables

Copy `.env.example` and set values:

- `PORT` - API/server port (default `3001`)
- `JWT_SECRET` - required strong secret in production
- `NODE_ENV` - `development` or `production`

## Deployment

### Render (recommended)

- Create a new Web Service
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment:
  - `NODE_ENV=production`
  - `JWT_SECRET=<your-secret>`

### Docker

Build and run:

- `docker build -t uel-survival-system .`
- `docker run -p 3001:3001 -e NODE_ENV=production -e JWT_SECRET=your-secret uel-survival-system`

## Quality Checks

- Lint: `npm run lint`
- Build: `npm run build`
