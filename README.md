# Mughith Emergency Response System

Mughith is a full-stack emergency response platform for coordinating dispatchers, verified volunteers, ambulance crews, and administrators during urgent medical incidents.

The system includes:

- A NestJS backend API with JWT authentication, role-based access control, Prisma, PostgreSQL, Swagger, Socket.IO, scheduled case expiry, push-notification hooks, and chat integration hooks.
- A React + Vite web dashboard for dispatchers, administrators, and volunteers.
- An Expo React Native mobile app for field volunteers and ambulance response workflows.

## Repository Structure

```text
Backend/mughith-backend      NestJS API, Prisma schema, migrations, tests, diagrams
webApp/mughith-frontend      React + Vite web dashboard
mobileapp/mughith-mobile     Expo React Native mobile app
```

## Core Features

- JWT login and registration
- Role-based navigation and authorization
- Dispatcher case creation and case lifecycle management
- Nearby volunteer discovery using stored coordinates and distance scoring
- Volunteer availability, alert acceptance, navigation, and handoff flow
- Admin verification and user management
- Case notifications stored in PostgreSQL with optional Firebase push delivery
- Live location updates through Socket.IO
- VoIP signaling namespace for WebRTC call setup
- Stream Chat integration path with offline/stub fallback for local development
- Bilingual EN/AR UI support in the client apps

## Tech Stack

Backend:

- NestJS
- Prisma
- PostgreSQL
- Socket.IO
- Swagger/OpenAPI
- Firebase Admin SDK
- Stream Chat

Web:

- React
- TypeScript
- Vite
- Zustand
- React Router
- Axios
- Leaflet
- Recharts
- Tailwind CSS

Mobile:

- Expo SDK 54
- React Native
- React Navigation
- Zustand
- AsyncStorage
- Axios
- Socket.IO Client
- Expo Location
- React Native Maps

## Docker Quick Start

From the repository root:

```bash
cp .env.docker.example .env
docker compose up --build
```

Default container URLs:

- Web app: `http://localhost:5174`
- Backend API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api`
- Health: `http://localhost:3001/health`
- PostgreSQL host port: `5434`

The backend container runs Prisma migrations and seeds the demo accounts automatically when `SEED_DATABASE=true`.

If one of those ports is already in use, change `BACKEND_PORT`, `WEB_PORT`, or `POSTGRES_PORT` in `.env` and run Compose again.

### Optional Expo Container

For Expo Go on a physical phone, set your computer LAN IP in `.env` first:

```text
LAN_IP=192.168.x.x
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
```

Then start the mobile profile:

```bash
docker compose --profile mobile up --build mobile
```

Open the Expo URL or QR code from the container logs in Expo Go. Your phone and computer must be on the same Wi-Fi network.

## Local Setup

Use this path if you prefer running each app directly without Docker.

### Backend

```bash
cd Backend/mughith-backend
npm install
cp .env.example .env
npm run db:generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

Backend URLs:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`
- Health: `http://localhost:3000/health`

### Web App

```bash
cd webApp/mughith-frontend
npm install
npm run dev
```

Default web URL:

```text
http://localhost:5173
```

### Mobile App

```bash
cd mobileapp/mughith-mobile
npm install
npx expo start --lan
```

For a physical phone, set `EXPO_PUBLIC_API_URL` to your computer LAN IP:

```text
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
```

## Demo Accounts

After seeding the backend database:

```text
admin@mughith.sa       Pass1234
dispatcher@mughith.sa  Pass1234
donator@mughith.sa     Pass1234
donator2@mughith.sa    Pass1234
donator3@mughith.sa    Pass1234
crew@mughith.sa        Pass1234
```

## API Documentation

Detailed endpoint notes are available in:

```text
Backend/mughith-backend/API_DOCUMENTATION.md
```

Swagger is available when the backend is running:

```text
http://localhost:3000/api
```

## Notes

- `.env` files are intentionally ignored and should not be committed.
- Firebase and Stream Chat credentials are optional for local development. Without them, the backend logs notifications and returns stub chat behavior.
- The backend REST API does not define a homepage route at `/`; use `/health` or `/api` for browser checks.
