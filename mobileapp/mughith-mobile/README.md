# Mughith Mobile

React Native (Expo SDK 54) mobile client for the **Mughith Emergency Response System**.
Built to mirror the web frontend ([../mughith-frontend-main](../mughith-frontend-main)) and
talks to the same NestJS backend ([../mughith-backend-main](../mughith-backend-main)) — same JWT
auth, same REST endpoints, same Socket.IO namespaces, same bilingual (EN/AR) UI with RTL.

## Tech

- **Expo SDK 54** / React Native 0.81 / React 19
- **React Navigation 7** (native stack + bottom tabs)
- **Zustand** + AsyncStorage for session persistence
- **axios** for REST, **socket.io-client** for live location/VoIP
- **expo-location** + **react-native-maps**
- I18nManager-based RTL toggle (en / ar)

## What's in here

The app routes to one of three role-based tab navigators on login:

### Volunteer (`DONATOR` / `AMBULANCE_CREW`)
- **Home** — availability toggle, alert badge, recent case
- **Alerts** — auto-polls notifications, surfaces the next OPEN case alert, accept/decline
- **Navigate** — live map + GPS streaming via `/location` socket, ETA/distance from server, panic button
- **On scene** — vitals form (HR/BP/SpO₂/GCS), action checklist, "stabilized" gate, hand-off (closes case)
- **History** — past cases
- **Profile** — edit name/phone/certification, language toggle, availability switch

### Dispatcher
- **Dashboard** — KPIs (active cases, available volunteers, avg response, today), severity filter, active case list
- **Cases** — Active / Closed / All tabs + severity filter + search
- **New Case** — 4-step wizard: Location (map pin + radius check) → Patient → Severity → Review → Dispatch
- **Case Detail** — header chips, map with volunteer pins, ambulance info, close case, status transitions, timeline, nearby volunteers
- **Volunteers** — KPIs + AVAILABLE/BUSY/OFFLINE filter
- **Reports** — 12-month bar chart, severity %, top responders

### Admin
- **Home** — KPIs, pending verifications, quick actions
- **Approvals** — Pending/Approved/All tabs, one-tap verify
- **Users** — full role-tagged list
- **Centers** — dispatch centers (placeholder, matches web)
- **System** — backend health ping every 15s, services list

Sign-out button and EN/AR toggle live in the top-right of every tab header.

## Step-by-step setup

### 1. Prerequisites

- **Node.js 18+** and npm
- **Expo Go** on your phone (App Store / Play Store) — must be the latest version (SDK 54)
- The backend ([../mughith-backend-main](../mughith-backend-main)) running, reachable from your phone

### 2. Get the backend running

```bash
cd ../mughith-backend-main
npm install
cp .env.example .env
# Edit .env if needed (DATABASE_URL, JWT_SECRET)
docker compose up -d            # starts PostgreSQL
npx prisma migrate deploy
npx prisma generate
npm run db:seed                 # seeds 6 demo users (password Pass1234)
npm run start:dev               # serves http://localhost:3000
```

Demo users seeded:
- `admin@mughith.sa` — ADMIN
- `dispatcher@mughith.sa` — DISPATCHER
- `donator@mughith.sa`, `donator2@mughith.sa`, … — DONATOR
- Password for all: `Pass1234`

### 3. Point the mobile app at your backend

Default is `http://localhost:3000` (works in iOS simulator). On a real phone you must
use your Mac/PC's LAN IP.

```bash
cp .env.example .env
# Edit .env, replacing localhost with your machine's LAN IP:
# EXPO_PUBLIC_API_URL=http://192.168.1.42:3000
```

Find your LAN IP on Mac: `ipconfig getifaddr en0`
Find your LAN IP on Windows: `ipconfig`

### 4. Install + run

```bash
npm install
npx expo start --lan
```

A QR code appears. Open **Expo Go** on your phone and scan it.

- iOS simulator: press `i`
- Android emulator: press `a` (use `http://10.0.2.2:3000` instead of localhost)

### 5. Try it out

1. Sign in as `dispatcher@mughith.sa` → create a case from **New Case**.
2. Switch to `donator@mughith.sa` (sign out → sign in). Toggle "Available for dispatch" on.
3. Pull-to-refresh **Alerts** → the new case should appear → **Accept**.
4. **Navigate** screen shows the map; grant location permission. Tap **I've arrived**.
5. **On scene**: fill any vitals, check actions, tick "Patient stabilized" → **Hand off**.
6. Switch to `admin@mughith.sa` → **Approvals** → verify any pending volunteer.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Network Error" on login | Your `EXPO_PUBLIC_API_URL` isn't reachable. Use your LAN IP, not `localhost`, on a real phone. |
| "Need SDK 54" in Expo Go | Update Expo Go from the App Store / Play Store. |
| Map is blank | On Android dev builds, add a Google Maps API key under `expo.android.config.googleMaps.apiKey` in `app.json`. In Expo Go it usually works without one. |
| RTL doesn't fully flip | Press `r` in the Expo terminal to reload the JS bundle. |
| Socket never connects | Backend must accept WebSockets on the same host:port. Check `/location` namespace in backend logs. |

## File map

```
src/
├── lib/
│   ├── api.ts            # axios + JWT interceptor (reads EXPO_PUBLIC_API_URL or app.json extra.apiUrl)
│   ├── auth.ts           # login / register / me
│   ├── cases.ts          # list / get / create / history / status / close / ambulance / panic
│   ├── dispatch.ts       # accept / reject / nearby
│   ├── users.ts          # profile / availability / verify / list donators
│   ├── notifications.ts  # list / mark read / mark all read
│   ├── socket.ts         # /location and /voip socket.io clients
│   ├── i18n.tsx          # full EN/AR strings + RTL via I18nManager
│   ├── theme.ts          # colors + severity/status/presence helpers
│   ├── geo.ts            # haversine + donatorState
│   ├── time.ts           # formatAgo, formatResponseTime
│   └── roleNav.ts        # role → tab root
├── store/useStore.ts     # Zustand + AsyncStorage persistence
├── types/index.ts        # backend-aligned types
├── components/
│   ├── UI.tsx            # Screen, Card, Button, Field, Pill, Avatar, StatCard, EmptyState…
│   └── HeaderRight.tsx   # lang toggle + sign-out button
├── navigation/RootNavigator.tsx
└── screens/
    ├── Auth/{Login,Register}.tsx
    ├── Volunteer/{Home,Alert,Navigate,OnScene,History,Profile}.tsx
    ├── Dispatcher/{Dashboard,CaseList,CreateCase,CaseDetail,Volunteers,Reports}.tsx
    └── Admin/{Home,Approvals,Users,Centers,System}.tsx
```
