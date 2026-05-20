# Mugeeth Frontend API Documentation

This document is for frontend integration against the current backend in this repository.

## Quick start

- Local base URL: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`
- REST routes do **not** use `/api` as a prefix. Example: `POST /auth/login`
- Auth: send `Authorization: Bearer <accessToken>`
- Content type: `application/json`
- CORS is enabled

## Common behavior

### Validation

The backend uses strict validation:

- Unknown fields are rejected with `400 Bad Request`
- Query params like `page`, `limit`, `latitude`, and `longitude` are converted to numbers automatically
- Enum fields must match the exact uppercase values shown below

### Common error shape

NestJS default errors usually look like:

```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

Validation errors may return `message` as an array of strings.

### Pagination shape

Paginated endpoints return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

## Enums

### Roles

```ts
type Role = 'DISPATCHER' | 'DONATOR' | 'AMBULANCE_CREW' | 'ADMIN';
```

### Case statuses

```ts
type CaseStatus = 'OPEN' | 'ASSIGNED' | 'ON_SCENE' | 'CLOSED' | 'EXPIRED';
```

Allowed transitions:

- `OPEN -> ASSIGNED | EXPIRED | CLOSED`
- `ASSIGNED -> ON_SCENE | CLOSED`
- `ON_SCENE -> CLOSED`

### Severity

```ts
type Severity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
```

### Notification types

```ts
type NotificationType =
  | 'CASE_ALERT'
  | 'CASE_ASSIGNED'
  | 'CASE_CANCELLED'
  | 'CASE_CLOSED'
  | 'GENERAL';
```

## Main data shapes

### User

Most user endpoints return the database user without `password`.

```ts
interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  certification: string | null;
  certExpiry: string | null;
  isVerified: boolean;
  isAvailable: boolean;
  isBusy: boolean;
  latitude: number | null;
  longitude: number | null;
  fcmToken: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Case

Base case shape:

```ts
interface Case {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  severity: Severity;
  status: CaseStatus;
  notes: string | null;
  outcome: string | null;
  radiusKm: number;
  expiresAt: string | null;
  ambulancePlate: string | null;
  ambulanceEta: string | null;
  ambulanceCrew: string | null;
  panicTriggered: boolean;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}
```

Some endpoints also include:

```ts
createdBy?: Pick<User, 'id' | 'name' | 'email'>;
assignedTo?: Pick<User, 'id' | 'name' | 'email'> | (User | null);
```

### Notification

```ts
interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  userId: string;
  caseId: string | null;
  createdAt: string;
}
```

## Authentication

### `POST /auth/register`

Creates a new user with role `DONATOR`.

Request:

```json
{
  "email": "user@example.com",
  "password": "Pass1234",
  "name": "Ahmed Ali",
  "phone": "+966500000000"
}
```

Success response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Ahmed Ali",
    "phone": "+966500000000",
    "role": "DONATOR",
    "certification": null,
    "certExpiry": null,
    "isVerified": false,
    "isAvailable": false,
    "isBusy": false,
    "latitude": null,
    "longitude": null,
    "fcmToken": null,
    "createdAt": "2026-04-27T08:00:00.000Z",
    "updatedAt": "2026-04-27T08:00:00.000Z"
  },
  "accessToken": "jwt-token"
}
```

Notes:

- Duplicate email returns `409 Conflict`
- Registration currently always creates a `DONATOR`

### `POST /auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "Pass1234"
}
```

Success response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Ahmed Ali",
    "phone": "+966500000000",
    "role": "DONATOR",
    "certification": null,
    "certExpiry": null,
    "isVerified": true,
    "isAvailable": true,
    "isBusy": false,
    "latitude": 24.7136,
    "longitude": 46.6753,
    "fcmToken": "device-token",
    "createdAt": "2026-04-27T08:00:00.000Z",
    "updatedAt": "2026-04-27T08:10:00.000Z"
  },
  "accessToken": "jwt-token"
}
```

### `GET /auth/me`

Requires bearer token.

Returns the current authenticated user.

## Users

### `GET /users/profile`

Requires bearer token.

Returns the same user shape as `GET /auth/me`.

### `PATCH /users/profile`

Requires bearer token.

Request body is partial. Send only fields you want to update.

```json
{
  "name": "Ahmed Ali",
  "phone": "+966500000000",
  "certification": "BLS",
  "certExpiry": "2027-12-31T00:00:00.000Z",
  "fcmToken": "device-token",
  "latitude": 24.7136,
  "longitude": 46.6753
}
```

Notes:

- `latitude` and `longitude` are useful as an initial REST fallback before live socket updates
- This is also the current way to save the device `fcmToken`

### `PATCH /users/availability`

Requires bearer token and role `DONATOR`.

Request:

```json
{
  "isAvailable": true
}
```

Returns the updated user.

### `PATCH /users/:id/verify`

Requires role `ADMIN`.

Marks a donator as verified.

Returns the updated user.

### `GET /users/donators?page=1&limit=20&available=true`

Requires role `DISPATCHER` or `ADMIN`.

Query params:

- `page` default `1`
- `limit` default `20`, max `100`
- `available` optional boolean

Returns paginated donators.

## Cases

### `POST /cases`

Requires role `DISPATCHER` or `ADMIN`.

Request:

```json
{
  "address": "Al Haram, Makkah",
  "severity": "CRITICAL",
  "notes": "Adult male, heavy bleeding",
  "radiusKm": 5,
  "latitude": 21.4225,
  "longitude": 39.8262
}
```

Notes:

- `address` is required even if coordinates are provided
- If `latitude` and `longitude` are omitted, the backend geocodes the address
- If geocoding fails, the backend returns `400`
- Creating a case triggers nearby-donator notifications automatically

Success response:

```json
{
  "id": "case-uuid",
  "address": "Al Haram, Makkah",
  "latitude": 21.4225,
  "longitude": 39.8262,
  "severity": "CRITICAL",
  "status": "OPEN",
  "notes": "Adult male, heavy bleeding",
  "outcome": null,
  "radiusKm": 5,
  "expiresAt": "2026-04-27T08:05:00.000Z",
  "ambulancePlate": null,
  "ambulanceEta": null,
  "ambulanceCrew": null,
  "panicTriggered": false,
  "createdById": "dispatcher-uuid",
  "assignedToId": null,
  "createdAt": "2026-04-27T08:00:00.000Z",
  "updatedAt": "2026-04-27T08:00:00.000Z",
  "closedAt": null
}
```

### `GET /cases?page=1&limit=20&status=OPEN&severity=CRITICAL`

Requires role `DISPATCHER` or `ADMIN`.

Returns paginated cases sorted by newest first.

Each item includes:

- all base `Case` fields
- `createdBy: { id, name, email }`
- `assignedTo: { id, name, email } | null`

### `GET /cases/history`

Requires bearer token.

Behavior depends on role:

- `DONATOR`: returns up to 50 closed or expired cases assigned to the current donator
- all other roles: returns up to 50 closed or expired cases created by the current user

### `GET /cases/:id`

Requires bearer token.

Returns one case with:

- all base `Case` fields
- `createdBy: { id, name, email }`
- `assignedTo: { id, name, email, phone } | null`

### `PATCH /cases/:id/status`

Requires role `DISPATCHER`, `DONATOR`, `AMBULANCE_CREW`, or `ADMIN`.

Request:

```json
{
  "status": "ON_SCENE"
}
```

Notes:

- Invalid transitions return `400`
- Setting status to `CLOSED` here also sets `closedAt`, but does not attach an `outcome`
- Use the dedicated close endpoint when you need an outcome report

### `PATCH /cases/:id/close`

Requires role `DISPATCHER` or `ADMIN`.

Request:

```json
{
  "outcome": "Patient stabilized, ambulance took over."
}
```

Behavior:

- sets `status` to `CLOSED`
- sets `closedAt`
- saves `outcome`
- if a donator was assigned, marks that donator `isBusy = false`
- sends a `CASE_CLOSED` notification to the assigned donator

### `PATCH /cases/:id/ambulance-info`

Requires role `DISPATCHER`, `AMBULANCE_CREW`, or `ADMIN`.

Request:

```json
{
  "plate": "ABC-1234",
  "eta": "12 min",
  "crew": "Team Alpha"
}
```

Notes:

- Only allowed when case status is `ASSIGNED` or `ON_SCENE`
- Missing fields are left unchanged

### `PATCH /cases/:id/panic`

Requires role `AMBULANCE_CREW`.

Behavior:

- sets `panicTriggered = true`
- sends a `GENERAL` notification to the case creator

## Dispatch

### `POST /dispatch/:caseId/accept`

Requires role `DONATOR`.

Behavior:

- first volunteer to accept wins
- case moves from `OPEN` to `ASSIGNED`
- accepting donator becomes `isBusy = true`
- other alerted donators get `CASE_CANCELLED`
- case creator gets `CASE_ASSIGNED`
- a chat channel is created for the case

Success response includes the updated case plus `assignedTo` and `createdBy`.

### `POST /dispatch/:caseId/reject`

Requires role `DONATOR`.

Marks the current unread `CASE_ALERT` notification for this case as read.

Success response:

```json
{
  "ok": true
}
```

### `GET /dispatch/:caseId/nearby`

Requires role `DISPATCHER` or `ADMIN`.

Returns ranked donators within the case radius:

```ts
interface NearbyDonator {
  id: string;
  name: string;
  phone: string | null;
  distanceKm: number;
  etaMinutes: number;
  latitude: number;
  longitude: number;
}
```

## Chat

### `POST /chat/case/:caseId/channel`

Requires bearer token.

Creates or fetches the chat channel for an assigned case.

Fails if:

- the case does not exist
- no donator is assigned yet
- the case is already `CLOSED` or `EXPIRED`

Success response:

```json
{
  "channelId": "case-case-uuid",
  "channelType": "messaging",
  "members": ["dispatcher-user-id", "donator-user-id"]
}
```

### `GET /chat/token`

Requires bearer token.

Success response:

```json
{
  "token": "stream-chat-token"
}
```

Notes:

- If Stream is not configured on the backend, this may return a stub token in local/dev environments

## Notifications

### `GET /notifications`

Requires bearer token.

Optional query params:

- `unread=true`

Returns notifications ordered from newest to oldest.

### `PATCH /notifications/read-all`

Requires bearer token.

Success response:

```json
{
  "count": 3
}
```

`count` is the number of rows updated.

### `PATCH /notifications/:id/read`

Requires bearer token.

Marks one notification as read.

Returns the updated notification object.

## Health

### `GET /health`

Public endpoint.

Used for uptime and database health checks.

## Real-time integration

The app uses Socket.IO for live location and VoIP signaling.

## Socket authentication

Both namespaces accept JWT in one of these ways:

- `auth.token` in the Socket.IO handshake
- `Authorization: Bearer <token>` header
- `?token=<jwt>` query param

Recommended frontend connection:

```ts
const socket = io('http://localhost:3000/location', {
  auth: { token: accessToken }
});
```

## Location namespace

Namespace: `/location`

### Client emits

#### `location:subscribe`

```json
{
  "caseId": "case-uuid"
}
```

#### `location:unsubscribe`

```json
{
  "caseId": "case-uuid"
}
```

#### `location:update`

```json
{
  "caseId": "case-uuid",
  "latitude": 24.7136,
  "longitude": 46.6753
}
```

This updates the donator's saved location in the database.

### Ack response for `location:update`

```json
{
  "ok": true,
  "distanceKm": 2.1,
  "etaMinutes": 4
}
```

### Server emits

#### `location:update`

Broadcast to subscribers of the case room:

```json
{
  "donatorId": "donator-uuid",
  "caseId": "case-uuid",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "distanceKm": 2.1,
  "etaMinutes": 4,
  "timestamp": "2026-04-27T08:12:00.000Z"
}
```

#### `location:signal-lost`

Emitted when a donator has not sent a location update for 30 seconds:

```json
{
  "donatorId": "donator-uuid",
  "lastSeenAt": "2026-04-27T08:12:00.000Z"
}
```

## VoIP namespace

Namespace: `/voip`

The backend is acting as a signaling server for WebRTC.

### Client emits

#### `call:offer`

```json
{
  "caseId": "case-uuid",
  "targetUserId": "other-user-id",
  "sdpOffer": {}
}
```

#### `call:answer`

```json
{
  "caseId": "case-uuid",
  "targetUserId": "other-user-id",
  "sdpAnswer": {}
}
```

#### `call:ice-candidate`

```json
{
  "caseId": "case-uuid",
  "targetUserId": "other-user-id",
  "candidate": {}
}
```

#### `call:end`

```json
{
  "caseId": "case-uuid",
  "targetUserId": "other-user-id"
}
```

### Server emits

#### `call:incoming`

```json
{
  "caseId": "case-uuid",
  "callerId": "caller-user-id",
  "sdpOffer": {}
}
```

#### `call:answered`

```json
{
  "caseId": "case-uuid",
  "calleeId": "callee-user-id",
  "sdpAnswer": {}
}
```

#### `call:ice-candidate`

```json
{
  "caseId": "case-uuid",
  "fromId": "sender-user-id",
  "candidate": {}
}
```

#### `call:ended`

```json
{
  "caseId": "case-uuid",
  "fromId": "sender-user-id"
}
```

### Socket ack errors

Failed socket actions usually acknowledge:

```json
{
  "ok": false,
  "error": "target offline"
}
```

## Recommended frontend flows

### Donator app flow

1. Register or login.
2. Save `accessToken` and user `role`.
3. Call `PATCH /users/profile` to store `fcmToken`.
4. Call `PATCH /users/profile` or live location socket updates to provide location.
5. Call `PATCH /users/availability` with `true` when ready.
6. Poll `GET /notifications?unread=true` or listen to FCM for nearby case alerts.
7. Accept with `POST /dispatch/:caseId/accept`.
8. Join chat and location sockets for the assigned case.

### Dispatcher app flow

1. Login and keep the JWT.
2. Create a case with `POST /cases`.
3. View nearby donators with `GET /dispatch/:caseId/nearby` if needed.
4. Monitor case status with `GET /cases/:id`.
5. Create or open chat with `POST /chat/case/:caseId/channel`.
6. Update ambulance info or close the case when complete.

## Notes for the frontend team

- Use the returned `role` to gate UI and route access.
- Treat all datetime fields as ISO strings in UTC.
- `GET /auth/me` and `GET /users/profile` are both available and currently return the same profile data.
- For volunteer proximity features, verified donators with `isAvailable = true`, `isBusy = false`, and saved coordinates are the only ones considered eligible.
